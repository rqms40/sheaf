import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import type { Workspace } from "./workspace.js";
import { getSettings, resolveActiveEngagementId } from "./settings.js";
import {
  addTimeline,
  getEngagement,
  importFfuf,
  importHttpx,
  importNaabu,
  importNmap,
  importNuclei,
} from "./services.js";

export type CapturableTool = "nmap" | "nuclei" | "httpx" | "ffuf" | "naabu";

export type WrapResult = {
  tool: CapturableTool | "unknown";
  command: string;
  engagementId: string;
  exitCode: number;
  stdoutPath: string;
  stderrTail: string;
  imported: boolean;
  importResult?: unknown;
  message: string;
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

function detectTool(argv0: string): CapturableTool | "unknown" {
  const base = path.basename(argv0).toLowerCase();
  if (base === "nmap" || base === "nmap.exe") return "nmap";
  if (base === "nuclei" || base === "nuclei.exe") return "nuclei";
  if (base === "httpx" || base === "httpx.exe") return "httpx";
  if (base === "ffuf" || base === "ffuf.exe") return "ffuf";
  if (base === "naabu" || base === "naabu.exe") return "naabu";
  return "unknown";
}

function injectMachineReadable(
  tool: CapturableTool,
  args: string[],
  outFile: string,
): string[] {
  const a = [...args];
  if (tool === "nmap" && !a.some((x) => x.startsWith("-o"))) {
    return [...a, "-oX", outFile];
  }
  if (tool === "nuclei" && !a.some((x) => x === "-jsonl" || x === "-json" || x === "-o")) {
    return [...a, "-jsonl", "-o", outFile];
  }
  if (tool === "httpx" && !a.some((x) => x === "-json" || x === "-o" || x === "-j")) {
    return [...a, "-json", "-o", outFile];
  }
  if (tool === "ffuf" && !a.some((x) => x === "-o" || x === "-of")) {
    return [...a, "-of", "json", "-o", outFile];
  }
  if (tool === "naabu" && !a.some((x) => x === "-json" || x === "-o" || x === "-j")) {
    return [...a, "-json", "-o", outFile];
  }
  return a;
}

function runCmd(
  bin: string,
  args: string[],
  opts?: { cwd?: string; timeoutMs?: number; onChunk?: (s: string) => void },
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
      const s = d.toString();
      stdout += s;
      opts?.onChunk?.(s);
    });
    child.stderr.on("data", (d) => {
      const s = d.toString();
      stderr += s;
      opts?.onChunk?.(s);
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

function importByTool(
  ws: Workspace,
  engagementId: string,
  tool: CapturableTool,
  content: string,
  sourcePath: string,
) {
  if (tool === "nmap") return importNmap(ws, engagementId, content, sourcePath);
  if (tool === "nuclei") return importNuclei(ws, engagementId, content, sourcePath);
  if (tool === "httpx") return importHttpx(ws, engagementId, content, sourcePath);
  if (tool === "ffuf") return importFfuf(ws, engagementId, content, sourcePath);
  if (tool === "naabu") return importNaabu(ws, engagementId, content, sourcePath);
  throw new Error(`unsupported tool ${tool}`);
}

/**
 * Run any argv as a local command; if the binary is a known recon tool,
 * force machine-readable output and import into the engagement (settings.active or -e).
 *
 * Example:
 *   sheaf wrap -e <id> -- nmap -sV scanme.nmap.org
 *   sheaf wrap -- nuclei -u https://example.com
 */
export async function wrapAndCapture(
  ws: Workspace,
  argv: string[],
  opts?: {
    engagementId?: string | null;
    autoImport?: boolean;
    onChunk?: (s: string) => void;
    cwd?: string;
  },
): Promise<WrapResult> {
  if (!argv.length) throw new Error("wrap requires a command (e.g. nmap -sV target)");
  const engagementId = resolveActiveEngagementId(ws, opts?.engagementId);
  if (!getEngagement(ws, engagementId)) {
    throw new Error(`Engagement not found: ${engagementId}`);
  }

  const settings = getSettings(ws);
  const autoImport = opts?.autoImport ?? settings.autoImportOnWrap;
  const toolName = detectTool(argv[0]);
  const binName = argv[0];
  const bin = which(binName) || (path.isAbsolute(binName) && fs.existsSync(binName) ? binName : null);
  if (!bin) throw new Error(`Command not found on PATH: ${binName}`);

  const runsDir = path.join(ws.sheafDir, "runs", engagementId);
  fs.mkdirSync(runsDir, { recursive: true, mode: 0o700 });
  const stamp = Date.now();
  const outFile = path.join(
    runsDir,
    `${toolName === "unknown" ? "cmd" : toolName}-${stamp}.out`,
  );

  let args = argv.slice(1);
  if (toolName !== "unknown" && autoImport) {
    args = injectMachineReadable(toolName, args, outFile);
  }

  const display = `${binName} ${args.join(" ")}`.trim();
  addTimeline(ws, engagementId, "other", `Wrap: ${display}`.slice(0, 400));

  const { code, stdout, stderr } = await runCmd(bin, args, {
    cwd: opts?.cwd ?? ws.root,
    timeoutMs: 60 * 60 * 1000,
    onChunk: opts?.onChunk,
  });

  let content = "";
  if (fs.existsSync(outFile) && fs.statSync(outFile).size > 0) {
    content = fs.readFileSync(outFile, "utf8");
  } else if (stdout.trim()) {
    content = stdout;
    fs.writeFileSync(outFile, content, "utf8");
  } else {
    fs.writeFileSync(outFile, stderr.slice(0, 200_000), "utf8");
  }

  let imported = false;
  let importResult: unknown;
  let message = `exit ${code}`;

  if (autoImport && toolName !== "unknown" && content.trim()) {
    try {
      importResult = importByTool(ws, engagementId, toolName, content, outFile);
      imported = true;
      message = `exit ${code} · imported ${toolName} into engagement`;
    } catch (e) {
      importResult = { error: e instanceof Error ? e.message : String(e) };
      message = `exit ${code} · import failed: ${e instanceof Error ? e.message : e}`;
    }
  } else if (toolName === "unknown") {
    message = `exit ${code} · command captured to ${outFile} (unknown tool — no auto-import)`;
    addTimeline(ws, engagementId, "other", `Wrap output saved (no import): ${path.basename(outFile)}`);
  } else if (!autoImport) {
    message = `exit ${code} · auto-import off · output ${outFile}`;
  }

  return {
    tool: toolName,
    command: display,
    engagementId,
    exitCode: code,
    stdoutPath: outFile,
    stderrTail: stderr.slice(-4000),
    imported,
    importResult,
    message,
  };
}

/** Known tools for UI quick-capture */
export const CAPTURABLE_TOOLS: CapturableTool[] = [
  "nmap",
  "nuclei",
  "httpx",
  "ffuf",
  "naabu",
];
