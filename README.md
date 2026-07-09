<p align="center">
  <img src="docs/assets/logo.png" alt="Sheaf" width="148" height="148" />
</p>

<h1 align="center">Sheaf</h1>

<p align="center">
  <strong>Local-first engagement OS</strong> for authorized pentests.<br/>
  Bind tool output into findings, evidence, and client-ready reports — data stays on your disk.
</p>

<p align="center">
  <a href="https://github.com/rqms40/sheaf/actions/workflows/ci.yml"><img src="https://img.shields.io/github/actions/workflow/status/rqms40/sheaf/ci.yml?branch=main&style=flat-square&label=CI" alt="CI" /></a>
  <a href="#license"><img src="https://img.shields.io/badge/license-TBD-lightgrey?style=flat-square" alt="License" /></a>
  <a href="#stack"><img src="https://img.shields.io/badge/node-%3E%3D20-brightgreen?style=flat-square" alt="Node" /></a>
  <a href="#stack"><img src="https://img.shields.io/badge/pnpm-11-blue?style=flat-square" alt="pnpm" /></a>
  <a href="#security-notes"><img src="https://img.shields.io/badge/bind-127.0.0.1-orange?style=flat-square" alt="Local only" /></a>
</p>

<p align="center">
  <code>Engagement → Scope / ROE → Assets → Runs → Evidence → Findings → Report</code>
</p>

---

## Why Sheaf?

Most tools are either scanners or report writers. Sheaf sits in the middle as a **casefile**: scope and ROE, imports from nuclei/nmap/httpx/ffuf/Burp, triage with evidence and edit history, then Markdown / paper HTML / DOCX export.

No cloud. No multi-tenant SaaS. Workspace lives under `./.sheaf/` (SQLite + evidence files).

**What’s next:** research-backed backlog in [docs/ROADMAP.md](docs/ROADMAP.md) and [docs/next-features-research.md](docs/next-features-research.md); open work lives in [GitHub Issues](https://github.com/rqms40/sheaf/issues).

## Features

| Area | What you get |
|------|----------------|
| **Casefile** | Engagements, include/exclude scope, ROE & notes, methodology checklist |
| **Imports** | nuclei JSONL, nmap XML, httpx JSONL, ffuf JSON, Burp issues XML |
| **Findings** | Severity/status triage, soft archive, templates, evidence attach |
| **History** | Append-only revisions (create / edit / restore) |
| **Report** | Structured Markdown, paper HTML (print-friendly), DOCX, JSON package — screenshots embed in the report |
| **Runs** | Spawn tools on `PATH` and auto-import (authorized targets only) |
| **Wrap** | `sheaf wrap -- nmap …` captures output into the **active** casefile (or `-e`) |
| **Settings** | Active engagement, auto-import, report defaults, UI density |
| **Console** | Local job console + **Run & import** capture (`127.0.0.1` only — not a full PTY) |

## Stack

| Layer | Tech |
|-------|------|
| Web | React, Vite, TanStack Query/Router, Tailwind |
| API | Hono on Node, loopback by default |
| Core | TypeScript, SQLite (better-sqlite3), Zod |
| CLI | Commander |
| Tests | Vitest, Playwright Chromium |

Monorepo: `apps/web` · `apps/api` · `packages/core` · `packages/cli`

## Requirements

- Node.js 20+
- pnpm 11+

## Setup

```bash
git clone https://github.com/rqms40/sheaf.git
cd sheaf
pnpm install
# if prompted for native builds (better-sqlite3 / esbuild):
pnpm approve-builds --all
```

### Dev (UI + API)

```bash
# terminal 1 — API  http://127.0.0.1:7420
pnpm dev:api

# terminal 2 — UI   http://127.0.0.1:5173  (proxies /api)
pnpm dev:web
```

Or one process after a web build:

```bash
pnpm build
pnpm sheaf -- serve -w .
# → http://127.0.0.1:7420
```

### CLI

```bash
pnpm sheaf -- init
pnpm sheaf -- engagement create -n acme-web -c Acme
pnpm sheaf -- engagement list

pnpm sheaf -- import nuclei ./scan.jsonl -e <id>
pnpm sheaf -- import nmap ./scan.xml -e <id>
pnpm sheaf -- import httpx ./httpx.jsonl -e <id>
pnpm sheaf -- import ffuf ./ffuf.json -e <id>
pnpm sheaf -- import burp ./issues.xml -e <id>
pnpm sheaf -- import naabu ./ports.jsonl -e <id>

# Active casefile for wrap (also in UI Settings)
pnpm sheaf -- settings set --active <id>
pnpm sheaf -- wrap -- nmap -sV scanme.nmap.org
pnpm sheaf -- wrap -e <id> -- nuclei -u https://target

pnpm sheaf -- run -e <id> -t nuclei -- -u https://target
pnpm sheaf -- checklist list -e <id>
pnpm sheaf -- probe -e <id> -f <findingId>

pnpm sheaf -- report -e <id> -o report.md
pnpm sheaf -- report -e <id> --docx -o report.docx
pnpm sheaf -- report -e <id> --confirmed-only -o client.md
pnpm sheaf -- export -e <id> -o export.json

pnpm sheaf -- finding archive <fid> -e <id>
pnpm sheaf -- engagement archive <id>
pnpm sheaf -- serve --port 7420
```

Workspace: **`./.sheaf/`** (SQLite + evidence files).

## Security notes

- Prefer binding to **`127.0.0.1`** only.
- The **console** can run shell as the API process user. Any XSS in the UI is effectively host shell access — do not expose Sheaf on a network interface.
- For **authorized** testing, labs, and training only. You own legal scope and ROE.

## Tests

```bash
pnpm test          # unit (core / importers)
pnpm test:e2e      # build + Playwright Chromium
pnpm ci            # test + typecheck + build + e2e
```

## Docs

| Doc | What |
|-----|------|
| [PRD.md](./PRD.md) | Product requirements |
| [PLANNING.md](./PLANNING.md) | Architecture |
| [AGENTS.md](./AGENTS.md) | Contributor / agent guidelines |
| [TASK.md](./TASK.md) | Task board |
| [docs/engagement-os-research.md](./docs/engagement-os-research.md) | Engagement OS research |
| [docs/data-model.md](./docs/data-model.md) | Data model |
| [docs/ROADMAP.md](./docs/ROADMAP.md) | Roadmap |

## Contributing

1. Read [PRD.md](./PRD.md) and [AGENTS.md](./AGENTS.md).
2. Prefer small PRs with tests for importers and core logic.
3. Synthetic fixtures only — never commit real client data.

```bash
pnpm ci
```

## License

TBD (lean MIT or Apache-2.0).

## Responsible use

Authorized security testing, assessments, and lab learning only. Misuse is on you.
