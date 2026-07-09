import { mapNucleiSeverity, nucleiFingerprint, normalizeHost } from "../fingerprint.js";
import type { Severity } from "../schemas.js";

export type NormalizedFinding = {
  title: string;
  severity: Severity;
  host: string | null;
  path: string | null;
  description: string | null;
  impact: string | null;
  remediation: string | null;
  cwe: string | null;
  cve: string | null;
  references: string[];
  fingerprint: string;
  raw: unknown;
  request?: string | null;
  response?: string | null;
};

type NucleiInfo = {
  name?: string;
  description?: string;
  severity?: string;
  remediation?: string;
  reference?: string[] | string;
  classification?: {
    "cwe-id"?: string[] | string;
    "cve-id"?: string[] | string;
  };
  tags?: string[] | string;
};

export type NucleiResult = {
  "template-id"?: string;
  templateID?: string;
  template?: string;
  info?: NucleiInfo;
  host?: string;
  matched?: string;
  "matched-at"?: string;
  "matcher-name"?: string;
  type?: string;
  ip?: string;
  timestamp?: string;
  request?: string;
  response?: string;
  curl?: string;
  [key: string]: unknown;
};

function asArray(v: string[] | string | undefined): string[] {
  if (!v) return [];
  return Array.isArray(v) ? v : [v];
}

function extractPath(matchedAt: string | undefined, host: string | undefined): string | null {
  if (!matchedAt) return null;
  try {
    if (matchedAt.startsWith("http")) {
      const u = new URL(matchedAt);
      return u.pathname + u.search;
    }
  } catch {
    // fall through
  }
  if (host && matchedAt.includes(host)) {
    const idx = matchedAt.indexOf(host) + host.length;
    return matchedAt.slice(idx) || null;
  }
  return matchedAt;
}

export function parseNucleiPayload(raw: string): NucleiResult[] {
  const trimmed = raw.trim();
  if (!trimmed) return [];

  // JSON array
  if (trimmed.startsWith("[")) {
    const data = JSON.parse(trimmed) as unknown;
    if (!Array.isArray(data)) throw new Error("nuclei JSON root must be an array");
    return data as NucleiResult[];
  }

  // Single JSON object
  if (trimmed.startsWith("{") && !trimmed.includes("\n{")) {
    try {
      return [JSON.parse(trimmed) as NucleiResult];
    } catch {
      // maybe JSONL that starts with {
    }
  }

  // JSONL
  const items: NucleiResult[] = [];
  for (const line of trimmed.split(/\r?\n/)) {
    const l = line.trim();
    if (!l) continue;
    items.push(JSON.parse(l) as NucleiResult);
  }
  return items;
}

export function normalizeNucleiResult(item: NucleiResult): NormalizedFinding {
  const templateId =
    item["template-id"] || item.templateID || item.template || "unknown-template";
  const hostRaw = item.host || item.ip || "";
  const matchedAt = item["matched-at"] || item.matched || "";
  const matcherName = item["matcher-name"] || "";
  const info = item.info ?? {};
  const title = info.name || String(templateId);
  const refs = asArray(info.reference);
  const cweList = asArray(info.classification?.["cwe-id"]);
  const cveList = asArray(info.classification?.["cve-id"]);

  const host = normalizeHost(hostRaw) || null;
  const path = extractPath(matchedAt || undefined, hostRaw || undefined);

  return {
    title,
    severity: mapNucleiSeverity(info.severity),
    host,
    path,
    description: info.description ?? null,
    impact: null,
    remediation: info.remediation ?? null,
    cwe: cweList[0] ?? null,
    cve: cveList[0] ?? null,
    references: refs,
    fingerprint: nucleiFingerprint({
      templateId: String(templateId),
      host: hostRaw,
      matchedAt: matchedAt || undefined,
      matcherName: matcherName || undefined,
    }),
    raw: item,
    request: item.request ?? item.curl ?? null,
    response: item.response ?? null,
  };
}

export function normalizeNucleiFile(raw: string): NormalizedFinding[] {
  return parseNucleiPayload(raw).map(normalizeNucleiResult);
}
