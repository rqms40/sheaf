# Base PRP Template — Sheaf

name: "Sheaf PRP Template — Context-Rich with Validation Loops"

## Purpose

Template for AI agents implementing Sheaf features with enough context and self-validation to reach working code iteratively.

## Core principles

1. **Context is king** — link PRD, PLANNING, data-model, ui-design, and code paths  
2. **Validation loops** — executable checks the agent can run and fix  
3. **Progressive success** — smallest vertical slice first  
4. **Global rules** — follow [AGENTS.md](../../AGENTS.md)  
5. **No stack thrash** — Hono, Drizzle, SQLite, Vite React, shadcn, lucide only  

---

## Goal

[What to build — end state visible to the user]

## Why

- [User / product value]
- [PRD requirement IDs e.g. FR-3]
- [What pain this removes]

## What

[User-visible behavior + technical requirements]

### Success criteria

- [ ] [Measurable outcome]
- [ ] [Measurable outcome]

## All needed context

### Documentation & references

```yaml
- file: PRD.md
  why: Product constraints and MVP scope
- file: PLANNING.md
  why: Architecture ADRs and layout
- file: AGENTS.md
  why: Non-negotiable agent rules
- file: docs/data-model.md
  why: Schema and fingerprint rules
- file: docs/ui-design.md
  why: Tokens, components, anti-patterns
- file: [paths to existing code]
  why: [patterns to mirror]
```

### Current codebase tree

```bash
# paste `find` or tree of apps/ and packages/ after scaffold
```

### Desired codebase tree (files this PRP adds)

```bash
# list new files and one-line responsibility each
```

### Known gotchas

```text
# CRITICAL: bind 127.0.0.1 by default
# CRITICAL: shared Zod in packages/core — do not duplicate in web
# CRITICAL: re-theme shadcn; do not ship stock zinc/violet
# CRITICAL: lucide-react only for icons
# Example: nuclei JSONL is one JSON object per line
# Example: nmap XML must stream/parse safely for large files
```

## Implementation blueprint

### Data models

```ts
// Zod + Drizzle sketches for entities touched
```

### Ordered tasks

```yaml
Task 1:
  CREATE packages/core/src/...
  - MIRROR pattern from: ...
  - TEST with: testdata/...

Task 2:
  MODIFY apps/api/src/...
  - ROUTE: ...

Task 3:
  MODIFY apps/web/src/...
  - UI: components/sheaf/...

Task N:
  VALIDATE: see Validation Loop
```

### Per-task pseudocode (critical paths only)

```ts
// PATTERN: validate → parse → fingerprint → upsert → timeline
```

### Integration points

```yaml
DATABASE:
  - migration: "..."
API:
  - route: "..."
UI:
  - route: "..."
CLI:
  - command: "sheaf ..."
```

## Validation loop

### Level 1 — Syntax & types

```bash
pnpm exec tsc --noEmit
# or project lint command once chosen
```

### Level 2 — Unit tests

```bash
pnpm --filter @sheaf/core test
# Expected: pass importer/fingerprint/report tests
```

### Level 3 — Integration

```bash
# API health
curl -s http://127.0.0.1:7420/api/health

# Import fixture (example)
sheaf import nuclei testdata/nuclei/sample.jsonl --engagement <id>

# Report
sheaf report --engagement <id> -o /tmp/sheaf-report.md
test -s /tmp/sheaf-report.md
```

## Final checklist

- [ ] Tests pass  
- [ ] Types pass  
- [ ] Manual UI path works for the feature  
- [ ] No stock shadcn theme regressions  
- [ ] No real client data in fixtures  
- [ ] TASK.md updated  
- [ ] README/PRD touched only if user-facing behavior changed  

## Anti-patterns

- ❌ New UI library next to shadcn  
- ❌ Skipping fingerprint dedupe on imports  
- ❌ Binding 0.0.0.0 silently  
- ❌ God-file components  
- ❌ Mocking tests just to pass  
- ❌ Shipping scanner/exploit functionality  
