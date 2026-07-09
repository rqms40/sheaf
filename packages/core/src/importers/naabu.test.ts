import { describe, expect, it } from "vitest";
import { parseNaabu } from "./naabu.js";

const sample = `{"host":"scanme.nmap.org","ip":"45.33.32.156","port":22,"protocol":"tcp"}
{"host":"scanme.nmap.org","ip":"45.33.32.156","port":80,"protocol":"tcp"}
{"host":"example.com","ip":"93.184.216.34","port":443,"protocol":"tcp"}
`;

describe("naabu importer", () => {
  it("groups ports by host from JSONL", () => {
    const assets = parseNaabu(sample);
    expect(assets).toHaveLength(2);
    const scanme = assets.find((a) => a.host.includes("scanme"));
    expect(scanme?.ports.map((p) => p.port).sort()).toEqual([22, 80]);
  });

  it("parses JSON array", () => {
    const assets = parseNaabu(
      JSON.stringify([{ host: "a.test", port: 8080, protocol: "tcp" }]),
    );
    expect(assets).toHaveLength(1);
    expect(assets[0].ports[0].port).toBe(8080);
  });
});
