import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SIDEBAR_COOKIE = "sheaf-sidebar";
const SIDEBAR_WIDTH = "14.5rem";
const SIDEBAR_WIDTH_ICON = "3.25rem";
/** Shared with main inset header so horizontal rules line up */
export const SIDEBAR_HEADER_HEIGHT = "3rem";

type SidebarContextValue = {
  open: boolean;
  setOpen: (open: boolean | ((v: boolean) => boolean)) => void;
  toggle: () => void;
  state: "expanded" | "collapsed";
};

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

export function useSidebar() {
  const ctx = React.useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}

function readStoredOpen(): boolean {
  try {
    const v = localStorage.getItem(SIDEBAR_COOKIE);
    if (v === "0") return false;
    if (v === "1") return true;
  } catch {
    // ignore
  }
  return true;
}

export function SidebarProvider({
  children,
  defaultOpen,
  className,
}: {
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpenState] = React.useState(() =>
    defaultOpen !== undefined ? defaultOpen : readStoredOpen(),
  );

  const setOpen = React.useCallback((value: boolean | ((v: boolean) => boolean)) => {
    setOpenState((prev) => {
      const next = typeof value === "function" ? value(prev) : value;
      try {
        localStorage.setItem(SIDEBAR_COOKIE, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  }, []);

  const toggle = React.useCallback(() => setOpen((v) => !v), [setOpen]);

  const value = React.useMemo(
    () => ({
      open,
      setOpen,
      toggle,
      state: open ? ("expanded" as const) : ("collapsed" as const),
    }),
    [open, setOpen, toggle],
  );

  return (
    <SidebarContext.Provider value={value}>
      <div
        data-slot="sidebar-wrapper"
        className={cn("group/sidebar-wrapper flex h-full min-h-0 w-full", className)}
        style={
          {
            "--sidebar-width": SIDEBAR_WIDTH,
            "--sidebar-width-icon": SIDEBAR_WIDTH_ICON,
            "--sidebar-header-height": SIDEBAR_HEADER_HEIGHT,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </SidebarContext.Provider>
  );
}

export function Sidebar({
  children,
  className,
  collapsible = "icon",
}: {
  children: React.ReactNode;
  className?: string;
  /** icon = collapse to icon rail; none = fixed expanded */
  collapsible?: "icon" | "none";
}) {
  const { state } = useSidebar();
  return (
    <aside
      data-slot="sidebar"
      data-state={state}
      data-collapsible={collapsible === "icon" ? state : "none"}
      data-testid="layout-sidebar"
      className={cn(
        "sheaf-sidebar group/sidebar peer hidden shrink-0 flex-col border-r border-border bg-card/95 text-foreground transition-[width] duration-200 ease-out md:flex",
        "w-[var(--sidebar-width)] data-[state=collapsed]:w-[var(--sidebar-width-icon)]",
        // icon-mode helpers for children
        "data-[state=collapsed]:[&_[data-sidebar-label]]:hidden",
        "data-[state=collapsed]:[&_[data-sidebar-case]]:hidden",
        "data-[state=collapsed]:[&_[data-sidebar-group-label]]:sr-only",
        className,
      )}
    >
      {children}
    </aside>
  );
}

export function SidebarHeader({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { state } = useSidebar();
  return (
    <div
      data-slot="sidebar-header"
      data-state={state}
      className={cn(
        "flex h-[var(--sidebar-header-height,3rem)] shrink-0 items-center border-b border-border px-2",
        state === "collapsed" && "justify-center px-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SidebarFooter({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const { state } = useSidebar();
  return (
    <div
      data-slot="sidebar-footer"
      data-state={state}
      className={cn(
        "mt-auto flex shrink-0 flex-col gap-1 border-t border-border p-2",
        state === "collapsed" && "items-center px-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SidebarContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-slot="sidebar-content"
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overflow-x-hidden p-2",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SidebarGroup({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-slot="sidebar-group" className={cn("relative flex w-full min-w-0 flex-col", className)}>
      {children}
    </div>
  );
}

export function SidebarGroupLabel({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-slot="sidebar-group-label"
      data-sidebar-group-label=""
      className={cn(
        "flex h-7 shrink-0 items-center rounded-md px-2.5 text-[10px] font-medium uppercase tracking-[0.14em] text-faint",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function SidebarGroupContent({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div data-slot="sidebar-group-content" className={cn("w-full space-y-0.5", className)}>
      {children}
    </div>
  );
}

export function SidebarMenu({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <ul data-slot="sidebar-menu" className={cn("flex w-full min-w-0 flex-col gap-0.5", className)}>
      {children}
    </ul>
  );
}

export function SidebarMenuItem({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <li data-slot="sidebar-menu-item" className={cn("group/menu-item relative", className)}>
      {children}
    </li>
  );
}

export const sidebarMenuButtonVariants = {
  base:
    "peer/menu-button flex w-full items-center gap-2.5 overflow-hidden rounded-md px-2.5 py-2 text-left text-[13px] outline-none transition-colors hover:bg-elevated/50 hover:text-foreground focus-visible:ring-1 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0",
  active: "bg-elevated text-foreground shadow-sm ring-1 ring-border",
  inactive: "text-muted",
};

export function SidebarMenuButton({
  className,
  isActive,
  children,
  asChild = false,
  tooltip,
  ...props
}: React.ComponentProps<"button"> & {
  isActive?: boolean;
  asChild?: boolean;
  tooltip?: string;
}) {
  const { state } = useSidebar();
  const Comp = asChild ? Slot : "button";
  const collapsed = state === "collapsed";
  return (
    <Comp
      data-slot="sidebar-menu-button"
      data-active={isActive || undefined}
      title={collapsed ? tooltip : undefined}
      className={cn(
        sidebarMenuButtonVariants.base,
        isActive ? sidebarMenuButtonVariants.active : sidebarMenuButtonVariants.inactive,
        collapsed && "size-9 justify-center gap-0 p-0 mx-auto",
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}

export function SidebarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggle, state } = useSidebar();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(className)}
      onClick={toggle}
      title={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
      aria-label={state === "expanded" ? "Collapse sidebar" : "Expand sidebar"}
      data-testid="sidebar-trigger"
      {...props}
    >
      <PanelLeft className="size-4" />
    </Button>
  );
}

export function SidebarInset({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-slot="sidebar-inset"
      className={cn("flex min-h-0 min-w-0 flex-1 flex-col", className)}
    >
      {children}
    </div>
  );
}

export function SidebarSeparator({ className }: { className?: string }) {
  return (
    <div
      data-slot="sidebar-separator"
      className={cn("mx-2 my-1 h-px bg-border", className)}
    />
  );
}
