import fs from "node:fs";
import path from "node:path";
import { openDb, migrate, type SheafDb } from "./db/client.js";
import type Database from "better-sqlite3";

export const SHEAF_DIR = ".sheaf";
export const DB_FILE = "sheaf.db";

export type Workspace = {
  root: string;
  sheafDir: string;
  dbPath: string;
  evidenceDir: string;
  sqlite: Database.Database;
  db: SheafDb;
};

export function resolveWorkspaceRoot(cwd = process.cwd()): string {
  return path.resolve(cwd);
}

export function getSheafPaths(root: string) {
  const sheafDir = path.join(root, SHEAF_DIR);
  return {
    sheafDir,
    dbPath: path.join(sheafDir, DB_FILE),
    evidenceDir: path.join(sheafDir, "evidence"),
    configPath: path.join(sheafDir, "config.json"),
  };
}

export function initWorkspace(root = process.cwd()): Workspace {
  const resolved = resolveWorkspaceRoot(root);
  const paths = getSheafPaths(resolved);
  fs.mkdirSync(paths.sheafDir, { recursive: true, mode: 0o700 });
  fs.mkdirSync(paths.evidenceDir, { recursive: true, mode: 0o700 });

  if (!fs.existsSync(paths.configPath)) {
    fs.writeFileSync(
      paths.configPath,
      JSON.stringify({ version: 1, createdAt: Date.now() }, null, 2),
      { mode: 0o600 },
    );
  }

  const { sqlite, db } = openDb(paths.dbPath);
  migrate(sqlite);

  return {
    root: resolved,
    sheafDir: paths.sheafDir,
    dbPath: paths.dbPath,
    evidenceDir: paths.evidenceDir,
    sqlite,
    db,
  };
}

export function openWorkspace(root = process.cwd()): Workspace {
  const resolved = resolveWorkspaceRoot(root);
  const paths = getSheafPaths(resolved);
  if (!fs.existsSync(paths.dbPath)) {
    return initWorkspace(resolved);
  }
  fs.mkdirSync(paths.evidenceDir, { recursive: true, mode: 0o700 });
  const { sqlite, db } = openDb(paths.dbPath);
  migrate(sqlite);
  return {
    root: resolved,
    sheafDir: paths.sheafDir,
    dbPath: paths.dbPath,
    evidenceDir: paths.evidenceDir,
    sqlite,
    db,
  };
}

export function evidencePathFor(ws: Workspace, engagementId: string, filename: string): string {
  const dir = path.join(ws.evidenceDir, engagementId);
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const safe = filename.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 180);
  return path.join(dir, safe);
}
