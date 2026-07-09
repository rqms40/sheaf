import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import fs from "node:fs";
import type { Server as HttpServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { WebSocketServer, type WebSocket } from "ws";
import {
  addTimeline,
  openWorkspace,
  runConsoleCommand,
  type ConsoleJob,
  type Workspace,
} from "@sheaf/core";
import { createApp } from "./app.js";

export type ServeOptions = {
  host?: string;
  port?: number;
  workspaceRoot?: string;
  webDist?: string;
};

function isLoopbackAddress(addr: string | undefined): boolean {
  if (!addr) return false;
  return (
    addr === "127.0.0.1" ||
    addr === "::1" ||
    addr === "::ffff:127.0.0.1" ||
    addr.endsWith("127.0.0.1")
  );
}

function attachConsoleWs(server: HttpServer, getWorkspace: () => Workspace, host: string) {
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url || "/", `http://${req.headers.host || "127.0.0.1"}`);
    if (url.pathname !== "/api/console") {
      socket.destroy();
      return;
    }

    const remote =
      (req.socket.remoteAddress as string | undefined) ||
      (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0]?.trim();

    // Only allow local clients. Console is host shell access.
    if (host !== "127.0.0.1" && host !== "localhost") {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }
    if (!isLoopbackAddress(remote)) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit("connection", ws, req, url);
    });
  });

  wss.on("connection", (ws: WebSocket, _req: unknown, url: URL) => {
    const engagementId = url.searchParams.get("engagementId");
    let job: ConsoleJob | null = null;

    const send = (msg: Record<string, unknown>) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify(msg));
      }
    };

    send({
      type: "hello",
      message:
        "Sheaf local console · bash -lc jobs only · XSS here ≈ shell on this host · 127.0.0.1 only",
      engagementId,
      cwd: getWorkspace().root,
    });

    ws.on("message", (raw) => {
      let data: { type?: string; command?: string };
      try {
        data = JSON.parse(String(raw));
      } catch {
        send({ type: "error", message: "invalid JSON" });
        return;
      }

      if (data.type === "kill") {
        job?.kill();
        job = null;
        send({ type: "status", message: "kill sent" });
        return;
      }

      if (data.type !== "run") {
        send({ type: "error", message: "unknown message type" });
        return;
      }

      const command = String(data.command || "").trim();
      if (!command) {
        send({ type: "error", message: "command required" });
        return;
      }
      if (command.length > 8000) {
        send({ type: "error", message: "command too long" });
        return;
      }

      if (job) {
        job.kill();
        job = null;
      }

      const wsSpace = getWorkspace();
      if (engagementId) {
        try {
          addTimeline(
            wsSpace,
            engagementId,
            "other",
            `Console: ${command.slice(0, 200)}`,
          );
        } catch {
          // engagement may not exist — still allow workspace-level console
        }
      }

      send({ type: "status", message: `$ ${command}` });

      job = runConsoleCommand(wsSpace, engagementId, command, {
        onData: (chunk) => send({ type: "out", data: chunk }),
        onExit: (code) => {
          send({ type: "exit", code });
          job = null;
        },
        onError: (err) => {
          send({ type: "error", message: err.message });
          job = null;
        },
      });
    });

    ws.on("close", () => {
      job?.kill();
      job = null;
    });
  });

  return wss;
}

export function startServer(opts: ServeOptions = {}) {
  const host = opts.host ?? process.env.SHEAF_HOST ?? "127.0.0.1";
  const port = Number(opts.port ?? process.env.SHEAF_PORT ?? 7420);
  const workspaceRoot = opts.workspaceRoot ?? process.env.SHEAF_WORKSPACE ?? process.cwd();

  if (host !== "127.0.0.1" && host !== "localhost") {
    console.warn(
      `[sheaf] WARNING: binding to ${host} exposes engagement data on the network. Prefer 127.0.0.1.`,
    );
    console.warn(
      `[sheaf] WARNING: console WebSocket is disabled when not bound to loopback.`,
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

  const server = serve({ fetch: app.fetch, hostname: host, port }) as unknown as HttpServer;

  if (host === "127.0.0.1" || host === "localhost") {
    attachConsoleWs(server, () => workspace, host);
    console.log(`[sheaf] console ws: ws://${host}:${port}/api/console`);
  }

  return server;
}

const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
const self = fileURLToPath(import.meta.url);
const isMain =
  entry === self ||
  entry.endsWith(`${path.sep}apps${path.sep}api${path.sep}src${path.sep}index.ts`);

if (isMain && !process.env.SHEAF_NO_AUTOSTART) {
  startServer();
}
