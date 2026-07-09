# Competitive research — Engagement OS landscape

Research snapshot for **Sheaf** positioning. Not an endorsement of any vendor.

---

## Category map

| Category | Examples | Notes |
|----------|----------|--------|
| Enterprise lifecycle | PlexTrac, AttackForge | Reporting + remediation + workflow; paid |
| Self-hosted report platforms | Dradis, Ghostwriter, PwnDoc, SysReptor, WriteHat | Varying license & weight |
| Ops + commands | Reconmap | Can run tools; microservices-heavy |
| Scanners / recon | nuclei, nmap, OpenVAS, ZAP | Not competitors — **inputs** to Sheaf |

---

## Detailed notes

### PlexTrac

- Full pentest lifecycle, polished UX, remediation tracking
- **Gap for us:** cost, cloud/enterprise gravity; not a weekend self-host for freelancers

### AttackForge

- Mid-market workflow + reporting
- **Gap:** closed source, paid

### Dradis (CE / Pro)

- Long-standing collaboration/report framework; CE is GPLv2; ships in some security distros
- **Strengths:** issue library concept (esp. Pro), community history
- **Gaps:** UX dated for many users; CE limited vs Pro; Ruby operational weight

### Ghostwriter (SpecterOps)

- Open-source red team ops: clients, infrastructure/domains, findings library, Jinja2 DOCX/XLSX/PPTX
- Integrations with C2 ecosystems matter for dedicated red teams
- Collaborative editing improvements in newer versions
- **Gaps for solo web/network pentesters:** heavy Django deploy; weak first-class ProjectDiscovery JSON pipelines; more “assessment ops platform” than “fast casefile”

### PwnDoc / PwnDoc-ng

- OSS pentest reporting: Markdown findings, customizable DOCX
- Motto energy: more time to pwn, less to doc
- **Gaps:** report-centric; not a live engagement timeline / import OS

### SysReptor

- Strong UX; popular for cert-style reports
- **License:** source-available community license — **not** classic open source (limits on distribution/mod/commercial vary by license text)
- **Gaps:** not positioned as full engagement OS; license may block some fork goals

### Reconmap

- Plan, execute, document; can run commands and store results; multi-format reports
- Architecture: microservices (API, auth, queues, etc.)
- **Gaps:** operational complexity for laptop solo use

### WriteHat

- Collaborative reporting (Django templates / HTML heritage)
- **Gaps:** older UI; report-first

---

## Recurring practitioner pains (opportunity)

1. Tool output sprawl (nuclei/httpx/nmap/ffuf files everywhere)
2. Findings without proof / status workflow
3. Report writing tax (30–50% of engagement time in many teams)
4. Heavy platforms for simple needs
5. Desire for **local** client data control
6. Modern recon stack under-served vs Burp/Nessus-centric plugins

---

## Sheaf wedge

| Dimension | Sheaf choice |
|-----------|--------------|
| Weight | Single process + SQLite |
| Center of gravity | **Import → findings → evidence → report** |
| Tool fluency | nuclei + nmap first; ProjectDiscovery-native |
| UI | Dense case-room app (shadcn + Lucide, re-themed) |
| Collab | Solo/small team first; no Yjs multiplayer in v1 |
| License intent | Real open source (decide SPDX at first code commit; lean MIT or Apache-2.0) |

**Not competing with:** nmap, nuclei, Metasploit, Burp.  
**Competing with:** ad-hoc folders + Word, and partially with lightweight use of PwnDoc/Dradis CE.

---

## Name collisions avoided

**Dossier** rejected due to Infoblox Dossier, report engines named dossier, and generic OSINT “collect a dossier” language. **Sheaf** = bound bundle of engagement artifacts.

---

## Sources (indicative)

- Vendor/product sites and GitHub READMEs for Ghostwriter, PwnDoc, Reconmap, Dradis, SysReptor
- Industry roundups comparing pentest report generators (2025–2026)
- Prior product discussion in parent project planning notes

_Update this doc when a competitor ships a killer import/timeline feature that changes positioning._
