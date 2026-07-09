import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import type { Workspace } from "./workspace.js";

/**
 * Local command runner for engagement console.
 * Not a full interactive PTY — runs bash -lc jobs with streamed stdout/stderr.
 * Bind UI only to 127.0.0.1. Any XSS in the web UI could drive this — treat as host shell.
 */
export type ConsoleJob = {
  kill: () => void;
  pid?: number;
};

export function runConsoleCommand(
  ws: Workspace,
  engagementId: string | null,
  command: string,
  handlers: {
    onData: (chunk: string) => void;
    onExit: (code: number | null) => void;
    onError: (err: Error) => void;
  },
  opts?: { cwd?: string },
): ConsoleJob {
  const cwd = opts?.cwd ?? ws.root;
  const child: ChildProcessWithoutNullStreams = spawn(
    process.env.SHELL || "bash",
    ["-lc", command],
    {
      cwd,
      env: {
        ...process.env,
        SHEAF_ENGAGEMENT: engagementId ?? "",
        SHEAF_WORKSPACE: ws.root,
        FORCE_COLOR: "0",
      },
    },
  );

  child.stdout.on("data", (d) => handlers.onData(d.toString()));
  child.stderr.on("data", (d) => handlers.onData(d.toString()));
  child.on("error", (err) => handlers.onError(err));
  child.on("close", (code) => handlers.onExit(code));

  return {
    pid: child.pid,
    kill: () => {
      try {
        child.kill("SIGTERM");
      } catch {
        // ignore
      }
    },
  };
}
