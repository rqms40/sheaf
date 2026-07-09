import { hashFingerprint, mapNucleiSeverity, normalizeHost } from "../fingerprint.js";
import type { NormalizedFinding } from "./nuclei.js";

type FfufResult = {
  url?: string;
  input?: { FUZZ?: string; [k: string]: unknown };
  status?: number;
  length?: number;
  words?: number;
  lines?: number;
  content_type?: string;
  redirectlocation?: string;
  host?: string;
};

/**
 * Supports:
 * - ffuf -o out.json -of json (full object with results[])
 * - array of result objects
 * - JSONL of result objects
 */
export function parseFfufPayload(raw: string): FfufResult[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("{")) {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      if (Array.isArray(obj.results)) return obj.results as FfufResult[];
      if (obj.url || obj.status) return [obj as FfufResult];
    } catch {
      // JSONL objects
    }
  }

  if (trimmed.startsWith("[")) {
    const data = JSON.parse(trimmed);
    if (!Array.isArray(data)) throw new Error("ffuf JSON array expected");
    return data as FfufResult[];
  }

  const items: FfufResult[] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    const l = line.trim();
    if (!l) continue;
    items.push(JSON.parse(l) as FfufResult);
  }
  return items;
}

export function normalizeFfufResults(
  items: FfufResult[],
  opts?: { minStatus?: number; maxStatus?: number },
): NormalizedFinding[] {
  const min = opts?.minStatus ?? 200;
  const max = opts?.maxStatus ?? 399;
  const findings: NormalizedFinding[] = [];

  for (const item of items) {
    const status = item.status ?? 0;
    // Interesting: non-404 by default in range, or 401/403
    const interesting =
      (status >= min && status <= max) || status === 401 || status === 403;
    if (!interesting && status !== 200) {
      if (status === 404 || status === 0) continue;
    }

    const url = item.url || "";
    let host = item.host || "";
    let path = "";
    try {
      if (url) {
        const u = new URL(url);
        host = host || u.host;
        path = u.pathname + u.search;
      }
    } catch {
      path = url;
    }

    const fuzz = item.input?.FUZZ ? String(item.input.FUZZ) : path;
    const title = `Content discovery hit [${status}] ${path || fuzz}`;
    const severity =
      status === 200 || status === 301 || status === 302
        ? mapNucleiSeverity("info")
        : status === 401 || status === 403
          ? mapNucleiSeverity("low")
          : mapNucleiSeverity("info");

    findings.push({
      title,
      severity,
      host: normalizeHost(host) || host || null,
      path: path || null,
      description: `ffuf discovered \`${path || url}\` with HTTP ${status}${
        item.content_type ? ` (${item.content_type})` : ""
      }. Length=${item.length ?? "?"} words=${item.words ?? "?"}.`,
      impact:
        "Exposed paths may reveal admin panels, backups, or debug endpoints. Validate authorization and sensitivity before reporting.",
      remediation:
        "Remove unnecessary content, enforce authz, and monitor for sensitive path exposure.",
      cwe: "CWE-200",
      cve: null,
      references: [],
      fingerprint: hashFingerprint([
        "ffuf",
        normalizeHost(host),
        path || url,
        String(status),
      ]),
      raw: item,
    });
  }

  return findings;
}

export function normalizeFfufFile(raw: string): NormalizedFinding[] {
  return normalizeFfufResults(parseFfufPayload(raw));
}
