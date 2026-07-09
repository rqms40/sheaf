import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Download, FileJson, FileOutput, FileType, RefreshCw } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/sheaf/EmptyState";
import { PageHeader } from "@/components/sheaf/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { downloadJson, downloadText, slugFile } from "@/lib/download";

export function ReportPage() {
  const { engagementId } = useParams({ strict: false }) as { engagementId: string };
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const eng = useQuery({
    queryKey: ["engagement", engagementId],
    queryFn: () => api.getEngagement(engagementId),
  });
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["report", engagementId, confirmedOnly],
    queryFn: () =>
      api.reportMarkdown(engagementId, {
        visibility: "active",
        confirmedOnly,
      }),
  });

  const baseName = slugFile(eng.data?.data.name || engagementId.slice(0, 8));

  const htmlish = useMemo(() => {
    if (!data) return "";
    return data
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/^#### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^### (.*)$/gm, "<h3>$1</h3>")
      .replace(/^## (.*)$/gm, "<h2>$1</h2>")
      .replace(/^# (.*)$/gm, "<h1>$1</h1>")
      .replace(/^&gt; (.*)$/gm, "<p class='opacity-70 text-[0.92em]'>$1</p>")
      .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
      .replace(/`([^`]+)`/g, "<code>$1</code>")
      .replace(/^\| (.+) \|$/gm, (row) => {
        if (row.includes("---")) return "";
        const cells = row
          .trim()
          .replace(/^\|/, "")
          .replace(/\|$/, "")
          .split("|")
          .map((c) => c.trim());
        return `<div class="font-mono text-[12px] opacity-80">${cells.join(" · ")}</div>`;
      })
      .replace(/^_([^_]+)_$/gm, "<em class='text-[0.95em] opacity-80'>$1</em>")
      .replace(/^\- (.*)$/gm, "<div class='ml-1'>• $1</div>")
      .replace(/```http\n([\s\S]*?)```/g, "<pre class='text-[11px] overflow-auto bg-black/5 p-2 rounded'>$1</pre>")
      .replace(/\n\n/g, "<br/><br/>");
  }, [data]);

  function downloadMd() {
    if (!data) return;
    downloadText(`${baseName}-report.md`, data, "text/markdown;charset=utf-8");
    toast.success("Report downloaded");
  }

  async function downloadDocx() {
    try {
      const blob = await api.reportDocx(engagementId, {
        visibility: "active",
        confirmedOnly,
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${baseName}-report.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("DOCX downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "DOCX export failed");
    }
  }

  async function downloadPackage() {
    try {
      const res = await api.exportPackage(engagementId);
      downloadJson(`${baseName}-sheaf-export.json`, res.data);
      if (typeof res.data.reportMarkdown === "string") {
        downloadText(
          `${baseName}-report.md`,
          res.data.reportMarkdown as string,
          "text/markdown;charset=utf-8",
        );
      }
      toast.success("Full package downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 border-b border-border px-3 py-3 sm:px-5 lg:px-6">
        <PageHeader
          className="mb-0"
          eyebrow="Deliverable"
          title="Report"
          description="Client-ready Markdown draft from the casefile. Refresh after saving findings."
          actions={
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <div className="flex items-center gap-2">
                <Label className="sr-only">Report scope</Label>
                <Select
                  value={confirmedOnly ? "confirmed" : "active"}
                  onValueChange={(v) => setConfirmedOnly(v === "confirmed")}
                >
                  <SelectTrigger className="h-8 w-full sm:w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active findings</SelectItem>
                    <SelectItem value="confirmed">Confirmed only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => refetch()}
                  disabled={isFetching}
                >
                  <RefreshCw className={`size-3.5 ${isFetching ? "animate-spin" : ""}`} />
                  <span className="hidden xs:inline sm:inline">Refresh</span>
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => void downloadPackage()}
                >
                  <FileJson className="size-3.5" />
                  <span className="hidden sm:inline">Package</span>
                </Button>
                <Button size="sm" variant="secondary" onClick={() => void downloadDocx()}>
                  <FileType className="size-3.5" />
                  DOCX
                </Button>
                <Button size="sm" onClick={downloadMd} disabled={!data}>
                  <Download className="size-3.5" />
                  .md
                </Button>
              </div>
            </div>
          }
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-background/80 p-3 pb-16 sm:p-6">
        {isLoading && <div className="text-muted">Generating…</div>}
        {error && (
          <EmptyState
            icon={FileOutput}
            title="Could not load report"
            description={(error as Error).message}
          />
        )}
        {data && (
          <article
            className="paper-surface w-full max-w-4xl rounded-sm px-4 py-6 text-[13px] leading-relaxed sm:mx-auto sm:px-10 sm:py-10 sm:text-[14px]"
            dangerouslySetInnerHTML={{ __html: htmlish }}
          />
        )}
      </div>
    </div>
  );
}
