import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { HomePage } from "./pages/HomePage";
import { EngagementLayout } from "./pages/EngagementLayout";
import { FindingsPage } from "./pages/FindingsPage";
import { ScopePage } from "./pages/ScopePage";
import { TimelinePage } from "./pages/TimelinePage";
import { ReportPage } from "./pages/ReportPage";
import { RunsPage } from "./pages/RunsPage";
import { ChecklistPage } from "./pages/ChecklistPage";
import { ConsolePage } from "./pages/ConsolePage";
import { SettingsPage } from "./pages/SettingsPage";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: SettingsPage,
});

const engagementRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/e/$engagementId",
  component: EngagementLayout,
});

const engagementIndexRoute = createRoute({
  getParentRoute: () => engagementRoute,
  path: "/",
  beforeLoad: ({ params }) => {
    throw redirect({
      to: "/e/$engagementId/findings",
      params: { engagementId: params.engagementId },
    });
  },
});

const findingsRoute = createRoute({
  getParentRoute: () => engagementRoute,
  path: "/findings",
  component: FindingsPage,
});

const scopeRoute = createRoute({
  getParentRoute: () => engagementRoute,
  path: "/scope",
  component: ScopePage,
});

const timelineRoute = createRoute({
  getParentRoute: () => engagementRoute,
  path: "/timeline",
  component: TimelinePage,
});

const reportRoute = createRoute({
  getParentRoute: () => engagementRoute,
  path: "/report",
  component: ReportPage,
});

const runsRoute = createRoute({
  getParentRoute: () => engagementRoute,
  path: "/runs",
  component: RunsPage,
});

const checklistRoute = createRoute({
  getParentRoute: () => engagementRoute,
  path: "/checklist",
  component: ChecklistPage,
});

const consoleRoute = createRoute({
  getParentRoute: () => engagementRoute,
  path: "/console",
  component: ConsolePage,
});

export const routeTree = rootRoute.addChildren([
  indexRoute,
  settingsRoute,
  engagementRoute.addChildren([
    engagementIndexRoute,
    findingsRoute,
    scopeRoute,
    timelineRoute,
    reportRoute,
    runsRoute,
    checklistRoute,
    consoleRoute,
  ]),
]);

// satisfy createRouter type import usage
void createRouter;
