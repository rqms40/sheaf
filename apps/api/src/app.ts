import { Hono } from "hono";
import { cors } from "hono/cors";
import { bodyLimit } from "hono/body-limit";
import fs from "node:fs";
import type { Workspace } from "@sheaf/core";
import {
  addEvidence,
  addNote,
  addScope,
  archiveEngagement,
  archiveFinding,
  buildDocxBuffer,
  buildExportPackage,
  buildReport,
  createEngagement,
  createFinding,
  deleteEvidence,
  deleteFinding,
  deleteScope,
  getEngagement,
  getEvidence,
  getFinding,
  getFindingTemplate,
  getSettings,
  importBurp,
  importFfuf,
  importHttpx,
  importNaabu,
  importNmap,
  importNuclei,
  updateSettings,
  wrapAndCapture,
  listAssets,
  listChecklist,
  listEngagements,
  listEvidence,
  listFindingHistory,
  listFindingTemplates,
  listFindings,
  listNotes,
  listRuns,
  listScope,
  listTimeline,
  probeFinding,
  resolveEvidenceFile,
  restoreFindingRevision,
  runToolAndImport,
  saveEvidenceFile,
  setChecklistItem,
  updateEngagement,
  updateFinding,
  CreateEngagementInput,
  CreateEvidenceInput,
  CreateFindingInput,
  CreateNoteInput,
  CreateScopeInput,
  UpdateEngagementInput,
  UpdateFindingInput,
  FindingStatus,
  Severity,
} from "@sheaf/core";

export type ApiEnv = {
  Variables: {
    workspace: Workspace;
  };
};

function jsonError(c: any, status: number, code: string, message: string) {
  return c.json({ error: { code, message } }, status);
}

export function createApp(getWorkspace: () => Workspace) {
  const app = new Hono<ApiEnv>();

  app.use(
    "*",
    cors({
      origin: ["http://127.0.0.1:5173", "http://localhost:5173", "http://127.0.0.1:7420"],
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
    }),
  );

  app.use("*", async (c, next) => {
    c.set("workspace", getWorkspace());
    await next();
  });

  app.get("/api/health", (c) =>
    c.json({
      ok: true,
      service: "sheaf",
      workspace: c.get("workspace").root,
    }),
  );

  app.get("/api/settings", (c) => {
    return c.json({ data: getSettings(c.get("workspace")) });
  });

  app.patch("/api/settings", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    try {
      const data = updateSettings(c.get("workspace"), body);
      return c.json({ data });
    } catch (e) {
      return jsonError(c, 400, "validation_error", e instanceof Error ? e.message : "invalid settings");
    }
  });

  app.post("/api/wrap", async (c) => {
    const body = await c.req.json().catch(() => ({}));
    const argv = Array.isArray(body.argv)
      ? body.argv.map(String)
      : String(body.command || "")
          .match(/(?:[^\s"]+|"[^"]*")+/g)
          ?.map((a: string) => a.replace(/^"|"$/g, "")) ?? [];
    if (!argv.length) return jsonError(c, 400, "validation_error", "argv or command required");
    const engagementId = body.engagementId ? String(body.engagementId) : undefined;
    try {
      const result = await wrapAndCapture(c.get("workspace"), argv, {
        engagementId,
        autoImport: body.autoImport !== false,
      });
      return c.json({ data: result });
    } catch (e) {
      return jsonError(c, 400, "wrap_error", e instanceof Error ? e.message : "wrap failed");
    }
  });

  app.get("/api/engagements", (c) => {
    return c.json({ data: listEngagements(c.get("workspace")) });
  });

  app.post("/api/engagements", async (c) => {
    const body = await c.req.json();
    const parsed = CreateEngagementInput.safeParse(body);
    if (!parsed.success) return jsonError(c, 400, "validation_error", parsed.error.message);
    const row = createEngagement(c.get("workspace"), parsed.data);
    return c.json({ data: row }, 201);
  });

  app.get("/api/engagements/:id", (c) => {
    const row = getEngagement(c.get("workspace"), c.req.param("id"));
    if (!row) return jsonError(c, 404, "not_found", "Engagement not found");
    return c.json({ data: row });
  });

  app.patch("/api/engagements/:id", async (c) => {
    const body = await c.req.json();
    const parsed = UpdateEngagementInput.safeParse(body);
    if (!parsed.success) return jsonError(c, 400, "validation_error", parsed.error.message);
    const row = updateEngagement(c.get("workspace"), c.req.param("id"), parsed.data);
    if (!row) return jsonError(c, 404, "not_found", "Engagement not found");
    return c.json({ data: row });
  });

  app.post("/api/engagements/:id/archive", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { archive?: boolean };
    const archive = body.archive !== false;
    const row = archiveEngagement(c.get("workspace"), c.req.param("id"), archive);
    if (!row) return jsonError(c, 404, "not_found", "Engagement not found");
    return c.json({ data: row });
  });

  app.get("/api/engagements/:id/export", (c) => {
    if (!getEngagement(c.get("workspace"), c.req.param("id")))
      return jsonError(c, 404, "not_found", "Engagement not found");
    try {
      const pkg = buildExportPackage(c.get("workspace"), c.req.param("id"));
      return c.json({ data: pkg });
    } catch (e) {
      return jsonError(c, 500, "export_error", e instanceof Error ? e.message : "export failed");
    }
  });

  app.get("/api/engagements/:id/scope", (c) => {
    if (!getEngagement(c.get("workspace"), c.req.param("id")))
      return jsonError(c, 404, "not_found", "Engagement not found");
    return c.json({ data: listScope(c.get("workspace"), c.req.param("id")) });
  });

  app.post("/api/engagements/:id/scope", async (c) => {
    if (!getEngagement(c.get("workspace"), c.req.param("id")))
      return jsonError(c, 404, "not_found", "Engagement not found");
    const body = await c.req.json();
    const parsed = CreateScopeInput.safeParse(body);
    if (!parsed.success) return jsonError(c, 400, "validation_error", parsed.error.message);
    const row = addScope(c.get("workspace"), c.req.param("id"), parsed.data);
    return c.json({ data: row }, 201);
  });

  app.delete("/api/engagements/:id/scope/:scopeId", (c) => {
    deleteScope(c.get("workspace"), c.req.param("id"), c.req.param("scopeId"));
    return c.json({ ok: true });
  });

  app.get("/api/engagements/:id/findings", (c) => {
    if (!getEngagement(c.get("workspace"), c.req.param("id")))
      return jsonError(c, 404, "not_found", "Engagement not found");
    const severity = c.req.query("severity");
    const status = c.req.query("status");
    const q = c.req.query("q") || undefined;
    const visibilityRaw = c.req.query("visibility") || "active";
    const visibility =
      visibilityRaw === "archived" || visibilityRaw === "all" || visibilityRaw === "active"
        ? visibilityRaw
        : "active";
    const data = listFindings(c.get("workspace"), c.req.param("id"), {
      severity: severity ? Severity.parse(severity) : undefined,
      status: status ? FindingStatus.parse(status) : undefined,
      q,
      visibility,
    });
    return c.json({ data });
  });

  app.post("/api/engagements/:id/findings", async (c) => {
    if (!getEngagement(c.get("workspace"), c.req.param("id")))
      return jsonError(c, 404, "not_found", "Engagement not found");
    const body = await c.req.json();
    const parsed = CreateFindingInput.safeParse(body);
    if (!parsed.success) return jsonError(c, 400, "validation_error", parsed.error.message);
    const row = createFinding(c.get("workspace"), c.req.param("id"), parsed.data);
    return c.json({ data: row }, 201);
  });

  app.get("/api/engagements/:id/findings/:fid", (c) => {
    const row = getFinding(c.get("workspace"), c.req.param("id"), c.req.param("fid"));
    if (!row) return jsonError(c, 404, "not_found", "Finding not found");
    return c.json({ data: row });
  });

  app.patch("/api/engagements/:id/findings/:fid", async (c) => {
    const body = await c.req.json();
    const parsed = UpdateFindingInput.safeParse(body);
    if (!parsed.success) return jsonError(c, 400, "validation_error", parsed.error.message);
    const row = updateFinding(
      c.get("workspace"),
      c.req.param("id"),
      c.req.param("fid"),
      parsed.data,
    );
    if (!row) return jsonError(c, 404, "not_found", "Finding not found");
    return c.json({ data: row });
  });

  app.delete("/api/engagements/:id/findings/:fid", (c) => {
    const ok = deleteFinding(c.get("workspace"), c.req.param("id"), c.req.param("fid"));
    if (!ok) return jsonError(c, 404, "not_found", "Finding not found");
    return c.json({ ok: true });
  });

  app.post("/api/engagements/:id/findings/:fid/archive", async (c) => {
    const body = (await c.req.json().catch(() => ({}))) as { archive?: boolean };
    const archive = body.archive !== false;
    const row = archiveFinding(
      c.get("workspace"),
      c.req.param("id"),
      c.req.param("fid"),
      archive,
    );
    if (!row) return jsonError(c, 404, "not_found", "Finding not found");
    return c.json({ data: row });
  });

  app.get("/api/engagements/:id/findings/:fid/history", (c) => {
    const data = listFindingHistory(
      c.get("workspace"),
      c.req.param("id"),
      c.req.param("fid"),
    );
    if (!data) return jsonError(c, 404, "not_found", "Finding not found");
    return c.json({ data });
  });

  app.post("/api/engagements/:id/findings/:fid/history/:rid/restore", (c) => {
    const row = restoreFindingRevision(
      c.get("workspace"),
      c.req.param("id"),
      c.req.param("fid"),
      c.req.param("rid"),
    );
    if (!row) return jsonError(c, 404, "not_found", "Revision or finding not found");
    return c.json({ data: row });
  });

  app.get("/api/engagements/:id/runs", (c) => {
    return c.json({ data: listRuns(c.get("workspace"), c.req.param("id")) });
  });

  app.get("/api/engagements/:id/assets", (c) => {
    return c.json({ data: listAssets(c.get("workspace"), c.req.param("id")) });
  });

  app.get("/api/engagements/:id/timeline", (c) => {
    return c.json({ data: listTimeline(c.get("workspace"), c.req.param("id")) });
  });

  app.get("/api/engagements/:id/evidence", (c) => {
    const findingId = c.req.query("findingId") || undefined;
    return c.json({ data: listEvidence(c.get("workspace"), c.req.param("id"), findingId) });
  });

  app.get("/api/engagements/:id/evidence/:eid", (c) => {
    const row = getEvidence(c.get("workspace"), c.req.param("id"), c.req.param("eid"));
    if (!row) return jsonError(c, 404, "not_found", "Evidence not found");
    return c.json({ data: row });
  });

  app.get("/api/engagements/:id/evidence/:eid/file", (c) => {
    const file = resolveEvidenceFile(
      c.get("workspace"),
      c.req.param("id"),
      c.req.param("eid"),
    );
    if (!file) return jsonError(c, 404, "not_found", "Evidence file not found");
    try {
      const bytes = fs.readFileSync(file.abs);
      return new Response(bytes, {
        status: 200,
        headers: {
          "Content-Type": file.mime,
          "Content-Disposition": `inline; filename="${file.filename.replace(/"/g, "")}"`,
          "Cache-Control": "private, max-age=60",
        },
      });
    } catch (e) {
      return jsonError(c, 500, "read_error", e instanceof Error ? e.message : "read failed");
    }
  });

  app.delete("/api/engagements/:id/evidence/:eid", (c) => {
    const ok = deleteEvidence(c.get("workspace"), c.req.param("id"), c.req.param("eid"));
    if (!ok) return jsonError(c, 404, "not_found", "Evidence not found");
    return c.json({ ok: true });
  });

  app.post("/api/engagements/:id/evidence", async (c) => {
    const body = await c.req.json();
    const parsed = CreateEvidenceInput.safeParse(body);
    if (!parsed.success) return jsonError(c, 400, "validation_error", parsed.error.message);
    const row = addEvidence(c.get("workspace"), c.req.param("id"), parsed.data);
    return c.json({ data: row }, 201);
  });

  app.get("/api/engagements/:id/notes", (c) => {
    const findingId = c.req.query("findingId") || undefined;
    return c.json({ data: listNotes(c.get("workspace"), c.req.param("id"), findingId) });
  });

  app.post("/api/engagements/:id/notes", async (c) => {
    const body = await c.req.json();
    const parsed = CreateNoteInput.safeParse(body);
    if (!parsed.success) return jsonError(c, 400, "validation_error", parsed.error.message);
    const row = addNote(c.get("workspace"), c.req.param("id"), parsed.data);
    return c.json({ data: row }, 201);
  });

  app.post(
    "/api/engagements/:id/import/nuclei",
    bodyLimit({ maxSize: 50 * 1024 * 1024 }),
    async (c) => {
      if (!getEngagement(c.get("workspace"), c.req.param("id")))
        return jsonError(c, 404, "not_found", "Engagement not found");
      const body = await c.req.json();
      const content = String(body.content ?? "");
      const sourcePath = body.sourcePath ? String(body.sourcePath) : undefined;
      if (!content.trim()) return jsonError(c, 400, "validation_error", "content required");
      try {
        const result = importNuclei(c.get("workspace"), c.req.param("id"), content, sourcePath);
        return c.json({ data: result });
      } catch (e) {
        return jsonError(c, 400, "import_error", e instanceof Error ? e.message : "import failed");
      }
    },
  );

  app.post(
    "/api/engagements/:id/import/nmap",
    bodyLimit({ maxSize: 50 * 1024 * 1024 }),
    async (c) => {
      if (!getEngagement(c.get("workspace"), c.req.param("id")))
        return jsonError(c, 404, "not_found", "Engagement not found");
      const body = await c.req.json();
      const content = String(body.content ?? "");
      const sourcePath = body.sourcePath ? String(body.sourcePath) : undefined;
      if (!content.trim()) return jsonError(c, 400, "validation_error", "content required");
      try {
        const result = importNmap(c.get("workspace"), c.req.param("id"), content, sourcePath);
        return c.json({ data: result });
      } catch (e) {
        return jsonError(c, 400, "import_error", e instanceof Error ? e.message : "import failed");
      }
    },
  );

  app.post(
    "/api/engagements/:id/import/httpx",
    bodyLimit({ maxSize: 50 * 1024 * 1024 }),
    async (c) => {
      if (!getEngagement(c.get("workspace"), c.req.param("id")))
        return jsonError(c, 404, "not_found", "Engagement not found");
      const body = await c.req.json();
      const content = String(body.content ?? "");
      const sourcePath = body.sourcePath ? String(body.sourcePath) : undefined;
      if (!content.trim()) return jsonError(c, 400, "validation_error", "content required");
      try {
        const result = importHttpx(c.get("workspace"), c.req.param("id"), content, sourcePath);
        return c.json({ data: result });
      } catch (e) {
        return jsonError(c, 400, "import_error", e instanceof Error ? e.message : "import failed");
      }
    },
  );

  app.post(
    "/api/engagements/:id/import/ffuf",
    bodyLimit({ maxSize: 50 * 1024 * 1024 }),
    async (c) => {
      if (!getEngagement(c.get("workspace"), c.req.param("id")))
        return jsonError(c, 404, "not_found", "Engagement not found");
      const body = await c.req.json();
      const content = String(body.content ?? "");
      const sourcePath = body.sourcePath ? String(body.sourcePath) : undefined;
      if (!content.trim()) return jsonError(c, 400, "validation_error", "content required");
      try {
        const result = importFfuf(c.get("workspace"), c.req.param("id"), content, sourcePath);
        return c.json({ data: result });
      } catch (e) {
        return jsonError(c, 400, "import_error", e instanceof Error ? e.message : "import failed");
      }
    },
  );

  app.post(
    "/api/engagements/:id/import/burp",
    bodyLimit({ maxSize: 50 * 1024 * 1024 }),
    async (c) => {
      if (!getEngagement(c.get("workspace"), c.req.param("id")))
        return jsonError(c, 404, "not_found", "Engagement not found");
      const body = await c.req.json();
      const content = String(body.content ?? "");
      const sourcePath = body.sourcePath ? String(body.sourcePath) : undefined;
      if (!content.trim()) return jsonError(c, 400, "validation_error", "content required");
      try {
        const result = importBurp(c.get("workspace"), c.req.param("id"), content, sourcePath);
        return c.json({ data: result });
      } catch (e) {
        return jsonError(c, 400, "import_error", e instanceof Error ? e.message : "import failed");
      }
    },
  );

  app.post(
    "/api/engagements/:id/import/naabu",
    bodyLimit({ maxSize: 50 * 1024 * 1024 }),
    async (c) => {
      if (!getEngagement(c.get("workspace"), c.req.param("id")))
        return jsonError(c, 404, "not_found", "Engagement not found");
      const body = await c.req.json();
      const content = String(body.content ?? "");
      const sourcePath = body.sourcePath ? String(body.sourcePath) : undefined;
      if (!content.trim()) return jsonError(c, 400, "validation_error", "content required");
      try {
        const result = importNaabu(c.get("workspace"), c.req.param("id"), content, sourcePath);
        return c.json({ data: result });
      } catch (e) {
        return jsonError(c, 400, "import_error", e instanceof Error ? e.message : "import failed");
      }
    },
  );

  app.post(
    "/api/engagements/:id/evidence/upload",
    bodyLimit({ maxSize: 25 * 1024 * 1024 }),
    async (c) => {
      if (!getEngagement(c.get("workspace"), c.req.param("id")))
        return jsonError(c, 404, "not_found", "Engagement not found");
      const body = await c.req.json();
      const filename = String(body.filename || "upload.bin");
      const findingId = body.findingId ? String(body.findingId) : null;
      const b64 = String(body.contentBase64 || "");
      if (!b64) return jsonError(c, 400, "validation_error", "contentBase64 required");
      try {
        const bytes = Buffer.from(b64, "base64");
        const kindRaw = body.kind ? String(body.kind) : undefined;
        const kind =
          kindRaw === "screenshot" ||
          kindRaw === "file" ||
          kindRaw === "http" ||
          kindRaw === "other"
            ? kindRaw
            : undefined;
        const row = saveEvidenceFile(c.get("workspace"), c.req.param("id"), {
          findingId,
          filename,
          bytes,
          kind,
          meta: {
            mimeType: body.mimeType ? String(body.mimeType) : undefined,
          },
        });
        return c.json({ data: row }, 201);
      } catch (e) {
        return jsonError(c, 400, "upload_error", e instanceof Error ? e.message : "upload failed");
      }
    },
  );

  app.get("/api/templates/findings", (c) => {
    return c.json({ data: listFindingTemplates() });
  });

  app.get("/api/templates/findings/:tid", (c) => {
    const t = getFindingTemplate(c.req.param("tid"));
    if (!t) return jsonError(c, 404, "not_found", "Template not found");
    return c.json({ data: t });
  });

  app.get("/api/engagements/:id/checklist", (c) => {
    if (!getEngagement(c.get("workspace"), c.req.param("id")))
      return jsonError(c, 404, "not_found", "Engagement not found");
    return c.json({ data: listChecklist(c.get("workspace"), c.req.param("id")) });
  });

  app.patch("/api/engagements/:id/checklist/:itemKey", async (c) => {
    const body = await c.req.json();
    const done = Boolean(body.done);
    const row = setChecklistItem(
      c.get("workspace"),
      c.req.param("id"),
      c.req.param("itemKey"),
      done,
    );
    if (!row) return jsonError(c, 404, "not_found", "Checklist item not found");
    return c.json({ data: row });
  });

  app.post("/api/engagements/:id/run", async (c) => {
    if (!getEngagement(c.get("workspace"), c.req.param("id")))
      return jsonError(c, 404, "not_found", "Engagement not found");
    const body = await c.req.json();
    const tool = String(body.tool || "");
    const args = Array.isArray(body.args) ? body.args.map(String) : [];
    if (!["nuclei", "nmap", "httpx", "ffuf", "naabu"].includes(tool)) {
      return jsonError(
        c,
        400,
        "validation_error",
        "tool must be nuclei|nmap|httpx|ffuf|naabu",
      );
    }
    try {
      const result = await runToolAndImport(
        c.get("workspace"),
        c.req.param("id"),
        tool as "nuclei" | "nmap" | "httpx" | "ffuf" | "naabu",
        args,
      );
      return c.json({ data: result });
    } catch (e) {
      return jsonError(c, 400, "run_error", e instanceof Error ? e.message : "run failed");
    }
  });

  app.post("/api/engagements/:id/findings/:fid/probe", async (c) => {
    try {
      const result = await probeFinding(
        c.get("workspace"),
        c.req.param("id"),
        c.req.param("fid"),
      );
      return c.json({ data: result });
    } catch (e) {
      return jsonError(c, 400, "probe_error", e instanceof Error ? e.message : "probe failed");
    }
  });

  app.get("/api/engagements/:id/report", async (c) => {
    if (!getEngagement(c.get("workspace"), c.req.param("id")))
      return jsonError(c, 404, "not_found", "Engagement not found");
    const format = c.req.query("format") || "markdown";
    const confirmedOnly =
      c.req.query("confirmedOnly") === "1" || c.req.query("confirmedOnly") === "true";
    const visibilityRaw = c.req.query("visibility") || "active";
    const visibility =
      visibilityRaw === "archived" || visibilityRaw === "all" || visibilityRaw === "active"
        ? visibilityRaw
        : "active";
    const opts = { visibility, confirmedOnly } as const;

    if (format === "docx") {
      const buf = await buildDocxBuffer(c.get("workspace"), c.req.param("id"), opts);
      return new Response(buf, {
        status: 200,
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="sheaf-report.docx"`,
        },
      });
    }

    const md = buildReport(c.get("workspace"), c.req.param("id"), opts);
    if (format === "raw" || format === "markdown") {
      return c.text(md, 200, { "Content-Type": "text/markdown; charset=utf-8" });
    }
    return c.json({ data: { markdown: md } });
  });

  return app;
}
