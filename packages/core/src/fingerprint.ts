import { createHash } from "node:crypto";
import type { Severity } from "./schemas.js";

export function normalizeHost(host: string | null | undefined): string {
  if (!host) return "";
  let h = host.trim().toLowerCase();
  // strip scheme
  h = h.replace(/^https?:\/\//, "");
  // strip path
  h = h.split("/")[0] ?? h;
  // strip default ports
  h = h.replace(/:443$/, "").replace(/:80$/, "");
  return h;
}

export function hashFingerprint(parts: string[]): string {
  const raw = parts.map((p) => p ?? "").join("|");
  if (raw.length <= 240) return raw;
  return createHash("sha256").update(raw).digest("hex");
}

export function nucleiFingerprint(input: {
  templateId: string;
  host: string;
  matchedAt?: string;
  matcherName?: string;
}): string {
  const host = normalizeHost(input.host);
  const pathPart = input.matchedAt ?? "";
  const matcher = input.matcherName ?? "";
  return hashFingerprint(["nuclei", input.templateId, host, pathPart, matcher]);
}

export function manualFingerprint(input: {
  title: string;
  host?: string | null;
  path?: string | null;
  id: string;
}): string {
  return hashFingerprint([
    "manual",
    input.id,
    normalizeHost(input.host),
    input.path ?? "",
    input.title,
  ]);
}

export function mapNucleiSeverity(sev: string | undefined): Severity {
  const s = (sev ?? "info").toLowerCase();
  if (s === "critical" || s === "high" || s === "medium" || s === "low" || s === "info") {
    return s;
  }
  if (s === "unknown") return "info";
  return "info";
}
