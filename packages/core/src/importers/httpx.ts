import { normalizeHost } from "../fingerprint.js";

export type HttpxAsset = {
  host: string;
  url?: string;
  statusCode?: number;
  title?: string;
  tech?: string[];
  webserver?: string;
  raw: unknown;
};

function parseItems(raw: string): unknown[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];
  if (trimmed.startsWith("[")) {
    const data = JSON.parse(trimmed);
    if (!Array.isArray(data)) throw new Error("httpx JSON root must be an array");
    return data;
  }
  const items: unknown[] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    const l = line.trim();
    if (!l) continue;
    items.push(JSON.parse(l));
  }
  return items;
}

export function parseHttpx(raw: string): HttpxAsset[] {
  return parseItems(raw).map((item) => {
    const o = item as Record<string, unknown>;
    const url = String(o.url || o.input || "");
    let host = String(o.host || o["final-url"] || "");
    if (!host && url) {
      try {
        host = new URL(url.startsWith("http") ? url : `https://${url}`).host;
      } catch {
        host = url;
      }
    }
    const tech = o.tech || o.technologies;
    return {
      host: normalizeHost(host) || host || "unknown",
      url: url || undefined,
      statusCode: typeof o.status_code === "number" ? o.status_code : undefined,
      title: o.title ? String(o.title) : undefined,
      tech: Array.isArray(tech) ? tech.map(String) : undefined,
      webserver: o.webserver ? String(o.webserver) : undefined,
      raw: item,
    };
  });
}
