import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Check, Settings2 } from "lucide-react";
import { useEffect, useState } from "react";
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

/**
 * Workspace preferences — active case for wrap/capture, report defaults, density.
 * Design: quiet case-room form, not a SaaS settings labyrinth.
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
            description="Active casefile for wrap/capture, report defaults, and UI density. Stored in .sheaf/config.json."
          />

          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-[13px]">
                <Settings2 className="size-3.5 text-primary" />
                Active engagement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-[12px] text-muted">
                Used by <code className="font-mono text-[11px]">sheaf wrap</code> and in-app
                Capture when you omit <code className="font-mono text-[11px]">-e</code>.
              </p>
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
            </CardContent>
          </Card>

          <Card className="mb-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px]">Capture & report</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                    When wrapping nmap/nuclei/httpx/ffuf/naabu, inject machine-readable
                    flags and import into the active casefile.
                  </span>
                </span>
              </label>
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
                    Report page opens with confirmed findings filter when enabled.
                  </span>
                </span>
              </label>
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
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-[13px]">Interface</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
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

          <pre className="mt-8 overflow-x-auto rounded-md border border-border bg-card p-3 font-mono text-[11px] text-muted">
            {`# CLI equivalents
pnpm sheaf -- settings get
pnpm sheaf -- settings set --active <engagement-id>
pnpm sheaf -- wrap -e <id> -- nmap -sV scanme.nmap.org
pnpm sheaf -- wrap -- nuclei -u https://example.com   # uses active engagement`}
          </pre>
        </div>
      </div>
    </div>
  );
}
