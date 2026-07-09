import { describe, expect, it } from "vitest";
import {
  diffSnapshots,
  snapshotFromFinding,
  summarizeChanges,
} from "./revisions.js";

describe("finding revisions", () => {
  it("diffs field changes", () => {
    const before = snapshotFromFinding({
      title: "XSS",
      severity: "medium",
      status: "draft",
      description: "old",
    });
    const after = snapshotFromFinding({
      title: "Reflected XSS",
      severity: "high",
      status: "confirmed",
      description: "new detail",
    });
    const d = diffSnapshots(before, after);
    expect(d.title?.from).toBe("XSS");
    expect(d.title?.to).toBe("Reflected XSS");
    expect(d.severity?.to).toBe("high");
    expect(d.status?.to).toBe("confirmed");
    expect(d.description?.to).toBe("new detail");
    expect(d.host).toBeUndefined();
  });

  it("summarizes create and multi-field edit", () => {
    expect(summarizeChanges("create", {})).toBe("Finding created");
    const summary = summarizeChanges("edit", {
      status: { from: "draft", to: "confirmed" },
      severity: { from: "low", to: "high" },
    });
    expect(summary).toContain("status");
    expect(summary).toContain("severity");
  });

  it("treats empty create fields as no initial noise", () => {
    const after = snapshotFromFinding({
      title: "Only title",
      severity: "info",
      status: "draft",
    });
    const d = diffSnapshots(null, after);
    expect(d.title?.to).toBe("Only title");
    expect(d.severity?.to).toBe("info");
    // empty optionals omitted
    expect(d.description).toBeUndefined();
  });
});
