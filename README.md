# Sheaf

Local-first engagement casefile for offensive security.

Bind tool output into findings, evidence, notes, and reports. Data stays on disk under your control.

## Requirements

- Node.js 20+
- pnpm 11+

## Setup

```bash
git clone <repo-url>
cd sheaf
pnpm install
pnpm approve-builds --all   # allow better-sqlite3 / esbuild native builds if prompted
```

## Development

```bash
# terminal 1 — API (http://127.0.0.1:7420)
pnpm dev:api

# terminal 2 — UI with proxy (http://127.0.0.1:5173)
pnpm dev:web
```

Or from a workspace directory:

```bash
pnpm sheaf -- init
pnpm sheaf -- serve -w .
```

## CLI

```bash
pnpm sheaf -- init [path]
pnpm sheaf -- engagement create -n acme-web -c Acme
pnpm sheaf -- engagement list
pnpm sheaf -- import nuclei ./scan.jsonl -e <id>
pnpm sheaf -- import nmap ./scan.xml -e <id>
pnpm sheaf -- import httpx ./httpx.jsonl -e <id>
pnpm sheaf -- import ffuf ./ffuf.json -e <id>
pnpm sheaf -- run -e <id> -t nuclei -- -u https://target
pnpm sheaf -- checklist list -e <id>
pnpm sheaf -- finding archive <fid> -e <id>
pnpm sheaf -- probe -e <id> -f <fid>
pnpm sheaf -- report -e <id> -o report.md
pnpm sheaf -- report -e <id> --docx -o report.docx
pnpm sheaf -- report -e <id> --confirmed-only -o client.md
pnpm sheaf -- export -e <id> -o export.json
pnpm sheaf -- engagement archive <id>
pnpm sheaf -- serve --port 7420
```

Workspace data: `./.sheaf/` (SQLite + evidence).

## Tests

```bash
pnpm test
```

## Production UI

```bash
pnpm --filter @sheaf/web build
pnpm sheaf -- serve
```

Serves API + built UI on `http://127.0.0.1:7420`.

## Docs

| File | Description |
|------|-------------|
| [PRD.md](./PRD.md) | Product requirements |
| [PLANNING.md](./PLANNING.md) | Architecture |
| [AGENTS.md](./AGENTS.md) | Contributor / agent guidelines |
| [TASK.md](./TASK.md) | Task board |
| [docs/](./docs/) | Design, data model, research |

## Contributing

1. Read [PRD.md](./PRD.md) and [PLANNING.md](./PLANNING.md).
2. Check [TASK.md](./TASK.md); add work you start.
3. Follow [AGENTS.md](./AGENTS.md).
4. Use synthetic fixtures only — never commit real client data.
5. Prefer small PRs with tests for importers and core logic.

```bash
pnpm test
pnpm --filter @sheaf/web build
```

## License

TBD (lean MIT or Apache-2.0).

## Responsible use

For authorized security testing, assessments, and lab learning only. You are responsible for legal scope.
