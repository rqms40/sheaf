import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Link,
  Outlet,
  useNavigate,
  useParams,
  useRouterState,
} from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  Download,
  FileJson,
  FileOutput,
  LayoutList,
  Menu,
  PanelLeft,
  Pencil,
  Settings2,
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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { api } from "@/lib/api";
import { downloadJson, downloadText, slugFile } from "@/lib/download";
import {
  ENGAGEMENT_NAV,
  NAV_GROUPS,
  bottomNav,
  isGroupActive,
  navItemsInGroup,
  rememberCasePath,
  type NavItem,
} from "@/lib/nav";
import { cn } from "@/lib/utils";

/** Logo only in the left rail — collapse control lives in the main header. */
function SidebarBrandRow() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  return (
    <div
      className={cn(
        "flex h-full w-full items-center",
        collapsed && "justify-center",
      )}
    >
      <Link
        to="/"
        className={cn(
          "flex min-w-0 items-center gap-2 rounded-md px-1 hover:opacity-90",
          collapsed ? "justify-center" : "flex-1",
        )}
        title="All engagements"
      >
        <SheafMark className="size-7 shrink-0" />
        {!collapsed ? (
          <span className="truncate text-[13px] font-medium leading-none tracking-[0.04em]">
            Sheaf
          </span>
        ) : null}
      </Link>
    </div>
  );
}

/**
 * Grouped nav: one control per Casework / Ops / Deliver.
 * Click opens the pages in that group (compact rail + collapsed sidebar).
 */
function NavGroupMenu({
  groupId,
  engagementId,
  pathname,
  variant,
}: {
  groupId: NavItem["group"];
  engagementId: string;
  pathname: string;
  variant: "rail" | "sidebar-icon";
}) {
  const group = NAV_GROUPS.find((g) => g.id === groupId)!;
  const items = navItemsInGroup(groupId);
  const active = isGroupActive(pathname, engagementId, groupId);
  const GroupIcon = group.icon;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {variant === "sidebar-icon" ? (
          <SidebarMenuButton
            type="button"
            isActive={active}
            tooltip={group.label}
            className={cn(active && "text-primary")}
          >
            <GroupIcon />
          </SidebarMenuButton>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 gap-1 px-2.5 text-[12px] font-medium",
              active
                ? "bg-elevated text-foreground shadow-sm ring-1 ring-border"
                : "text-muted hover:text-foreground",
            )}
          >
            {group.label}
            <ChevronDown className="size-3.5 opacity-60" />
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={variant === "sidebar-icon" ? "start" : "start"}
        side={variant === "sidebar-icon" ? "right" : "bottom"}
        sideOffset={6}
        className="w-52"
      >
        <DropdownMenuLabel className="text-[10px] uppercase tracking-[0.12em] text-faint">
          {group.label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => {
          const href = `/e/${engagementId}/${item.to}`;
          const isActive = pathname.startsWith(href);
          const Icon = item.icon;
          return (
            <DropdownMenuItem key={item.to} asChild>
              <Link
                to={`/e/$engagementId/${item.to}` as "/e/$engagementId/findings"}
                params={{ engagementId }}
                className={cn(
                  "cursor-pointer",
                  isActive && "bg-elevated text-foreground",
                )}
              >
                <Icon className="size-3.5 shrink-0 text-muted" />
                <span className="flex-1">{item.label}</span>
                {isActive ? (
                  <span className="size-1.5 shrink-0 rounded-full bg-primary" />
                ) : null}
              </Link>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Collapsed sidebar: 3 group icons that open page menus */
function SidebarCollapsedNav({
  engagementId,
  pathname,
}: {
  engagementId: string;
  pathname: string;
}) {
  return (
    <SidebarMenu>
      {NAV_GROUPS.map((g) => (
        <SidebarMenuItem key={g.id}>
          <NavGroupMenu
            groupId={g.id}
            engagementId={engagementId}
            pathname={pathname}
            variant="sidebar-icon"
          />
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  );
}

/** Expanded sidebar: full labeled groups */
function SidebarExpandedNav({
  engagementId,
  pathname,
}: {
  engagementId: string;
  pathname: string;
}) {
  return (
    <>
      {NAV_GROUPS.map((g) => (
        <SidebarGroup key={g.id}>
          <SidebarGroupLabel>{g.label}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItemsInGroup(g.id).map((item) => {
                const href = `/e/${engagementId}/${item.to}`;
                const active = pathname.startsWith(href);
                const Icon = item.icon;
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.label}>
                      <Link
                        to={`/e/$engagementId/${item.to}` as "/e/$engagementId/findings"}
                        params={{ engagementId }}
                      >
                        <Icon />
                        <span data-sidebar-label="">{item.label}</span>
                        {active ? (
                          <span
                            data-sidebar-label=""
                            className="ml-auto size-1.5 shrink-0 rounded-full bg-primary"
                            aria-hidden
                          />
                        ) : null}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      ))}
    </>
  );
}

function SidebarNavBody({
  engagementId,
  pathname,
}: {
  engagementId: string;
  pathname: string;
}) {
  const { state } = useSidebar();
  if (state === "collapsed") {
    return (
      <SidebarCollapsedNav engagementId={engagementId} pathname={pathname} />
    );
  }
  return (
    <SidebarExpandedNav engagementId={engagementId} pathname={pathname} />
  );
}

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
  const settingsQ = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
  });
  const layout = settingsQ.data?.data.uiLayout === "sidebar" ? "sidebar" : "rail";
  const density =
    settingsQ.data?.data.uiDensity === "compact" ? "compact" : "comfortable";
  /** Compact density on top-rail: group menus instead of 7 flat links */
  const useGroupedRailNav = layout === "rail" && density === "compact";

  const engagement = data?.data;
  const archived = engagement?.status === "archived";
  const baseName = slugFile(engagement?.name || engagementId.slice(0, 8));

  useEffect(() => {
    setMobileNav(false);
    rememberCasePath(pathname);
  }, [pathname]);

  useEffect(() => {
    if (engagement && !renameOpen) {
      setRenameName(engagement.name);
      setRenameClient(engagement.client || "");
    }
  }, [engagement?.id, engagement?.name, engagement?.client, renameOpen]);

  useEffect(() => {
    document.documentElement.dataset.layout = layout;
  }, [layout]);

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

  function openRename() {
    if (!engagement) return;
    setRenameName(engagement.name);
    setRenameClient(engagement.client || "");
    setRenameOpen(true);
  }

  function navLink(
    item: NavItem,
    opts?: { mobile?: boolean; bottom?: boolean; sidebar?: boolean },
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
    if (opts?.sidebar) {
      return (
        <Link
          key={item.to}
          to={`/e/$engagementId/${item.to}` as "/e/$engagementId/findings"}
          params={{ engagementId }}
          className={cn(
            "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] transition-colors",
            active
              ? "bg-elevated text-foreground shadow-sm ring-1 ring-border"
              : "text-muted hover:bg-elevated/50 hover:text-foreground",
          )}
        >
          <Icon className="size-4 shrink-0 opacity-90" />
          <span className="truncate">{item.label}</span>
          {active ? (
            <span className="ml-auto size-1.5 rounded-full bg-primary" aria-hidden />
          ) : null}
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

  function downloadMenu(opts?: { sidebar?: boolean; iconOnly?: boolean }) {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          {opts?.sidebar ? (
            <SidebarMenuButton type="button" tooltip="Download / export">
              <Download />
              <span data-sidebar-label="">Download</span>
            </SidebarMenuButton>
          ) : (
            <Button
              variant="secondary"
              size={opts?.iconOnly ? "icon" : "sm"}
              className={opts?.iconOnly ? undefined : "px-2 sm:px-3"}
            >
              <Download className="size-3.5" />
              {!opts?.iconOnly ? (
                <span className="hidden sm:inline">Download</span>
              ) : null}
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="right" className="w-52">
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
    );
  }

  const renameDialog = (
    <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rename engagement</DialogTitle>
          <DialogDescription>Update the case name and client label.</DialogDescription>
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
  );

  /* ── Sidebar layout (optional, Settings → Interface) — shadcn-style collapsible ── */
  if (layout === "sidebar") {
    return (
      <SidebarProvider className="h-full">
        <Sidebar collapsible="icon">
          <SidebarHeader>
            <SidebarBrandRow />
          </SidebarHeader>

          <SidebarContent>
            <SidebarNavBody engagementId={engagementId} pathname={pathname} />
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>{downloadMenu({ sidebar: true })}</SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  type="button"
                  tooltip={archived ? "Restore" : "Archive"}
                  disabled={archiveMut.isPending || !engagement}
                  onClick={() => archiveMut.mutate(!archived)}
                >
                  {archived ? <ArchiveRestore /> : <Archive />}
                  <span data-sidebar-label="">{archived ? "Restore" : "Archive"}</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Settings">
                  <Link to="/settings" search={{ returnTo: pathname }}>
                    <Settings2 />
                    <span data-sidebar-label="">Settings</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="All engagements">
                  <Link to="/" onClick={() => navigate({ to: "/" })}>
                    <LayoutList />
                    <span data-sidebar-label="">All engagements</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        <SidebarInset>
          {/* Desktop header: same height as sidebar header so borders align */}
          <header
            className="z-20 hidden h-[var(--sidebar-header-height,3rem)] shrink-0 items-center gap-2 border-b border-border bg-card/80 px-2 backdrop-blur md:flex"
          >
            <SidebarTrigger className="size-8 shrink-0" />
            <button
              type="button"
              className="group flex min-w-0 max-w-md items-center gap-1.5 rounded-md px-1.5 py-1 text-left hover:bg-elevated/40"
              title="Rename engagement"
              onClick={openRename}
            >
              <span className="truncate text-[13px] font-medium leading-none text-foreground">
                {engagement?.name ?? "…"}
              </span>
              {engagement?.client ? (
                <span className="truncate text-[12px] leading-none text-muted">
                  · {engagement.client}
                </span>
              ) : null}
              <Pencil className="size-3 shrink-0 text-faint opacity-50 transition-opacity group-hover:opacity-100" />
              {archived ? (
                <span className="shrink-0 text-[10px] uppercase tracking-wide text-faint">
                  archived
                </span>
              ) : null}
            </button>
            <div className="ml-auto flex items-center gap-1">{downloadMenu()}</div>
          </header>

          {/* Mobile top bar */}
          <header className="z-20 flex shrink-0 items-center justify-between gap-2 border-b border-border bg-card/95 px-2 py-2 backdrop-blur md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMobileNav((v) => !v)}
              aria-label={mobileNav ? "Close menu" : "Open menu"}
            >
              {mobileNav ? <X className="size-4" /> : <Menu className="size-4" />}
            </Button>
            <button
              type="button"
              className="min-w-0 flex-1 truncate text-left text-[13px] font-medium"
              onClick={openRename}
            >
              {engagement?.name ?? "…"}
            </button>
            {downloadMenu({ iconOnly: true })}
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
                {ENGAGEMENT_NAV.map((item) => navLink(item, { mobile: true }))}
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
        </SidebarInset>
        {renameDialog}
      </SidebarProvider>
    );
  }

  /* ── Rail layout (default — original compact top nav) ── */
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid="layout-rail">
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
            onClick={openRename}
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
          <nav
            className={cn(
              "hidden items-center md:flex",
              useGroupedRailNav ? "gap-1.5" : "gap-0.5",
            )}
            aria-label={useGroupedRailNav ? "Grouped navigation" : "Navigation"}
          >
            {useGroupedRailNav
              ? NAV_GROUPS.map((g) => (
                  <NavGroupMenu
                    key={g.id}
                    groupId={g.id}
                    engagementId={engagementId}
                    pathname={pathname}
                    variant="rail"
                  />
                ))
              : ENGAGEMENT_NAV.map((item) => navLink(item))}
          </nav>

          <Separator orientation="vertical" className="mx-0.5 hidden h-5 md:block" />

          {downloadMenu()}

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
            to="/settings"
            search={{ returnTo: pathname }}
            className="hidden items-center rounded-md p-2 text-muted hover:bg-elevated/50 hover:text-foreground sm:inline-flex"
            title="Settings"
          >
            <Settings2 className="size-[15px]" />
          </Link>

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
            {ENGAGEMENT_NAV.map((item) => navLink(item, { mobile: true }))}
            <Separator className="my-2" />
            <button
              type="button"
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-left text-[13px] text-muted hover:bg-elevated/50 hover:text-foreground"
              onClick={() => {
                openRename();
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
            <Link
              to="/settings"
              search={{ returnTo: pathname }}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 text-[13px] text-muted hover:bg-elevated/50 hover:text-foreground"
              onClick={() => setMobileNav(false)}
            >
              <PanelLeft className="size-4" />
              Settings / layout
            </Link>
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

      {renameDialog}
    </div>
  );
}
