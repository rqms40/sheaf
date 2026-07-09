import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, CircleHelp, Settings2 } from "lucide-react";
import { useEffect, useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/sheaf/PageHeader";
import { SheafMark } from "@/components/sheaf/Logo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

/**
 * Expandable help for a setting — “What this does” (case-room, not a modal maze).
 */
function SettingHelp({
  title,
  children,
  defaultOpen = false,
}: {
  title?: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = useId();
  return (
    <div className="rounded-md border border-border/80 bg-background/40">
      <button
        type="button"
        className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] text-muted hover:text-foreground"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((v) => !v)}
      >
        <CircleHelp className="size-3.5 shrink-0 text-primary/80" />
        <span className="flex-1 font-medium tracking-wide">
          {title ?? "What this does"}
        </span>
        <ChevronDown
          className={cn(
            "size-3.5 shrink-0 text-faint transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? (
        <div
          id={panelId}
          className="space-y-2 border-t border-border/60 px-2.5 py-2 text-[12px] leading-relaxed text-muted"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function HelpList({ items }: { items: string[] }) {
  return (
    <ul className="list-disc space-y-1 pl-4">
      {items.map((t) => (
        <li key={t}>{t}</li>
      ))}
    </ul>
  );
}

/**
 * Workspace preferences — active case for wrap/capture, report defaults, density.
 * Design: quiet case-room form with progressive disclosure for each option.
 */
export function SettingsPage() {
  const qc = useQueryClient();
  const settingsQ = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
  });
  const engagementsQ = useQuery({
    queryKey: ["engagements"],
    queryFn: () => api.listEngagements(),
  });

  const [activeId, setActiveId] = useState<string>("");
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const [autoImport, setAutoImport] = useState(true);
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");
  const [consoleCwd, setConsoleCwd] = useState<"workspace" | "engagement">("workspace");

  useEffect(() => {
    const s = settingsQ.data?.data;
    if (!s) return;
    setActiveId(s.activeEngagementId || "");
    setConfirmedOnly(s.reportConfirmedOnly);
    setAutoImport(s.autoImportOnWrap);
    setDensity(s.uiDensity === "compact" ? "compact" : "comfortable");
    setConsoleCwd(s.consoleCwd === "engagement" ? "engagement" : "workspace");
  }, [settingsQ.data?.data]);

  const save = useMutation({
    mutationFn: () =>
      api.updateSettings({
        activeEngagementId: activeId || null,
        reportConfirmedOnly: confirmedOnly,
        autoImportOnWrap: autoImport,
        uiDensity: density,
        consoleCwd,
      }),
    onSuccess: () => {
      toast.success("Settings saved");
      qc.invalidateQueries({ queryKey: ["settings"] });
      document.documentElement.dataset.density = density;
    },
    onError: (e: Error) => toast.error(e.message),
  });

  useEffect(() => {
    if (settingsQ.data?.data?.uiDensity) {
      document.documentElement.dataset.density = settingsQ.data.data.uiDensity;
    }
  }, [settingsQ.data?.data?.uiDensity]);

  const engagements = engagementsQ.data?.data ?? [];
  const activeName =
    engagements.find((e) => e.id === activeId)?.name ||
    (activeId ? activeId.slice(0, 10) : "None");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border bg-card/95 px-3 py-2 sm:px-5">
        <Link to="/" className="flex items-center gap-2 rounded-md hover:opacity-90">
          <SheafMark className="size-7" />
          <span className="text-[13px] font-medium tracking-[0.04em]">Sheaf</span>
        </Link>
        <span className="text-[12px] text-muted">Workspace preferences</span>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-4 pb-16 sm:px-6 lg:px-10">
        <div className="mx-auto w-full max-w-xl">
          <PageHeader
            eyebrow="Preferences"
            title="Settings"
            description="Stored in .sheaf/config.json. Expand “What this does” under each option for examples and side effects."
          />

          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[13px]">
                <Settings2 className="size-3.5 text-primary" />
                Active engagement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label>Casefile</Label>
                <Select
                  value={activeId || "__none__"}
                  onValueChange={(v) => setActiveId(v === "__none__" ? "" : v)}
                >
                  <SelectTrigger data-testid="settings-active-engagement">
                    <SelectValue placeholder="Select engagement" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {engagements.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                        {e.status === "archived" ? " (archived)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <p className="text-[11px] text-faint">
                Current: <span className="text-muted">{activeName}</span>
              </p>
              <SettingHelp defaultOpen>
                <p>
                  <strong className="text-foreground">Default casefile</strong> for tool
                  capture when you don’t pass an engagement id.
                </p>
                <HelpList
                  items={[
                    "sheaf wrap -- nmap -sV host → imports into this engagement",
                    "Console / Capture uses the engagement you opened; CLI wrap uses this when -e is omitted",
                    "Set to None if you want wrap to require an explicit -e (safer on shared machines)",
                  ]}
                />
                <p className="font-mono text-[11px] text-faint">
                  CLI: sheaf settings set --active &lt;id&gt;
                </p>
              </SettingHelp>
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px]">Capture & report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={autoImport}
                    onChange={(e) => setAutoImport(e.target.checked)}
                  />
                  <span>
                    <span className="block text-[13px] text-foreground">
                      Auto-import on wrap
                    </span>
                    <span className="text-[12px] text-muted">
                      Inject machine-readable flags and import known tools into the casefile.
                    </span>
                  </span>
                </label>
                <SettingHelp>
                  <p>
                    When <strong className="text-foreground">on</strong>, wrap/capture for
                    known tools (nmap, nuclei, httpx, ffuf, naabu) will:
                  </p>
                  <HelpList
                    items={[
                      "Add output flags if you didn’t (e.g. nmap -oX, nuclei -jsonl)",
                      "Save raw output under .sheaf/runs/<engagement>/",
                      "Parse and create assets / findings on the active case",
                    ]}
                  />
                  <p>
                    When <strong className="text-foreground">off</strong>, the command still
                    runs and output is saved, but nothing is imported — useful if you only
                    want a log file.
                  </p>
                  <p className="text-faint">
                    Authorized targets only. You are responsible for ROE and scope.
                  </p>
                </SettingHelp>
              </div>

              <div className="space-y-2">
                <label className="flex cursor-pointer items-start gap-3">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={confirmedOnly}
                    onChange={(e) => setConfirmedOnly(e.target.checked)}
                  />
                  <span>
                    <span className="block text-[13px] text-foreground">
                      Default report: confirmed only
                    </span>
                    <span className="text-[12px] text-muted">
                      Report page starts with the “Confirmed only” filter.
                    </span>
                  </span>
                </label>
                <SettingHelp>
                  <p>
                    Controls the <strong className="text-foreground">initial filter</strong>{" "}
                    on the Report page for this workspace (you can still switch in the UI).
                  </p>
                  <HelpList
                    items={[
                      "On → client-ready draft: only findings marked confirmed",
                      "Off → all active findings (drafts / needs review included)",
                      "Does not change finding status or archive anything",
                    ]}
                  />
                </SettingHelp>
              </div>

              <div className="space-y-2">
                <div className="space-y-1.5">
                  <Label>Console default cwd</Label>
                  <Select
                    value={consoleCwd}
                    onValueChange={(v) =>
                      setConsoleCwd(v === "engagement" ? "engagement" : "workspace")
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="workspace">Workspace root</SelectItem>
                      <SelectItem value="engagement">Engagement evidence folder</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <SettingHelp>
                  <p>
                    Preferred working directory for job-console / capture context (where
                    relative paths resolve).
                  </p>
                  <HelpList
                    items={[
                      "Workspace root → the folder that contains .sheaf/ (good for general tools)",
                      "Engagement evidence folder → under .sheaf/evidence/<id>/ (handy for saving dumps next to the case)",
                      "Does not change where wrap stores run outputs (always .sheaf/runs/…)",
                    ]}
                  />
                </SettingHelp>
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px]">Interface</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="space-y-1.5">
                <Label>Density</Label>
                <Select
                  value={density}
                  onValueChange={(v) =>
                    setDensity(v === "compact" ? "compact" : "comfortable")
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <SettingHelp>
                <p>UI spacing preference for this workspace.</p>
                <HelpList
                  items={[
                    "Comfortable → default type size and breathing room",
                    "Compact → slightly denser text for smaller screens or long finding lists",
                    "Applies after Save (sets data-density on the page)",
                  ]}
                />
              </SettingHelp>
            </CardContent>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button
              data-testid="settings-save"
              disabled={save.isPending}
              onClick={() => save.mutate()}
            >
              <Check className="size-3.5" />
              {save.isPending ? "Saving…" : "Save settings"}
            </Button>
            <Button variant="secondary" asChild>
              <Link to="/">Back to engagements</Link>
            </Button>
          </div>

          <details className="mt-8 rounded-md border border-border bg-card open:pb-0">
            <summary className="cursor-pointer list-none px-3 py-2 text-[12px] text-muted marker:content-none [&::-webkit-details-marker]:hidden">
              <span className="inline-flex items-center gap-2">
                <CircleHelp className="size-3.5 text-primary/80" />
                Advanced: CLI equivalents
                <ChevronDown className="size-3.5 text-faint" />
              </span>
            </summary>
            <pre className="overflow-x-auto border-t border-border px-3 py-2 font-mono text-[11px] text-muted">
              {`pnpm sheaf -- settings get
pnpm sheaf -- settings set --active <engagement-id>
pnpm sheaf -- settings set --auto-import
pnpm sheaf -- settings set --no-auto-import
pnpm sheaf -- settings set --confirmed-only
pnpm sheaf -- wrap -e <id> -- nmap -sV scanme.nmap.org
pnpm sheaf -- wrap -- nuclei -u https://example.com   # uses active engagement`}
            </pre>
          </details>
        </div>
      </div>
    </div>
  );
}
