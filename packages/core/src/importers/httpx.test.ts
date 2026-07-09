import { describe, expect, it } from "vitest";
import { parseHttpx } from "./httpx.js";

const sample = `
{"url":"https://shop.lab.local","host":"shop.lab.local","status_code":200,"title":"Shop","tech":["nginx","React"]}
{"url":"https://api.lab.local","status_code":403,"webserver":"cloudflare"}
`.trim();

describe("httpx importer", () => {
  it("parses JSONL hosts", () => {
    const assets = parseHttpx(sample);
    expect(assets).toHaveLength(2);
    expect(assets[0].host).toBe("shop.lab.local");
    expect(assets[0].tech).toContain("nginx");
    expect(assets[1].statusCode).toBe(403);
  });
});
