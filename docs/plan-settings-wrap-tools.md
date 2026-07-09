# Plan: Settings · `sheaf wrap` · more importers

**Status:** research + implementation plan (not shipped)  
**Framing:** Authorized engagements only. Client data stays in local `./.sheaf/`. No cloud.  
**Related:** [competitive-research.md](./competitive-research.md), [engagement-os-research.md](./engagement-os-research.md), [data-model.md](./data-model.md), [ROADMAP.md](./ROADMAP.md)

---

## 0. Current state (baseline)

| Piece | Today |
|-------|--------|
| Importers | nuclei, nmap, httpx, ffuf, burp XML |
| Spawn + import | `sheaf run -e <id> -t <tool> -- <args>` via `runToolAndImport()`; injects machine-readable flags; writes to **tmpdir** |
| Console | Job console (`bash -lc` over WS); engagement-scoped; not full PTY |
| Settings | `.sheaf/config.json` is stub `{ version, createdAt }` only |
| Active engagement | URL route `/e/$engagementId` only — no workspace-level preference |
| Tool enum | `ToolName`: nuclei \| nmap \| httpx \| ffuf \| manual \| other (no naabu yet) |

**Problem:** Operators still retype `-e`, lose runs outside the casefile (`tee` to random dirs), and have no durable defaults (report filters, wrap auto-import, console cwd).

---

## 1. Similar tools landscape

| Tool / pattern | What it is | Capture / ingest model | Gap vs laptop solo casefile |
|----------------|------------|------------------------|-----------------------------|
| **Ghostwriter** | Red team ops (Django): clients, infra, findings, Jinja DOCX | Ops platform + C2-adjacent workflows; not ProjectDiscovery-native import | Heavy deploy; weak nuclei/httpx/naabu JSON pipelines |
| **PwnDoc / SysReptor** | Report-first generators | Findings library → DOCX; little live tool capture | No engagement timeline/runs; not an ops log |
| **Dradis** | Collab report framework | Many scanner **plugins** (esp. Pro); CE limited | Ops weight; UX/framework-era; not portable folder |
| **Faraday** | Multi-tool IEM / workspaces | **Plugins + agents** parse tool output → workspace correlation | Service footprint; less “one folder casefile” |
| **Reconmap** | Plan / execute / document | Can **run commands** and store results | Microservices-heavy for solo laptop |
| **BloodHound / Outflank-style notes** | Graph or operator notes adjacent to attack paths | Manual or tool-specific ingest; not general recon casefile | Wrong center of gravity for web/network recon→report |
| **Obsidian / pure notes** | Markdown vault | Manual paste; plugins for some tools | No fingerprint dedupe, runs, scope, report filters |
| **Operator reality (nmap etc.)** | Shell | `nmap … -oX out.xml`, `tee`, tmux scrollback, custom bash wrappers, `> logs/$(date).txt` | Sprawl; forgotten `-oX`; no auto-link to engagement |

### How operators capture nmap (and recon) today

| Pattern | Pros | Cons |
|---------|------|------|
| Shell redirect / `-oX` / `-oA` | Native, reliable | Path chaos; forget flags; no casefile link |
| `tee` | See + save | Still manual import step |
| tmux scrollback | Zero friction | Not durable; not structured |
| Custom scripts / aliases | Team muscle memory | Unshared; drift per laptop |
| Faraday / recon-ng plugins | Structured ingest | Heavy or module-bound |

### Gap Sheaf fills

```text
[authorized tool on PATH]
        ↓ sheaf wrap | sheaf run | import file | console capture
   .sheaf/runs + SQLite casefile
   ROE · scope · assets · findings · evidence · timeline
        ↓ report (confirmed-only default from settings)
   MD / paper HTML / DOCX / package
```

**Wedge:** local-first **engagement casefile** between scanners and client report — not another scanner, C2, or multi-tenant SaaS. ProjectDiscovery + nmap fluent; single process + SQLite; durable runs under the workspace, not `/tmp`.

---

## 2. Tool-wrapper / auto-ingest patterns

### 2.1 Patterns elsewhere

| Pattern | Who | Behavior | Takeaway for Sheaf |
|---------|-----|----------|--------------------|
| **Faraday plugins / agents** | Faraday | Per-tool parser; agent or CLI pushes results into workspace | Keep **pure importers** in core; wrapper only spawns + routes to importer |
| **recon-ng / module wrappers** | recon-ng, custom kits | Module owns I/O format | Prefer sniff + inject flags over per-tool mini-CLIs when possible |
| **tee + import** | Practitioners | `tool \| tee file` then `import` | First-class: wrap = tee-to-`.sheaf/runs/` + optional auto-import |
| **`sheaf run` (already)** | Sheaf | Explicit `-t`; inject `-jsonl`/`-oX`/…; tmpdir | Evolve into **wrap** (sniff) + durable run dir + settings engagement |

### 2.2 Recommended Sheaf design: `sheaf wrap`

```bash
# Explicit engagement
sheaf wrap -e <engagementId> -- nmap -sV -p- 10.0.0.0/24

# Active engagement from settings (no -e)
sheaf wrap -- nuclei -u https://target.example -severity high,critical

# Capture only (no import)
sheaf wrap --no-import -- httpx -l hosts.txt
```

**CLI shape**

```text
sheaf wrap [--engagement id] [--no-import] [--tool <name>] [--workspace path] -- <cmd> [args...]
```

| Concern | Design |
|---------|--------|
| **Spawn** | `spawn(cmd, args, { shell: false, cwd })` — no shell unless operator puts `bash -lc` themselves |
| **Stream** | Pipe child stdout/stderr to parent (operator sees live output) **and** append to run log under `.sheaf/runs/` |
| **Sniff tool** | Basename of argv0: `nmap`, `nuclei`, `httpx`, `ffuf`, `naabu`, …; override with `--tool` |
| **Machine-readable flags** | If operator did **not** pass output flags, inject preferred ones (same idea as `runToolAndImport`) |
| **Durable artifacts** | `.sheaf/runs/<runId>/` — `meta.json`, `stdout.log`, `stderr.log`, `out.<ext>` |
| **Import** | Default on when `settings.autoImportOnWrap` and engagement resolved; `--no-import` forces off |
| **Engagement** | `--engagement` > `settings.activeEngagementId` > error with clear message |
| **Timeline** | `Running …` + `wrap finished (exit N)` + import event |
| **Authz framing** | Help text + stderr banner: operator responsible for scope; authorized targets only |

**Flag injection matrix (prefer when missing)**

| Tool | Prefer inject | Notes |
|------|---------------|--------|
| nuclei | `-jsonl -o <out>` | Existing runner |
| nmap | `-oX <out>` | Existing runner |
| httpx | `-json -o <out>` | Existing runner |
| ffuf | `-of json -o <out>` | Existing runner |
| **naabu** | `-json -o <out>` (or JSONL-capable flag set) | P0 importer; verify against installed naabu flags in impl |
| unknown | none | Still tee stdout/stderr; tool=`other`; no auto-import (or import only if sniff later) |

**Core API (packages/core)**

```ts
// packages/core/src/wrap.ts (new)
wrapTool(ws, {
  engagementId: string | null, // null → resolve from settings
  argv: string[],              // after `--`
  toolOverride?: ToolName | "naabu",
  autoImport?: boolean,        // default from settings
  cwd?: string,
}): Promise<WrapResult>
```

Refactor: `runToolAndImport` either calls `wrapTool` with forced tool, or becomes a thin alias. Prefer **one** code path.

**vs `sheaf run`**

| | `sheaf run` | `sheaf wrap` |
|--|-------------|--------------|
| Tool | Required `-t` | Sniffed (or `--tool`) |
| Args | Tool args only | Full command (`nmap …`) |
| Output dir | os.tmpdir | `.sheaf/runs/<id>/` |
| Engagement | Required `-e` | `-e` or settings |
| Keep | Yes (compat) | Primary operator path |

### 2.3 In-app: Console + Runs + active engagement

| Surface | Behavior |
|---------|----------|
| **Settings** | `activeEngagementId`, `autoImportOnWrap`, `reportDefaults`, `consoleDefaults` |
| **Runs page** | Already engagement-scoped via route; show wrap artifacts paths when present; optional “set as active engagement” chip using settings |
| **Console** | “**Capture to case**” on finished job: save buffer (or last job log) → `.sheaf/runs/` → optional import if tool sniffed / user picks importer |
| **Console cwd** | `consoleDefaults.cwdMode`: `workspace` (default, today) \| `engagement` (e.g. `.sheaf/runs/` or future per-engagement dir) |
| **Global chrome (optional P1)** | Header indicator of active engagement for wrap/CLI mental model; not required for P0 if Settings page is clear |

**Capture to case (minimal)**

1. Job exits → enable button.  
2. POST `/api/engagements/:id/runs/capture` with `{ command, stdout, stderr, exitCode }`.  
3. Write run dir; timeline; if sniffable + `autoImportOnWrap`, import.  
4. No full PTY; no re-exec of capture as exploit path — store text only.

---

## 3. More importers (ease × value)

Do **not** boil the ocean. Prefer pure parsers + `testdata/` fixtures + `importX` in services + CLI/API route.

| Priority | Importer | Formats | Maps to | Ease | Value | Notes |
|----------|----------|---------|---------|------|-------|-------|
| **P0 ship** | **naabu** | JSON / JSONL | **Assets** (host, port, protocol) | High | High | Complements nmap; common ProjectDiscovery port scan |
| **P1 later** | masscan | Greppable (`-oG`) | Assets | Med | Med | Regex lines; noisy; rate-limit awareness is operator’s |
| **P1 later** | katana | JSONL | Assets / URLs only | Med | Med | No findings spam; path inventory |
| **P1 later** | ZAP | XML | Findings (+ optional evidence seeds) | Med–Low | Med | Schema version variance; subset of alerts first |
| **Defer** | Burp Collaborator full | — | — | — | — | Issues XML already covers export path |
| **Defer** | Metasploit DB | — | — | — | — | Wrong product shape |
| **Defer** | Nessus `.nessus` | — | — | Low unless tiny sample | — | Huge XML; only if tiny fixture path appears |

### P0 naabu sketch

| Item | Choice |
|------|--------|
| Parse | JSON array or JSONL objects (`host`/`ip`, `port`, `protocol`, …) |
| Normalize | `normalizeHost`; upsert assets like nmap/httpx (ports list / tags) |
| Fingerprint | Asset-level; no findings unless later policy |
| Tool enum | Extend `ToolName` with `naabu` (or map runs to `other` + meta — **prefer extend enum**) |
| Fixture | `testdata/naabu/sample.jsonl` |
| Wire | `importNaabu` · CLI `sheaf import naabu` · API `POST …/import/naabu` · wrap sniff |

### P1 notes (enough to not re-research)

- **masscan greppable:** `Host: x.x.x.x () Ports: 80/open/tcp//…`  
- **katana JSONL:** URL → host + path tag; cap bulk if needed  
- **ZAP XML:** alert name, risk, URL, description; status `needs_review`

---

## 4. Settings / preferences

### 4.1 Storage

| Choice | Detail |
|--------|--------|
| Path | `.sheaf/config.json` (already created by `initWorkspace`) — **reuse**, do not add `preferences.json` unless config becomes contested |
| Mode | `0o600` file under `0o700` `.sheaf/` |
| Schema | Tiny Zod; version field for migrations |
| Not in SQLite | Prefer file so CLI works without “settings table” ceremony; optional later mirror |

### 4.2 Schema (v1)

```ts
// packages/core — WorkspaceSettings
{
  version: 1,
  createdAt: number,           // keep existing
  activeEngagementId: string | null,
  reportDefaults: {
    confirmedOnly: boolean,    // default false (safe internal default)
  },
  consoleDefaults: {
    cwdMode: "workspace" | "engagement",  // default "workspace"
  },
  autoImportOnWrap: boolean,   // default true
  // theme: fixed dark case-room — omit for now
  // density: "compact" | "comfortable" — optional later, omit from P0 schema
}
```

**Rules**

- Missing keys → defaults via Zod `.default()`.  
- Invalid `activeEngagementId` (deleted/archived): treat as null on read or clear on next PATCH; never crash wrap/import.  
- PATCH is shallow-merge per top-level key (document in API).

### 4.3 API

| Method | Path | Behavior |
|--------|------|----------|
| GET | `/api/settings` | Read + parse + defaults |
| PATCH | `/api/settings` | Validate body with `WorkspaceSettingsPatch`, write file, return full settings |

CLI optional later: `sheaf settings get|set` — not required for P0 if API + UI exist.

### 4.4 UI

- Route: `/settings` (workspace-level, not under `/e/:id`) **or** gear on Home.  
- Controls: active engagement select (list engagements), toggles for `autoImportOnWrap` + `reportDefaults.confirmedOnly`, select for `consoleDefaults.cwdMode`.  
- Copy: authorized-use one-liner; loopback reminder if relevant.  
- Theme: fixed dark — no light toggle. Density later.

### 4.5 Consumers

| Consumer | Uses |
|----------|------|
| `sheaf wrap` | activeEngagementId, autoImportOnWrap |
| Report UI / CLI | reportDefaults.confirmedOnly as **default** checkbox/flag (overridable) |
| Console | cwdMode |
| Capture to case | autoImportOnWrap |

---

## 5. Non-goals (keep simple)

| Non-goal | Why |
|----------|-----|
| Multi-user auth | Solo/local first |
| SaaS sync / telemetry | Local-first invariant |
| Full interactive PTY | Job console + wrap suffice; XSS≈RCE already serious |
| C2 / agent implant logging | Wrong product |
| Built-in scanner engine | Not a scanner; wrap external tools only |
| Generic field-mapping importer UI | Defer (engagement-os P3) |
| Nessus / MSF DB / full Collaborator | Explicit defer |
| Theme engine / multi-brand | Case-room dark only |
| Network-exposed wrap/console | 127.0.0.1 discipline unchanged |

---

## 6. Implementation plan (ordered)

### Task A — Settings storage + API + Settings UI

| | |
|--|--|
| **Scope** | Zod schema, read/write helpers, GET/PATCH `/api/settings`, Settings page, wire report default checkbox |
| **Touch** | `packages/core/src/settings.ts` (new), `schemas.ts`, `workspace.ts` (export config path helpers), `apps/api/src/app.ts`, `apps/web` router + `SettingsPage.tsx`, `lib/api.ts` |
| **Acceptance** | ① GET returns full defaults when only `{version,createdAt}` exists ② PATCH persists and round-trips ③ Invalid patch → 400 ④ UI changes active engagement and toggles survive reload ⑤ Report page initializes `confirmedOnly` from settings ⑥ Unit test: parse/merge/defaults |

### Task B — `sheaf wrap` CLI + `wrapTool()`

| | |
|--|--|
| **Scope** | Core `wrapTool`, durable `.sheaf/runs/<id>/`, sniff + flag inject, CLI `wrap`, optional refactor of `runToolAndImport` |
| **Touch** | `packages/core/src/wrap.ts`, `runner.ts` (refactor), `packages/cli/src/index.ts`, `index.ts` exports, `data-model.md` layout note |
| **Acceptance** | ① `sheaf wrap -e <id> -- echo hi` creates run dir with logs ② Known tools without output flags get inject + import when autoImport on ③ Without `-e`, uses `activeEngagementId` ④ No engagement → non-zero exit + clear error ⑤ `--no-import` skips import but keeps artifacts ⑥ Live stdout/stderr still on terminal ⑦ Timeline events present ⑧ Temp-only-no-workspace regression avoided (artifacts under `.sheaf/runs`) |

### Task C — naabu importer + tests

| | |
|--|--|
| **Scope** | Parser, import service, CLI + API, wrap sniff, fixtures |
| **Touch** | `importers/naabu.ts` + test, `services.ts`, `schemas.ts` ToolName, CLI import, API route, wrap flag matrix, `testdata/naabu/` |
| **Acceptance** | ① sample JSONL → assets with host/port ② idempotent re-import (update counts sensible) ③ empty/malformed → controlled error ④ `sheaf import naabu` works ⑤ wrap sniffs `naabu` and imports when flags allow |

### Task D — Wire Console / Runs to active engagement + Capture

| | |
|--|--|
| **Scope** | Capture-to-case API + Console button; console cwd from settings; Runs shows path/meta for wrap runs if not already |
| **Touch** | `apps/api` capture route, `console.ts` cwd option, `ConsolePage.tsx`, `RunsPage.tsx` (display only if needed), settings consumers |
| **Acceptance** | ① Console respects `cwdMode` ② After job exit, **Capture to case** writes run + timeline on current engagement ③ If command sniffs as known tool and autoImport on, import runs ④ Loopback/XSS warnings unchanged ⑤ No full PTY added |

### Task E — Docs / ROADMAP

| | |
|--|--|
| **Scope** | Document wrap, settings, naabu; update roadmap shipped/gaps |
| **Touch** | `docs/ROADMAP.md`, `README.md` operator commands, `docs/data-model.md` (config + runs layout), optional one-line in `TASK.md` |
| **Acceptance** | ① ROADMAP lists settings + wrap + naabu ② Example commands copy-pasteable ③ Non-goals/console security still accurate |

---

## 7. Filesystem layout (target)

```text
.sheaf/
  sheaf.db
  config.json              # settings (zod)
  evidence/<engagement_id>/…
  runs/
    <runId>/
      meta.json            # tool, argv, engagementId, exitCode, timestamps, import summary
      stdout.log
      stderr.log
      out.xml | out.json | out.jsonl   # machine-readable artifact when known
```

---

## 8. Security notes (wrap + settings)

1. Wrap/console remain **local operator power tools** — same XSS≈RCE class as console.  
2. Do not bind API off loopback without auth (still non-goal).  
3. No bundled exploit payloads; PATH tools only.  
4. Settings file permissions stay restrictive.  
5. Captured logs may contain secrets — treat as engagement evidence; no upload.  
6. Flag injection must not strip operator intent; only **add** missing output format flags.

---

## 9. Suggested ship order & effort

| Order | Task | Est. size | Depends |
|-------|------|-----------|---------|
| 1 | A Settings | S–M | — |
| 2 | B wrap | M | A (engagement default); can stub engagement required first |
| 3 | C naabu | S | B sniff matrix optional same PR |
| 4 | D Console capture | S–M | A + B (run dir helpers) |
| 5 | E docs | S | after A–D or parallel late |

**P0 bundle:** A + B + C + E (minimal). **D** can trail by one PR if needed, but Capture is high UX value next to wrap.

---

## 10. Open decisions (resolve during Task A/B)

| Decision | Recommendation |
|----------|----------------|
| config.json vs preferences.json | **config.json** only |
| Extend ToolName with naabu | **Yes** |
| `sheaf run` deprecate? | **Keep** as explicit alias; docs lead with wrap |
| engagement cwd path | `.sheaf/runs` or `ws.root` subfolder per id — start with `ws.root` still if uncertain; only switch cwd when mode=engagement to `path.join(ws.sheafDir, "runs")` |
| Report confirmedOnly default | Default **false** (internal); operators opt into client mode |

---

## 11. P0 scope summary (recommended)

1. **Settings file + API + UI:** `activeEngagementId`, `autoImportOnWrap`, `reportDefaults.confirmedOnly`, `consoleDefaults.cwdMode`.  
2. **`sheaf wrap` + `wrapTool()`:** stream, sniff, inject MR flags, write `.sheaf/runs/`, auto-import into active/selected engagement.  
3. **naabu JSON/JSONL importer** with fixtures, CLI, API, wrap sniff.  
4. **Refactor path:** durable runs; `runToolAndImport` shares wrap core (no second divergent spawner).  
5. **Docs/ROADMAP** update; defer masscan/katana/ZAP, PTY, SaaS, Nessus/MSF, Capture-to-case only if time-boxed after wrap (else immediate Task D).

*Authorized assessments only. Sheaf stores casefile data locally; the operator owns scope and tool targets.*
