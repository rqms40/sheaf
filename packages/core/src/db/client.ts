import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema.js";

export type SheafDb = BetterSQLite3Database<typeof schema>;

export function openDb(dbPath: string): { sqlite: Database.Database; db: SheafDb } {
  const sqlite = new Database(dbPath);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  return { sqlite, db };
}

export function migrate(sqlite: Database.Database): void {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS engagements (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client TEXT,
      type TEXT NOT NULL DEFAULT 'web',
      status TEXT NOT NULL DEFAULT 'active',
      start_at INTEGER,
      end_at INTEGER,
      roe_text TEXT,
      notes_text TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS scope_items (
      id TEXT PRIMARY KEY,
      engagement_id TEXT NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      value TEXT NOT NULL,
      is_exclude INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS scope_engagement_idx ON scope_items(engagement_id);

    CREATE TABLE IF NOT EXISTS assets (
      id TEXT PRIMARY KEY,
      engagement_id TEXT NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      host TEXT NOT NULL,
      ports_json TEXT NOT NULL DEFAULT '[]',
      tags_json TEXT NOT NULL DEFAULT '[]',
      source_run_id TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS assets_engagement_host_uidx ON assets(engagement_id, host);

    CREATE TABLE IF NOT EXISTS runs (
      id TEXT PRIMARY KEY,
      engagement_id TEXT NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      tool TEXT NOT NULL,
      label TEXT,
      source_path TEXT,
      started_at INTEGER NOT NULL,
      finished_at INTEGER,
      meta_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS findings (
      id TEXT PRIMARY KEY,
      engagement_id TEXT NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      run_id TEXT,
      title TEXT NOT NULL,
      severity TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'needs_review',
      host TEXT,
      path TEXT,
      description TEXT,
      impact TEXT,
      remediation TEXT,
      cwe TEXT,
      cve TEXT,
      references_json TEXT NOT NULL DEFAULT '[]',
      fingerprint TEXT NOT NULL,
      raw_json TEXT,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS findings_engagement_fp_uidx ON findings(engagement_id, fingerprint);
    CREATE INDEX IF NOT EXISTS findings_severity_idx ON findings(engagement_id, severity);
    CREATE INDEX IF NOT EXISTS findings_status_idx ON findings(engagement_id, status);

    CREATE TABLE IF NOT EXISTS evidence (
      id TEXT PRIMARY KEY,
      engagement_id TEXT NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      finding_id TEXT,
      kind TEXT NOT NULL DEFAULT 'http',
      path TEXT,
      content_text TEXT,
      meta_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      engagement_id TEXT NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      finding_id TEXT,
      title TEXT NOT NULL DEFAULT 'Note',
      body_json TEXT NOT NULL DEFAULT '{"type":"doc","content":[]}',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS timeline_events (
      id TEXT PRIMARY KEY,
      engagement_id TEXT NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      kind TEXT NOT NULL,
      message TEXT NOT NULL,
      ref_type TEXT,
      ref_id TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS timeline_engagement_created_idx ON timeline_events(engagement_id, created_at);

    CREATE TABLE IF NOT EXISTS checklist_items (
      id TEXT PRIMARY KEY,
      engagement_id TEXT NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      item_key TEXT NOT NULL,
      label TEXT NOT NULL,
      phase TEXT NOT NULL DEFAULT '',
      done INTEGER NOT NULL DEFAULT 0,
      updated_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS checklist_engagement_key_uidx
      ON checklist_items(engagement_id, item_key);

    CREATE TABLE IF NOT EXISTS finding_revisions (
      id TEXT PRIMARY KEY,
      engagement_id TEXT NOT NULL REFERENCES engagements(id) ON DELETE CASCADE,
      finding_id TEXT NOT NULL REFERENCES findings(id) ON DELETE CASCADE,
      revision INTEGER NOT NULL,
      source TEXT NOT NULL DEFAULT 'edit',
      summary TEXT NOT NULL,
      snapshot_json TEXT NOT NULL,
      changes_json TEXT NOT NULL DEFAULT '{}',
      created_at INTEGER NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS finding_revisions_finding_rev_uidx
      ON finding_revisions(finding_id, revision);
    CREATE INDEX IF NOT EXISTS finding_revisions_finding_created_idx
      ON finding_revisions(finding_id, created_at);
    CREATE INDEX IF NOT EXISTS finding_revisions_engagement_idx
      ON finding_revisions(engagement_id);
  `);

  // Additive columns for older workspaces (SQLite ignores if already present via try/catch)
  const alters = [
    "ALTER TABLE engagements ADD COLUMN roe_text TEXT",
    "ALTER TABLE engagements ADD COLUMN notes_text TEXT",
  ];
  for (const sql of alters) {
    try {
      sqlite.exec(sql);
    } catch {
      // column exists
    }
  }
}
