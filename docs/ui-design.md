# UI design — Sheaf

Case-room / field ops aesthetic for a dense offensive security engagement app.

**Audience:** solo pentester or small consultancy  
**Shell job:** open an engagement and see what matters next  
**Findings job:** triage, enrich, evidence, status  

---

## Design principles

1. **Information first** — density without clutter; severity and status readable at a glance  
2. **One signature** — severity left-rail + timeline spine; everything else quiet  
3. **Not a scanner UI** — no matrix rain, no neon green terminal cosplay as brand  
4. **Not generic AI SaaS** — no stock shadcn zinc/violet marketing dashboard  
5. **Paper for clients** — report preview uses a light “paper” surface  

---

## Color tokens

| Token | Hex | Role |
|-------|-----|------|
| `bg-void` | `#0f1115` | App background |
| `bg-panel` | `#161a22` | Sidebars, elevated panels |
| `bg-elevated` | `#1c2230` | Cards / nested surfaces |
| `bg-paper` | `#ebe6dc` | Report preview |
| `ink` | `#e7eaf0` | Primary text (dark UI) |
| `ink-muted` | `#8b93a7` | Secondary text |
| `ink-faint` | `#5c6578` | Tertiary / timestamps |
| `signal` | `#d4a574` | Copper accent: focus, selection, primary actions |
| `line` | `#2a3142` | Borders / dividers |
| `crit` | `#e85d4c` | Critical |
| `high` | `#e8a23a` | High |
| `med` | `#c9b458` | Medium |
| `low` | `#6b9e78` | Low |
| `info` | `#6a8caf` | Info |
| `paper-ink` | `#1a1c1e` | Text on paper |

### shadcn CSS variable mapping

Map shadcn theme variables so primitives inherit Sheaf identity:

| shadcn var | Sheaf |
|------------|--------|
| `--background` | `bg-void` |
| `--card` / `--popover` | `bg-panel` |
| `--foreground` | `ink` |
| `--muted-foreground` | `ink-muted` |
| `--border` / `--input` | `line` |
| `--primary` | `signal` |
| `--primary-foreground` | `#1a1410` (dark on copper) |
| `--destructive` | `crit` |
| `--ring` | `signal` |
| `--radius` | `0.375rem` (slightly tight; not pill-happy) |

Dark mode is the **default**. Light mode is not required for v1 app chrome; paper surface is a local exception for report preview.

---

## Typography

| Role | Family | Notes |
|------|--------|--------|
| UI | **IBM Plex Sans** | Calm technical; avoid Inter as brand default |
| Mono | **IBM Plex Mono** | Hosts, paths, HTTP, IDs |
| Report display | **Source Serif 4** | Titles on paper only |

Scale (approx):

- Page title: 18–20px medium  
- Section: 13–14px medium / semibold  
- Body: 13px  
- Meta / table: 12px  
- Mono evidence: 12px  

---

## Signature elements

### Severity left-rail

Every finding row:

```text
│▌ Title of finding                    HIGH   confirmed
│  api.example.com · /v1/orders/{id}
```

- 3px left border (or absolute rail) colored by severity  
- Do not rely on color alone: show severity text/badge too  

### Timeline spine

Engagement overview: vertical spine of ops events (import, status change, note). Not a widget-card dashboard.

---

## Layout wireframe

```text
┌────────────────────────────────────────────────────────────┐
│ SHEAF  ·  acme-q3-web        scope  findings  timeline  ⚙  │
├──────────────┬─────────────────────────────────────────────┤
│ Engagements  │ Findings                      [+ Manual]    │
│ · acme-q3    │ ┌─────────────────────────────────────────┐ │
│ · lab-ad     │ │▌ IDOR on /api/orders/{id}      HIGH  ●  │ │
│              │ │  host: api.acme.tld · confirmed         │ │
│ Scope        │ └─────────────────────────────────────────┘ │
│ · *.acme.tld │ Detail tabs: description | evidence | notes │
│ · 10.0.0.0/24│                                             │
│              │ Optional split: paper report preview        │
│ Runs         │                                             │
│ · nuclei …   │                                             │
└──────────────┴─────────────────────────────────────────────┘
```

---

## Component kit

### Use

- **shadcn/ui:** Button, Input, Textarea, Select, Dialog, Sheet, Tabs, Badge, Separator, ScrollArea, DropdownMenu, Command, Form, Checkbox, ToggleGroup  
- **lucide-react:** only icon pack  
- **TanStack Table:** findings grid logic  
- **TipTap:** notes / long writeups  
- **sonner:** toasts  

### Product wrappers (`components/sheaf/`)

| Component | Purpose |
|-----------|---------|
| `SeverityBadge` | Color + label |
| `StatusBadge` | Finding status |
| `FindingRow` | Rail + title + host meta |
| `ScopeList` | Include/exclude items |
| `Timeline` | Spine events |
| `HttpEvidence` | Req/res mono blocks |
| `PaperPreview` | Report on `bg-paper` |

### Lucide mapping (starter)

| Action | Icon |
|--------|------|
| Engagements | `Briefcase` |
| Scope | `Crosshair` |
| Findings | `Bug` |
| Import | `Import` |
| Report | `FileOutput` |
| Timeline | `History` |
| Runs | `Terminal` |
| Evidence | `Paperclip` |
| Search | `Search` |
| Empty | `Inbox` / `FolderOpen` |

Sizes: **16** dense lists, **18** nav chrome. Do not mix icon packs.

---

## Motion & a11y

- Panel transitions: short opacity/translate; respect `prefers-reduced-motion`  
- Focus rings use `signal`  
- Keyboard: `j/k` findings, `/` search, `n` note, `⌘K` / `Ctrl+K` command palette  
- Density toggle: comfortable vs compact for long lists  
- Severity never color-only  

---

## Copy tone

- Active voice, sentence case  
- Buttons: “Import nuclei”, “Export report”, “Mark confirmed”  
- Empty states: what to do next, not jokes  
- Errors: what failed + how to fix  

---

## Anti-patterns

- Stock shadcn demo layouts / purple gradients  
- Neon green “hacker” brand as primary  
- Glassmorphism and decorative blur  
- Huge hero metrics cards with no operational value  
- Inter-only / Roboto default identity  
- Emoji as primary navigation  

---

## Implementation checklist

- [ ] Init shadcn in `apps/web`  
- [ ] Install `lucide-react`  
- [ ] Replace theme CSS variables with Sheaf tokens  
- [ ] Load IBM Plex Sans/Mono + Source Serif 4  
- [ ] Build `FindingRow` + `SeverityBadge` before polishing marketing chrome  
- [ ] Paper preview route/panel for report  
