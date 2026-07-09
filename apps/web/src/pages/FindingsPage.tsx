import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import {
  Archive,
  ArchiveRestore,
  ArrowLeft,
  FileWarning,
  Import,
  Plus,
  Radar,
  Save,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/sheaf/EmptyState";
import { FindingHistory } from "@/components/sheaf/FindingHistory";
import { FindingRow } from "@/components/sheaf/FindingRow";
import { SeverityBadge } from "@/components/sheaf/SeverityBadge";
import { StatusBadge } from "@/components/sheaf/StatusBadge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api, type Finding } from "@/lib/api";
import { readFileAsBase64, readFileAsText } from "@/lib/files";
import { cn } from "@/lib/utils";

type ImportTool = "nuclei" | "nmap" | "httpx" | "ffuf" | "burp";

/** Working statuses for edit form (archive is a separate action). */
const STATUSES = [
  "draft",
  "needs_review",
  "confirmed",
  "false_positive",
  "risk_accepted",
  "remediated",
] as const;

const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;

type FindingDraft = {
  title: string;
  severity: string;
  status: string;
  host: string;
  path: string;
  description: string;
  impact: string;
  remediation: string;
  cwe: string;
  cve: string;
};

function toDraft(f: Finding): FindingDraft {
  return {
    title: f.title ?? "",
    severity: f.severity,
    status: f.status,
    host: f.host ?? "",
    path: f.path ?? "",
    description: f.description ?? "",
    impact: f.impact ?? "",
    remediation: f.remediation ?? "",
    cwe: f.cwe ?? "",
    cve: f.cve ?? "",
  };
}

function draftsEqual(a: FindingDraft, b: FindingDraft) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function FindingsPage() {
  const { engagementId } = useParams({ strict: false }) as { engagementId: string };
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");
  /** Active casework by default; archived is soft-hide, delete is permanent. */
  const [visibility, setVisibility] = useState<"active" | "archived" | "all">(
    "active",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [importKind, setImportKind] = useState<ImportTool>("nuclei");
  const [importText, setImportText] = useState("");
  const [importFileName, setImportFileName] = useState<string | undefined>();
  const [manualOpen, setManualOpen] = useState(false);
  const [manualTitle, setManualTitle] = useState("");
  const [templateOpen, setTemplateOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [evidenceText, setEvidenceText] = useState("");
  const [draft, setDraft] = useState<FindingDraft | null>(null);
  const [savedSnapshot, setSavedSnapshot] = useState<FindingDraft | null>(null);
  /** Mobile: list vs detail (desktop always shows both). */
  const [mobilePanel, setMobilePanel] = useState<"list" | "detail">("list");
  const importFileRef = useRef<HTMLInputElement>(null);
  const evidenceFileRef = useRef<HTMLInputElement>(null);

  const findingsQuery = useQuery({
    queryKey: ["findings", engagementId, severity, status, q, visibility],
    queryFn: () =>
      api.listFindings(engagementId, {
        severity: severity === "all" ? undefined : severity,
        status: status === "all" ? undefined : status,
        q: q || undefined,
        visibility,
      }),
  });

  const findings = findingsQuery.data?.data ?? [];
  const selected = useMemo(
    () => findings.find((f) => f.id === selectedId) ?? findings[0] ?? null,
    [findings, selectedId],
  );
  const isArchived = selected?.status === "archived";

  const dirty = !!(draft && savedSnapshot && !draftsEqual(draft, savedSnapshot));

  // Load draft only when selection identity changes — not on every refetch
  useEffect(() => {
    if (!selected) {
      setDraft(null);
      setSavedSnapshot(null);
      return;
    }
    const next = toDraft(selected);
    setDraft(next);
    setSavedSnapshot(next);
    setSelectedId(selected.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional: only rebind when selected.id changes
  }, [selected?.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        if (dirty) save.mutate();
        return;
      }
      if (e.key === "j" || e.key === "k") {
        if (!findings.length) return;
        if (dirty) {
          toast.message("Save or discard changes before switching findings");
          return;
        }
        const idx = Math.max(
          0,
          findings.findIndex((f) => f.id === (selected?.id ?? "")),
        );
        const next =
          e.key === "j"
            ? Math.min(findings.length - 1, idx + 1)
            : Math.max(0, idx - 1);
        setSelectedId(findings[next].id);
      }
      if (e.key === "/") {
        e.preventDefault();
        document.getElementById("finding-search")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["findings", engagementId] });
    qc.invalidateQueries({ queryKey: ["timeline", engagementId] });
    qc.invalidateQueries({ queryKey: ["runs", engagementId] });
    qc.invalidateQueries({ queryKey: ["evidence", engagementId] });
    if (selected?.id) {
      qc.invalidateQueries({
        queryKey: ["finding-history", engagementId, selected.id],
      });
    }
  };

  const historyQuery = useQuery({
    queryKey: ["finding-history", engagementId, selected?.id],
    queryFn: () => api.listFindingHistory(engagementId, selected!.id),
    enabled: !!selected?.id,
    refetchOnMount: "always",
    staleTime: 0,
  });

  const save = useMutation({
    mutationFn: () => {
      if (!selected || !draft) throw new Error("Nothing to save");
      return api.updateFinding(engagementId, selected.id, {
        title: draft.title,
        severity: draft.severity,
        status: draft.status,
        host: draft.host || null,
        path: draft.path || null,
        description: draft.description || null,
        impact: draft.impact || null,
        remediation: draft.remediation || null,
        cwe: draft.cwe || null,
        cve: draft.cve || null,
      });
    },
    onSuccess: async (res) => {
      const next = toDraft(res.data);
      setDraft(next);
      setSavedSnapshot(next);
      toast.success("Finding saved");
      invalidate();
      await qc.invalidateQueries({
        queryKey: ["finding-history", engagementId, res.data.id],
      });
      await qc.refetchQueries({
        queryKey: ["finding-history", engagementId, res.data.id],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const restoreMut = useMutation({
    mutationFn: (revisionId: string) => {
      if (!selected) throw new Error("No finding");
      return api.restoreFindingRevision(engagementId, selected.id, revisionId);
    },
    onSuccess: (res) => {
      const next = toDraft(res.data);
      setDraft(next);
      setSavedSnapshot(next);
      toast.success("Version restored (new revision appended)");
      invalidate();
      qc.invalidateQueries({
        queryKey: ["finding-history", engagementId, res.data.id],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const createManual = useMutation({
    mutationFn: () =>
      api.createFinding(engagementId, {
        title: manualTitle,
        severity: "medium",
        status: "draft",
      }),
    onSuccess: (res) => {
      toast.success("Finding created");
      setManualOpen(false);
      setManualTitle("");
      setSelectedId(res.data.id);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const templatesQuery = useQuery({
    queryKey: ["templates"],
    queryFn: () => api.listTemplates(),
    enabled: templateOpen,
  });

  const doImport = useMutation({
    mutationFn: async () => {
      const src = importFileName || "ui-import";
      if (importKind === "nuclei") return api.importNuclei(engagementId, importText, src);
      if (importKind === "nmap") return api.importNmap(engagementId, importText, src);
      if (importKind === "httpx") return api.importHttpx(engagementId, importText, src);
      if (importKind === "burp") return api.importBurp(engagementId, importText, src);
      return api.importFfuf(engagementId, importText, src);
    },
    onSuccess: (res) => {
      toast.success(`Import done: ${res.data.created} new, ${res.data.updated} updated`);
      setImportOpen(false);
      setImportText("");
      setImportFileName(undefined);
      invalidate();
      qc.invalidateQueries({ queryKey: ["assets", engagementId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const applyTemplate = useMutation({
    mutationFn: async (templateId: string) => {
      const t = templatesQuery.data?.data.find((x) => x.id === templateId);
      if (!t) throw new Error("Template not found");
      return api.createFinding(engagementId, {
        title: t.title,
        severity: t.severity,
        status: "draft",
        description: t.description,
        impact: t.impact,
        remediation: t.remediation,
        cwe: t.cwe ?? null,
      });
    },
    onSuccess: (res) => {
      toast.success("Finding created from template");
      setTemplateOpen(false);
      setSelectedId(res.data.id);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const probeMut = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No finding");
      return api.probeFinding(engagementId, selected.id);
    },
    onSuccess: (res) => {
      if (res.data.ok) {
        toast.success(`Probe ${res.data.statusCode} · ${res.data.url}`);
      } else {
        toast.error(res.data.error || "Probe failed");
      }
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const uploadEvidenceMut = useMutation({
    mutationFn: async (file: File) => {
      if (!selected) throw new Error("No finding");
      const contentBase64 = await readFileAsBase64(file);
      return api.uploadEvidence(engagementId, {
        filename: file.name,
        contentBase64,
        findingId: selected.id,
        kind: file.type.startsWith("image/") ? "screenshot" : "file",
        mimeType: file.type || undefined,
      });
    },
    onSuccess: () => {
      toast.success("File evidence uploaded");
      invalidate();
      void qc.invalidateQueries({
        queryKey: ["evidence", engagementId, selected?.id],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteEvidenceMut = useMutation({
    mutationFn: (evidenceId: string) => api.deleteEvidence(engagementId, evidenceId),
    onSuccess: () => {
      toast.success("Evidence removed");
      invalidate();
      void qc.invalidateQueries({
        queryKey: ["evidence", engagementId, selected?.id],
      });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const evidenceQuery = useQuery({
    queryKey: ["evidence", engagementId, selected?.id],
    queryFn: () => api.listEvidence(engagementId, selected?.id),
    enabled: !!selected,
  });

  const archiveMut = useMutation({
    mutationFn: (archive: boolean) => {
      if (!selected) throw new Error("No finding");
      return api.archiveFinding(engagementId, selected.id, archive);
    },
    onSuccess: (res) => {
      toast.success(
        res.data.status === "archived"
          ? "Finding archived (hidden from active list)"
          : "Finding restored to needs review",
      );
      setSelectedId(null);
      setDraft(null);
      setSavedSnapshot(null);
      setMobilePanel("list");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No finding");
      return api.deleteFinding(engagementId, selected.id);
    },
    onSuccess: () => {
      toast.success("Finding deleted permanently");
      setDeleteOpen(false);
      setSelectedId(null);
      setDraft(null);
      setSavedSnapshot(null);
      setMobilePanel("list");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addEvidenceMut = useMutation({
    mutationFn: () => {
      if (!selected) throw new Error("No finding");
      return api.addEvidence(engagementId, {
        findingId: selected.id,
        kind: "http",
        contentText: evidenceText,
      });
    },
    onSuccess: () => {
      toast.success("Evidence attached");
      setEvidenceText("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  function selectFinding(id: string) {
    if (id === selected?.id) {
      setMobilePanel("detail");
      return;
    }
    if (dirty) {
      toast.message("Save or discard changes before switching findings");
      return;
    }
    setSelectedId(id);
    setMobilePanel("detail");
  }

  function backToList() {
    if (dirty) {
      toast.message("Save or discard changes before going back");
      return;
    }
    setMobilePanel("list");
  }

  function discard() {
    if (!savedSnapshot) return;
    setDraft({ ...savedSnapshot });
    toast.message("Changes discarded");
  }

  function patchDraft(partial: Partial<FindingDraft>) {
    setDraft((d) => (d ? { ...d, ...partial } : d));
  }

  return (
    <div className="flex h-full min-h-0 flex-col md:flex-row">
      <aside
        className={cn(
          "flex min-h-0 w-full shrink-0 flex-col border-border bg-card/50 md:w-[min(100%,340px)] md:border-r lg:w-[380px]",
          mobilePanel === "detail" ? "hidden md:flex" : "flex h-full",
        )}
      >
        <div className="space-y-2.5 border-b border-border p-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="eyebrow">Casefile</div>
              <div className="text-[14px] font-medium">Findings</div>
            </div>
            <div className="flex gap-1.5">
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setImportOpen(true)}
                title="Import tool output"
              >
                <Import className="size-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setTemplateOpen(true)}
                title="From template"
              >
                <FileWarning className="size-4" />
              </Button>
              <Button
                variant="secondary"
                size="icon"
                onClick={() => setManualOpen(true)}
                title="New manual finding"
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </div>

          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2 size-3.5 text-faint" />
            <Input
              id="finding-search"
              className="pl-8"
              placeholder="Search title, host, path…  /"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>

          <Select
            value={visibility}
            onValueChange={(v) => {
              setVisibility(v as typeof visibility);
              setSelectedId(null);
            }}
          >
            <SelectTrigger aria-label="Finding visibility">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active (hide archived)</SelectItem>
              <SelectItem value="archived">Archived only</SelectItem>
              <SelectItem value="all">All findings</SelectItem>
            </SelectContent>
          </Select>

          <div className="grid grid-cols-2 gap-2">
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger aria-label="Filter severity">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All severities</SelectItem>
                {SEVERITIES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger aria-label="Filter status">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replaceAll("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-[11px] text-faint">
            {findings.length} finding{findings.length === 1 ? "" : "s"}
            <span className="mx-1.5 text-border">·</span>
            <span className="hidden sm:inline">Archive = soft hide · Delete = permanent</span>
            <span className="sm:hidden">Tap a finding to open</span>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="space-y-1 p-2 pb-6">
            {findingsQuery.isLoading && (
              <div className="p-3 text-muted">Loading findings…</div>
            )}
            {findings.map((f) => (
              <FindingRow
                key={f.id}
                finding={f}
                selected={f.id === selected?.id}
                onClick={() => selectFinding(f.id)}
              />
            ))}
            {!findingsQuery.isLoading && findings.length === 0 && (
              <EmptyState
                icon={FileWarning}
                title="No findings yet"
                description="Import nuclei JSONL or nmap XML, or create a manual finding."
                className="border-0 bg-transparent py-8"
                action={
                  <Button size="sm" onClick={() => setImportOpen(true)}>
                    Import output
                  </Button>
                }
              />
            )}
          </div>
        </ScrollArea>
      </aside>

      <section
        className={cn(
          "min-h-0 min-w-0 flex-1 overflow-y-auto",
          mobilePanel === "list" ? "hidden md:block" : "block",
        )}
      >
        {!selected || !draft ? (
          <div className="flex h-full items-center justify-center p-6 sm:p-8">
            <EmptyState
              icon={FileWarning}
              title="Select a finding"
              description="Choose a finding from the list to review and edit. Changes only save when you click Save."
            />
          </div>
        ) : (
          <div className="w-full max-w-none space-y-4 px-3 py-3 pb-16 sm:space-y-5 sm:px-5 sm:py-4 lg:px-8">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="mb-2 -ml-2 md:hidden"
                  onClick={backToList}
                >
                  <ArrowLeft className="size-3.5" />
                  Findings
                </Button>
                <div className="flex items-center gap-2">
                  {dirty ? <span className="dirty-dot" title="Unsaved changes" /> : null}
                  <h2 className="truncate text-[15px] font-medium tracking-tight sm:text-[16px]">
                    {draft.title || "Untitled finding"}
                  </h2>
                </div>
                <div className="mt-1 font-mono text-[12px] text-muted">
                  {draft.host || "—"}
                  {draft.path ? <span className="text-faint">{draft.path}</span> : null}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <SeverityBadge severity={draft.severity} />
                <StatusBadge status={draft.status} />
              </div>
            </div>

            <div
              className={cn(
                "sticky top-0 z-10 -mx-4 flex flex-wrap items-center justify-between gap-2 border-y border-border bg-background/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8",
                dirty && "border-primary/30",
              )}
            >
              <div className="text-[12px] text-muted">
                {dirty
                  ? "Unsaved changes — nothing is written until you save."
                  : isArchived
                    ? "This finding is archived (hidden from active list & default report)."
                    : "Up to date with the casefile."}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!selected?.host || probeMut.isPending}
                  onClick={() => probeMut.mutate()}
                  title="Safe GET probe (authorized targets only)"
                >
                  <Radar className="size-3.5" />
                  Probe
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={archiveMut.isPending || dirty}
                  onClick={() => archiveMut.mutate(!isArchived)}
                  title={
                    isArchived
                      ? "Restore to active triage"
                      : "Archive — soft hide, reversible"
                  }
                >
                  {isArchived ? (
                    <ArchiveRestore className="size-3.5" />
                  ) : (
                    <Archive className="size-3.5" />
                  )}
                  {isArchived ? "Restore" : "Archive"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={deleteMut.isPending}
                  onClick={() => setDeleteOpen(true)}
                  title="Delete permanently"
                >
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!dirty || save.isPending}
                  onClick={discard}
                >
                  <Undo2 className="size-3.5" />
                  Discard
                </Button>
                <Button
                  size="sm"
                  disabled={!dirty || save.isPending || !draft.title.trim()}
                  onClick={() => save.mutate()}
                >
                  <Save className="size-3.5" />
                  {save.isPending ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>

            <Tabs defaultValue="writeup">
              <TabsList className="flex h-auto min-h-9 w-full flex-wrap justify-start gap-0.5 sm:w-auto">
                <TabsTrigger value="writeup">Writeup</TabsTrigger>
                <TabsTrigger value="meta">Meta</TabsTrigger>
                <TabsTrigger value="evidence">
                  Evidence ({evidenceQuery.data?.data?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="history" data-testid="history-tab">
                  History ({historyQuery.data?.data?.length ?? 0})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="writeup" className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="f-title">Title</Label>
                  <Input
                    id="f-title"
                    value={draft.title}
                    onChange={(e) => patchDraft({ title: e.target.value })}
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Severity</Label>
                    <Select
                      value={draft.severity}
                      onValueChange={(v) => patchDraft({ severity: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {SEVERITIES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Status</Label>
                    {isArchived ? (
                      <div className="flex h-8 items-center rounded-md border border-border bg-elevated px-2.5 text-[12px] text-muted">
                        archived — use Restore to triage again
                      </div>
                    ) : (
                      <Select
                        value={
                          STATUSES.includes(draft.status as (typeof STATUSES)[number])
                            ? draft.status
                            : "needs_review"
                        }
                        onValueChange={(v) => patchDraft({ status: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {s.replaceAll("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-desc">Description</Label>
                  <Textarea
                    id="f-desc"
                    className="min-h-[100px] font-sans"
                    value={draft.description}
                    onChange={(e) => patchDraft({ description: e.target.value })}
                    placeholder="What did you observe?"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-impact">Impact</Label>
                  <Textarea
                    id="f-impact"
                    className="min-h-[80px] font-sans"
                    value={draft.impact}
                    onChange={(e) => patchDraft({ impact: e.target.value })}
                    placeholder="Business / security impact"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-rem">Remediation</Label>
                  <Textarea
                    id="f-rem"
                    className="min-h-[80px] font-sans"
                    value={draft.remediation}
                    onChange={(e) => patchDraft({ remediation: e.target.value })}
                    placeholder="How should this be fixed?"
                  />
                </div>
              </TabsContent>

              <TabsContent value="meta" className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="f-host">Host</Label>
                    <Input
                      id="f-host"
                      className="font-mono text-[12px]"
                      value={draft.host}
                      onChange={(e) => patchDraft({ host: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="f-path">Path / location</Label>
                    <Input
                      id="f-path"
                      className="font-mono text-[12px]"
                      value={draft.path}
                      onChange={(e) => patchDraft({ path: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="f-cwe">CWE</Label>
                    <Input
                      id="f-cwe"
                      value={draft.cwe}
                      onChange={(e) => patchDraft({ cwe: e.target.value })}
                      placeholder="CWE-639"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="f-cve">CVE</Label>
                    <Input
                      id="f-cve"
                      value={draft.cve}
                      onChange={(e) => patchDraft({ cve: e.target.value })}
                      placeholder="CVE-2021-44228"
                    />
                  </div>
                </div>
                <Separator />
                <div className="rounded-md border border-border bg-card/60 p-3 font-mono text-[11px] text-faint">
                  id {selected.id}
                  <br />
                  fingerprint {selected.fingerprint}
                </div>
              </TabsContent>

              <TabsContent value="evidence" className="space-y-3">
                <div className="space-y-2 rounded-md border border-border bg-card p-3">
                  <Label htmlFor="ev-text">Attach HTTP / text evidence</Label>
                  <Textarea
                    id="ev-text"
                    className="min-h-[100px]"
                    placeholder={"=== REQUEST ===\nGET / HTTP/1.1\n..."}
                    value={evidenceText}
                    onChange={(e) => setEvidenceText(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={!evidenceText.trim() || addEvidenceMut.isPending}
                      onClick={() => addEvidenceMut.mutate()}
                    >
                      Attach text
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={uploadEvidenceMut.isPending}
                      onClick={() => evidenceFileRef.current?.click()}
                    >
                      Upload file / screenshot
                    </Button>
                    <input
                      ref={evidenceFileRef}
                      type="file"
                      className="hidden"
                      accept="image/*,.txt,.log,.json,.xml,.har,.pdf"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) uploadEvidenceMut.mutate(f);
                        e.target.value = "";
                      }}
                    />
                  </div>
                </div>
                {(evidenceQuery.data?.data ?? []).map((ev) => {
                  const meta = (ev.meta ?? {}) as {
                    originalName?: string;
                    mimeType?: string;
                    size?: number;
                  };
                  const name = meta.originalName || ev.path || ev.kind;
                  const mime = meta.mimeType || "";
                  const isImage =
                    ev.kind === "screenshot" ||
                    mime.startsWith("image/") ||
                    /\.(png|jpe?g|gif|webp|svg)$/i.test(name);
                  const hasFile = !!ev.path;
                  const fileUrl = hasFile
                    ? api.evidenceFileUrl(engagementId, ev.id)
                    : null;
                  return (
                    <div
                      key={ev.id}
                      className="overflow-hidden rounded-md border border-border bg-card"
                      data-testid="evidence-card"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
                        <div className="min-w-0">
                          <span className="text-[11px] uppercase tracking-wide text-faint">
                            {ev.kind}
                          </span>
                          <div className="truncate font-mono text-[11px] text-muted">
                            {name}
                            {typeof meta.size === "number"
                              ? ` · ${(meta.size / 1024).toFixed(1)} KB`
                              : ""}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {fileUrl ? (
                            <Button size="sm" variant="ghost" asChild>
                              <a href={fileUrl} target="_blank" rel="noreferrer">
                                Open
                              </a>
                            </Button>
                          ) : null}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            disabled={deleteEvidenceMut.isPending}
                            title="Remove evidence"
                            onClick={() => {
                              if (
                                !window.confirm(
                                  `Remove this evidence${name ? ` (${name})` : ""}?`,
                                )
                              ) {
                                return;
                              }
                              deleteEvidenceMut.mutate(ev.id);
                            }}
                          >
                            <Trash2 className="size-3.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                      {isImage && fileUrl ? (
                        <div className="bg-background/50 p-2">
                          <a href={fileUrl} target="_blank" rel="noreferrer">
                            <img
                              src={fileUrl}
                              alt={name}
                              className="mx-auto max-h-80 w-auto max-w-full rounded border border-border object-contain"
                              loading="lazy"
                            />
                          </a>
                        </div>
                      ) : null}
                      {ev.contentText ? (
                        <pre className="max-h-72 overflow-auto p-3 font-mono text-[11px] text-muted whitespace-pre-wrap">
                          {ev.contentText}
                        </pre>
                      ) : null}
                      {!isImage && !ev.contentText && hasFile ? (
                        <div className="p-3 text-[12px] text-muted">
                          File attached.{" "}
                          <a
                            className="text-primary underline-offset-2 hover:underline"
                            href={fileUrl!}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Open / download
                          </a>
                        </div>
                      ) : null}
                      {!hasFile && !ev.contentText ? (
                        <div className="p-3 text-[12px] text-faint">Empty evidence row</div>
                      ) : null}
                    </div>
                  );
                })}
                {(evidenceQuery.data?.data?.length ?? 0) === 0 && (
                  <EmptyState
                    icon={FileWarning}
                    title="No evidence yet"
                    description="Paste request/response above, or upload a screenshot / file. Images show a preview here."
                    className="py-8"
                  />
                )}
              </TabsContent>

              <TabsContent value="history" className="space-y-3">
                <FindingHistory
                  revisions={historyQuery.data?.data ?? []}
                  loading={historyQuery.isLoading}
                  restoringId={restoreMut.isPending ? restoreMut.variables : null}
                  dirty={dirty}
                  onRestore={(revisionId) => {
                    if (dirty) {
                      toast.message("Save or discard changes before restoring");
                      return;
                    }
                    restoreMut.mutate(revisionId);
                  }}
                />
              </TabsContent>
            </Tabs>
          </div>
        )}
      </section>

      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Import tool output</DialogTitle>
            <DialogDescription>
              Paste or choose a file. Findings/assets are deduped by fingerprint/host.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2">
            {(["nuclei", "nmap", "httpx", "ffuf", "burp"] as ImportTool[]).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={importKind === t ? "default" : "secondary"}
                onClick={() => setImportKind(t)}
              >
                {t}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => importFileRef.current?.click()}
            >
              Choose file
            </Button>
            <span className="truncate text-[12px] text-muted">
              {importFileName || "No file selected"}
            </span>
            <input
              ref={importFileRef}
              type="file"
              className="hidden"
              accept=".json,.jsonl,.xml,.txt,application/xml,text/xml"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (!f) return;
                try {
                  const text = await readFileAsText(f);
                  setImportText(text);
                  setImportFileName(f.name);
                  toast.message(`Loaded ${f.name}`);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Read failed");
                }
                e.target.value = "";
              }}
            />
          </div>
          <Textarea
            className="min-h-[220px]"
            placeholder={`Paste ${importKind} output or load a file…`}
            value={importText}
            onChange={(e) => setImportText(e.target.value)}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setImportOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!importText.trim() || doImport.isPending}
              onClick={() => doImport.mutate()}
            >
              {doImport.isPending ? "Importing…" : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={templateOpen} onOpenChange={setTemplateOpen}>
        <DialogContent className="flex max-h-[min(85vh,640px)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-lg">
          <DialogHeader className="shrink-0 space-y-1 border-b border-border px-5 py-4 pr-12 text-left">
            <DialogTitle>Finding templates</DialogTitle>
            <DialogDescription>
              Seed a writeup from a common vulnerability pattern. Edit before saving.
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <div className="space-y-2 pb-1">
              {(templatesQuery.data?.data ?? []).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className="w-full rounded-md border border-border bg-background/50 px-3 py-2.5 text-left transition-colors hover:bg-elevated/80"
                  onClick={() => applyTemplate.mutate(t.id)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{t.name}</span>
                    <SeverityBadge severity={t.severity} />
                  </div>
                  <div className="mt-0.5 text-[11px] text-faint">{t.category}</div>
                </button>
              ))}
              {templatesQuery.isLoading && (
                <div className="py-6 text-center text-muted">Loading templates…</div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={manualOpen} onOpenChange={setManualOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manual finding</DialogTitle>
            <DialogDescription>
              Create a draft finding. You can flesh out the writeup after.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="manual-title">Title</Label>
            <Input
              id="manual-title"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="IDOR on /api/orders/{id}"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setManualOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!manualTitle.trim() || createManual.isPending}
              onClick={() => createManual.mutate()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete finding permanently?</DialogTitle>
            <DialogDescription>
              This removes{" "}
              <strong className="text-foreground">{selected?.title}</strong> and its
              linked evidence/notes from the casefile. Prefer{" "}
              <strong className="text-foreground">Archive</strong> if you might need
              it later.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => deleteMut.mutate()}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete permanently"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
