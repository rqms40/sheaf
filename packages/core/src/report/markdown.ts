import type { Severity } from "../schemas.js";
import { SEVERITY_ORDER } from "../schemas.js";

type Engagement = {
  id: string;
  name: string;
  client: string | null;
  type: string;
  status: string;
  startAt: number | null;
  endAt: number | null;
  roeText?: string | null;
  notesText?: string | null;
};

type Finding = {
  title: string;
  severity: string;
  status: string;
  host: string | null;
  path: string | null;
  description: string | null;
  impact: string | null;
  remediation: string | null;
  cwe: string | null;
  cve: string | null;
  references?: string[];
  id: string;
};

type ScopeItem = {
  kind: string;
  value: string;
  isExclude: number;
};

type Evidence = {
  id: string;
  findingId: string | null;
  kind: string;
  contentText?: string | null;
  path?: string | null;
  meta?: Record<string, unknown>;
  /** When set, Markdown embeds the screenshot as a data-URI image */
  imageDataUri?: string | null;
  imageFilename?: string | null;
};

type Asset = {
  host: string;
  ports?: Array<{ port: number; protocol: string; service?: string; state?: string }>;
};

type Run = {
  tool: string;
  label: string | null;
  sourcePath: string | null;
  createdAt: number;
  meta?: Record<string, unknown>;
};

function fmtDate(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toISOString().slice(0, 10);
}

function fmtDateTime(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC");
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
}

function escapeMdAlt(s: string): string {
  return s.replace(/[[\]]/g, "");
}

function severityLabel(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function statusLabel(s: string): string {
  return s.replaceAll("_", " ");
}

function buildExecutiveSummary(
  engagement: Engagement,
  findings: Finding[],
  bySev: Map<Severity, Finding[]>,
): string[] {
  const total = findings.length;
  const confirmed = findings.filter((f) => f.status === "confirmed").length;
  const needsReview = findings.filter((f) => f.status === "needs_review" || f.status === "draft").length;
  const critHigh =
    (bySev.get("critical")?.length ?? 0) + (bySev.get("high")?.length ?? 0);

  const lines: string[] = [];
  lines.push(
    `This report covers the **${engagement.type}** engagement **${engagement.name}**` +
      (engagement.client ? ` for **${engagement.client}**` : "") +
      `.`,
  );
  lines.push("");

  if (total === 0) {
    lines.push(
      "No findings were recorded in Sheaf for this engagement at export time. Confirm that imports and manual findings were completed before delivery.",
    );
    return lines;
  }

  lines.push(
    `Sheaf currently holds **${total}** finding${total === 1 ? "" : "s"}: **${critHigh}** critical/high, **${confirmed}** marked confirmed, and **${needsReview}** still in draft or needs review.`,
  );
  lines.push("");

  if (critHigh > 0) {
    lines.push(
      "Priority should focus on critical and high severity items first, especially any with status **confirmed**. Validate impact with the client environment before final risk scoring.",
    );
  } else {
    lines.push(
      "No critical or high severity findings are recorded. Review medium/low items for residual risk and false positives before closing the engagement.",
    );
  }
  lines.push("");
  lines.push(
    "_Analyst note: replace this generated summary with client-specific business context, attack narrative, and agreed priorities before delivery._",
  );
  return lines;
}

export function renderMarkdownReport(input: {
  engagement: Engagement;
  findings: Finding[];
  scope: ScopeItem[];
  evidence: Evidence[];
  assets?: Asset[];
  runs?: Run[];
}): string {
  const { engagement, findings, scope, evidence } = input;
  const assets = input.assets ?? [];
  const runs = input.runs ?? [];

  const bySev = new Map<Severity, Finding[]>();
  for (const s of SEVERITY_ORDER) bySev.set(s, []);
  for (const f of findings) {
    const sev = (
      SEVERITY_ORDER.includes(f.severity as Severity) ? f.severity : "info"
    ) as Severity;
    bySev.get(sev)!.push(f);
  }

  const generatedAt = Date.now();
  const lines: string[] = [];

  // Title block
  lines.push(`# ${engagement.name}`);
  lines.push("");
  lines.push(`> Local engagement export · generated ${fmtDateTime(generatedAt)}`);
  lines.push("");

  // Document control
  lines.push("## Document control");
  lines.push("");
  lines.push("| Field | Value |");
  lines.push("| --- | --- |");
  lines.push(`| Engagement | ${engagement.name} |`);
  lines.push(`| Client | ${engagement.client || "—"} |`);
  lines.push(`| Type | ${engagement.type} |`);
  lines.push(`| Status | ${statusLabel(engagement.status)} |`);
  lines.push(`| Window | ${fmtDate(engagement.startAt)} → ${fmtDate(engagement.endAt)} |`);
  lines.push(`| Engagement ID | \`${engagement.id}\` |`);
  lines.push(`| Generated | ${fmtDateTime(generatedAt)} |`);
  lines.push(`| Tool | Sheaf (local-first casefile) |`);
  lines.push("");

  // TOC
  lines.push("## Contents");
  lines.push("");
  lines.push("1. [Executive summary](#executive-summary)");
  lines.push("2. [Severity overview](#severity-overview)");
  lines.push("3. [Rules of engagement](#rules-of-engagement)");
  lines.push("4. [Scope](#scope)");
  if (assets.length) lines.push("5. [Assets](#assets)");
  if (runs.length) lines.push(`${assets.length ? "6" : "5"}. [Testing activity](#testing-activity)`);
  lines.push("- [Findings](#findings)");
  lines.push("- [Appendix: evidence index](#appendix-evidence-index)");
  lines.push("");

  // Executive summary
  lines.push("## Executive summary");
  lines.push("");
  lines.push(...buildExecutiveSummary(engagement, findings, bySev));
  lines.push("");

  // Severity overview table
  lines.push("## Severity overview");
  lines.push("");
  lines.push("| Severity | Count |");
  lines.push("| --- | ---: |");
  for (const s of SEVERITY_ORDER) {
    lines.push(`| ${severityLabel(s)} | ${bySev.get(s)!.length} |`);
  }
  lines.push(`| **Total** | **${findings.length}** |`);
  lines.push("");

  // Status breakdown
  const statusCounts = new Map<string, number>();
  for (const f of findings) {
    statusCounts.set(f.status, (statusCounts.get(f.status) ?? 0) + 1);
  }
  if (statusCounts.size) {
    lines.push("| Status | Count |");
    lines.push("| --- | ---: |");
    for (const [st, n] of [...statusCounts.entries()].sort((a, b) => b[1] - a[1])) {
      lines.push(`| ${statusLabel(st)} | ${n} |`);
    }
    lines.push("");
  }

  // Rules of engagement / ROE
  lines.push("## Rules of engagement");
  lines.push("");
  if (engagement.roeText?.trim()) {
    lines.push(engagement.roeText.trim());
    lines.push("");
  } else {
    lines.push(
      "_No rules of engagement notes were recorded in Sheaf. Paste ROE constraints (hours, excluded hosts, rate limits, notification rules) on the Scope page before delivery._",
    );
    lines.push("");
  }
  if (engagement.notesText?.trim()) {
    lines.push("### Engagement notes");
    lines.push("");
    lines.push(engagement.notesText.trim());
    lines.push("");
  }

  // Scope
  lines.push("## Scope");
  lines.push("");
  if (scope.length === 0) {
    lines.push("_No scope items were recorded in Sheaf._");
    lines.push("");
  } else {
    lines.push("| Direction | Kind | Value |");
    lines.push("| --- | --- | --- |");
    for (const s of scope) {
      lines.push(
        `| ${s.isExclude ? "Exclude" : "Include"} | ${s.kind} | \`${s.value}\` |`,
      );
    }
    lines.push("");
    lines.push(
      "_Scope entries are advisory records in the casefile and are not a substitute for the signed rules of engagement._",
    );
    lines.push("");
  }

  // Assets
  if (assets.length) {
    lines.push("## Assets");
    lines.push("");
    lines.push("| Host | Open services (sample) |");
    lines.push("| --- | --- |");
    for (const a of assets) {
      const ports = (a.ports ?? [])
        .filter((p) => !p.state || p.state === "open")
        .slice(0, 12)
        .map((p) => `${p.port}/${p.protocol}${p.service ? ` (${p.service})` : ""}`)
        .join(", ");
      lines.push(`| \`${a.host}\` | ${ports || "—"} |`);
    }
    lines.push("");
  }

  // Runs / activity
  if (runs.length) {
    lines.push("## Testing activity");
    lines.push("");
    lines.push("| When (UTC) | Tool | Label / source |");
    lines.push("| --- | --- | --- |");
    for (const r of runs) {
      const label = r.label || r.sourcePath || "—";
      lines.push(`| ${fmtDateTime(r.createdAt)} | ${r.tool} | ${label} |`);
    }
    lines.push("");
  }

  // Findings
  lines.push("## Findings");
  lines.push("");

  if (findings.length === 0) {
    lines.push("_No findings in this engagement._");
    lines.push("");
  } else {
    // Index
    lines.push("### Finding index");
    lines.push("");
    lines.push("| # | Severity | Status | Title | Host |");
    lines.push("| ---: | --- | --- | --- | --- |");
    let idx = 1;
    const numbered: Array<{ n: number; f: Finding }> = [];
    for (const sev of SEVERITY_ORDER) {
      for (const f of bySev.get(sev)!) {
        numbered.push({ n: idx, f });
        lines.push(
          `| ${idx} | ${f.severity} | ${statusLabel(f.status)} | [${f.title}](#finding-${idx}-${slugify(f.title)}) | ${f.host ? `\`${f.host}\`` : "—"} |`,
        );
        idx += 1;
      }
    }
    lines.push("");

    for (const { n, f } of numbered) {
      lines.push(`### Finding ${n}: ${f.title}`);
      lines.push("");
      lines.push(`<a id="finding-${n}-${slugify(f.title)}"></a>`);
      lines.push("");
      lines.push("| Attribute | Value |");
      lines.push("| --- | --- |");
      lines.push(`| Severity | **${f.severity}** |`);
      lines.push(`| Status | ${statusLabel(f.status)} |`);
      lines.push(`| Host | ${f.host ? `\`${f.host}\`` : "—"} |`);
      lines.push(`| Path / location | ${f.path ? `\`${f.path}\`` : "—"} |`);
      lines.push(`| CWE | ${f.cwe || "—"} |`);
      lines.push(`| CVE | ${f.cve || "—"} |`);
      lines.push(`| Finding ID | \`${f.id}\` |`);
      lines.push("");

      lines.push("#### Description");
      lines.push("");
      lines.push(f.description?.trim() || "_No description recorded._");
      lines.push("");

      lines.push("#### Impact");
      lines.push("");
      lines.push(f.impact?.trim() || "_No impact narrative recorded._");
      lines.push("");

      lines.push("#### Remediation");
      lines.push("");
      lines.push(f.remediation?.trim() || "_No remediation guidance recorded._");
      lines.push("");

      if (f.references?.length) {
        lines.push("#### References");
        lines.push("");
        for (const r of f.references) lines.push(`- ${r}`);
        lines.push("");
      }

      const ev = evidence.filter((e) => e.findingId === f.id);
      if (ev.length) {
        lines.push("#### Evidence");
        lines.push("");
        let imageN = 0;
        for (const e of ev) {
          const label =
            e.imageFilename ||
            (typeof e.meta?.originalName === "string" ? e.meta.originalName : null) ||
            e.kind;
          if (e.imageDataUri) {
            imageN += 1;
            lines.push(`**Figure ${n}.${imageN}** — ${label} (\`${e.kind}\`)`);
            lines.push("");
            // data URI so paper HTML / print preview renders without a separate asset server
            lines.push(`![${escapeMdAlt(label)}](${e.imageDataUri})`);
            lines.push("");
          } else if (e.contentText && e.contentText.length < 4000) {
            lines.push(`**${label}** (\`${e.kind}\`)`);
            lines.push("");
            lines.push("```http");
            lines.push(e.contentText.trim());
            lines.push("```");
            lines.push("");
          } else {
            lines.push(
              `- \`${e.id}\` (${e.kind}${e.path ? ` · \`${e.path}\`` : ""}) — file attached; not embedded in this export format.`,
            );
            lines.push("");
          }
        }
      }
    }
  }

  // Appendix
  lines.push("## Appendix: evidence index");
  lines.push("");
  if (evidence.length === 0) {
    lines.push("_No evidence records in this export._");
    lines.push("");
  } else {
    lines.push("| Evidence ID | Kind | Finding ID | Embedded image |");
    lines.push("| --- | --- | --- | --- |");
    for (const e of evidence) {
      lines.push(
        `| \`${e.id}\` | ${e.kind} | ${e.findingId ? `\`${e.findingId}\`` : "—"} | ${e.imageDataUri ? "yes" : "—"} |`,
      );
    }
    lines.push("");
  }

  lines.push("---");
  lines.push("");
  lines.push(
    "_Generated by **Sheaf** — local-first engagement casefile. Authorized testing only. Validate all findings before client delivery._",
  );
  lines.push("");
  return lines.join("\n");
}
