#!/usr/bin/env node
import { Command } from "commander";
import fs from "node:fs";
import path from "node:path";
import {
  archiveEngagement,
  archiveFinding,
  buildDocxBuffer,
  buildExportPackage,
  createEngagement,
  deleteFinding,
  importBurp,
  importFfuf,
  importHttpx,
  importNmap,
  importNuclei,
  initWorkspace,
  listChecklist,
  listEngagements,
  listFindings,
  openWorkspace,
  probeFinding,
  runToolAndImport,
  setChecklistItem,
  writeReportFile,
} from "@sheaf/core";

const program = new Command();
program.name("sheaf").description("Local-first engagement casefile").version("0.1.0");

program
  .command("init")
  .argument("[path]", "workspace root", ".")
  .description("Initialize a .sheaf workspace")
  .action((p: string) => {
    const root = path.resolve(p);
    const ws = initWorkspace(root);
    console.log(`Initialized Sheaf workspace at ${ws.sheafDir}`);
  });

program
  .command("serve")
  .description("Start API + UI on 127.0.0.1")
  .option("-p, --port <port>", "port", "7420")
  .option("-H, --host <host>", "host", "127.0.0.1")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action(async (opts: { port: string; host: string; workspace: string }) => {
    const { startServer } = await import("@sheaf/api");
    startServer({
      port: Number(opts.port),
      host: opts.host,
      workspaceRoot: path.resolve(opts.workspace),
    });
  });

const engagement = program.command("engagement").description("Manage engagements");

engagement
  .command("list")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action((opts: { workspace: string }) => {
    const ws = openWorkspace(path.resolve(opts.workspace));
    const rows = listEngagements(ws);
    if (!rows.length) {
      console.log("No engagements.");
      return;
    }
    for (const r of rows) {
      console.log(`${r.id}\t${r.status}\t${r.name}${r.client ? ` (${r.client})` : ""}`);
    }
  });

engagement
  .command("create")
  .requiredOption("-n, --name <name>", "engagement name")
  .option("-c, --client <client>", "client name")
  .option("-t, --type <type>", "web|network|ad|cloud|other", "web")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action((opts: { name: string; client?: string; type: string; workspace: string }) => {
    const ws = openWorkspace(path.resolve(opts.workspace));
    const row = createEngagement(ws, {
      name: opts.name,
      client: opts.client,
      type: opts.type as "web",
    });
    console.log(row.id);
  });

engagement
  .command("archive")
  .argument("<id>", "engagement id")
  .option("--restore", "restore to active instead of archive")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action((id: string, opts: { restore?: boolean; workspace: string }) => {
    const ws = openWorkspace(path.resolve(opts.workspace));
    const row = archiveEngagement(ws, id, !opts.restore);
    if (!row) {
      console.error("Engagement not found");
      process.exitCode = 1;
      return;
    }
    console.log(`${row.id}\t${row.status}`);
  });

const finding = program.command("finding").description("Manage findings");

finding
  .command("list")
  .requiredOption("-e, --engagement <id>", "engagement id")
  .option("--archived", "list archived only")
  .option("--all", "list active + archived")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action(
    (opts: {
      engagement: string;
      archived?: boolean;
      all?: boolean;
      workspace: string;
    }) => {
      const ws = openWorkspace(path.resolve(opts.workspace));
      const visibility = opts.all ? "all" : opts.archived ? "archived" : "active";
      const rows = listFindings(ws, opts.engagement, { visibility });
      for (const r of rows) {
        console.log(`${r.id}\t${r.severity}\t${r.status}\t${r.title}`);
      }
    },
  );

finding
  .command("archive")
  .argument("<findingId>", "finding id")
  .requiredOption("-e, --engagement <id>", "engagement id")
  .option("--restore", "restore to needs_review")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action(
    (
      findingId: string,
      opts: { engagement: string; restore?: boolean; workspace: string },
    ) => {
      const ws = openWorkspace(path.resolve(opts.workspace));
      const row = archiveFinding(ws, opts.engagement, findingId, !opts.restore);
      if (!row) {
        console.error("Finding not found");
        process.exitCode = 1;
        return;
      }
      console.log(`${row.id}\t${row.status}`);
    },
  );

finding
  .command("delete")
  .argument("<findingId>", "finding id")
  .requiredOption("-e, --engagement <id>", "engagement id")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action((findingId: string, opts: { engagement: string; workspace: string }) => {
    const ws = openWorkspace(path.resolve(opts.workspace));
    const ok = deleteFinding(ws, opts.engagement, findingId);
    if (!ok) {
      console.error("Finding not found");
      process.exitCode = 1;
      return;
    }
    console.log("deleted");
  });

const imp = program.command("import").description("Import tool output");

imp
  .command("nuclei")
  .argument("<file>", "nuclei JSON/JSONL file")
  .requiredOption("-e, --engagement <id>", "engagement id")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action((file: string, opts: { engagement: string; workspace: string }) => {
    const ws = openWorkspace(path.resolve(opts.workspace));
    const raw = fs.readFileSync(path.resolve(file), "utf8");
    const result = importNuclei(ws, opts.engagement, raw, path.resolve(file));
    console.log(
      `nuclei import complete: ${result.created} created, ${result.updated} updated (run ${result.runId})`,
    );
  });

imp
  .command("nmap")
  .argument("<file>", "nmap XML file")
  .requiredOption("-e, --engagement <id>", "engagement id")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action((file: string, opts: { engagement: string; workspace: string }) => {
    const ws = openWorkspace(path.resolve(opts.workspace));
    const raw = fs.readFileSync(path.resolve(file), "utf8");
    const result = importNmap(ws, opts.engagement, raw, path.resolve(file));
    console.log(
      `nmap import complete: ${result.created} new hosts, ${result.updated} updated (run ${result.runId})`,
    );
  });

imp
  .command("httpx")
  .argument("<file>", "httpx JSON/JSONL file")
  .requiredOption("-e, --engagement <id>", "engagement id")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action((file: string, opts: { engagement: string; workspace: string }) => {
    const ws = openWorkspace(path.resolve(opts.workspace));
    const raw = fs.readFileSync(path.resolve(file), "utf8");
    const result = importHttpx(ws, opts.engagement, raw, path.resolve(file));
    console.log(
      `httpx import complete: ${result.created} new, ${result.updated} updated (run ${result.runId})`,
    );
  });

imp
  .command("ffuf")
  .argument("<file>", "ffuf JSON file")
  .requiredOption("-e, --engagement <id>", "engagement id")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action((file: string, opts: { engagement: string; workspace: string }) => {
    const ws = openWorkspace(path.resolve(opts.workspace));
    const raw = fs.readFileSync(path.resolve(file), "utf8");
    const result = importFfuf(ws, opts.engagement, raw, path.resolve(file));
    console.log(
      `ffuf import complete: ${result.created} new, ${result.updated} updated (run ${result.runId})`,
    );
  });

imp
  .command("burp")
  .argument("<file>", "Burp issues XML export")
  .requiredOption("-e, --engagement <id>", "engagement id")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action((file: string, opts: { engagement: string; workspace: string }) => {
    const ws = openWorkspace(path.resolve(opts.workspace));
    const raw = fs.readFileSync(path.resolve(file), "utf8");
    const result = importBurp(ws, opts.engagement, raw, path.resolve(file));
    console.log(
      `burp import complete: ${result.created} new, ${result.updated} updated (run ${result.runId})`,
    );
  });

program
  .command("run")
  .description("Spawn tool on PATH and import output (authorized targets only)")
  .requiredOption("-e, --engagement <id>", "engagement id")
  .requiredOption("-t, --tool <tool>", "nuclei|nmap|httpx|ffuf")
  .argument("[args...]", "tool arguments")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action(
    async (
      args: string[],
      opts: { engagement: string; tool: string; workspace: string },
    ) => {
      const ws = openWorkspace(path.resolve(opts.workspace));
      const tool = opts.tool as "nuclei" | "nmap" | "httpx" | "ffuf";
      const result = await runToolAndImport(ws, opts.engagement, tool, args);
      console.log(JSON.stringify(result, null, 2));
    },
  );

program
  .command("probe")
  .description("Safe HTTP GET probe for a finding")
  .requiredOption("-e, --engagement <id>", "engagement id")
  .requiredOption("-f, --finding <id>", "finding id")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action(async (opts: { engagement: string; finding: string; workspace: string }) => {
    const ws = openWorkspace(path.resolve(opts.workspace));
    const result = await probeFinding(ws, opts.engagement, opts.finding);
    console.log(JSON.stringify(result, null, 2));
  });

const checklist = program.command("checklist").description("Methodology checklist");

checklist
  .command("list")
  .requiredOption("-e, --engagement <id>", "engagement id")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action((opts: { engagement: string; workspace: string }) => {
    const ws = openWorkspace(path.resolve(opts.workspace));
    for (const item of listChecklist(ws, opts.engagement)) {
      console.log(`${item.done ? "[x]" : "[ ]"}\t${item.phase}\t${item.itemKey}\t${item.label}`);
    }
  });

checklist
  .command("set")
  .requiredOption("-e, --engagement <id>", "engagement id")
  .requiredOption("-k, --key <itemKey>", "checklist item key")
  .option("--done", "mark done", true)
  .option("--undone", "mark undone")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action(
    (opts: {
      engagement: string;
      key: string;
      done?: boolean;
      undone?: boolean;
      workspace: string;
    }) => {
      const ws = openWorkspace(path.resolve(opts.workspace));
      const done = opts.undone ? false : true;
      const row = setChecklistItem(ws, opts.engagement, opts.key, done);
      if (!row) {
        console.error("Item not found");
        process.exitCode = 1;
        return;
      }
      console.log(`${row.itemKey}\t${row.done ? "done" : "open"}`);
    },
  );

program
  .command("report")
  .requiredOption("-e, --engagement <id>", "engagement id")
  .option("-o, --output <path>", "output path", "report.md")
  .option("--docx", "write DOCX instead of markdown")
  .option("--confirmed-only", "only confirmed findings")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action(
    async (opts: {
      engagement: string;
      output: string;
      docx?: boolean;
      confirmedOnly?: boolean;
      workspace: string;
    }) => {
      const ws = openWorkspace(path.resolve(opts.workspace));
      if (opts.docx) {
        const buf = await buildDocxBuffer(ws, opts.engagement, {
          visibility: "active",
          confirmedOnly: !!opts.confirmedOnly,
        });
        const out = path.resolve(opts.output.endsWith(".docx") ? opts.output : `${opts.output}.docx`);
        fs.writeFileSync(out, buf);
        console.log(`Wrote ${out}`);
        return;
      }
      const out = writeReportFile(ws, opts.engagement, path.resolve(opts.output));
      console.log(`Wrote ${out}`);
    },
  );

program
  .command("export")
  .requiredOption("-e, --engagement <id>", "engagement id")
  .option("-o, --output <path>", "output json path", "sheaf-export.json")
  .option("-w, --workspace <path>", "workspace root", ".")
  .action((opts: { engagement: string; output: string; workspace: string }) => {
    const ws = openWorkspace(path.resolve(opts.workspace));
    const pkg = buildExportPackage(ws, opts.engagement);
    const out = path.resolve(opts.output);
    fs.writeFileSync(out, JSON.stringify(pkg, null, 2), "utf8");
    const mdPath = out.replace(/\.json$/i, "") + "-report.md";
    fs.writeFileSync(mdPath, pkg.reportMarkdown, "utf8");
    console.log(`Wrote ${out}`);
    console.log(`Wrote ${mdPath}`);
  });

program.parse();
