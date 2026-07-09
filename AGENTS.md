# AGENTS.md — Sheaf

Global rules for any coding agent (Claude Code, Codex, Grok, Copilot, etc.) working in this repository.

---

## Project awareness

- **Read [PRD.md](./PRD.md)** and **[PLANNING.md](./PLANNING.md)** before implementing features.
- **Check [TASK.md](./TASK.md)** before starting work; add the task if missing; mark done when finished.
- Prefer **[docs/](./docs/)** for competitive, schema, and UI truth over inventing new patterns.
- For multi-step features, create a PRP under `PRPs/` using [PRPs/templates/prp_base.md](./PRPs/templates/prp_base.md).

---

## Product constraints (do not violate)

1. **Local-first.** Default bind `127.0.0.1`. No telemetry. No required cloud.
2. **Not a scanner.** Do not build exploit engines or replace nuclei/nmap/Metasploit.
3. **No exploit payloads** shipped in-repo.
4. **Authorized-use framing** stays in README/PRD; do not remove responsible-use language.
5. **Workspace portability:** engagement data lives in project-local storage (prefer `./.sheaf/`).

---

## Stack (decided — do not swap casually)

| Layer | Choice |
|-------|--------|
| Language | TypeScript end-to-end |
| API | Hono |
| DB | SQLite + Drizzle |
| Web | Vite + React 19 |
| UI | **shadcn/ui** + **lucide-react** + Tailwind 4 |
| Theme | Sheaf case-room tokens ([docs/ui-design.md](./docs/ui-design.md)) — **not** stock shadcn zinc/violet |
| Forms / schema | Zod (+ react-hook-form in UI) |
| Tables | TanStack Table |
| Editor | TipTap |
| Client data | TanStack Query + TanStack Router |
| Test | Vitest (unit); Playwright later |
| Packages | pnpm |

If you propose a stack change, document it as an ADR in PLANNING.md and get explicit human approval.

---

## Code structure

- Prefer monorepo shape:

  ```text
  apps/api
  apps/web
  packages/core    # shared types, parsers, db schema, report
  packages/cli
  ```

- **No file longer than ~500 lines** without splitting modules.
- Shared types and Zod schemas live in `packages/core` — UI and API must not diverge.
- Import adapters: `packages/core/src/importers/{nuclei,nmap,...}.ts`
- UI composition:
  - `components/ui/*` — shadcn primitives
  - `components/sheaf/*` — product components (`SeverityBadge`, `FindingRow`, …)

---

## UI rules

- Icons: **lucide-react only** (no Font Awesome / mixed packs).
- Dense lists: Lucide `size={16}`; chrome: `size={18}`.
- Signature UX: **severity left-rail** on findings; **timeline spine** for engagement ops.
- Dark case-room default; paper surface only for report preview.
- Avoid generic AI-dashboard layouts, neon matrix green, purple gradients, Inter-as-only-font.

---

## Testing & validation

- New core logic (importers, fingerprint, report): unit tests with fixtures under `testdata/`.
- Each feature: happy path + edge case + failure case when feasible.
- Do not “mock to green” — fix root causes.
- After API routes: curl or integration check against local server.

---

## Style

- TypeScript strict; explicit types on public APIs.
- Format/lint with project tooling once scaffolded (e.g. oxlint/eslint + prettier, or biome—match PLANNING.md when set).
- Prefer clear names (`importNucleiJson`) over clever ones.
- Comment **why** for non-obvious security or dedupe logic (`// Reason: ...`).

---

## Git & safety

- Never commit client engagement data, real scopes, credentials, or evidence samples from real assessments.
- Use synthetic fixtures only in `testdata/`.
- Do not force-push or rewrite history unless the human asks.

---

## Anti-patterns

- ❌ New UI framework alongside shadcn (MUI, Ant, Chakra, …)
- ❌ Default shadcn marketing theme left unchanged
- ❌ Cloud sync “for convenience” in v1
- ❌ Binding `0.0.0.0` without explicit config + warning
- ❌ Giant god-components for findings page
- ❌ Duplicating Zod schemas in web and api
- ❌ Assuming missing context — ask or read PRD/PLANNING

---

## When stuck

1. Re-read PRD MVP scope.  
2. Check TASK.md and open questions in PRD §18.  
3. Prefer smallest vertical slice (import → list findings → markdown report).  
