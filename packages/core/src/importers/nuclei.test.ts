import { describe, expect, it } from "vitest";
import { normalizeNucleiFile, parseNucleiPayload } from "./nuclei.js";
import { nucleiFingerprint } from "../fingerprint.js";

const sample = `
{"template-id":"http-missing-security-headers","info":{"name":"HTTP Missing Security Headers","severity":"info","description":"Missing headers"},"host":"https://example.com","matched-at":"https://example.com/","matcher-name":"x-frame-options"}
{"template-id":"cve-2021-44228","info":{"name":"Log4j RCE","severity":"critical","classification":{"cve-id":["CVE-2021-44228"],"cwe-id":["CWE-502"]},"reference":["https://nvd.nist.gov"]},"host":"app.lab.local","matched-at":"https://app.lab.local:443/api","request":"GET /api HTTP/1.1","response":"HTTP/1.1 200 OK"}
`.trim();

describe("nuclei importer", () => {
  it("parses JSONL", () => {
    const items = parseNucleiPayload(sample);
    expect(items).toHaveLength(2);
  });

  it("normalizes severity and fingerprint", () => {
    const findings = normalizeNucleiFile(sample);
    expect(findings[0].severity).toBe("info");
    expect(findings[1].severity).toBe("critical");
    expect(findings[1].cve).toBe("CVE-2021-44228");
    expect(findings[1].fingerprint).toContain("nuclei");
  });

  it("dedupes same fingerprint", () => {
    const a = nucleiFingerprint({
      templateId: "t1",
      host: "https://Example.com:443",
      matchedAt: "/x",
      matcherName: "m",
    });
    const b = nucleiFingerprint({
      templateId: "t1",
      host: "example.com",
      matchedAt: "/x",
      matcherName: "m",
    });
    expect(a).toBe(b);
  });
});
