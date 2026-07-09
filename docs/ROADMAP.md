# Sheaf — post-MVP roadmap

## Status: planned items implemented

All P0–P3 items from the engagement-OS research plan are in the codebase (see below). Remaining work is polish, real-world soak testing, and optional Burp XML.

---

## Product position

**Sheaf = local-first engagement casefile** between scanners and the client report.

```
[nuclei | nmap | httpx | ffuf | manual | sheaf run]
              ↓ import / capture
        SHEAF casefile
  triage · archive · evidence · checklist
              ↓ download
     Markdown · DOCX · JSON package
```

---

## Shipped feature matrix

| Area | Features |
|------|----------|
| **Casefile core** | Engagements, scope, findings draft/save, archive/delete, timeline |
| **Import** | nuclei, nmap, **httpx**, **ffuf** + **file picker** + paste |
| **Templates** | 10 common finding writeup seeds |
| **Evidence** | HTTP text, **file/screenshot upload**, safe probe capture |
| **Checklist** | Type-seeded methodology (web/network/ad/cloud/other) |
| **Run** | `sheaf run` / UI spawn tool on PATH → auto-import |
| **Probe** | Non-destructive GET/HEAD re-check |
| **Export** | MD (profiles), **DOCX**, findings JSON, full package |
| **Lifecycle** | Finding + engagement archive/restore; hard delete findings |

---

## Gaps still open (future)

| Gap | Notes |
|-----|--------|
| Burp issues XML | P1 deferred |
| TipTap rich notes | Simple notes API exists |
| Multi-user local auth | Explicit non-goal for now |
| Full Jinja DOCX templates | Current DOCX is structured simple client export |
| OOB / authenticated probe | Safe probe is unauthenticated GET only |

---

## UX principles (frontend-design)

1. Active work is default (archived hidden)  
2. Soft archive vs hard delete is explicit  
3. Save is intentional  
4. Download from header + report page  
5. Case-room copper chrome, not matrix-green SaaS  
6. Empty states point to next action  

---

## Operator commands (quick)

```bash
pnpm sheaf -- import httpx ./out.jsonl -e <id>
pnpm sheaf -- import ffuf ./ffuf.json -e <id>
pnpm sheaf -- run -e <id> -t nuclei -- -u https://target -severity high,critical
pnpm sheaf -- checklist list -e <id>
pnpm sheaf -- report -e <id> --docx -o report.docx
pnpm sheaf -- report -e <id> --confirmed-only -o client.md
pnpm sheaf -- probe -e <id> -f <findingId>
```
