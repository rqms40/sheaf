import { and, desc, eq, max } from "drizzle-orm";
import * as schema from "./db/schema.js";
import { newId, nowMs } from "./ids.js";
import type { Workspace } from "./workspace.js";

/** Fields tracked in finding edit history (document body of the writeup). */
export const REVISION_FIELDS = [
  "title",
  "severity",
  "status",
  "host",
  "path",
  "description",
  "impact",
  "remediation",
  "cwe",
  "cve",
  "references",
] as const;

export type RevisionField = (typeof REVISION_FIELDS)[number];

export type FindingSnapshot = {
  title: string;
  severity: string;
  status: string;
  host: string | null;
  path: string | null;
  description: string | null;
  impact: string | null;
  remediation: string | null;
  cwe: string | null;
  cve: string | null;
  references: string[];
};

export type FieldChange = { from: unknown; to: unknown };

export type FindingRevisionSource =
  | "create"
  | "edit"
  | "import"
  | "archive"
  | "restore"
  | "status";

export type FindingRevision = {
  id: string;
  engagementId: string;
  findingId: string;
  revision: number;
  source: FindingRevisionSource;
  summary: string;
  snapshot: FindingSnapshot;
  changes: Partial<Record<RevisionField, FieldChange>>;
  createdAt: number;
};

function norm(v: unknown): string {
  if (v == null) return "";
  if (Array.isArray(v)) return JSON.stringify(v);
  return String(v);
}

export function snapshotFromFinding(f: {
  title: string;
  severity: string;
  status: string;
  host?: string | null;
  path?: string | null;
  description?: string | null;
  impact?: string | null;
  remediation?: string | null;
  cwe?: string | null;
  cve?: string | null;
  references?: string[];
}): FindingSnapshot {
  return {
    title: f.title,
    severity: f.severity,
    status: f.status,
    host: f.host ?? null,
    path: f.path ?? null,
    description: f.description ?? null,
    impact: f.impact ?? null,
    remediation: f.remediation ?? null,
    cwe: f.cwe ?? null,
    cve: f.cve ?? null,
    references: Array.isArray(f.references) ? f.references.map(String) : [],
  };
}

export function diffSnapshots(
  before: FindingSnapshot | null,
  after: FindingSnapshot,
): Partial<Record<RevisionField, FieldChange>> {
  const changes: Partial<Record<RevisionField, FieldChange>> = {};
  if (!before) {
    for (const field of REVISION_FIELDS) {
      const to = after[field];
      if (field === "references" && Array.isArray(to) && to.length === 0) continue;
      if (to == null || to === "") continue;
      changes[field] = { from: null, to };
    }
    return changes;
  }
  for (const field of REVISION_FIELDS) {
    const a = before[field];
    const b = after[field];
    if (norm(a) !== norm(b)) {
      changes[field] = { from: a, to: b };
    }
  }
  return changes;
}

export function summarizeChanges(
  source: FindingRevisionSource,
  changes: Partial<Record<RevisionField, FieldChange>>,
): string {
  const keys = Object.keys(changes) as RevisionField[];
  if (source === "create") return "Finding created";
  if (source === "restore") return "Restored from earlier revision";
  if (source === "archive") return "Archived";
  if (keys.length === 0) return "Saved (no field changes)";

  const bits: string[] = [];
  for (const k of keys.slice(0, 6)) {
    const c = changes[k]!;
    if (k === "status" || k === "severity" || k === "title") {
      const from = c.from == null || c.from === "" ? "—" : String(c.from);
      const to = c.to == null || c.to === "" ? "—" : String(c.to);
      bits.push(`${k} ${from} → ${to}`);
    } else if (k === "description" || k === "impact" || k === "remediation") {
      bits.push(`${k} updated`);
    } else {
      bits.push(k);
    }
  }
  if (keys.length > 6) bits.push(`+${keys.length - 6} more`);
  return bits.join(" · ");
}

function mapRevision(row: typeof schema.findingRevisions.$inferSelect): FindingRevision {
  let snapshot: FindingSnapshot;
  let changes: Partial<Record<RevisionField, FieldChange>> = {};
  try {
    snapshot = JSON.parse(row.snapshotJson) as FindingSnapshot;
  } catch {
    snapshot = snapshotFromFinding({
      title: "(corrupt snapshot)",
      severity: "info",
      status: "draft",
    });
  }
  try {
    changes = JSON.parse(row.changesJson || "{}") as Partial<
      Record<RevisionField, FieldChange>
    >;
  } catch {
    changes = {};
  }
  return {
    id: row.id,
    engagementId: row.engagementId,
    findingId: row.findingId,
    revision: row.revision,
    source: row.source as FindingRevisionSource,
    summary: row.summary,
    snapshot,
    changes,
    createdAt: row.createdAt,
  };
}

function nextRevisionNumber(ws: Workspace, findingId: string): number {
  const row = ws.db
    .select({ m: max(schema.findingRevisions.revision) })
    .from(schema.findingRevisions)
    .where(eq(schema.findingRevisions.findingId, findingId))
    .get();
  return (row?.m ?? 0) + 1;
}

/**
 * Append a revision if there are real field changes (or source is create/restore/archive).
 * Returns the revision or null if nothing to record.
 */
export function recordFindingRevision(
  ws: Workspace,
  engagementId: string,
  findingId: string,
  source: FindingRevisionSource,
  before: FindingSnapshot | null,
  after: FindingSnapshot,
): FindingRevision | null {
  const changes = diffSnapshots(before, after);
  const hasChanges = Object.keys(changes).length > 0;
  if (!hasChanges && source === "edit") return null;
  if (!hasChanges && source === "import") return null;
  if (!hasChanges && source === "status") return null;

  // Narrow source for pure status flips
  let src = source;
  if (source === "edit" && Object.keys(changes).length === 1 && changes.status) {
    src = after.status === "archived" ? "archive" : "status";
  }

  const revision = nextRevisionNumber(ws, findingId);
  const id = newId();
  const now = nowMs();
  const summary = summarizeChanges(src, changes);

  ws.db
    .insert(schema.findingRevisions)
    .values({
      id,
      engagementId,
      findingId,
      revision,
      source: src,
      summary,
      snapshotJson: JSON.stringify(after),
      changesJson: JSON.stringify(changes),
      createdAt: now,
    })
    .run();

  return mapRevision(
    ws.db
      .select()
      .from(schema.findingRevisions)
      .where(eq(schema.findingRevisions.id, id))
      .get()!,
  );
}

export function listFindingRevisions(
  ws: Workspace,
  engagementId: string,
  findingId: string,
): FindingRevision[] {
  return ws.db
    .select()
    .from(schema.findingRevisions)
    .where(
      and(
        eq(schema.findingRevisions.engagementId, engagementId),
        eq(schema.findingRevisions.findingId, findingId),
      ),
    )
    .orderBy(desc(schema.findingRevisions.revision))
    .all()
    .map(mapRevision);
}

export function getFindingRevision(
  ws: Workspace,
  engagementId: string,
  findingId: string,
  revisionId: string,
): FindingRevision | null {
  const row = ws.db
    .select()
    .from(schema.findingRevisions)
    .where(
      and(
        eq(schema.findingRevisions.id, revisionId),
        eq(schema.findingRevisions.engagementId, engagementId),
        eq(schema.findingRevisions.findingId, findingId),
      ),
    )
    .get();
  return row ? mapRevision(row) : null;
}

export function deleteFindingRevisions(
  ws: Workspace,
  engagementId: string,
  findingId: string,
): void {
  ws.db
    .delete(schema.findingRevisions)
    .where(
      and(
        eq(schema.findingRevisions.engagementId, engagementId),
        eq(schema.findingRevisions.findingId, findingId),
      ),
    )
    .run();
}
