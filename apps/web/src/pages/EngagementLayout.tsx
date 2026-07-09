import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  useNavigate,
  useParams,
  useRouterState,
} from "@tanstack/react-router";
import {
  Activity,
  Archive,
  ArchiveRestore,
  Bug,
  Crosshair,
  Download,
  FileJson,
  FileOutput,
  History,
  LayoutList,
  ListChecks,
  Menu,
  Pencil,
  SquareTerminal,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { SheafMark } from "@/components/sheaf/Logo";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";
import { downloadJson, downloadText, slugFile } from "@/lib/download";
import { cn } from "@/lib/utils";

/** Full nav: desktop header + mobile sidebar. Bottom bar uses primary only. */
const nav = [
  { to: "findings", label: "Findings", icon: Bug, primary: true },
  { to: "scope", label: "Scope", icon: Crosshair, primary: true },
  { to: "runs", label: "Runs", icon: Activity, primary: false },
  { to: "console", label: "Console", icon: SquareTerminal, primary: false },
  { to: "checklist", label: "Checklist", icon: ListChecks, primary: true },
  { to: "timeline", label: "Timeline", icon: History, primary: false },
  { to: "report", label: "Report", icon: FileOutput, primary: true },
] as const;

const bottomNav = nav.filter((item) => item.primary);

export function EngagementLayout() {
  const { engagementId } = useParams({ strict: false }) as { engagementId: string };
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [mobileNav, setMobileNav] = useState(false);
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameName, setRenameName] = useState("");
  const [renameClient, setRenameClient] = useState("");

  const { data } = useQuery({
    queryKey: ["engagement", engagementId],
    queryFn: () => api.getEngagement(engagementId),
  });
  const engagement = data?.data;
  const archived = engagement?.status === "archived";
  const baseName = slugFile(engagement?.name || engagementId.slice(0, 8));

  useEffect(() => {
    setMobileNav(false);
  }, [pathname]);

  useEffect(() => {
    if (engagement && !renameOpen) {
      setRenameName(engagement.name);
      setRenameClient(engagement.client || "");
    }
  }, [engagement?.id, engagement?.name, engagement?.client, renameOpen]);

  const archiveMut = useMutation({
    mutationFn: (archive: boolean) => api.archiveEngagement(engagementId, archive),
    onSuccess: (res) => {
      toast.success(
        res.data.status === "archived" ? "Engagement archived" : "Engagement restored",
      );
      qc.invalidateQueries({ queryKey: ["engagement", engagementId] });
      qc.invalidateQueries({ queryKey: ["engagements"] });
      qc.invalidateQueries({ queryKey: ["timeline", engagementId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const renameMut = useMutation({
    mutationFn: () =>
      api.updateEngagement(engagementId, {
        name: renameName.trim(),
        client: renameClient.trim() || null,
      }),
    onSuccess: () => {
      toast.success("Engagement renamed");
      setRenameOpen(false);
      qc.invalidateQueries({ queryKey: ["engagement", engagementId] });
      qc.invalidateQueries({ queryKey: ["engagements"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  async function downloadReport() {
    try {
      const md = await api.reportMarkdown(engagementId);
      downloadText(`${baseName}-report.md`, md, "text/markdown;charset=utf-8");
      toast.success("Report downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    }
  }

  async function downloadFindingsJson() {
    try {
      const res = await api.listFindings(engagementId);
      downloadJson(`${baseName}-findings.json`, {
        engagementId,
        exportedAt: new Date().toISOString(),
        findings: res.data,
      });
      toast.success("Findings JSON downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Download failed");
    }
  }

  async function downloadFullExport() {
    try {
      const res = await api.exportPackage(engagementId);
      downloadJson(`${baseName}-sheaf-export.json`, res.data);
      if (typeof res.data.reportMarkdown === "string") {
        downloadText(
          `${baseName}-report.md`,
          res.data.reportMarkdown as string,
          "text/markdown;charset=utf-8",
        );
      }
      toast.success("Export package downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }

  function navLink(
    item: (typeof nav)[number],
    opts?: { mobile?: boolean; bottom?: boolean },
  ) {
    const href = `/e/${engagementId}/${item.to}`;
    const active = pathname.startsWith(href);
    const Icon = item.icon;
    if (opts?.bottom) {
      return (
        <Link
          key={item.to}
          to={`/e/$engagementId/${item.to}` as "/e/$engagementId/findings"}
          params={{ engagementId }}
          className={cn(
            "flex min-w-0 flex-1 flex-col items-center gap-0.5 rounded-md px-0.5 py-1.5 text-[10px]",
            active ? "text-primary" : "text-muted",
          )}
        >
          <Icon className="size-4 shrink-0" />
          <span className="max-w-full truncate">{item.label}</span>
        </Link>
      );
    }
    return (
      <Link
        key={item.to}
        to={`/e/$engagementId/${item.to}` as "/e/$engagementId/findings"}
        params={{ engagementId }}
        className={cn(
          opts?.mobile
            ? "flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px]"
            : "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[12px] transition-colors lg:px-2.5",
          active
            ? opts?.mobile
              ? "bg-elevated text-foreground"
              : "bg-elevated text-foreground shadow-sm ring-1 ring-border"
            : "text-muted hover:bg-elevated/50 hover:text-foreground",
        )}
      >
        <Icon className={cn("shrink-0", opts?.mobile ? "size-4" : "size-[15px]")} />
        {opts?.mobile ? (
          item.label
        ) : (
          <span className="hidden lg:inline">{item.label}</span>
        )}
      </Link>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="z-20 flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card/95 px-2 py-2 backdrop-blur sm:gap-3 sm:px-3">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 md:hidden"
            onClick={() => setMobileNav((v) => !v)}
            aria-label={mobileNav ? "Close menu" : "Open menu"}
          >
            {mobileNav ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>

          <Link
            to="/"
            className="flex shrink-0 items-center gap-2 rounded-md hover:opacity-90"
            title="All engagements"
          >
            <SheafMark className="size-7" />
            <span className="hidden text-[13px] font-medium tracking-[0.04em] sm:inline">
              Sheaf
            </span>
          </Link>
          <Separator orientation="vertical" className="mx-0.5 hidden h-5 sm:block" />
          <button
            type="button"
            className="group min-w-0 flex-1 rounded-md px-1 py-0.5 text-left hover:bg-elevated/40"
            title="Rename engagement"
            onClick={() => {
              if (!engagement) return;
              setRenameName(engagement.name);
              setRenameClient(engagement.client || "");
              setRenameOpen(true);
            }}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <span className="truncate text-[12px] font-medium leading-tight sm:text-[13px]">
                {engagement?.name ?? "…"}
              </span>
              <Pencil className="size-3 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-60" />
              {archived ? (
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-faint">
                  archived
                </span>
              ) : null}
            </div>
            {engagement?.client ? (
              <div className="hidden truncate text-[11px] text-muted sm:block">
                {engagement.client}
              </div>
            ) : null}
          </button>
        </div>

        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <nav className="hidden items-center gap-0.5 md:flex">
            {nav.map((item) => navLink(item))}
          </nav>

          <Separator orientation="vertical" className="mx-0.5 hidden h-5 md:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="sm" className="px-2 sm:px-3">
                <Download className="size-3.5" />
                <span className="hidden sm:inline">Download</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Export engagement</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => void downloadReport()}>
                <FileOutput className="size-3.5" />
                Report (.md)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void downloadFindingsJson()}>
                <FileJson className="size-3.5" />
                Findings (.json)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => void downloadFullExport()}>
                <Download className="size-3.5" />
                Full package
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            variant="ghost"
            size="icon"
            className="hidden sm:inline-flex"
            disabled={archiveMut.isPending || !engagement}
            onClick={() => archiveMut.mutate(!archived)}
            title={archived ? "Restore engagement" : "Archive engagement"}
          >
            {archived ? (
              <ArchiveRestore className="size-3.5" />
            ) : (
              <Archive className="size-3.5" />
            )}
          </Button>

          <Link
            to="/"
            className="inline-flex items-center rounded-md p-2 text-muted hover:bg-elevated/50 hover:text-foreground"
            title="All engagements"
            onClick={() => navigate({ to: "/" })}
          >
            <LayoutList className="size-[15px]" />
          </Link>
        </div>
      </header>

      {mobileNav ? (
        <>
          <button
            type="button"
            className="fixed inset-0 top-12 z-30 bg-black/50 md:hidden"
            aria-label="Close menu"
            onClick={() => setMobileNav(false)}
          />
          <nav
            className="fixed bottom-14 left-0 top-12 z-40 flex w-[min(100%,280px)] flex-col overflow-y-auto border-r border-border bg-card p-2 shadow-xl md:hidden"
            data-testid="mobile-sidebar"
          >
            <div className="mb-2 px-2 py-1 text-[11px] uppercase tracking-wide text-faint">
              All pages
            </div>
            {nav.map((item) => navLink(item, { mobile: true }))}
            <Separator className="my-2" />
            <button
              type="button"
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-[13px] text-muted hover:bg-elevated/50 hover:text-foreground"
              onClick={() => {
                if (!engagement) return;
                setRenameName(engagement.name);
                setRenameClient(engagement.client || "");
                setRenameOpen(true);
                setMobileNav(false);
              }}
            >
              <Pencil className="size-4" />
              Rename engagement
            </button>
            <button
              type="button"
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-[13px] text-muted hover:bg-elevated/50 hover:text-foreground"
              disabled={archiveMut.isPending || !engagement}
              onClick={() => {
                archiveMut.mutate(!archived);
                setMobileNav(false);
              }}
            >
              {archived ? (
                <ArchiveRestore className="size-4" />
              ) : (
                <Archive className="size-4" />
              )}
              {archived ? "Restore engagement" : "Archive engagement"}
            </button>
          </nav>
        </>
      ) : null}

      <div className="min-h-0 flex-1 overflow-hidden">
        <Outlet />
      </div>

      <nav
        className="z-20 flex shrink-0 items-stretch justify-around border-t border-border bg-card/95 px-0.5 py-0.5 pb-[max(0.25rem,env(safe-area-inset-bottom))] md:hidden"
        data-testid="mobile-bottom-nav"
        aria-label="Primary navigation"
      >
        {bottomNav.map((item) => navLink(item, { bottom: true }))}
      </nav>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename engagement</DialogTitle>
            <DialogDescription>
              Update the case name and client label.
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(ev) => {
              ev.preventDefault();
              if (!renameName.trim()) return;
              renameMut.mutate();
            }}
          >
            <div className="space-y-1.5">
              <Label htmlFor="case-rename-name">Name</Label>
              <Input
                id="case-rename-name"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                autoFocus
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="case-rename-client">Client</Label>
              <Input
                id="case-rename-client"
                value={renameClient}
                onChange={(e) => setRenameClient(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRenameOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={!renameName.trim() || renameMut.isPending}>
                {renameMut.isPending ? "Saving…" : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
