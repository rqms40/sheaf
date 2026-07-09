# Sheaf — Product Requirements Document

| Field | Value |
|-------|--------|
| **Product** | Sheaf |
| **Path** | `own/sheaf` |
| **CLI** | `sheaf` |
| **Version** | 0.1 (PRD) |
| **Status** | Draft / ready for MVP build |
| **Audience** | Solo pentesters, small consultancies, internal offensive teams |

**Tagline:** Local-first engagement casefile — bind tool output into findings and reports.

---

## 1. Vision

Sheaf is a **local-first engagement OS** for offensive security: one place to hold scope, run history, notes, findings, evidence, and report export—without replacing scanners or becoming enterprise SaaS.

It sits **between tools and the report**:

```
[nmap | nuclei | ffuf | httpx | burp | manual]
              ↓ import / run wrappers
         ┌─────────────┐
         │    SHEAF    │  scope · notes · findings · evidence · timeline
         └─────────────┘
              ↓ export
         Markdown / DOCX report
```

### Positioning

| Sheaf is | Sheaf is not |
|----------|--------------|
| A casefile for an engagement | Another vulnerability scanner |
| Glue + triage + evidence + report | Enterprise PTaaS / multi-tenant cloud |
| ProjectDiscovery- and nmap-fluent | A C2 or post-exploitation framework |
| Local disk, portable workspace | A SaaS that owns your client data |

---

## 2. Problem

Pentesters lose large amounts of time stitching:

- Tool output (JSON/XML scattered across terminals and folders)
- Notes and screenshots
- Severity justification and CWE mapping
- Client-facing Word/PDF reports

Existing options fall into two camps:

1. **Report-only** tools (e.g. PwnDoc, SysReptor focus) — strong deliverables, weak live engagement ops.
2. **Heavy platforms** (Ghostwriter, Reconmap, commercial PlexTrac) — powerful but Docker-heavy, enterprise-shaped, slow for a laptop solo workflow.

**Gap:** a fast, local casefile that speaks modern recon stacks (nuclei, httpx, nmap) and produces a draft report without ceremony.

---

## 3. Goals

1. Cut time from “first scan” → “draft report”.
2. Make every finding **statused, evidenced, and exportable**.
3. Keep all engagement data **on disk under user control**.
4. Stay usable **offline** after install.
5. Feel dense and professional in the UI—not a generic dark dashboard.

---

## 4. Non-goals (v1)

- Multi-tenant SaaS or cloud sync
- Built-in vulnerability scanning engine
- Full collaborative real-time editing (e.g. Yjs multiplayer)
- C2 operator activity logging
- Mobile app
- Replacing Metasploit, Burp Suite, or Hashcat
- Bundled exploit payloads

---

## 5. Personas

| Persona | Primary need |
|---------|----------------|
| **Solo consultant** | Speed, clean client report, client-separated projects on disk |
| **Internal pentester** | Methodology structure, import org scanner output, consistent findings |
| **Learner (HTB / OSCP / labs)** | Notes + findings structure without enterprise bloat |

---

## 6. Core concepts

| Entity | Description |
|--------|-------------|
| **Workspace** | Root folder with SQLite DB + evidence files (prefer `./.sheaf/`) |
| **Engagement** | Time-boxed assessment (client, dates, type) |
| **Scope item** | Domain, URL, CIDR, wildcard; include/exclude |
| **Asset** | Host/URL derived from scope or imports |
| **Run** | Tool execution or import batch (nuclei, nmap, …) |
| **Finding** | Issue with severity, status, narrative, optional CWE/CVE |
| **Evidence** | File, HTTP exchange, screenshot, or structured blob ref |
| **Note** | Freeform rich note; optional link to finding/engagement |
| **Timeline event** | Append-only ops log |
| **Report snapshot** | Generated export at a point in time |

---

## 7. Finding model

### Severity

`critical | high | medium | low | info`

CVSS optional later; v1 is **manual severity**.

### Status lifecycle

```
draft → needs_review → confirmed → false_positive
                              ↘ risk_accepted
                              ↘ remediated
```

### Fingerprint (dedupe)

For imported findings, fingerprint should include enough to dedupe safely, e.g.:

- tool + template/plugin id
- host
- path/endpoint
- matcher / proof hash when available

---

## 8. Functional requirements

### FR-1 Workspace & engagement

- Create/open a workspace on disk
- CRUD engagements: name, client, start/end, type (`web | network | ad | cloud | other`)
- Archive engagement
- One active engagement context in the UI

### FR-2 Scope

- Add/remove scope items (domain, URL, IP/CIDR, wildcard)
- Mark exclude rules
- Helper: validate whether a host/URL appears in-scope (advisory only—not a legal boundary)

### FR-3 Tool import (v1 adapters)

| Adapter | Formats |
|---------|---------|
| **nuclei** | JSON / JSONL |
| **nmap** | XML |
| **httpx** | JSON (v1.1 if not in MVP; prefer in MVP if cheap) |
| **Generic** | JSON with field mapping (stretch) |

- Create a **Run** record per import
- Normalize into **Finding** rows
- Deduplicate by fingerprint
- Append **timeline** events

### FR-4 Findings

- List / filter / sort by severity, status, host, tag
- Manual create and edit
- Fields: title, description, impact, remediation, references, CWE (string v1), CVE optional
- Status transitions
- Link evidence

### FR-5 Evidence

- Store files under `workspace/evidence/<engagement-id>/`
- Paste HTTP request/response as structured evidence
- Screenshot / image upload

### FR-6 Notes & timeline

- Engagement-level and finding-level notes (TipTap / rich JSON)
- Timeline of imports, status changes, notes

### FR-7 Report

- Export **Markdown** report:
  - Engagement metadata
  - Exec summary placeholders
  - Findings grouped by severity
  - Evidence references
- HTML print-friendly preview
- DOCX template export in **v1.1**

### FR-8 CLI

```text
sheaf init [path]
sheaf serve [--port 7420]
sheaf engagement list|create
sheaf import nuclei <file> --engagement <id>
sheaf import nmap <file> --engagement <id>
sheaf report --engagement <id> -o report.md
```

### FR-9 UI

- Engagement switcher
- Scope panel
- Findings table + detail pane
- Run history
- Timeline
- Report preview (paper surface)
- Keyboard shortcuts (`j/k`, `/`, `n`, `⌘K` command palette)

---

## 9. Non-functional requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Default bind **`127.0.0.1` only** |
| NFR-2 | Workspace portable: copy folder = full backup |
| NFR-3 | SPA + open engagement &lt; 2s for &lt; 5k findings on a laptop |
| NFR-4 | **No telemetry** by default |
| NFR-5 | Secrets local; v1 plaintext DB + file-permission guidance; v1.1 optional encryption |
| NFR-6 | Keyboard-accessible UI |
| NFR-7 | No phone-home update checks without explicit opt-in |

---

## 10. Success metrics

- Import a nuclei JSON and see a filterable findings list in **&lt; 1 minute** of user time
- Produce first Markdown report **without leaving Sheaf**
- Prefer Sheaf over ad-hoc folders for the **next real engagement**

---

## 11. MVP scope (ship first)

1. Workspace + engagement CRUD  
2. Scope list  
3. nuclei + nmap import  
4. Findings CRUD + status  
5. Evidence attach (file + HTTP text)  
6. Markdown report  
7. CLI: `init` / `serve` / `import` / `report`  
8. UI shell: re-themed shadcn + Lucide + case-room tokens  

---

## 12. Roadmap

| Phase | Features |
|-------|----------|
| **v1.1** | httpx/ffuf adapters, DOCX export, finding templates library |
| **v1.2** | `sheaf run` wrappers (spawn tools, capture output into Runs) |
| **v1.3** | Safe re-validation hooks (optional non-destructive probes) |
| **v2** | Local multi-user auth, methodology checklists, Burp XML |
| **Later** | Attack-path graph, agent orchestrator integration |

---

## 13. Data model (sketch)

See also [docs/data-model.md](./docs/data-model.md).

```text
engagements(id, name, client, type, start_at, end_at, status, created_at)
scope_items(id, engagement_id, kind, value, is_exclude, notes)
assets(id, engagement_id, host, ports_json, tags_json)
runs(id, engagement_id, tool, started_at, finished_at, source_path, meta_json)
findings(id, engagement_id, run_id?, title, severity, status, host, path,
         description, impact, remediation, cwe, cve, fingerprint, raw_json)
evidence(id, finding_id?, engagement_id, kind, path_or_blob_ref, meta_json)
notes(id, engagement_id, finding_id?, title, body_json, updated_at)
timeline(id, engagement_id, kind, message, ref_type, ref_id, created_at)
```

---

## 14. Tech stack (decided)

| Layer | Choice |
|-------|--------|
| API | Hono + TypeScript (Node 22 or Bun) |
| DB | SQLite + Drizzle ORM |
| Web | Vite + React 19 + TypeScript |
| UI kit | **shadcn/ui** + **lucide-react** |
| Style | Tailwind CSS 4 + Sheaf CSS variables (not stock shadcn theme) |
| Data | TanStack Query + TanStack Router |
| Editor | TipTap |
| Tables | TanStack Table |
| CLI | Commander or citty + shared `packages/core` |
| Validation | Zod (shared) |
| Test | Vitest; Playwright later |
| Packages | pnpm |

**Runtime:**

```text
sheaf serve  →  http://127.0.0.1:7420
                  ├── /api/*   Hono + SQLite
                  └── /*       SPA (prod: static from API)
```

Details: [PLANNING.md](./PLANNING.md), [docs/ui-design.md](./docs/ui-design.md).

---

## 15. UI direction (summary)

- **Aesthetic:** case room / field ops — not matrix-green, not generic AI SaaS
- **Accent:** copper `signal` `#d4a574`
- **Chrome:** void/panel dark surfaces; **paper** surface for report preview
- **Type:** IBM Plex Sans + IBM Plex Mono; Source Serif 4 on report titles
- **Signature:** severity left-rail on findings + engagement timeline spine
- Full tokens and shadcn mapping: [docs/ui-design.md](./docs/ui-design.md)

---

## 16. Security & ethics

- For **authorized** security testing and research only
- No bundled exploit payloads
- Scope helper is **advisory**, not a legal engagement boundary
- README must state responsible use clearly

---

## 17. Naming note

**Sheaf** was chosen over “Dossier” because *dossier* collides with Infoblox Dossier, multiple GitHub report tools, and generic OSINT “collect a dossier” language. A *sheaf* is a bound bundle—findings, evidence, and notes gathered into one unit.

---

## 18. Open questions

- Prefer always project-local DB vs optional `~/.sheaf` for global config only? (**Lean: project-local data, optional global config.**)
- When to encrypt credential notes? (**Lean: v1.1.**)
- Multi-engagement deep support in one window for v1? (**Lean: list + switcher; deep multi-pane later.**)

---

## 19. Related documents

| Doc | Purpose |
|-----|---------|
| [README.md](./README.md) | Entry point |
| [PLANNING.md](./PLANNING.md) | Architecture ADRs |
| [AGENTS.md](./AGENTS.md) | Rules for coding agents |
| [INITIAL.md](./INITIAL.md) | MVP seed for PRP generation |
| [TASK.md](./TASK.md) | Living task board |
| [docs/competitive-research.md](./docs/competitive-research.md) | Landscape |
| [docs/data-model.md](./docs/data-model.md) | Schema detail |
| [docs/ui-design.md](./docs/ui-design.md) | Design system |
| [PRPs/templates/prp_base.md](./PRPs/templates/prp_base.md) | Feature PRP template |
