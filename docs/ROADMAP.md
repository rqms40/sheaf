# Sheaf — post-MVP roadmap

## Status: Engagement OS slice shipped

Research-backed engagement OS upgrades are in tree: ROE, Burp XML, paper report render, local job console, Playwright e2e. See [engagement-os-research.md](./engagement-os-research.md).

---

## Product position

**Sheaf = local-first engagement casefile** between scanners and the client report.

```
[nuclei | nmap | httpx | ffuf | burp | manual | sheaf run | console]
              ↓ import / capture
        SHEAF casefile
  ROE · triage · archive · evidence · checklist
              ↓ download / print
     Markdown · paper HTML · DOCX · JSON package
```

---

## Shipped feature matrix

| Area | Features |
|------|----------|
| **Casefile core** | Engagements, scope, **ROE/notes**, findings draft/save, archive/delete, timeline |
| **Import** | nuclei, nmap, httpx, ffuf, **Burp issues XML** + file picker + paste |
| **Templates** | 10 common finding writeup seeds |
| **Evidence** | HTTP text, file/screenshot upload, safe probe capture |
| **Checklist** | Type-seeded methodology (web/network/ad/cloud/other) |
| **Run** | `sheaf run` / UI spawn tool on PATH → auto-import |
| **Console** | Local **job console** (`bash -lc` over WS, 127.0.0.1 only — not full PTY) |
| **Probe** | Non-destructive GET/HEAD re-check |
| **Export** | MD (profiles), **GFM paper HTML** (marked+DOMPurify+print CSS), DOCX, package |
| **Lifecycle** | Finding + engagement archive/restore; hard delete findings |
| **E2E** | Playwright Chromium: ROE, scope, report, console, burp API |

---

## Gaps still open (future)

| Gap | Notes |
|-----|--------|
| Full interactive PTY | Deferred; job console is safer first step |
| TipTap rich notes | Plain ROE/notes + notes API exist |
| Multi-user local auth | Explicit non-goal for now |
| Full Jinja DOCX templates | Current DOCX is structured simple client export |
| OOB / authenticated probe | Safe probe is unauthenticated GET only |
| Editable exec summary in UI | Generated MD is still the source of truth |

---

## Console security (non-negotiable)

1. Bind API to **127.0.0.1** only for operator machines  
2. Console WS rejects non-loopback peers and non-loopback binds  
3. Treat any XSS in the web UI as **host shell**  
4. Prefer job console over full PTY until there is a clear need  

---

## UX principles (frontend-design)

1. Active work is default (archived hidden)  
2. Soft archive vs hard delete is explicit  
3. Save is intentional  
4. Download from header + report page  
5. Case-room copper chrome; report is paper; console is phosphor on slate  
6. Empty states point to next action  

---

## Operator commands (quick)

```bash
pnpm sheaf -- import burp ./issues.xml -e <id>
pnpm sheaf -- import httpx ./out.jsonl -e <id>
pnpm sheaf -- run -e <id> -t nuclei -- -u https://target -severity high,critical
pnpm sheaf -- checklist list -e <id>
pnpm sheaf -- report -e <id> --docx -o report.docx
pnpm sheaf -- report -e <id> --confirmed-only -o client.md
pnpm sheaf -- probe -e <id> -f <findingId>
pnpm test:e2e
```
