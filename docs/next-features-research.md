# Next features research — Engagement OS backlog

**Date:** 2026-07-09  
**Audience:** Future you (and maintainers) picking Sheaf work without re-researching the market.  
**Scope:** Evidence-backed feature demand for a **local-first engagement OS** aimed at elite bug bounty hunters and consulting / internal pentesters.  
**Related:** [ROADMAP.md](./ROADMAP.md), [engagement-os-research.md](./engagement-os-research.md), [competitive-research.md](./competitive-research.md).

**This document does not implement features.** It justifies *what* to build next and maps each item to GitHub issues.

---

## 1. Method

### 1.1 What counts as evidence

| Tier | Sources used |
|------|----------------|
| **A — Industry surveys / platform reports** | Core Security / Fortra 2024 Pen Testing Survey; Pentera State of Pentesting 2025 (~500 CISOs); HackerOne Hacker-Powered Security Report 2025 (9th edition) |
| **B — Practitioner methodology** | SANS “Writing a Penetration Testing Report” (Rights); Bright Security / Hack The Box report writing guidance; ProjectDiscovery-centric recon playbooks |
| **C — Community / competitive product pain** | Reddit r/bugbounty & r/Pentesting themes (Obsidian notes, report tax, tool sprawl); Caido vs Burp reviews; Dradis / PwnDoc / PlexTrac / Ghostwriter positioning |
| **D — Sheaf baseline** | Shipped code + existing ROADMAP gaps (assets UI weak, no CVSS, no retest, etc.) |

We deliberately avoid inventing features from “wouldn’t it be cool.” Every P0 item ties to at least one Tier A/B signal **or** a Tier C pattern that appears across multiple independent sources.

### 1.2 Explicit non-goals (product shape stays fixed)

- Not a scanner, not a proxy, not C2, not multi-tenant SaaS  
- No required cloud sync or telemetry  
- Loopback-first security model remains non-negotiable  
- Do not rebuild Burp/Caido inside Sheaf — **import / attach** instead  

---

## 2. Survey and report findings (Tier A/B)

### 2.1 Core Security / Fortra 2024 Pen Testing Survey

Public summaries of the survey (including Bright Defense’s 2026 statistics compilation citing Core Security PDF):

| Finding | Implication for Sheaf |
|---------|------------------------|
| ~**72%** of orgs rely on **open-source** pentest tools | First-class importers for OSS recon/scan tools remain the wedge |
| When evaluating **paid** tools: **69% prioritize reporting**, **64% multi-vector testing**, **58% automation of redundant tasks** | Report quality is not polish — it is the #1 buyer criterion; multi-tool glue + less busywork is validated demand |
| Rigorous pentesting linked to breach prevention narratives (~**72%** in same report family) | Client-facing deliverables (exec summary, remediation, retest) matter as much as raw findings |

**Product takeaway:** Invest next cycles in **report builder + retest + multi-importer asset/finding glue**, not in more chrome alone.

### 2.2 Pentera State of Pentesting 2025 (~500 CISOs)

| Finding | Implication |
|---------|-------------|
| Security stacks keep growing; alert volume scales with tool count | Casefile must **prioritize confirmed / exploitable** work, not mirror every scanner row |
| Shift toward continuous / software-based validation | “What’s new since last recon” and retest status beat one-shot dump UIs |
| Need to focus on what is **truly exploitable** | Status model + evidence + severity/CVSS > untriaged import lists |

### 2.3 HackerOne Hacker-Powered Security Report 2025 (9th)

| Finding | Implication |
|---------|-------------|
| **70% of researchers use AI tools** in workflow (“bionic hacker”) | Optional **writeup assist** is demand-validated; must be opt-in and never replace PoC/evidence |
| Platform still requires reproducible steps, impact, and proof | **Submission pack** export (structured MD for H1/Bugcrowd) is high-value for bounty persona |
| AI is attack surface + helper | Keep Sheaf offline-capable; AI is a plugin, not a dependency |

### 2.4 SANS + report-writing practice (Tier B)

- SANS “Writing a Penetration Testing Report” frames report writing as a core skill; draft production consumes a large share of report effort (often cited as ~**60% of report-writing time on the draft**).  
- Bright Security / HTB-style guidance: **write as you go**, attach screenshots during testing, structure exec summary + findings + remediation.  
- CREST-style commercial practice: **retesting** after remediation is a first-class engagement phase, not an afterthought.

**Product takeaway:** Editable report sections + retest workflow + evidence embeds are the engagement OS heart — Sheaf already has MD/HTML/DOCX export; the gap is **live report drafting inside the casefile**.

---

## 3. Practitioner themes (Tier C)

### 3.1 Bug bounty hunter (elite)

Recurring patterns from methodology writeups, Obsidian threads, recon playbooks, and proxy tool discourse:

| Pain | Evidence pattern | Feature response |
|------|------------------|------------------|
| Multi-program scope chaos | bbscope / hacker-scoper mental models; H1 program rules | **Program entity + scope import** |
| Recon pipeline output sprawl | subfinder → httpx → katana → nuclei is default 2024–2026 stack | **Assets UI + more recon importers** |
| Out-of-scope waste | Program rules forbid scanners / OOS; time is money | **Scope guardrails on wrap/run** |
| Notes in Obsidian, findings elsewhere | r/bugbounty Obsidian organization threads | **Linked notes / TipTap** without leaving casefile |
| Proxy is daily driver | Caido adoption vs Burp Pro; project management in proxy ≠ report | **Caido + richer Burp evidence import** |
| Report → platform paste | H1 “detailed steps to reproduce” | **Submission pack** |
| Duplicates / status tracking | Researcher discourse on dups and triage | Fingerprint (shipped) + **submission/retest status fields** |

### 3.2 Consulting / internal pentester

| Pain | Evidence pattern | Feature response |
|------|------------------|------------------|
| Report tax / formatting hate | r/Pentesting report tooling threads; PwnDoc UI complaints; PlexTrac cost/direction rants | Better **local** report builder, not SaaS |
| Reuse writeups | Dradis issue library; PwnDoc templates | **Personal finding library** |
| Client retest | Remediation verification reports | **Retest workflow** |
| CVSS / management language | Client and auditor expectations | **CVSS 3.1** |
| Creds in random files | Every real engagement | **Local secret vault** |
| Methodology coverage | Checklists (partially shipped) | Richer checklist + delta activity |

### 3.3 Competitive steal / avoid

| Steal | From | Avoid |
|-------|------|-------|
| Issue / finding library | Dradis, PwnDoc | Enterprise multi-tenant |
| Jinja/DOCX depth | Ghostwriter, SysReptor | Heavy Django deploy |
| Multi-tool correlation | Faraday | Agent fleets / heavy services |
| Write-as-you-go UX | Operator lore + SANS | Pure “generate report at the end” |

---

## 4. Gap matrix: Sheaf today vs elite needs

| Need | Shipped? | Gap |
|------|----------|-----|
| Engagements, scope, ROE | Yes | — |
| Checklist | Yes (type-seeded) | Deeper custom packs later |
| Import nuclei/nmap/httpx/ffuf/Burp/naabu | Yes | More recon tools |
| Assets in DB | Partial (import) | **No first-class Assets UI** |
| Findings triage + evidence + history | Yes | CVSS, retest, submission status |
| Wrap / run / console | Yes | Scope guardrails |
| Report MD/HTML/DOCX | Yes | **Editable exec summary / sections** |
| Settings + layout + back-to-case | Yes | Command palette / keys |
| BB program model | No | New entity |
| Caido | No | Importer |
| Secrets vault | No | New module |
| AI writeup assist | No | P2 opt-in |
| Multi-user / mobile / full PTY | No | Deferred / non-goal |

---

## 5. Prioritized feature backlog

IDs **F1–F22** match GitHub issues (see [ROADMAP.md](./ROADMAP.md) for live links).

### P0 — Next return (highest leverage)

| ID | Feature | Evidence | Acceptance sketch |
|----|---------|----------|-------------------|
| **F1** | Assets workspace UI | Recon playbooks center on hosts; assets already in schema | List/filter assets; ports/tech; link to findings/runs |
| **F2** | Report builder (editable sections) | Core Security reporting #1; SANS draft effort | Persist exec summary + custom sections; export uses them |
| **F3** | Retest workflow | Client lifecycle; CREST-style retest | Status + retest evidence; report shows verified fixed |
| **F4** | Scope guardrails on wrap/run | OOS cost; ethics | Configurable warn/block when target ∉ include scope |
| **F5** | Deeper proxy evidence (Caido + Burp) | Proxy is daily driver | Import path for Caido export; faster HTTP evidence attach |
| **F6** | CVSS 3.1 fields | Client language | Vector string + score; optional severity map |

### P1 — Power-user OS

| ID | Feature | Evidence |
|----|---------|----------|
| **F7** | Recon importers (subfinder, katana, gau, dnsx) | PD pipeline ubiquity |
| **F8** | Bug bounty program entity | Multi-program hunting |
| **F9** | Platform submission pack | H1 report quality rules |
| **F10** | Credential / secret vault | Real engagements |
| **F11** | Personal finding library | Dradis-class reuse |
| **F12** | Command palette + keyboard map | Dense case-room UX |
| **F13** | Rich notes (TipTap) linked to entities | Obsidian migration |
| **F14** | Delta view (new since last activity) | Continuous recon |

### P2 — Later / careful

| ID | Feature | Notes |
|----|---------|-------|
| **F15** | Advanced DOCX/Jinja templates + branding | After F2 |
| **F16** | Auth / OOB probe helpers | Safety-critical |
| **F17** | Optional LLM writeup assist | H1 70% AI; offline default |
| **F18** | Attack-path / relationship graph | Nice-to-have |
| **F19** | Multi-user local auth | Non-goal until requested |
| **F20** | Full interactive PTY | Deferred (security) |
| **F21** | Jira/GitHub ticket export | After core casefile |
| **F22** | Mobile companion | Non-goal |

### Recommended build order when returning

```text
F1 Assets → F2 Report builder → F4 Scope guards → F3 Retest → F6 CVSS → F5 Proxy
→ then P1 recon/BB (F7–F9) → vault/library/UX (F10–F14)
```

---

## 6. Sources

### Surveys and industry reports

1. Core Security / Fortra — *2024 Penetration Testing Report* (survey). Summarized e.g. via Bright Defense “200+ Penetration Testing Statistics for 2026” citing Core Security PDF (`static.fortra.com/core-security/pdfs/guides/fta-cs-2024-pen-testing-report-gd.pdf`).  
2. Pentera — *State of Pentesting 2025* (≈500 CISOs; Global Surveyz Dec 2024–Jan 2025).  
3. HackerOne — *9th Annual Hacker-Powered Security Report* (2025); press: 70% researchers use AI tools.  

### Methodology and practice

4. SANS Institute Reading Room — Rights, *Writing a Penetration Testing Report*.  
5. Bright Security — penetration testing report sections / best practices.  
6. Hack The Box — pentest report template and “write as you go” guidance.  
7. ProjectDiscovery-centric recon methodologies (subfinder, httpx, katana, nuclei pipelines) in 2025–2026 bounty roadmaps.  

### Tools and competitive context

8. Caido vs Burp comparative writeups (AFINE, InfoSec Writeups, Caido product positioning) — project management and workflow speed; not a casefile replacement.  
9. Internal Sheaf docs: `competitive-research.md`, `engagement-os-research.md`, `ROADMAP.md`.  
10. Community themes: r/bugbounty (Obsidian organization, recon notes); r/Pentesting (report automation pain, PwnDoc/SysReptor/PlexTrac discourse).  

_Update this file when a new industry survey lands or a major competitor ships a category-defining feature._
