# Data model — Sheaf

SQLite workspace DB (prefer `./.sheaf/sheaf.db`). Evidence blobs on filesystem under `./.sheaf/evidence/<engagement_id>/`.

IDs: **ULID** strings (sortable). Timestamps: ISO-8601 text or integer Unix ms — pick one in Drizzle scaffold (**lean: integer ms UTC**).

---

## ER overview

```text
engagements 1──* scope_items
engagements 1──* assets
engagements 1──* runs
engagements 1──* findings
engagements 1──* notes
engagements 1──* timeline_events
engagements 1──* evidence

runs 1──* findings          (optional; manual findings have null run_id)
findings 1──* evidence
findings 1──* notes
```

---

## Tables

### engagements

| Column | Type | Notes |
|--------|------|--------|
| id | text PK | ULID |
| name | text | required |
| client | text | nullable |
| type | text | `web\|network\|ad\|cloud\|other` |
| status | text | `active\|archived` |
| start_at | integer | nullable ms |
| end_at | integer | nullable ms |
| created_at | integer | required |
| updated_at | integer | required |

### scope_items

| Column | Type | Notes |
|--------|------|--------|
| id | text PK | |
| engagement_id | text FK | cascade delete |
| kind | text | `domain\|url\|cidr\|wildcard\|ip` |
| value | text | e.g. `*.acme.tld`, `10.0.0.0/24` |
| is_exclude | integer | 0/1 boolean |
| notes | text | nullable |
| created_at | integer | |

**Indexes:** `(engagement_id)`

### assets

| Column | Type | Notes |
|--------|------|--------|
| id | text PK | |
| engagement_id | text FK | |
| host | text | hostname or IP |
| ports_json | text | JSON array of port objects |
| tags_json | text | JSON string array |
| source_run_id | text FK nullable | |
| created_at | integer | |

**Indexes:** `(engagement_id, host)` unique preferred

### runs

| Column | Type | Notes |
|--------|------|--------|
| id | text PK | |
| engagement_id | text FK | |
| tool | text | `nuclei\|nmap\|httpx\|ffuf\|manual\|other` |
| label | text | nullable display |
| source_path | text | original import path if any |
| started_at | integer | |
| finished_at | integer | nullable |
| meta_json | text | counts, versions, args |
| created_at | integer | |

### findings

| Column | Type | Notes |
|--------|------|--------|
| id | text PK | |
| engagement_id | text FK | |
| run_id | text FK nullable | |
| title | text | |
| severity | text | `critical\|high\|medium\|low\|info` |
| status | text | see PRD lifecycle |
| host | text | nullable |
| path | text | URL path or location |
| description | text | |
| impact | text | |
| remediation | text | |
| cwe | text | nullable e.g. `CWE-639` |
| cve | text | nullable |
| references_json | text | JSON array of URLs |
| fingerprint | text | dedupe key |
| raw_json | text | original tool item |
| created_at | integer | |
| updated_at | integer | |

**Indexes:**

- `(engagement_id, severity)`
- `(engagement_id, status)`
- **unique** `(engagement_id, fingerprint)` where fingerprint not null

### evidence

| Column | Type | Notes |
|--------|------|--------|
| id | text PK | |
| engagement_id | text FK | |
| finding_id | text FK nullable | |
| kind | text | `file\|http\|screenshot\|note_ref\|other` |
| path | text | relative path under evidence dir |
| content_text | text | nullable inline (HTTP bodies small enough) |
| meta_json | text | content-type, sizes, req/res split |
| created_at | integer | |

### notes

| Column | Type | Notes |
|--------|------|--------|
| id | text PK | |
| engagement_id | text FK | |
| finding_id | text FK nullable | |
| title | text | |
| body_json | text | TipTap JSON doc |
| created_at | integer | |
| updated_at | integer | |

### timeline_events

| Column | Type | Notes |
|--------|------|--------|
| id | text PK | |
| engagement_id | text FK | |
| kind | text | `import\|status_change\|note\|finding_created\|report\|other` |
| message | text | human readable |
| ref_type | text | nullable `finding\|run\|note\|evidence` |
| ref_id | text | nullable |
| created_at | integer | |

**Indexes:** `(engagement_id, created_at desc)`

---

## Fingerprint algorithm (nuclei v1)

Suggested stable string (hash if too long):

```text
nuclei|{template-id}|{host}|{matched-at or path}|{matcher-name or extractor summary}
```

Normalize host (lowercase, strip default ports). Manual findings: generate fingerprint `manual|{ulid}` or hash of title+host+path.

---

## Filesystem layout

```text
.sheaf/
  sheaf.db
  sheaf.db-wal          # if WAL mode
  evidence/
    <engagement_id>/
      <evidence_id>_<safe_filename>
  config.json           # optional workspace settings
```

---

## Zod / TypeScript enums

```ts
export const EngagementType = z.enum(["web", "network", "ad", "cloud", "other"]);
export const EngagementStatus = z.enum(["active", "archived"]);
export const Severity = z.enum(["critical", "high", "medium", "low", "info"]);
export const FindingStatus = z.enum([
  "draft",
  "needs_review",
  "confirmed",
  "false_positive",
  "risk_accepted",
  "remediated",
]);
export const ScopeKind = z.enum(["domain", "url", "cidr", "wildcard", "ip"]);
export const ToolName = z.enum(["nuclei", "nmap", "httpx", "ffuf", "manual", "other"]);
```

---

## Migration policy

- Drizzle migrations in `packages/core/drizzle` (or `apps/api/drizzle`)
- Never edit applied migrations; add new ones
- v1 may reset schema aggressively until first real engagement; document breaking changes in TASK.md

---

## Privacy

- DB may contain client names, hosts, credentials in notes — treat as sensitive
- Default file mode guidance: workspace dir `0700` when created on Unix
