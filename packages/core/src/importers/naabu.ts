import { normalizeHost } from "../fingerprint.js";

export type NaabuAsset = {
  host: string;
  ports: Array<{
    port: number;
    protocol: string;
    state: string;
    service?: string;
  }>;
};

/**
 * ProjectDiscovery naabu JSON/JSONL.
 * Lines like: {"host":"scanme.nmap.org","ip":"45.33.32.156","port":80,"protocol":"tcp","timestamp":"..."}
 * or array of same.
 */
export function parseNaabu(raw: string): NaabuAsset[] {
  const text = raw.trim();
  if (!text) return [];

  const rows: Array<Record<string, unknown>> = [];
  if (text.startsWith("[")) {
    try {
      const arr = JSON.parse(text) as unknown;
      if (Array.isArray(arr)) {
        for (const item of arr) {
          if (item && typeof item === "object") rows.push(item as Record<string, unknown>);
        }
      }
    } catch {
      // fall through to JSONL
    }
  }
  if (!rows.length) {
    for (const line of text.split("\n")) {
      const t = line.trim();
      if (!t || !t.startsWith("{")) continue;
      try {
        rows.push(JSON.parse(t) as Record<string, unknown>);
      } catch {
        // skip bad line
      }
    }
  }

  const byHost = new Map<string, NaabuAsset>();
  for (const r of rows) {
    const host =
      normalizeHost(String(r.host ?? r.ip ?? r["host-ip"] ?? "")) ||
      String(r.ip ?? "").trim();
    if (!host) continue;
    const port = Number(r.port ?? r["port-number"] ?? 0);
    if (!port || Number.isNaN(port)) continue;
    const protocol = String(r.protocol ?? r.proto ?? "tcp").toLowerCase() || "tcp";
    let asset = byHost.get(host);
    if (!asset) {
      asset = { host, ports: [] };
      byHost.set(host, asset);
    }
    if (!asset.ports.some((p) => p.port === port && p.protocol === protocol)) {
      asset.ports.push({
        port,
        protocol,
        state: "open",
        service: r.service ? String(r.service) : undefined,
      });
    }
  }
  return [...byHost.values()];
}
