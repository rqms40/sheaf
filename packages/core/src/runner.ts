import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Workspace } from "./workspace.js";
import { importNuclei, importNmap, importHttpx, importFfuf, addTimeline } from "./services.js";

export type RunToolName = "nuclei" | "nmap" | "httpx" | "ffuf";

export type RunToolResult = {
  tool: RunToolName;
  exitCode: number;
  stdoutPath: string;
  stderr: string;
  importResult?: unknown;
};

function which(cmd: string): string | null {
  const pathEnv = process.env.PATH || "";
  for (const dir of pathEnv.split(path.delimiter)) {
    const full = path.join(dir, cmd);
    try {
      fs.accessSync(full, fs.constants.X_OK);
      return full;
    } catch {
      // continue
    }
  }
  return null;
}

function runCmd(
  bin: string,
  args: string[],
  opts?: { cwd?: string; timeoutMs?: number },
): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd: opts?.cwd,
      env: process.env,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Command timed out after ${opts?.timeoutMs ?? 600_000}ms`));
    }, opts?.timeoutMs ?? 600_000);

    child.stdout.on("data", (d) => {
      stdout += d.toString();
    });
    child.stderr.on("data", (d) => {
      stderr += d.toString();
    });
    child.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

/**
 * Spawn an external tool (if installed), capture output, import into engagement.
 * Authorized targets only — operator is responsible for scope.
 */
export async function runToolAndImport(
  ws: Workspace,
  engagementId: string,
  tool: RunToolName,
  args: string[],
): Promise<RunToolResult> {
  const bin = which(tool);
  if (!bin) {
    throw new Error(
      `${tool} not found on PATH. Install the tool or use sheaf import with saved output.`,
    );
  }

  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `sheaf-${tool}-`));
  const outFile = path.join(tmpDir, `${tool}-out.txt`);

  let finalArgs = [...args];
  if (tool === "nuclei" && !args.some((a) => a === "-jsonl" || a === "-json" || a === "-o")) {
    finalArgs = [...args, "-jsonl", "-o", outFile];
  } else if (tool === "nmap" && !args.some((a) => a.startsWith("-o"))) {
    finalArgs = [...args, "-oX", outFile];
  } else if (tool === "httpx" && !args.some((a) => a === "-json" || a === "-o")) {
    finalArgs = [...args, "-json", "-o", outFile];
  } else if (tool === "ffuf" && !args.some((a) => a === "-o" || a === "-of")) {
    finalArgs = [...args, "-of", "json", "-o", outFile];
  }

  addTimeline(
    ws,
    engagementId,
    "other",
    `Running ${tool} ${finalArgs.join(" ")}`.slice(0, 500),
  );

  const { code, stdout, stderr } = await runCmd(bin, finalArgs, {
    cwd: ws.root,
    timeoutMs: 30 * 60 * 1000,
  });

  let content = "";
  if (fs.existsSync(outFile) && fs.statSync(outFile).size > 0) {
    content = fs.readFileSync(outFile, "utf8");
  } else {
    content = stdout;
    fs.writeFileSync(outFile, content, "utf8");
  }

  let importResult: unknown;
  try {
    if (content.trim()) {
      if (tool === "nuclei") importResult = importNuclei(ws, engagementId, content, outFile);
      else if (tool === "nmap") importResult = importNmap(ws, engagementId, content, outFile);
      else if (tool === "httpx") importResult = importHttpx(ws, engagementId, content, outFile);
      else if (tool === "ffuf") importResult = importFfuf(ws, engagementId, content, outFile);
    }
  } catch (e) {
    importResult = { error: e instanceof Error ? e.message : String(e) };
  }

  addTimeline(
    ws,
    engagementId,
    "import",
    `${tool} run finished (exit ${code})`,
  );

  return {
    tool,
    exitCode: code,
    stdoutPath: outFile,
    stderr: stderr.slice(-4000),
    importResult,
  };
}
