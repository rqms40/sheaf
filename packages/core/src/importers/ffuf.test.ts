import { describe, expect, it } from "vitest";
import { normalizeFfufFile, parseFfufPayload } from "./ffuf.js";

const sample = JSON.stringify({
  results: [
    {
      url: "https://shop.lab.local/admin",
      status: 200,
      length: 1200,
      words: 40,
      host: "shop.lab.local",
    },
    {
      url: "https://shop.lab.local/missing",
      status: 404,
      length: 20,
    },
  ],
});

describe("ffuf importer", () => {
  it("parses results array", () => {
    expect(parseFfufPayload(sample)).toHaveLength(2);
  });

  it("normalizes interesting hits", () => {
    const findings = normalizeFfufFile(sample);
    expect(findings.some((f) => f.path?.includes("/admin"))).toBe(true);
    expect(findings.every((f) => f.fingerprint.startsWith("ffuf"))).toBe(true);
  });
});
