# Engagement OS research brief — Sheaf

**Audience:** Sheaf maintainers and operators building a local-first engagement casefile.  
**Scope:** Product definition, integration posture, web console risk, backlog, report quality.  
**Framing:** Authorized assessments only. Client data stays on the operator’s disk. No cloud requirement.

Related: [competitive-research.md](./competitive-research.md), [data-model.md](./data-model.md), [ROADMAP.md](./ROADMAP.md).

---

## 1. What a proper Engagement OS needs

### 1.1 Lifecycle (not just findings)

A usable engagement OS tracks the **full authorized engagement arc**, not only vulnerability rows:

| Stage | Operator need | Casefile artifact |
|-------|---------------|-------------------|
| **Engagement** | Time-boxed assessment identity (client, type, window, status) | `engagements` |
| **Scope / ROE** | Include/exclude targets; constraints, windows, out-of-scope notes | `scope_items` + ROE narrative (report + notes) |
| **Assets** | Hosts, ports, services derived from scope + recon | `assets` |
| **Activity** | What was run/imported when; methodology progress | `runs`, checklist, timeline |
| **Evidence** | Proof that survives re-open and audit | `evidence` + files under workspace |
| **Findings** | Statused issues with narrative, severity, dedupe | `findings` + fingerprint |
| **Report** | Client-ready export with control sections | Markdown / DOCX / package |

**Flow:**

```text
Engagement → Scope/ROE → Assets → Activity → Evidence → Findings → Report
     ↑______________ triage / retest / status changes _______________|
```

Without Scope/ROE and Activity, tools become **finding dumps**. Without Evidence linked to status, reports are untrusted. Without Report export that respects status filters (e.g. confirmed-only), triage work is wasted.

### 1.2 Pure finding trackers vs engagement casefiles

Industry tools cluster into report-centric and platform-heavy categories. Sheaf should not imitate either blindly.

| Category | Examples | Strength | Structural gap for laptop solo / small team |
|----------|----------|----------|-----------------------------------------------|
| **Report-first generators** | PwnDoc / PwnDoc-ng, SysReptor-class tools | Strong DOCX/templates, finding writeups | Weak live ops: timeline, import-native recon, asset graph, ROE as first-class |
| **Collaboration / issue libraries** | Dradis (CE/Pro) | Issue reuse, many scanner plugins (esp. Pro) | Ruby/ops weight; CE vs Pro split; UX often feels framework-era |
| **Red team ops platforms** | Ghostwriter | Clients, infrastructure, C2-adjacent ops, Jinja exports | Django deploy; overkill for web/network casefile; weak ProjectDiscovery-native import path |
| **Vulnerability aggregation / multi-tool IEM** | Faraday | Multi-tool correlation, workspace model | Heavier service footprint; less “portable folder casefile” |
| **Enterprise lifecycle / PTaaS** | PlexTrac, AttackForge-class | Remediation workflows, multi-tenant polish | Cost, cloud/enterprise gravity; not offline-local by default |
| **Command + document platforms** | Reconmap-class | Can run commands and store results | Microservices complexity for solo use |

**Recurring practitioner pains these categories leave open:**

1. Tool output sprawl (JSONL/XML in random dirs).
2. Findings without linked proof or status workflow.
3. Report writing tax (large share of engagement time).
4. Heavy platforms for a single laptop engagement.
5. Client data control and offline work.
6. Modern recon stack (nuclei, httpx, ffuf, nmap) treated as second-class vs legacy scanner plugins.

### 1.3 Differentiation for local-first authorized work

**Sheaf wedge:** local engagement **casefile** between scanners and the client report.

```text
[nuclei | nmap | httpx | ffuf | Burp export | manual | PATH runners]
                         ↓ import / capture
                   SHEAF workspace (.sheaf/)
            scope · assets · runs · evidence · findings · timeline
                         ↓ export
              structured Markdown · DOCX · JSON package
```

| Dimension | Sheaf choice |
|-----------|--------------|
| Weight | Single process + SQLite + files |
| Center of gravity | Import → triage → evidence → report |
| Tool fluency | ProjectDiscovery + nmap (+ optional Burp XML) |
| Deploy | Loopback web UI + CLI; portable `./.sheaf/` |
| Collab | Solo/small team; no multi-tenant SaaS |
| Security model | `127.0.0.1` default; no required cloud; authorized targets only |

**Not competing with:** nmap, nuclei, Metasploit, Burp Suite, C2 frameworks.  
**Competing with:** ad-hoc folders + Word, and lightweight use of report-only tools when the operator also needs live triage.

**Explicit non-goals:** multi-tenant SaaS, built-in vuln engine, real-time multiplayer editing, C2 operator logging, network-exposed shell.

---

## 2. Integrations strategy

### 2.1 Prefer file import over SaaS APIs

Authorized engagements already produce local tool output. File importers are:

- **Offline-capable** and air-gap friendly  
- **Deterministic** (fixtures + unit tests)  
- **Low privilege** (no third-party OAuth or vendor cloud)  
- **Auditable** (raw retained; fingerprint for dedupe)

| Tool | Preferred format | Primary normalize into |
|------|------------------|------------------------|
| **nuclei** | JSONL / JSON | Findings (+ host/path) |
| **nmap** | XML (`-oX`) | Assets (ports/services); optional service notes |
| **httpx** | JSONL / JSON | Assets / live hosts; optional findings |
| **ffuf** | JSON (`-of json`) | Findings or path inventory (policy: interesting status codes) |
| **Burp** | Issues XML export | Findings + HTTP evidence seeds |

**Import contract (invariant):**

1. Create a **Run** (tool, label, source path, meta).  
2. Parse → normalize → **fingerprint** → upsert finding/asset.  
3. Append **timeline** event.  
4. Keep raw tool item when useful (`raw_json` / evidence).

SaaS scanner APIs (cloud vuln platforms, ticket systems) are optional later, never required for core value.

### 2.2 Optional PATH tool runners

`sheaf run` / UI “spawn tool on PATH” is a convenience layer **on top of** import:

- Resolve binary via `PATH` only (no bundled exploit payloads).  
- Capture stdout/stderr and canonical output file (`-jsonl`, `-oX`, etc.).  
- Auto-import into the engagement.  
- Record timeline + run metadata.

Operators remain responsible for **scope and authorization**. Runners must not imply “scan anything reachable.”

### 2.3 Evidence capture

| Kind | Source | Storage |
|------|--------|---------|
| HTTP request/response | Paste, Burp export, probe | Inline text and/or file under `evidence/<engagement_id>/` |
| Screenshot / file | Upload or drop | Filesystem blob + DB row |
| Tool raw | Import side-effect | Path or `raw_json` |
| Safe re-check | Non-destructive GET/HEAD probe | New evidence + timeline |

Evidence must attach to findings (and optionally engagement-only). Report export should index evidence without dumping secrets by default when filters exist.

---

## 3. Website terminal research

### 3.1 Is an embedded terminal in a local web UI good?

**Conditional yes** for a local Engagement OS — if treated as **host shell capability**, not a toy widget.

| Pros | Cons |
|------|------|
| Keeps ops log next to casefile (less context switch) | **XSS ≈ RCE** if browser can spawn shell |
| Streams tool output into engagement narrative | Full PTY is complex (resize, signals, raw mode, multi-session) |
| Aligns with “activity belongs in the casefile” | Accidental network bind exposes shell to LAN |

### 3.2 Risk model (non-negotiable)

1. **Any XSS in the web UI that can call the console API is local RCE** under the Sheaf process user.  
2. **Bind `127.0.0.1` only** by default; warn loudly on `0.0.0.0` / LAN bind.  
3. Prefer **job console** first: `bash -lc <command>` with streamed stdout/stderr, kill handle, no full interactive TTY.  
4. **Never** expose console/run endpoints on a shared network without strong auth (v1: do not expose).  
5. Log console commands to the engagement **timeline** (truncated).  
6. Sanitize UI rendering of tool output (ANSI stripping or safe terminal renderer; treat output as untrusted text).

Sheaf’s existing design matches this: job console over PTY, loopback default, timeline on console command.

### 3.3 Job console first vs full PTY later

| Mode | Behavior | When |
|------|----------|------|
| **Job console (recommended now)** | One-shot / long-running non-interactive jobs; stream logs; SIGTERM | `nmap`, `nuclei`, `httpx`, `ffuf`, one-liners, import-adjacent ops |
| **Full PTY (later, optional)** | Interactive shell / TUI (`msfconsole`, password prompts, `vim`) | Only if operators demand interactive tools inside UI *and* security review is complete |

**Prefer staying with job console** until:

- Operators repeatedly leave Sheaf for interactive sessions that *must* be casefile-attached.  
- Session isolation, command confirmations, and CSP/XSS hardening are solid.  
- Optional: allowlist of binaries or cwd roots for defense-in-depth (not a substitute for loopback + XSS hygiene).

### 3.4 UX patterns for ops log / console in casefiles

1. **Timeline as source of truth** — imports, status changes, console snippets, report exports.  
2. **Runs page** — each import/runner as a card: tool, args/meta, counts, link to findings.  
3. **Console drawer / panel** — engagement-scoped; cwd defaults to workspace; show `SHEAF_ENGAGEMENT` context.  
4. **Copy-forward** — “promote selection → finding/evidence/note” from log output.  
5. **No fake multiuser chat** — solo ops log, not Slack-in-a-shell.  
6. **Empty states** — point to import file or run on PATH, not a blank terminal.

---

## 4. Recommended feature backlog (prioritized)

Priorities assume import/run/report core already exist; focus remaining value for authorized local use.

### P0 — Harden the casefile spine

- [ ] **Burp issues XML** importer (findings + HTTP evidence seeds).  
- [ ] **ROE fields** on engagement (window, constraints, out-of-scope narrative) and **report section**.  
- [ ] **Confirmed-only / status filters** consistent across MD + DOCX + UI preview.  
- [ ] **Loopback + console safety** checklist in docs/UI (no LAN bind without warning).

### P1 — Triage speed

- [ ] Bulk status / severity actions; “mark FP from import noise.”  
- [ ] Stronger **asset** view from nmap/httpx (ports, tech tags).  
- [ ] Evidence attach from run console selection.  
- [ ] Finding templates library expansion (common web/network writeups).

### P2 — Report polish

- [ ] Print-friendly HTML/CSS (paper margins, page breaks, severity table styles).  
- [ ] Exec summary editable override (store analyst text; do not only generate).  
- [ ] Jinja-class or richer DOCX templates (logo, classification banner).  
- [ ] Package export: MD + evidence index + findings JSON.

### P3 — Optional depth (do not block core)

- [ ] Full PTY console (only after XSS/bind review).  
- [ ] TipTap/rich notes on findings.  
- [ ] Local multi-user auth (same host).  
- [ ] OOB / authenticated retest probes (explicit, scope-checked).  
- [ ] Generic JSON field-mapping importer.

---

## 5. Report quality standard

Client reports must read as **professional deliverables**, not raw tool dumps.

### 5.1 Structured Markdown skeleton

1. **Title + document control** — engagement, client, type, window, IDs, generated timestamp.  
2. **Contents**  
3. **Executive summary** — counts, critical/high callout, placeholder for business narrative (analyst replaces generated boilerplate).  
4. **Severity overview** — table by severity; secondary table by status.  
5. **Rules of engagement / Scope** — includes, excludes, testing windows, constraints, assumptions.  
6. **Assets** (if present) — hosts/ports from recon.  
7. **Testing activity** — runs/tools used (not full noisy logs).  
8. **Findings** — grouped by severity; each with status, host/path, description, impact, remediation, CWE/CVE, refs, evidence links.  
9. **Appendix: evidence index**

Filters: e.g. `--confirmed-only` for client drafts; internal exports may include draft/needs_review.

### 5.2 Print-friendly paper CSS (HTML preview)

- `@media print`: white background, black text, hide nav/chrome.  
- Page margins ~1.5–2cm; `page-break-inside: avoid` on finding cards/tables where possible.  
- Severity tables compact; monospace for hosts/paths.  
- Classification / confidentiality line in header or footer if set.  
- Prefer static HTML export over browser-only layout hacks.

### 5.3 Quality bar checklist

| Check | Pass criteria |
|-------|----------------|
| ROE/scope present | Client can see what was authorized |
| Severity table accurate | Counts match listed findings |
| Status hygiene | Client export excludes draft/FP unless requested |
| Evidence linked | Confirmed issues have proof or explicit “observed in tool X” |
| Exec summary human | Generated text replaced or clearly marked for rewrite |
| No scanner spam | Info-level noise triaged or filtered |

---

## 6. Decision summary

| Topic | Recommendation |
|-------|----------------|
| Product shape | Full lifecycle casefile, not report-only tracker |
| Integrations | File import first; PATH runners second; no SaaS dependency |
| Console | Job console (`bash -lc` stream) on loopback; PTY later if ever |
| Security | XSS = RCE model; never network-expose shell |
| Reports | Structured MD + ROE + severity tables + print CSS |
| Competition | Folders + Word; light PwnDoc/Dradis use — not enterprise PTaaS |

---

## 7. Sources (indicative)

- Category map and product notes: [competitive-research.md](./competitive-research.md)  
- Vendor/docs/GitHub positioning for Ghostwriter, PwnDoc, Dradis, Faraday, Reconmap-class tools (report generators vs ops platforms)  
- xterm.js security guidance: browser terminal I/O is fully scriptable; any XSS that reaches terminal control is critical  
- Sheaf ADRs: local SQLite workspace, loopback bind, import-first, Markdown-then-DOCX (`PLANNING.md`, `PRD.md`)

_Update when import formats, console threat model, or competitor lifecycle features change positioning._
