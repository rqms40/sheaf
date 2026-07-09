import { z } from "zod";

export const EngagementType = z.enum(["web", "network", "ad", "cloud", "other"]);
export type EngagementType = z.infer<typeof EngagementType>;

export const EngagementStatus = z.enum(["active", "archived"]);
export type EngagementStatus = z.infer<typeof EngagementStatus>;

export const Severity = z.enum(["critical", "high", "medium", "low", "info"]);
export type Severity = z.infer<typeof Severity>;

export const FindingStatus = z.enum([
  "draft",
  "needs_review",
  "confirmed",
  "false_positive",
  "risk_accepted",
  "remediated",
  /** Soft-removed from active casework; reversible. Prefer over delete for noise. */
  "archived",
]);
export type FindingStatus = z.infer<typeof FindingStatus>;

/** Default triage statuses (excludes archived). */
export const ACTIVE_FINDING_STATUSES: FindingStatus[] = [
  "draft",
  "needs_review",
  "confirmed",
  "false_positive",
  "risk_accepted",
  "remediated",
];

export const ScopeKind = z.enum(["domain", "url", "cidr", "wildcard", "ip"]);
export type ScopeKind = z.infer<typeof ScopeKind>;

export const ToolName = z.enum(["nuclei", "nmap", "httpx", "ffuf", "manual", "other"]);
export type ToolName = z.infer<typeof ToolName>;

export const EvidenceKind = z.enum(["file", "http", "screenshot", "note_ref", "other"]);
export type EvidenceKind = z.infer<typeof EvidenceKind>;

export const TimelineKind = z.enum([
  "import",
  "status_change",
  "note",
  "finding_created",
  "report",
  "other",
]);
export type TimelineKind = z.infer<typeof TimelineKind>;

export const CreateEngagementInput = z.object({
  name: z.string().min(1),
  client: z.string().optional().nullable(),
  type: EngagementType.default("web"),
  startAt: z.number().optional().nullable(),
  endAt: z.number().optional().nullable(),
});
export type CreateEngagementInput = z.infer<typeof CreateEngagementInput>;

export const UpdateEngagementInput = z.object({
  name: z.string().min(1).optional(),
  client: z.string().optional().nullable(),
  type: EngagementType.optional(),
  status: EngagementStatus.optional(),
  startAt: z.number().optional().nullable(),
  endAt: z.number().optional().nullable(),
  roeText: z.string().optional().nullable(),
  notesText: z.string().optional().nullable(),
});
export type UpdateEngagementInput = z.infer<typeof UpdateEngagementInput>;

export const CreateScopeInput = z.object({
  kind: ScopeKind,
  value: z.string().min(1),
  isExclude: z.boolean().default(false),
  notes: z.string().optional().nullable(),
});
export type CreateScopeInput = z.infer<typeof CreateScopeInput>;

export const CreateFindingInput = z.object({
  title: z.string().min(1),
  severity: Severity.default("medium"),
  status: FindingStatus.default("draft"),
  host: z.string().optional().nullable(),
  path: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  impact: z.string().optional().nullable(),
  remediation: z.string().optional().nullable(),
  cwe: z.string().optional().nullable(),
  cve: z.string().optional().nullable(),
  references: z.array(z.string()).optional(),
});
export type CreateFindingInput = z.infer<typeof CreateFindingInput>;

export const UpdateFindingInput = CreateFindingInput.partial().extend({
  status: FindingStatus.optional(),
  severity: Severity.optional(),
});
export type UpdateFindingInput = z.infer<typeof UpdateFindingInput>;

export const CreateEvidenceInput = z.object({
  findingId: z.string().optional().nullable(),
  kind: EvidenceKind.default("http"),
  contentText: z.string().optional().nullable(),
  path: z.string().optional().nullable(),
  meta: z.record(z.unknown()).optional(),
});
export type CreateEvidenceInput = z.infer<typeof CreateEvidenceInput>;

export const CreateNoteInput = z.object({
  findingId: z.string().optional().nullable(),
  title: z.string().default("Note"),
  body: z.string().default(""),
});
export type CreateNoteInput = z.infer<typeof CreateNoteInput>;

export const SEVERITY_ORDER: Severity[] = [
  "critical",
  "high",
  "medium",
  "low",
  "info",
];
