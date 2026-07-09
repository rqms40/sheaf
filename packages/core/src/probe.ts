import type { Workspace } from "./workspace.js";
import { getFinding, addEvidence, addTimeline } from "./services.js";
import { nowMs } from "./ids.js";

export type ProbeResult = {
  findingId: string;
  ok: boolean;
  statusCode?: number;
  error?: string;
  url?: string;
  durationMs: number;
};

/**
 * Safe re-validation: single non-destructive HTTP GET (or HEAD) against finding host+path.
 * No payloads, no auth bypass attempts — operator must ensure scope.
 */
export async function probeFinding(
  ws: Workspace,
  engagementId: string,
  findingId: string,
  opts?: { method?: "GET" | "HEAD"; timeoutMs?: number },
): Promise<ProbeResult> {
  const finding = getFinding(ws, engagementId, findingId);
  if (!finding) {
    return { findingId, ok: false, error: "Finding not found", durationMs: 0 };
  }
  if (!finding.host) {
    return { findingId, ok: false, error: "Finding has no host", durationMs: 0 };
  }

  const method = opts?.method ?? "GET";
  const timeoutMs = opts?.timeoutMs ?? 10_000;
  const pathPart = finding.path?.startsWith("/")
    ? finding.path
    : finding.path
      ? `/${finding.path}`
      : "/";
  // Prefer https; fall back attempted only if given path already absolute
  let url = pathPart.startsWith("http")
    ? pathPart
    : `https://${finding.host}${pathPart}`;

  const started = nowMs();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method,
      redirect: "manual",
      signal: controller.signal,
      headers: {
        "User-Agent": "Sheaf-SafeProbe/0.1 (+local engagement casefile)",
        Accept: "*/*",
      },
    });
    clearTimeout(timer);
    const durationMs = nowMs() - started;
    const snippet = [
      `=== SAFE PROBE ${method} ===`,
      `URL: ${url}`,
      `Status: ${res.status} ${res.statusText}`,
      `Date: ${new Date().toISOString()}`,
      `DurationMs: ${durationMs}`,
    ].join("\n");

    addEvidence(ws, engagementId, {
      findingId,
      kind: "http",
      contentText: snippet,
      meta: { probe: true, statusCode: res.status, url },
    });
    addTimeline(
      ws,
      engagementId,
      "other",
      `Safe probe ${method} ${url} → ${res.status}`,
      "finding",
      findingId,
    );

    return {
      findingId,
      ok: true,
      statusCode: res.status,
      url,
      durationMs,
    };
  } catch (e) {
    clearTimeout(timer);
    const durationMs = nowMs() - started;
    // retry http once if https failed
    if (url.startsWith("https://")) {
      try {
        return await probeFindingHttpFallback(
          ws,
          engagementId,
          findingId,
          url.replace("https://", "http://"),
          method,
          timeoutMs,
          started,
        );
      } catch {
        // fall through
      }
    }
    const err = e instanceof Error ? e.message : String(e);
    addTimeline(
      ws,
      engagementId,
      "other",
      `Safe probe failed for ${finding.title}: ${err}`.slice(0, 400),
      "finding",
      findingId,
    );
    return { findingId, ok: false, error: err, url, durationMs };
  }
}

async function probeFindingHttpFallback(
  ws: Workspace,
  engagementId: string,
  findingId: string,
  url: string,
  method: "GET" | "HEAD",
  timeoutMs: number,
  started: number,
): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const res = await fetch(url, {
    method,
    redirect: "manual",
    signal: controller.signal,
    headers: { "User-Agent": "Sheaf-SafeProbe/0.1" },
  });
  clearTimeout(timer);
  const durationMs = nowMs() - started;
  addEvidence(ws, engagementId, {
    findingId,
    kind: "http",
    contentText: `=== SAFE PROBE ${method} ===\nURL: ${url}\nStatus: ${res.status}\n`,
    meta: { probe: true, statusCode: res.status, url },
  });
  return { findingId, ok: true, statusCode: res.status, url, durationMs };
}
