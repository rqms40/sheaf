# Sheaf — post-MVP roadmap

## Status

Engagement OS core is shipped (casefile, imports, wrap/run, report, settings layout, CI).  
**Next work is tracked as open GitHub issues**, justified by research in [next-features-research.md](./next-features-research.md).

Related: [engagement-os-research.md](./engagement-os-research.md), [competitive-research.md](./competitive-research.md).

---

## Product position

**Sheaf = local-first engagement casefile** between scanners and the client report.

```
[nuclei | nmap | httpx | ffuf | burp | caido* | recon* | manual | sheaf run | console]
              ↓ import / capture
        SHEAF casefile
  ROE · scope · assets* · triage · evidence · checklist · retest*
              ↓ download / print
     Markdown · paper HTML · DOCX · JSON package · submission pack*
```

`*` = planned (see backlog).

---

## Shipped feature matrix

| Area | Features |
|------|----------|
| **Casefile core** | Engagements, scope, **ROE/notes**, findings draft/save, archive/delete, timeline (paginated) |
| **Import** | nuclei, nmap, httpx, ffuf, **Burp issues XML**, naabu + file picker + paste |
| **Templates** | 10 common finding writeup seeds |
| **Evidence** | HTTP text, file/screenshot upload, safe probe capture |
| **Checklist** | Type-seeded methodology (web/network/ad/cloud/other) |
| **Run / Wrap** | `sheaf run` / UI spawn; `sheaf wrap` capture → active engagement |
| **Console** | Local **job console** (`bash -lc` over WS, 127.0.0.1 only — not full PTY) |
| **Probe** | Non-destructive GET/HEAD re-check |
| **Export** | MD (profiles), **GFM paper HTML**, DOCX, package — screenshots embed |
| **Settings** | Active engagement, auto-import, report defaults, UI density, **layout rail/sidebar** |
| **UX** | Settings **back-to-case** (`returnTo` / last case path) |
| **Lifecycle** | Finding + engagement archive/restore; hard delete findings; edit history |
| **E2E** | Playwright Chromium: ROE, scope, report, console, burp API, settings |

---

## Research-backed backlog (return here)

Full evidence and persona maps: **[next-features-research.md](./next-features-research.md)**.

### P0 — build first

| ID | Feature | Issue |
|----|---------|-------|
| F1 | Assets workspace UI (hosts/ports/tech) | [#1](https://github.com/rqms40/sheaf/issues/1) |
| F2 | Report builder: editable exec summary + sections | [#2](https://github.com/rqms40/sheaf/issues/2) |
| F3 | Retest / remediation verification workflow | [#3](https://github.com/rqms40/sheaf/issues/3) |
| F4 | Scope guardrails on wrap/run | [#4](https://github.com/rqms40/sheaf/issues/4) |
| F5 | Deeper proxy evidence (Caido + richer Burp) | [#5](https://github.com/rqms40/sheaf/issues/5) |
| F6 | CVSS 3.1 vectors on findings | [#6](https://github.com/rqms40/sheaf/issues/6) |

**Suggested order:** F1 → F2 → F4 → F3 → F6 → F5

### P1 — power-user

| ID | Feature | Issue |
|----|---------|-------|
| F7 | Recon importers: subfinder, katana, gau/wayback, dnsx | [#7](https://github.com/rqms40/sheaf/issues/7) |
| F8 | Bug bounty program entity + scope import | [#8](https://github.com/rqms40/sheaf/issues/8) |
| F9 | Platform submission pack export (H1/Bugcrowd-oriented) | [#9](https://github.com/rqms40/sheaf/issues/9) |
| F10 | Engagement-scoped credential/secret vault | [#10](https://github.com/rqms40/sheaf/issues/10) |
| F11 | Personal finding/issue library | [#11](https://github.com/rqms40/sheaf/issues/11) |
| F12 | Command palette + keyboard navigation | [#12](https://github.com/rqms40/sheaf/issues/12) |
| F13 | Rich notes (TipTap) linked to findings/assets | [#13](https://github.com/rqms40/sheaf/issues/13) |
| F14 | Delta view: new assets/findings since last activity | [#14](https://github.com/rqms40/sheaf/issues/14) |

### P2 — later / careful

| ID | Feature | Issue |
|----|---------|-------|
| F15 | Advanced DOCX/Jinja templates + branding | [#15](https://github.com/rqms40/sheaf/issues/15) |
| F16 | Authenticated / OOB probe helpers | [#16](https://github.com/rqms40/sheaf/issues/16) |
| F17 | Optional LLM writeup assist (opt-in) | [#17](https://github.com/rqms40/sheaf/issues/17) |
| F18 | Attack-path / finding relationship graph | [#18](https://github.com/rqms40/sheaf/issues/18) |
| F19 | Multi-user local auth | [#19](https://github.com/rqms40/sheaf/issues/19) |
| F20 | Full interactive PTY | [#20](https://github.com/rqms40/sheaf/issues/20) |
| F21 | Jira/GitHub issue export | [#21](https://github.com/rqms40/sheaf/issues/21) |
| F22 | Mobile companion (non-goal) | [#22](https://github.com/rqms40/sheaf/issues/22) |

Filter: [`priority:p0`](https://github.com/rqms40/sheaf/labels/priority%3Ap0) · [`priority:p1`](https://github.com/rqms40/sheaf/labels/priority%3Ap1) · [`priority:p2`](https://github.com/rqms40/sheaf/labels/priority%3Ap2)

---

## Gaps still open (quick list)

| Gap | Notes |
|-----|--------|
| Full interactive PTY | Deferred; job console is safer (F20) |
| TipTap rich notes | Plain ROE/notes + notes API exist (F13) |
| Multi-user local auth | Explicit non-goal for now (F19) |
| Full Jinja DOCX templates | Current DOCX is structured simple export (F15) |
| OOB / authenticated probe | Safe probe is unauthenticated GET only (F16) |
| Editable exec summary in UI | Generated MD still primary (F2) |
| Assets first-class UI | Data exists; UX incomplete (F1) |
| CVSS / retest | Client deliverable gaps (F3, F6) |

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
pnpm sheaf -- wrap -e <id> -- nmap -sV -oX out.xml target
pnpm sheaf -- checklist list -e <id>
pnpm sheaf -- report -e <id> --docx -o report.docx
pnpm sheaf -- report -e <id> --confirmed-only -o client.md
pnpm sheaf -- probe -e <id> -f <findingId>
pnpm test:e2e
```

Browse open work: [GitHub Issues](https://github.com/rqms40/sheaf/issues)
