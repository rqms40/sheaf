import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openWorkspace } from "@sheaf/core";
import { createApp } from "./app.js";

export type ServeOptions = {
  host?: string;
  port?: number;
  workspaceRoot?: string;
  webDist?: string;
};

export function startServer(opts: ServeOptions = {}) {
  const host = opts.host ?? process.env.SHEAF_HOST ?? "127.0.0.1";
  const port = Number(opts.port ?? process.env.SHEAF_PORT ?? 7420);
  const workspaceRoot = opts.workspaceRoot ?? process.env.SHEAF_WORKSPACE ?? process.cwd();

  if (host !== "127.0.0.1" && host !== "localhost") {
    console.warn(
      `[sheaf] WARNING: binding to ${host} exposes engagement data on the network. Prefer 127.0.0.1.`,
    );
  }

  const workspace = openWorkspace(workspaceRoot);
  const app = createApp(() => workspace);

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const webDist =
    opts.webDist ??
    process.env.SHEAF_WEB_DIST ??
    path.resolve(__dirname, "../../../apps/web/dist");

  if (fs.existsSync(webDist)) {
    app.use("/*", serveStatic({ root: webDist }));
    app.get("*", async (c) => {
      const index = path.join(webDist, "index.html");
      if (fs.existsSync(index) && !c.req.path.startsWith("/api")) {
        return c.html(fs.readFileSync(index, "utf8"));
      }
      return c.text("Not found", 404);
    });
  } else {
    app.get("/", (c) =>
      c.json({
        service: "sheaf-api",
        message: "Web UI not built. Run pnpm --filter @sheaf/web build or pnpm dev:web",
        health: "/api/health",
      }),
    );
  }

  console.log(`[sheaf] workspace: ${workspace.root}`);
  console.log(`[sheaf] listening on http://${host}:${port}`);

  return serve({ fetch: app.fetch, hostname: host, port });
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
const self = fileURLToPath(import.meta.url);
const isMain = entry === self || entry.endsWith(`${path.sep}apps${path.sep}api${path.sep}src${path.sep}index.ts`);

if (isMain && !process.env.SHEAF_NO_AUTOSTART) {
  startServer();
}
