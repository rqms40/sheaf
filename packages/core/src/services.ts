import { and, desc, eq } from "drizzle-orm";
import * as schema from "./db/schema.js";
import { newId, nowMs } from "./ids.js";
import {
  CreateEngagementInput,
  CreateEvidenceInput,
  CreateFindingInput,
  CreateNoteInput,
  CreateScopeInput,
  UpdateEngagementInput,
  UpdateFindingInput,
  type FindingStatus,
  type Severity,
} from "./schemas.js";
import { normalizeNucleiFile } from "./importers/nuclei.js";
import { parseNmapXml } from "./importers/nmap.js";
import { parseHttpx } from "./importers/httpx.js";
import { normalizeFfufFile } from "./importers/ffuf.js";
import { manualFingerprint } from "./fingerprint.js";
import { renderMarkdownReport } from "./report/markdown.js";
import { checklistForType } from "./checklist/definitions.js";
import { evidencePathFor, type Workspace } from "./workspace.js";
import fs from "node:fs";
import path from "node:path";

function parseJsonArray(s: string | null | undefined): string[] {
  try {
    const v = JSON.parse(s || "[]");
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function mapFinding(row: typeof schema.findings.$inferSelect) {
  return {
    ...row,
    references: parseJsonArray(row.referencesJson),
  };
}

export function listEngagements(ws: Workspace) {
  return ws.db.select().from(schema.engagements).orderBy(desc(schema.engagements.updatedAt)).all();
}

export function getEngagement(ws: Workspace, id: string) {
  return ws.db.select().from(schema.engagements).where(eq(schema.engagements.id, id)).get();
}

export function createEngagement(ws: Workspace, input: CreateEngagementInput) {
  const data = CreateEngagementInput.parse(input);
  const id = newId();
  const now = nowMs();
  ws.db
    .insert(schema.engagements)
    .values({
      id,
      name: data.name,
      client: data.client ?? null,
      type: data.type,
      status: "active",
      startAt: data.startAt ?? null,
      endAt: data.endAt ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  addTimeline(ws, id, "other", `Engagement created: ${data.name}`);
  return getEngagement(ws, id)!;
}

export function updateEngagement(ws: Workspace, id: string, input: UpdateEngagementInput) {
  const data = UpdateEngagementInput.parse(input);
  const existing = getEngagement(ws, id);
  if (!existing) return null;
  ws.db
    .update(schema.engagements)
    .set({
      name: data.name ?? existing.name,
      client: data.client === undefined ? existing.client : data.client,
      type: data.type ?? existing.type,
      status: data.status ?? existing.status,
      startAt: data.startAt === undefined ? existing.startAt : data.startAt,
      endAt: data.endAt === undefined ? existing.endAt : data.endAt,
      updatedAt: nowMs(),
    })
    .where(eq(schema.engagements.id, id))
    .run();
  return getEngagement(ws, id)!;
}

export function listScope(ws: Workspace, engagementId: string) {
  return ws.db
    .select()
    .from(schema.scopeItems)
    .where(eq(schema.scopeItems.engagementId, engagementId))
    .all();
}

export function addScope(ws: Workspace, engagementId: string, input: CreateScopeInput) {
  const data = CreateScopeInput.parse(input);
  const id = newId();
  ws.db
    .insert(schema.scopeItems)
    .values({
      id,
      engagementId,
      kind: data.kind,
      value: data.value,
      isExclude: data.isExclude ? 1 : 0,
      notes: data.notes ?? null,
      createdAt: nowMs(),
    })
    .run();
  addTimeline(ws, engagementId, "other", `Scope ${data.isExclude ? "exclude" : "include"}: ${data.value}`);
  return ws.db.select().from(schema.scopeItems).where(eq(schema.scopeItems.id, id)).get()!;
}

export function deleteScope(ws: Workspace, engagementId: string, scopeId: string) {
  ws.db
    .delete(schema.scopeItems)
    .where(and(eq(schema.scopeItems.id, scopeId), eq(schema.scopeItems.engagementId, engagementId)))
    .run();
}

export type FindingListFilters = {
  severity?: Severity;
  status?: FindingStatus;
  q?: string;
  /**
   * active (default) = hide archived
   * archived = only archived
   * all = everything
   */
  visibility?: "active" | "archived" | "all";
};

export function listFindings(
  ws: Workspace,
  engagementId: string,
  filters?: FindingListFilters,
) {
  let rows = ws.db
    .select()
    .from(schema.findings)
    .where(eq(schema.findings.engagementId, engagementId))
    .orderBy(desc(schema.findings.updatedAt))
    .all()
    .map(mapFinding);

  const visibility = filters?.visibility ?? "active";
  if (visibility === "active") {
    rows = rows.filter((r) => r.status !== "archived");
  } else if (visibility === "archived") {
    rows = rows.filter((r) => r.status === "archived");
  }

  if (filters?.severity) rows = rows.filter((r) => r.severity === filters.severity);
  if (filters?.status) rows = rows.filter((r) => r.status === filters.status);
  if (filters?.q) {
    const q = filters.q.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.host ?? "").toLowerCase().includes(q) ||
        (r.path ?? "").toLowerCase().includes(q),
    );
  }

  const order: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
    info: 4,
  };
  rows.sort((a, b) => (order[a.severity] ?? 9) - (order[b.severity] ?? 9));
  return rows;
}

export function archiveFinding(
  ws: Workspace,
  engagementId: string,
  findingId: string,
  archive = true,
) {
  const existing = getFinding(ws, engagementId, findingId);
  if (!existing) return null;
  // Archive = soft hide from active casework; restore lands back in triage.
  return updateFinding(ws, engagementId, findingId, {
    status: archive ? "archived" : "needs_review",
  });
}

export function getFinding(ws: Workspace, engagementId: string, findingId: string) {
  const row = ws.db
    .select()
    .from(schema.findings)
    .where(and(eq(schema.findings.id, findingId), eq(schema.findings.engagementId, engagementId)))
    .get();
  return row ? mapFinding(row) : null;
}

export function createFinding(ws: Workspace, engagementId: string, input: CreateFindingInput) {
  const data = CreateFindingInput.parse(input);
  const id = newId();
  const now = nowMs();
  const fingerprint = manualFingerprint({
    id,
    title: data.title,
    host: data.host,
    path: data.path,
  });
  ws.db
    .insert(schema.findings)
    .values({
      id,
      engagementId,
      runId: null,
      title: data.title,
      severity: data.severity,
      status: data.status,
      host: data.host ?? null,
      path: data.path ?? null,
      description: data.description ?? null,
      impact: data.impact ?? null,
      remediation: data.remediation ?? null,
      cwe: data.cwe ?? null,
      cve: data.cve ?? null,
      referencesJson: JSON.stringify(data.references ?? []),
      fingerprint,
      rawJson: null,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  addTimeline(ws, engagementId, "finding_created", `Finding created: ${data.title}`, "finding", id);
  return getFinding(ws, engagementId, id)!;
}

export function updateFinding(
  ws: Workspace,
  engagementId: string,
  findingId: string,
  input: UpdateFindingInput,
) {
  const data = UpdateFindingInput.parse(input);
  const existing = getFinding(ws, engagementId, findingId);
  if (!existing) return null;

  const nextStatus = data.status ?? existing.status;
  ws.db
    .update(schema.findings)
    .set({
      title: data.title ?? existing.title,
      severity: data.severity ?? existing.severity,
      status: nextStatus,
      host: data.host === undefined ? existing.host : data.host,
      path: data.path === undefined ? existing.path : data.path,
      description: data.description === undefined ? existing.description : data.description,
      impact: data.impact === undefined ? existing.impact : data.impact,
      remediation: data.remediation === undefined ? existing.remediation : data.remediation,
      cwe: data.cwe === undefined ? existing.cwe : data.cwe,
      cve: data.cve === undefined ? existing.cve : data.cve,
      referencesJson:
        data.references === undefined
          ? existing.referencesJson
          : JSON.stringify(data.references),
      updatedAt: nowMs(),
    })
    .where(eq(schema.findings.id, findingId))
    .run();

  if (data.status && data.status !== existing.status) {
    addTimeline(
      ws,
      engagementId,
      "status_change",
      `Finding status ${existing.status} → ${data.status}: ${existing.title}`,
      "finding",
      findingId,
    );
  }
  return getFinding(ws, engagementId, findingId)!;
}

export function deleteFinding(ws: Workspace, engagementId: string, findingId: string) {
  const existing = getFinding(ws, engagementId, findingId);
  if (!existing) return false;

  // Clean related rows (no FK cascade on finding_id)
  ws.db
    .delete(schema.evidence)
    .where(
      and(
        eq(schema.evidence.engagementId, engagementId),
        eq(schema.evidence.findingId, findingId),
      ),
    )
    .run();
  ws.db
    .delete(schema.notes)
    .where(
      and(eq(schema.notes.engagementId, engagementId), eq(schema.notes.findingId, findingId)),
    )
    .run();
  ws.db
    .delete(schema.findings)
    .where(and(eq(schema.findings.id, findingId), eq(schema.findings.engagementId, engagementId)))
    .run();
  addTimeline(
    ws,
    engagementId,
    "other",
    `Finding deleted: ${existing.title}`,
    "finding",
    findingId,
  );
  return true;
}

export function listRuns(ws: Workspace, engagementId: string) {
  return ws.db
    .select()
    .from(schema.runs)
    .where(eq(schema.runs.engagementId, engagementId))
    .orderBy(desc(schema.runs.createdAt))
    .all()
    .map((r) => ({
      ...r,
      meta: (() => {
        try {
          return JSON.parse(r.metaJson || "{}");
        } catch {
          return {};
        }
      })(),
    }));
}

export function listAssets(ws: Workspace, engagementId: string) {
  return ws.db
    .select()
    .from(schema.assets)
    .where(eq(schema.assets.engagementId, engagementId))
    .all()
    .map((a) => ({
      ...a,
      ports: (() => {
        try {
          return JSON.parse(a.portsJson || "[]");
        } catch {
          return [];
        }
      })(),
      tags: parseJsonArray(a.tagsJson),
    }));
}

export function listTimeline(ws: Workspace, engagementId: string, limit = 100) {
  return ws.db
    .select()
    .from(schema.timelineEvents)
    .where(eq(schema.timelineEvents.engagementId, engagementId))
    .orderBy(desc(schema.timelineEvents.createdAt))
    .limit(limit)
    .all();
}

export function addTimeline(
  ws: Workspace,
  engagementId: string,
  kind: string,
  message: string,
  refType?: string | null,
  refId?: string | null,
) {
  const id = newId();
  ws.db
    .insert(schema.timelineEvents)
    .values({
      id,
      engagementId,
      kind,
      message,
      refType: refType ?? null,
      refId: refId ?? null,
      createdAt: nowMs(),
    })
    .run();
  return id;
}

export function listEvidence(ws: Workspace, engagementId: string, findingId?: string) {
  const rows = ws.db
    .select()
    .from(schema.evidence)
    .where(eq(schema.evidence.engagementId, engagementId))
    .orderBy(desc(schema.evidence.createdAt))
    .all();
  const filtered = findingId ? rows.filter((r) => r.findingId === findingId) : rows;
  return filtered.map((e) => ({
    ...e,
    meta: (() => {
      try {
        return JSON.parse(e.metaJson || "{}");
      } catch {
        return {};
      }
    })(),
  }));
}

export function addEvidence(ws: Workspace, engagementId: string, input: CreateEvidenceInput) {
  const data = CreateEvidenceInput.parse(input);
  const id = newId();
  ws.db
    .insert(schema.evidence)
    .values({
      id,
      engagementId,
      findingId: data.findingId ?? null,
      kind: data.kind,
      path: data.path ?? null,
      contentText: data.contentText ?? null,
      metaJson: JSON.stringify(data.meta ?? {}),
      createdAt: nowMs(),
    })
    .run();
  addTimeline(ws, engagementId, "other", `Evidence added (${data.kind})`, "evidence", id);
  return listEvidence(ws, engagementId).find((e) => e.id === id)!;
}

export function listNotes(ws: Workspace, engagementId: string, findingId?: string) {
  const rows = ws.db
    .select()
    .from(schema.notes)
    .where(eq(schema.notes.engagementId, engagementId))
    .orderBy(desc(schema.notes.updatedAt))
    .all();
  return findingId ? rows.filter((n) => n.findingId === findingId) : rows;
}

export function addNote(ws: Workspace, engagementId: string, input: CreateNoteInput) {
  const data = CreateNoteInput.parse(input);
  const id = newId();
  const now = nowMs();
  // Store plain text body as simple TipTap-compatible doc with one paragraph
  const bodyJson = JSON.stringify({
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: data.body ? [{ type: "text", text: data.body }] : [],
      },
    ],
  });
  ws.db
    .insert(schema.notes)
    .values({
      id,
      engagementId,
      findingId: data.findingId ?? null,
      title: data.title,
      bodyJson,
      createdAt: now,
      updatedAt: now,
    })
    .run();
  addTimeline(ws, engagementId, "note", `Note: ${data.title}`, "note", id);
  return listNotes(ws, engagementId).find((n) => n.id === id)!;
}

export type ImportResult = {
  runId: string;
  created: number;
  updated: number;
  skipped: number;
  assets?: number;
};

export function importNuclei(
  ws: Workspace,
  engagementId: string,
  raw: string,
  sourcePath?: string,
): ImportResult {
  const items = normalizeNucleiFile(raw);
  const now = nowMs();
  const runId = newId();
  ws.db
    .insert(schema.runs)
    .values({
      id: runId,
      engagementId,
      tool: "nuclei",
      label: sourcePath ? path.basename(sourcePath) : "nuclei import",
      sourcePath: sourcePath ?? null,
      startedAt: now,
      finishedAt: now,
      metaJson: JSON.stringify({ count: items.length }),
      createdAt: now,
    })
    .run();

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const item of items) {
    const existing = ws.db
      .select()
      .from(schema.findings)
      .where(
        and(
          eq(schema.findings.engagementId, engagementId),
          eq(schema.findings.fingerprint, item.fingerprint),
        ),
      )
      .get();

    if (existing) {
      ws.db
        .update(schema.findings)
        .set({
          runId,
          title: item.title,
          severity: item.severity,
          host: item.host,
          path: item.path,
          description: item.description,
          remediation: item.remediation,
          cwe: item.cwe,
          cve: item.cve,
          referencesJson: JSON.stringify(item.references),
          rawJson: JSON.stringify(item.raw),
          updatedAt: now,
        })
        .where(eq(schema.findings.id, existing.id))
        .run();
      updated += 1;
    } else {
      const findingId = newId();
      ws.db
        .insert(schema.findings)
        .values({
          id: findingId,
          engagementId,
          runId,
          title: item.title,
          severity: item.severity,
          status: "needs_review",
          host: item.host,
          path: item.path,
          description: item.description,
          impact: item.impact,
          remediation: item.remediation,
          cwe: item.cwe,
          cve: item.cve,
          referencesJson: JSON.stringify(item.references),
          fingerprint: item.fingerprint,
          rawJson: JSON.stringify(item.raw),
          createdAt: now,
          updatedAt: now,
        })
        .run();
      created += 1;

      if (item.request || item.response) {
        const content = [
          item.request ? `=== REQUEST ===\n${item.request}` : "",
          item.response ? `=== RESPONSE ===\n${item.response}` : "",
        ]
          .filter(Boolean)
          .join("\n\n");
        ws.db
          .insert(schema.evidence)
          .values({
            id: newId(),
            engagementId,
            findingId,
            kind: "http",
            path: null,
            contentText: content,
            metaJson: JSON.stringify({ source: "nuclei" }),
            createdAt: now,
          })
          .run();
      }
    }
  }

  addTimeline(
    ws,
    engagementId,
    "import",
    `Imported nuclei (${created} new, ${updated} updated, ${items.length} total)`,
    "run",
    runId,
  );

  touchEngagement(ws, engagementId);
  return { runId, created, updated, skipped };
}

export function importNmap(
  ws: Workspace,
  engagementId: string,
  raw: string,
  sourcePath?: string,
): ImportResult {
  const assets = parseNmapXml(raw);
  const now = nowMs();
  const runId = newId();
  ws.db
    .insert(schema.runs)
    .values({
      id: runId,
      engagementId,
      tool: "nmap",
      label: sourcePath ? path.basename(sourcePath) : "nmap import",
      sourcePath: sourcePath ?? null,
      startedAt: now,
      finishedAt: now,
      metaJson: JSON.stringify({ hosts: assets.length }),
      createdAt: now,
    })
    .run();

  let created = 0;
  let updated = 0;

  for (const asset of assets) {
    const existing = ws.db
      .select()
      .from(schema.assets)
      .where(and(eq(schema.assets.engagementId, engagementId), eq(schema.assets.host, asset.host)))
      .get();

    const portsJson = JSON.stringify(asset.ports);
    if (existing) {
      ws.db
        .update(schema.assets)
        .set({
          portsJson,
          sourceRunId: runId,
        })
        .where(eq(schema.assets.id, existing.id))
        .run();
      updated += 1;
    } else {
      ws.db
        .insert(schema.assets)
        .values({
          id: newId(),
          engagementId,
          host: asset.host,
          portsJson,
          tagsJson: "[]",
          sourceRunId: runId,
          createdAt: now,
        })
        .run();
      created += 1;
    }
  }

  addTimeline(
    ws,
    engagementId,
    "import",
    `Imported nmap (${created} new hosts, ${updated} updated, ${assets.length} total)`,
    "run",
    runId,
  );
  touchEngagement(ws, engagementId);
  return { runId, created, updated, skipped: 0, assets: assets.length };
}

export function importHttpx(
  ws: Workspace,
  engagementId: string,
  raw: string,
  sourcePath?: string,
): ImportResult {
  const assets = parseHttpx(raw);
  const now = nowMs();
  const runId = newId();
  ws.db
    .insert(schema.runs)
    .values({
      id: runId,
      engagementId,
      tool: "httpx",
      label: sourcePath ? path.basename(sourcePath) : "httpx import",
      sourcePath: sourcePath ?? null,
      startedAt: now,
      finishedAt: now,
      metaJson: JSON.stringify({ hosts: assets.length }),
      createdAt: now,
    })
    .run();

  let created = 0;
  let updated = 0;
  for (const asset of assets) {
    const tags = [
      ...(asset.tech ?? []),
      asset.webserver ? `webserver:${asset.webserver}` : "",
      asset.statusCode ? `status:${asset.statusCode}` : "",
      asset.title ? `title:${asset.title}` : "",
    ].filter(Boolean);
    const portsJson = "[]";
    const existing = ws.db
      .select()
      .from(schema.assets)
      .where(and(eq(schema.assets.engagementId, engagementId), eq(schema.assets.host, asset.host)))
      .get();
    if (existing) {
      ws.db
        .update(schema.assets)
        .set({
          tagsJson: JSON.stringify(tags),
          sourceRunId: runId,
        })
        .where(eq(schema.assets.id, existing.id))
        .run();
      updated += 1;
    } else {
      ws.db
        .insert(schema.assets)
        .values({
          id: newId(),
          engagementId,
          host: asset.host,
          portsJson,
          tagsJson: JSON.stringify(tags),
          sourceRunId: runId,
          createdAt: now,
        })
        .run();
      created += 1;
    }
  }
  addTimeline(
    ws,
    engagementId,
    "import",
    `Imported httpx (${created} new hosts, ${updated} updated, ${assets.length} total)`,
    "run",
    runId,
  );
  touchEngagement(ws, engagementId);
  return { runId, created, updated, skipped: 0, assets: assets.length };
}

export function importFfuf(
  ws: Workspace,
  engagementId: string,
  raw: string,
  sourcePath?: string,
): ImportResult {
  const items = normalizeFfufFile(raw);
  const now = nowMs();
  const runId = newId();
  ws.db
    .insert(schema.runs)
    .values({
      id: runId,
      engagementId,
      tool: "ffuf",
      label: sourcePath ? path.basename(sourcePath) : "ffuf import",
      sourcePath: sourcePath ?? null,
      startedAt: now,
      finishedAt: now,
      metaJson: JSON.stringify({ count: items.length }),
      createdAt: now,
    })
    .run();

  let created = 0;
  let updated = 0;
  for (const item of items) {
    const existing = ws.db
      .select()
      .from(schema.findings)
      .where(
        and(
          eq(schema.findings.engagementId, engagementId),
          eq(schema.findings.fingerprint, item.fingerprint),
        ),
      )
      .get();
    if (existing) {
      ws.db
        .update(schema.findings)
        .set({
          runId,
          title: item.title,
          severity: item.severity,
          host: item.host,
          path: item.path,
          description: item.description,
          impact: item.impact,
          remediation: item.remediation,
          rawJson: JSON.stringify(item.raw),
          updatedAt: now,
        })
        .where(eq(schema.findings.id, existing.id))
        .run();
      updated += 1;
    } else {
      ws.db
        .insert(schema.findings)
        .values({
          id: newId(),
          engagementId,
          runId,
          title: item.title,
          severity: item.severity,
          status: "needs_review",
          host: item.host,
          path: item.path,
          description: item.description,
          impact: item.impact,
          remediation: item.remediation,
          cwe: item.cwe,
          cve: item.cve,
          referencesJson: JSON.stringify(item.references),
          fingerprint: item.fingerprint,
          rawJson: JSON.stringify(item.raw),
          createdAt: now,
          updatedAt: now,
        })
        .run();
      created += 1;
    }
  }
  addTimeline(
    ws,
    engagementId,
    "import",
    `Imported ffuf (${created} new, ${updated} updated, ${items.length} total)`,
    "run",
    runId,
  );
  touchEngagement(ws, engagementId);
  return { runId, created, updated, skipped: 0 };
}

/** Save binary/text evidence file under workspace evidence dir. */
export function saveEvidenceFile(
  ws: Workspace,
  engagementId: string,
  input: {
    findingId?: string | null;
    filename: string;
    bytes: Buffer;
    kind?: "file" | "screenshot" | "http" | "other";
    meta?: Record<string, unknown>;
  },
) {
  const id = newId();
  const safeName = `${id}_${input.filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120)}`;
  const abs = evidencePathFor(ws, engagementId, safeName);
  fs.writeFileSync(abs, input.bytes, { mode: 0o600 });
  const rel = path.relative(ws.sheafDir, abs);
  const kind = input.kind ?? (/\.(png|jpe?g|gif|webp)$/i.test(input.filename) ? "screenshot" : "file");
  ws.db
    .insert(schema.evidence)
    .values({
      id,
      engagementId,
      findingId: input.findingId ?? null,
      kind,
      path: rel,
      contentText: null,
      metaJson: JSON.stringify({
        ...(input.meta ?? {}),
        originalName: input.filename,
        size: input.bytes.length,
      }),
      createdAt: nowMs(),
    })
    .run();
  addTimeline(ws, engagementId, "other", `File evidence: ${input.filename}`, "evidence", id);
  return listEvidence(ws, engagementId).find((e) => e.id === id)!;
}

export function ensureChecklist(ws: Workspace, engagementId: string) {
  const eng = getEngagement(ws, engagementId);
  if (!eng) throw new Error("Engagement not found");
  const def = checklistForType(eng.type);
  const now = nowMs();
  const existing = ws.db
    .select()
    .from(schema.checklistItems)
    .where(eq(schema.checklistItems.engagementId, engagementId))
    .all();
  const have = new Set(existing.map((e) => e.itemKey));
  for (const item of def.items) {
    if (have.has(item.id)) continue;
    ws.db
      .insert(schema.checklistItems)
      .values({
        id: newId(),
        engagementId,
        itemKey: item.id,
        label: item.label,
        phase: item.phase,
        done: 0,
        updatedAt: now,
      })
      .run();
  }
  return listChecklist(ws, engagementId);
}

export function listChecklist(ws: Workspace, engagementId: string) {
  ensureChecklistSeeded(ws, engagementId);
  return ws.db
    .select()
    .from(schema.checklistItems)
    .where(eq(schema.checklistItems.engagementId, engagementId))
    .all()
    .map((r) => ({
      id: r.id,
      itemKey: r.itemKey,
      label: r.label,
      phase: r.phase,
      done: r.done === 1,
      updatedAt: r.updatedAt,
    }));
}

function ensureChecklistSeeded(ws: Workspace, engagementId: string) {
  const eng = getEngagement(ws, engagementId);
  if (!eng) return;
  const count = ws.db
    .select()
    .from(schema.checklistItems)
    .where(eq(schema.checklistItems.engagementId, engagementId))
    .all().length;
  if (count === 0) {
    const def = checklistForType(eng.type);
    const now = nowMs();
    for (const item of def.items) {
      ws.db
        .insert(schema.checklistItems)
        .values({
          id: newId(),
          engagementId,
          itemKey: item.id,
          label: item.label,
          phase: item.phase,
          done: 0,
          updatedAt: now,
        })
        .run();
    }
  }
}

export function setChecklistItem(
  ws: Workspace,
  engagementId: string,
  itemKey: string,
  done: boolean,
) {
  ensureChecklistSeeded(ws, engagementId);
  const row = ws.db
    .select()
    .from(schema.checklistItems)
    .where(
      and(
        eq(schema.checklistItems.engagementId, engagementId),
        eq(schema.checklistItems.itemKey, itemKey),
      ),
    )
    .get();
  if (!row) return null;
  ws.db
    .update(schema.checklistItems)
    .set({ done: done ? 1 : 0, updatedAt: nowMs() })
    .where(eq(schema.checklistItems.id, row.id))
    .run();
  addTimeline(
    ws,
    engagementId,
    "other",
    `Checklist ${done ? "done" : "undone"}: ${row.label}`,
  );
  return listChecklist(ws, engagementId).find((i) => i.itemKey === itemKey)!;
}

function touchEngagement(ws: Workspace, engagementId: string) {
  ws.db
    .update(schema.engagements)
    .set({ updatedAt: nowMs() })
    .where(eq(schema.engagements.id, engagementId))
    .run();
}

export type ReportOptions = {
  /** active (default) excludes archived findings from the client report */
  visibility?: "active" | "archived" | "all";
  /** When true, only status=confirmed findings */
  confirmedOnly?: boolean;
};

export function buildReport(
  ws: Workspace,
  engagementId: string,
  options: ReportOptions = {},
): string {
  const engagement = getEngagement(ws, engagementId);
  if (!engagement) throw new Error("Engagement not found");
  let findings = listFindings(ws, engagementId, {
    visibility: options.visibility ?? "active",
  });
  if (options.confirmedOnly) {
    findings = findings.filter((f) => f.status === "confirmed");
  }
  const scope = listScope(ws, engagementId);
  const evidence = listEvidence(ws, engagementId).filter(
    (e) => !e.findingId || findings.some((f) => f.id === e.findingId),
  );
  const assets = listAssets(ws, engagementId);
  const runs = listRuns(ws, engagementId);
  return renderMarkdownReport({
    engagement,
    findings,
    scope,
    evidence,
    assets,
    runs: runs.map((r) => ({
      tool: r.tool,
      label: r.label,
      sourcePath: r.sourcePath,
      createdAt: r.createdAt,
      meta: r.meta,
    })),
  });
}

export function buildExportPackage(
  ws: Workspace,
  engagementId: string,
  options: ReportOptions = {},
) {
  const engagement = getEngagement(ws, engagementId);
  if (!engagement) throw new Error("Engagement not found");
  const visibility = options.visibility ?? "all";
  let findings = listFindings(ws, engagementId, { visibility });
  if (options.confirmedOnly) {
    findings = findings.filter((f) => f.status === "confirmed");
  }
  const scope = listScope(ws, engagementId);
  const evidence = listEvidence(ws, engagementId);
  const assets = listAssets(ws, engagementId);
  const runs = listRuns(ws, engagementId);
  const timeline = listTimeline(ws, engagementId, 500);
  const markdown = buildReport(ws, engagementId, {
    visibility: options.visibility ?? "active",
    confirmedOnly: options.confirmedOnly,
  });
  return {
    format: "sheaf-export-v1",
    exportedAt: nowMs(),
    engagement,
    scope,
    findings,
    evidence,
    assets,
    runs,
    timeline,
    reportMarkdown: markdown,
  };
}

export function archiveEngagement(ws: Workspace, engagementId: string, archive = true) {
  const existing = getEngagement(ws, engagementId);
  if (!existing) return null;
  const status = archive ? "archived" : "active";
  const row = updateEngagement(ws, engagementId, { status });
  addTimeline(
    ws,
    engagementId,
    "other",
    archive ? "Engagement archived" : "Engagement restored to active",
  );
  return row;
}

export function writeReportFile(ws: Workspace, engagementId: string, outPath: string): string {
  const md = buildReport(ws, engagementId);
  const resolved = path.resolve(outPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, md, "utf8");
  addTimeline(ws, engagementId, "report", `Report exported to ${resolved}`);
  return resolved;
}
