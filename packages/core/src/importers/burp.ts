import { XMLParser } from "fast-xml-parser";
import { hashFingerprint, mapNucleiSeverity, normalizeHost } from "../fingerprint.js";
import type { NormalizedFinding } from "./nuclei.js";

function ensureArray<T>(v: T | T[] | undefined | null): T[] {
  if (v == null) return [];
  return Array.isArray(v) ? v : [v];
}

function decodeMaybeBase64(s: string | undefined, isBase64?: string | boolean): string | null {
  if (!s) return null;
  const flag = isBase64 === true || isBase64 === "true";
  if (!flag) return s;
  try {
    return Buffer.from(s, "base64").toString("utf8");
  } catch {
    return s;
  }
}

/** Burp XML nodes may be strings or `{ "#text": "...", "@_…": ... }`. */
function xmlText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (typeof node === "object") {
    const o = node as Record<string, unknown>;
    if (o["#text"] != null) return String(o["#text"]);
    if (o["#cdata"] != null) return String(o["#cdata"]);
  }
  return "";
}

/**
 * Burp Suite issue XML export (Scanner / selected issues).
 * Maps to draft findings with optional HTTP evidence.
 */
export function parseBurpIssuesXml(raw: string): Array<
  NormalizedFinding & { request?: string | null; response?: string | null }
> {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: "@_",
    trimValues: false,
  });
  const doc = parser.parse(raw) as Record<string, unknown>;
  const issuesRoot = (doc.issues ?? doc) as Record<string, unknown>;
  const issues = ensureArray(
    (issuesRoot.issue ?? (doc as { issue?: unknown }).issue) as
      | Record<string, unknown>
      | Record<string, unknown>[],
  );

  const out: Array<NormalizedFinding & { request?: string | null; response?: string | null }> =
    [];

  for (const issue of issues) {
    if (!issue || typeof issue !== "object") continue;
    const name = xmlText(issue.name) || "Burp finding";
    const severityRaw = (xmlText(issue.severity) || "Information").toLowerCase();
    const severity = mapNucleiSeverity(
      severityRaw === "information"
        ? "info"
        : severityRaw === "false positive"
          ? "info"
          : severityRaw,
    );
    const hostRaw = xmlText(issue.host) || xmlText(issue.ip);
    const host = normalizeHost(hostRaw) || null;
    const path = xmlText(issue.path) || null;
    const location = xmlText(issue.location) || path;
    const background = xmlText(issue.issueBackground);
    const issueDetail = xmlText(issue.issueDetail);
    const detail = [issueDetail, background].filter(Boolean).join("\n\n");
    const remediation =
      xmlText(issue.remediationBackground) ||
      xmlText(issue.remediationDetail) ||
      null;

    const reqNode = issue.requestresponse as Record<string, unknown> | undefined;
    const request = decodeMaybeBase64(
      reqNode?.request ? String(reqNode.request) : undefined,
      (reqNode?.request as { "@_base64"?: string })?.["@_base64"] ??
        (typeof reqNode?.request === "object"
          ? (reqNode.request as { "@_base64"?: string })["@_base64"]
          : undefined),
    );
    // Burp often nests request as object with #text
    let reqText = request;
    let resText: string | null = null;
    if (reqNode) {
      const r = reqNode.request as Record<string, unknown> | string | undefined;
      const s = reqNode.response as Record<string, unknown> | string | undefined;
      if (typeof r === "object" && r) {
        reqText = decodeMaybeBase64(
          String(r["#text"] ?? r),
          r["@_base64"] as string | undefined,
        );
      } else if (typeof r === "string") {
        reqText = r;
      }
      if (typeof s === "object" && s) {
        resText = decodeMaybeBase64(
          String(s["#text"] ?? s),
          s["@_base64"] as string | undefined,
        );
      } else if (typeof s === "string") {
        resText = s;
      }
    }

    // Multiple requestresponse nodes
    const rrs = ensureArray(issue.requestresponse as Record<string, unknown>[]);
    if (rrs.length && !reqText) {
      const first = rrs[0];
      const r = first?.request as Record<string, unknown> | string | undefined;
      const s = first?.response as Record<string, unknown> | string | undefined;
      if (typeof r === "object" && r) {
        reqText = decodeMaybeBase64(String(r["#text"] ?? ""), r["@_base64"] as string);
      }
      if (typeof s === "object" && s) {
        resText = decodeMaybeBase64(String(s["#text"] ?? ""), s["@_base64"] as string);
      }
    }

    const confidence = xmlText(issue.confidence);
    out.push({
      title: name,
      severity,
      host,
      path: location,
      description: detail || (confidence ? `Confidence: ${confidence}` : ""),
      impact: background ? background.slice(0, 2000) : null,
      remediation,
      cwe: null,
      cve: xmlText(issue.vulnerabilityClassifications).slice(0, 200) || null,
      references: xmlText(issue.references) ? [xmlText(issue.references)] : [],
      fingerprint: hashFingerprint([
        "burp",
        xmlText(issue.serialNumber) || name,
        host ?? "",
        location ?? "",
      ]),
      raw: issue,
      request: reqText,
      response: resText,
    });
  }

  return out;
}
