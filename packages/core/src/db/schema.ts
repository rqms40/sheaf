import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";

export const engagements = sqliteTable("engagements", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  client: text("client"),
  type: text("type").notNull().default("web"),
  status: text("status").notNull().default("active"),
  startAt: integer("start_at"),
  endAt: integer("end_at"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const scopeItems = sqliteTable(
  "scope_items",
  {
    id: text("id").primaryKey(),
    engagementId: text("engagement_id")
      .notNull()
      .references(() => engagements.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    value: text("value").notNull(),
    isExclude: integer("is_exclude").notNull().default(0),
    notes: text("notes"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("scope_engagement_idx").on(t.engagementId)],
);

export const assets = sqliteTable(
  "assets",
  {
    id: text("id").primaryKey(),
    engagementId: text("engagement_id")
      .notNull()
      .references(() => engagements.id, { onDelete: "cascade" }),
    host: text("host").notNull(),
    portsJson: text("ports_json").notNull().default("[]"),
    tagsJson: text("tags_json").notNull().default("[]"),
    sourceRunId: text("source_run_id"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [uniqueIndex("assets_engagement_host_uidx").on(t.engagementId, t.host)],
);

export const runs = sqliteTable("runs", {
  id: text("id").primaryKey(),
  engagementId: text("engagement_id")
    .notNull()
    .references(() => engagements.id, { onDelete: "cascade" }),
  tool: text("tool").notNull(),
  label: text("label"),
  sourcePath: text("source_path"),
  startedAt: integer("started_at").notNull(),
  finishedAt: integer("finished_at"),
  metaJson: text("meta_json").notNull().default("{}"),
  createdAt: integer("created_at").notNull(),
});

export const findings = sqliteTable(
  "findings",
  {
    id: text("id").primaryKey(),
    engagementId: text("engagement_id")
      .notNull()
      .references(() => engagements.id, { onDelete: "cascade" }),
    runId: text("run_id"),
    title: text("title").notNull(),
    severity: text("severity").notNull().default("medium"),
    status: text("status").notNull().default("needs_review"),
    host: text("host"),
    path: text("path"),
    description: text("description"),
    impact: text("impact"),
    remediation: text("remediation"),
    cwe: text("cwe"),
    cve: text("cve"),
    referencesJson: text("references_json").notNull().default("[]"),
    fingerprint: text("fingerprint").notNull(),
    rawJson: text("raw_json"),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("findings_engagement_fp_uidx").on(t.engagementId, t.fingerprint),
    index("findings_severity_idx").on(t.engagementId, t.severity),
    index("findings_status_idx").on(t.engagementId, t.status),
  ],
);

export const evidence = sqliteTable("evidence", {
  id: text("id").primaryKey(),
  engagementId: text("engagement_id")
    .notNull()
    .references(() => engagements.id, { onDelete: "cascade" }),
  findingId: text("finding_id"),
  kind: text("kind").notNull().default("http"),
  path: text("path"),
  contentText: text("content_text"),
  metaJson: text("meta_json").notNull().default("{}"),
  createdAt: integer("created_at").notNull(),
});

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  engagementId: text("engagement_id")
    .notNull()
    .references(() => engagements.id, { onDelete: "cascade" }),
  findingId: text("finding_id"),
  title: text("title").notNull().default("Note"),
  bodyJson: text("body_json").notNull().default('{"type":"doc","content":[]}'),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const timelineEvents = sqliteTable(
  "timeline_events",
  {
    id: text("id").primaryKey(),
    engagementId: text("engagement_id")
      .notNull()
      .references(() => engagements.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    message: text("message").notNull(),
    refType: text("ref_type"),
    refId: text("ref_id"),
    createdAt: integer("created_at").notNull(),
  },
  (t) => [index("timeline_engagement_created_idx").on(t.engagementId, t.createdAt)],
);

export const checklistItems = sqliteTable(
  "checklist_items",
  {
    id: text("id").primaryKey(),
    engagementId: text("engagement_id")
      .notNull()
      .references(() => engagements.id, { onDelete: "cascade" }),
    itemKey: text("item_key").notNull(),
    label: text("label").notNull(),
    phase: text("phase").notNull().default(""),
    done: integer("done").notNull().default(0),
    updatedAt: integer("updated_at").notNull(),
  },
  (t) => [uniqueIndex("checklist_engagement_key_uidx").on(t.engagementId, t.itemKey)],
);
