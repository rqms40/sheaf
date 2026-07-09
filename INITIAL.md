## FEATURE:

Build the **Sheaf MVP**: local-first engagement casefile.

### Must ship

1. **Workspace + engagement CRUD** (SQLite via Drizzle, project-local `./.sheaf/`)
2. **Scope items** list (add/remove domain, URL, CIDR, wildcard, exclude flag)
3. **Importers**
   - nuclei JSON/JSONL → findings + run + timeline
   - nmap XML → assets (and optional info findings if useful) + run + timeline
4. **Findings** list/detail: severity, status, host, path, description, impact, remediation, CWE, fingerprint dedupe
5. **Evidence**: file path storage under `evidence/<engagement-id>/` + HTTP request/response text evidence
6. **Markdown report** export grouped by severity
7. **CLI**: `sheaf init`, `serve`, `import nuclei|nmap`, `report`
8. **Web UI** (Vite + React + Tailwind + shadcn/ui + lucide-react):
   - Case-room theme (see `docs/ui-design.md`)
   - Engagement switcher, scope panel, findings table + detail, runs, timeline, report preview
   - Severity left-rail on finding rows

### API

- Hono on `127.0.0.1:7420`
- REST JSON under `/api/*`
- Serve SPA static assets in production mode

### Shared

- Zod schemas + types in `packages/core`
- Fingerprint function for nuclei findings

## EXAMPLES:

None in-repo yet. When scaffolding:

- Keep importer pure functions testable without HTTP
- Mirror patterns: parse → normalize → upsert by fingerprint → timeline event

After first scaffold, put golden fixtures in `testdata/nuclei/` and `testdata/nmap/`.

## DOCUMENTATION:

- Product: `PRD.md`
- Architecture: `PLANNING.md`
- Schema: `docs/data-model.md`
- UI: `docs/ui-design.md`
- Agent rules: `AGENTS.md`
- PRP template: `PRPs/templates/prp_base.md`

External (implementers should consult official docs as needed):

- Hono: https://hono.dev/
- Drizzle ORM SQLite: https://orm.drizzle.team/docs/get-started-sqlite
- shadcn/ui: https://ui.shadcn.com/
- Lucide React: https://lucide.dev/guide/packages/lucide-react
- TanStack Query / Router / Table
- nuclei JSON output format
- nmap XML (`-oX`) structure

## OTHER CONSIDERATIONS:

- **Do not** bind `0.0.0.0` by default.
- **Do not** add telemetry.
- **Do not** invent a scanning engine.
- Re-theme shadcn immediately — copper primary, void/panel backgrounds (not default zinc/violet).
- Icons: lucide-react only.
- Synthetic data only in fixtures — never real client data.
- Prefer vertical slice: one engagement → import sample nuclei → see findings in UI → `sheaf report` writes markdown.
- File size: split modules before 500+ lines.
- Validation gates for MVP:
  1. unit tests for nuclei parser + fingerprint
  2. `sheaf serve` health returns ok
  3. import fixture increases finding count
  4. report file non-empty
