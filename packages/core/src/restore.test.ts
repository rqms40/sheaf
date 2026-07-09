import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createEngagement,
  createFinding,
  getFinding,
  listFindingHistory,
  openWorkspace,
  restoreFindingRevision,
  updateFinding,
} from "./index.js";
import type { Workspace } from "./workspace.js";

const dirs: string[] = [];

afterEach(() => {
  for (const d of dirs) {
    try {
      fs.rmSync(d, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }
  dirs.length = 0;
});

function tmpWs(): Workspace {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "sheaf-restore-"));
  dirs.push(dir);
  return openWorkspace(dir);
}

describe("restoreFindingRevision", () => {
  it("restores title/description/severity and appends restore revision", () => {
    const ws = tmpWs();
    const eng = createEngagement(ws, { name: "r", type: "web" });
    const f = createFinding(ws, eng.id, {
      title: "Alpha",
      severity: "low",
      status: "draft",
      description: "v1",
      host: "a.example",
    });
    updateFinding(ws, eng.id, f.id, {
      title: "Beta",
      severity: "critical",
      status: "confirmed",
      description: "v2",
      host: "b.example",
    });

    const hist = listFindingHistory(ws, eng.id, f.id)!;
    expect(hist.length).toBeGreaterThanOrEqual(2);
    const rev1 = hist.find((h) => h.revision === 1)!;
    expect(rev1.snapshot.title).toBe("Alpha");

    const restored = restoreFindingRevision(ws, eng.id, f.id, rev1.id);
    expect(restored).toBeTruthy();
    expect(restored!.title).toBe("Alpha");
    expect(restored!.description).toBe("v1");
    expect(restored!.severity).toBe("low");
    expect(restored!.status).toBe("draft");
    expect(restored!.host).toBe("a.example");

    const cur = getFinding(ws, eng.id, f.id)!;
    expect(cur.title).toBe("Alpha");
    expect(cur.description).toBe("v1");

    const after = listFindingHistory(ws, eng.id, f.id)!;
    expect(after[0].source).toBe("restore");
    expect(after[0].snapshot.title).toBe("Alpha");
  });

  it("restores null host/path from snapshot", () => {
    const ws = tmpWs();
    const eng = createEngagement(ws, { name: "r2", type: "web" });
    const f = createFinding(ws, eng.id, {
      title: "X",
      severity: "medium",
      status: "draft",
      description: "d",
    });
    updateFinding(ws, eng.id, f.id, { host: "host.lab", path: "/x" });
    const hist = listFindingHistory(ws, eng.id, f.id)!;
    const base = hist.find((h) => h.revision === 1)!;
    const restored = restoreFindingRevision(ws, eng.id, f.id, base.id)!;
    expect(restored.host).toBeNull();
    expect(restored.path).toBeNull();
  });
});
