import {
  Activity,
  Briefcase,
  Bug,
  Crosshair,
  FileOutput,
  History,
  ListChecks,
  Package,
  SquareTerminal,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  to: "findings" | "scope" | "runs" | "console" | "checklist" | "timeline" | "report";
  label: string;
  icon: LucideIcon;
  /** Primary bottom-tab on mobile */
  primary: boolean;
  /** Sidebar section */
  group: "work" | "ops" | "deliver";
};

/** Engagement navigation — shared by rail (top) and sidebar layouts. */
export const ENGAGEMENT_NAV: NavItem[] = [
  { to: "findings", label: "Findings", icon: Bug, primary: true, group: "work" },
  { to: "scope", label: "Scope", icon: Crosshair, primary: true, group: "work" },
  { to: "checklist", label: "Checklist", icon: ListChecks, primary: true, group: "work" },
  { to: "runs", label: "Runs", icon: Activity, primary: false, group: "ops" },
  { to: "console", label: "Console", icon: SquareTerminal, primary: false, group: "ops" },
  { to: "timeline", label: "Timeline", icon: History, primary: false, group: "ops" },
  { to: "report", label: "Report", icon: FileOutput, primary: true, group: "deliver" },
];

export const NAV_GROUPS: Array<{
  id: NavItem["group"];
  label: string;
  /** Icon for compact/collapsed group control */
  icon: LucideIcon;
}> = [
  { id: "work", label: "Casework", icon: Briefcase },
  { id: "ops", label: "Ops", icon: Activity },
  { id: "deliver", label: "Deliver", icon: Package },
];

export const bottomNav = ENGAGEMENT_NAV.filter((item) => item.primary);

export function navItemsInGroup(group: NavItem["group"]): NavItem[] {
  return ENGAGEMENT_NAV.filter((n) => n.group === group);
}

export function isGroupActive(pathname: string, engagementId: string, group: NavItem["group"]) {
  return navItemsInGroup(group).some((item) =>
    pathname.startsWith(`/e/${engagementId}/${item.to}`),
  );
}

/** Safe in-app engagement path (used for settings returnTo / last-case). */
const ENGAGEMENT_PATH_RE = /^\/e\/[^/]+(\/.*)?$/;

const LAST_CASE_PATH_KEY = "sheaf:lastCasePath";

export function isEngagementPath(path: string): boolean {
  return ENGAGEMENT_PATH_RE.test(path);
}

/** Remember the last case page so Settings can return without going home. */
export function rememberCasePath(pathname: string): void {
  if (!isEngagementPath(pathname)) return;
  try {
    sessionStorage.setItem(LAST_CASE_PATH_KEY, pathname);
  } catch {
    /* private mode / blocked storage */
  }
}

export function getLastCasePath(): string | null {
  try {
    const raw = sessionStorage.getItem(LAST_CASE_PATH_KEY);
    if (raw && isEngagementPath(raw)) return raw;
  } catch {
    /* ignore */
  }
  return null;
}

/**
 * Prefer explicit returnTo → last visited case → active engagement findings → home.
 */
export function resolveSettingsBackPath(
  returnTo: string | undefined,
  activeEngagementId?: string | null,
): string {
  if (returnTo && isEngagementPath(returnTo)) return returnTo;
  const last = getLastCasePath();
  if (last) return last;
  if (activeEngagementId) return `/e/${activeEngagementId}/findings`;
  return "/";
}
