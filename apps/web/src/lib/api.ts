export type Engagement = {
  id: string;
  name: string;
  client: string | null;
  type: string;
  status: string;
  startAt: number | null;
  endAt: number | null;
  roeText?: string | null;
  notesText?: string | null;
  createdAt: number;
  updatedAt: number;
};

export type Finding = {
  id: string;
  engagementId: string;
  runId: string | null;
  title: string;
  severity: string;
  status: string;
  host: string | null;
  path: string | null;
  description: string | null;
  impact: string | null;
  remediation: string | null;
  cwe: string | null;
  cve: string | null;
  references: string[];
  fingerprint: string;
  createdAt: number;
  updatedAt: number;
};

export type ScopeItem = {
  id: string;
  engagementId: string;
  kind: string;
  value: string;
  isExclude: number;
  notes: string | null;
  createdAt: number;
};

export type TimelineEvent = {
  id: string;
  engagementId: string;
  kind: string;
  message: string;
  refType: string | null;
  refId: string | null;
  createdAt: number;
};

export type Run = {
  id: string;
  engagementId: string;
  tool: string;
  label: string | null;
  sourcePath: string | null;
  startedAt: number;
  finishedAt: number | null;
  meta: Record<string, unknown>;
  createdAt: number;
};

export type Evidence = {
  id: string;
  engagementId: string;
  findingId: string | null;
  kind: string;
  path: string | null;
  contentText: string | null;
  meta: Record<string, unknown>;
  createdAt: number;
};

export type Asset = {
  id: string;
  host: string;
  ports: Array<{
    port: number;
    protocol: string;
    state: string;
    service?: string;
  }>;
};

export type SheafSettings = {
  version: number;
  createdAt?: number;
  activeEngagementId: string | null;
  reportConfirmedOnly: boolean;
  autoImportOnWrap: boolean;
  consoleCwd: "workspace" | "engagement";
  uiDensity: "comfortable" | "compact";
  uiLayout: "rail" | "sidebar";
};

export type FindingRevision = {
  id: string;
  engagementId: string;
  findingId: string;
  revision: number;
  source:
    | "create"
    | "edit"
    | "import"
    | "archive"
    | "restore"
    | "status"
    | "baseline";
  summary: string;
  snapshot: {
    title: string;
    severity: string;
    status: string;
    host: string | null;
    path: string | null;
    description: string | null;
    impact: string | null;
    remediation: string | null;
    cwe: string | null;
    cve: string | null;
    references: string[];
  };
  changes: Record<string, { from: unknown; to: unknown }>;
  createdAt: number;
};

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const body = await res.json();
      message = body?.error?.message || message;
    } catch {
      // ignore
    }
    throw new Error(message);
  }
  if (res.headers.get("content-type")?.includes("text/markdown")) {
    return (await res.text()) as T;
  }
  return res.json() as Promise<T>;
}

export const api = {
  health: () => request<{ ok: boolean; workspace: string }>("/api/health"),
  getSettings: () => request<{ data: SheafSettings }>("/api/settings"),
  updateSettings: (body: Partial<SheafSettings>) =>
    request<{ data: SheafSettings }>("/api/settings", {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  wrapCommand: (body: {
    argv?: string[];
    command?: string;
    engagementId?: string;
    autoImport?: boolean;
  }) =>
    request<{
      data: {
        tool: string;
        command: string;
        engagementId: string;
        exitCode: number;
        stdoutPath: string;
        stderrTail: string;
        imported: boolean;
        importResult?: unknown;
        message: string;
      };
    }>("/api/wrap", { method: "POST", body: JSON.stringify(body) }),
  listEngagements: () => request<{ data: Engagement[] }>("/api/engagements"),
  createEngagement: (body: {
    name: string;
    client?: string;
    type?: string;
  }) =>
    request<{ data: Engagement }>("/api/engagements", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  getEngagement: (id: string) =>
    request<{ data: Engagement }>(`/api/engagements/${id}`),
  updateEngagement: (id: string, body: Record<string, unknown>) =>
    request<{ data: Engagement }>(`/api/engagements/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  archiveEngagement: (id: string, archive = true) =>
    request<{ data: Engagement }>(`/api/engagements/${id}/archive`, {
      method: "POST",
      body: JSON.stringify({ archive }),
    }),
  exportPackage: (id: string) =>
    request<{ data: Record<string, unknown> }>(`/api/engagements/${id}/export`),
  listScope: (id: string) =>
    request<{ data: ScopeItem[] }>(`/api/engagements/${id}/scope`),
  addScope: (
    id: string,
    body: { kind: string; value: string; isExclude?: boolean },
  ) =>
    request<{ data: ScopeItem }>(`/api/engagements/${id}/scope`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteScope: (id: string, scopeId: string) =>
    request<{ ok: boolean }>(`/api/engagements/${id}/scope/${scopeId}`, {
      method: "DELETE",
    }),
  listFindings: (
    id: string,
    params?: {
      severity?: string;
      status?: string;
      q?: string;
      visibility?: "active" | "archived" | "all";
    },
  ) => {
    const sp = new URLSearchParams();
    if (params?.severity) sp.set("severity", params.severity);
    if (params?.status) sp.set("status", params.status);
    if (params?.q) sp.set("q", params.q);
    if (params?.visibility) sp.set("visibility", params.visibility);
    const qs = sp.toString();
    return request<{ data: Finding[] }>(
      `/api/engagements/${id}/findings${qs ? `?${qs}` : ""}`,
    );
  },
  createFinding: (id: string, body: Record<string, unknown>) =>
    request<{ data: Finding }>(`/api/engagements/${id}/findings`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateFinding: (id: string, fid: string, body: Record<string, unknown>) =>
    request<{ data: Finding }>(`/api/engagements/${id}/findings/${fid}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  archiveFinding: (id: string, fid: string, archive = true) =>
    request<{ data: Finding }>(`/api/engagements/${id}/findings/${fid}/archive`, {
      method: "POST",
      body: JSON.stringify({ archive }),
    }),
  deleteFinding: (id: string, fid: string) =>
    request<{ ok: boolean }>(`/api/engagements/${id}/findings/${fid}`, {
      method: "DELETE",
    }),
  listTimeline: (
    id: string,
    opts?: { limit?: number; offset?: number },
  ) => {
    const sp = new URLSearchParams();
    if (opts?.limit != null) sp.set("limit", String(opts.limit));
    if (opts?.offset != null) sp.set("offset", String(opts.offset));
    const qs = sp.toString();
    return request<{
      data: TimelineEvent[];
      meta: {
        total: number;
        limit: number;
        offset: number;
        hasMore: boolean;
      };
    }>(`/api/engagements/${id}/timeline${qs ? `?${qs}` : ""}`);
  },
  listRuns: (id: string) =>
    request<{ data: Run[] }>(`/api/engagements/${id}/runs`),
  listAssets: (id: string) =>
    request<{ data: Asset[] }>(`/api/engagements/${id}/assets`),
  listEvidence: (id: string, findingId?: string) =>
    request<{ data: Evidence[] }>(
      `/api/engagements/${id}/evidence${findingId ? `?findingId=${findingId}` : ""}`,
    ),
  addEvidence: (id: string, body: Record<string, unknown>) =>
    request<{ data: Evidence }>(`/api/engagements/${id}/evidence`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  deleteEvidence: (id: string, evidenceId: string) =>
    request<{ ok: boolean }>(`/api/engagements/${id}/evidence/${evidenceId}`, {
      method: "DELETE",
    }),
  /** Same-origin URL for previewing / downloading a file attachment */
  evidenceFileUrl: (id: string, evidenceId: string) =>
    `/api/engagements/${id}/evidence/${evidenceId}/file`,
  importNuclei: (id: string, content: string, sourcePath?: string) =>
    request<{ data: { created: number; updated: number; runId: string } }>(
      `/api/engagements/${id}/import/nuclei`,
      {
        method: "POST",
        body: JSON.stringify({ content, sourcePath }),
      },
    ),
  importNmap: (id: string, content: string, sourcePath?: string) =>
    request<{ data: { created: number; updated: number; runId: string } }>(
      `/api/engagements/${id}/import/nmap`,
      {
        method: "POST",
        body: JSON.stringify({ content, sourcePath }),
      },
    ),
  importHttpx: (id: string, content: string, sourcePath?: string) =>
    request<{ data: { created: number; updated: number; runId: string } }>(
      `/api/engagements/${id}/import/httpx`,
      {
        method: "POST",
        body: JSON.stringify({ content, sourcePath }),
      },
    ),
  importFfuf: (id: string, content: string, sourcePath?: string) =>
    request<{ data: { created: number; updated: number; runId: string } }>(
      `/api/engagements/${id}/import/ffuf`,
      {
        method: "POST",
        body: JSON.stringify({ content, sourcePath }),
      },
    ),
  importBurp: (id: string, content: string, sourcePath?: string) =>
    request<{ data: { created: number; updated: number; runId: string } }>(
      `/api/engagements/${id}/import/burp`,
      {
        method: "POST",
        body: JSON.stringify({ content, sourcePath }),
      },
    ),
  importNaabu: (id: string, content: string, sourcePath?: string) =>
    request<{ data: { created: number; updated: number; runId: string } }>(
      `/api/engagements/${id}/import/naabu`,
      {
        method: "POST",
        body: JSON.stringify({ content, sourcePath }),
      },
    ),
  uploadEvidence: (
    id: string,
    body: {
      filename: string;
      contentBase64: string;
      findingId?: string;
      kind?: string;
      mimeType?: string;
    },
  ) =>
    request<{ data: Evidence }>(`/api/engagements/${id}/evidence/upload`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listTemplates: () =>
    request<{
      data: Array<{
        id: string;
        name: string;
        category: string;
        title: string;
        severity: string;
        description: string;
        impact: string;
        remediation: string;
        cwe?: string;
      }>;
    }>("/api/templates/findings"),
  listChecklist: (id: string) =>
    request<{
      data: Array<{
        id: string;
        itemKey: string;
        label: string;
        phase: string;
        done: boolean;
      }>;
    }>(`/api/engagements/${id}/checklist`),
  setChecklist: (id: string, itemKey: string, done: boolean) =>
    request<{ data: { itemKey: string; done: boolean } }>(
      `/api/engagements/${id}/checklist/${itemKey}`,
      { method: "PATCH", body: JSON.stringify({ done }) },
    ),
  runTool: (id: string, tool: string, args: string[]) =>
    request<{ data: { exitCode: number; importResult?: unknown; stderr: string } }>(
      `/api/engagements/${id}/run`,
      { method: "POST", body: JSON.stringify({ tool, args }) },
    ),
  probeFinding: (id: string, fid: string) =>
    request<{
      data: { ok: boolean; statusCode?: number; error?: string; url?: string };
    }>(`/api/engagements/${id}/findings/${fid}/probe`, { method: "POST", body: "{}" }),
  listFindingHistory: (id: string, fid: string) =>
    request<{ data: FindingRevision[] }>(
      `/api/engagements/${id}/findings/${fid}/history`,
    ),
  restoreFindingRevision: (id: string, fid: string, revisionId: string) =>
    request<{ data: Finding }>(
      `/api/engagements/${id}/findings/${fid}/history/${revisionId}/restore`,
      { method: "POST", body: "{}" },
    ),
  reportMarkdown: (
    id: string,
    opts?: { confirmedOnly?: boolean; visibility?: "active" | "archived" | "all" },
  ) => {
    const sp = new URLSearchParams({ format: "markdown" });
    if (opts?.confirmedOnly) sp.set("confirmedOnly", "1");
    if (opts?.visibility) sp.set("visibility", opts.visibility);
    return request<string>(`/api/engagements/${id}/report?${sp}`);
  },
  reportDocx: async (
    id: string,
    opts?: { confirmedOnly?: boolean; visibility?: "active" | "archived" | "all" },
  ) => {
    const sp = new URLSearchParams({ format: "docx" });
    if (opts?.confirmedOnly) sp.set("confirmedOnly", "1");
    if (opts?.visibility) sp.set("visibility", opts.visibility);
    const res = await fetch(`/api/engagements/${id}/report?${sp}`);
    if (!res.ok) throw new Error(await res.text());
    return res.blob();
  },
};

