# PLANNING.md — Sheaf architecture

Living architecture document. Update when ADRs change.

---

## Goals (engineering)

- Ship a **local** engagement OS with one command to serve UI + API
- TypeScript end-to-end for speed
- Importers as pure, tested functions
- UI dense enough for real pentest triage

---

## Repository layout (target)

```text
own/sheaf/
├── PRD.md
├── AGENTS.md
├── PLANNING.md
├── INITIAL.md
├── TASK.md
├── README.md
├── docs/
├── PRPs/
├── testdata/                 # synthetic only
├── apps/
│   ├── api/                  # Hono server
│   └── web/                  # Vite React SPA
├── packages/
│   ├── core/                 # schema, importers, report, db
│   └── cli/                  # sheaf CLI
├── package.json              # pnpm workspace root
└── pnpm-workspace.yaml
```

---

## ADR-001: Local-first SQLite workspace

**Decision:** Store engagement data in SQLite under project-local `./.sheaf/` (e.g. `./.sheaf/sheaf.db`, `./.sheaf/evidence/`).

**Why:** Portable, zero ops, client isolation (copy/delete folder), offline.

**Consequences:** Multi-user remote access is out of scope for v1; backups = filesystem.

---

## ADR-002: TypeScript monorepo (Hono + Vite)

**Decision:** One language for API, CLI, web, parsers.

**Why:** Shared Zod types, faster MVP, one hiring/skill profile.

**Alternatives rejected:** FastAPI dual-stack (slower UI iteration); Django (Ghostwriter weight); microservices (Reconmap weight).

---

## ADR-003: shadcn/ui + lucide-react + custom tokens

**Decision:** Use shadcn primitives and Lucide icons; **re-theme** to Sheaf case-room palette.

**Why:** Fast accessible components without locking into a closed design system; Lucide is the shadcn default.

**Consequences:** Must invest in CSS variables early so the product does not look like generic shadcn demos.

---

## ADR-004: Bind loopback by default

**Decision:** Listen on `127.0.0.1:7420` unless configured otherwise, with a warning if binding all interfaces.

**Why:** Engagement data and notes can be sensitive.

---

## ADR-005: Import-first, run-later

**Decision:** MVP focuses on **importing** tool output. `sheaf run` (spawn nuclei/etc.) is v1.2.

**Why:** Vertical value without process orchestration edge cases.

---

## ADR-006: Markdown report before DOCX

**Decision:** MVP exports Markdown (+ HTML print view). DOCX in v1.1.

**Why:** Simple, diffable, good enough for many clients and for drafting.

---

## Runtime topology

```text
sheaf serve
    │
    ├─ Hono API        /api/health
    │                  /api/engagements
    │                  /api/engagements/:id/scope
    │                  /api/engagements/:id/findings
    │                  /api/engagements/:id/runs
    │                  /api/engagements/:id/import/:tool
    │                  /api/engagements/:id/report
    │                  /api/engagements/:id/timeline
    │
    └─ SPA static      /   (Vite build in prod; proxy in dev)
```

**Dev:** Vite dev server proxies `/api` → Hono.  
**Prod:** Hono serves `apps/web/dist`.

---

## Core package responsibilities

| Module | Responsibility |
|--------|----------------|
| `db/` | Drizzle schema, migrations, client |
| `importers/nuclei.ts` | Parse JSON/JSONL → normalized findings |
| `importers/nmap.ts` | Parse XML → assets (+ optional findings) |
| `fingerprint.ts` | Stable dedupe keys |
| `report/markdown.ts` | Engagement → Markdown string |
| `schemas/` | Zod entities shared with API/UI |

---

## API conventions

- JSON only
- Error shape: `{ "error": { "code": string, "message": string } }`
- IDs: ULID or UUID v7 (pick one in scaffold and stick to it — **prefer ULID** for sortability)
- Timestamps: ISO-8601 UTC

---

## UI architecture

- TanStack Router for engagement-scoped routes:
  - `/` engagements list
  - `/e/$engagementId` overview / timeline
  - `/e/$engagementId/findings`
  - `/e/$engagementId/scope`
  - `/e/$engagementId/runs`
  - `/e/$engagementId/report`
- TanStack Query for server state
- Product components under `components/sheaf/*`

Design tokens: [docs/ui-design.md](./docs/ui-design.md).

---

## Security notes (engineering)

- Path traversal: sanitize evidence filenames; store under engagement-id directory only
- Import size limits: sensible max body / stream files from disk for CLI imports
- No eval of imported content
- Future encryption is additive; schema should allow opaque blobs later

---

## Testing strategy

| Layer | Approach |
|-------|----------|
| Importers | Vitest + fixture files |
| Fingerprint | Table-driven unit tests |
| API | inject Hono app or supertest-style |
| UI | Playwright smoke after MVP shell |

---

## Open engineering questions

- Bun vs Node for runtime (either fine; pick during scaffold based on local toolchain)
- Biome vs ESLint+Prettier
- Single SQLite file vs per-engagement DB (**lean: one DB per workspace, multi engagement tables**)

---

## References

- [PRD.md](./PRD.md)
- [docs/competitive-research.md](./docs/competitive-research.md)
- [docs/data-model.md](./docs/data-model.md)
