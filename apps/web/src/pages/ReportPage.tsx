import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import DOMPurify from "dompurify";
import { Download, FileJson, FileOutput, FileType, Printer, RefreshCw } from "lucide-react";
import { marked } from "marked";
import { useEffect, useMemo, useState } from "react";
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

marked.setOptions({
  gfm: true,
  breaks: false,
});

function renderReportHtml(markdown: string): string {
  const raw = marked.parse(markdown, { async: false }) as string;
  // Allow data:image/* so evidence screenshots embed in the paper preview
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
    ADD_TAGS: ["img"],
    ADD_ATTR: ["src", "alt", "title", "width", "height", "loading"],
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|sms|cid|xmpp|data):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

export function ReportPage() {
  const { engagementId } = useParams({ strict: false }) as { engagementId: string };
  const settingsQ = useQuery({
    queryKey: ["settings"],
    queryFn: () => api.getSettings(),
  });
  const [confirmedOnly, setConfirmedOnly] = useState(false);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  useEffect(() => {
    if (prefsLoaded || !settingsQ.data?.data) return;
    setConfirmedOnly(settingsQ.data.data.reportConfirmedOnly);
    setPrefsLoaded(true);
  }, [settingsQ.data?.data, prefsLoaded]);
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

  const html = useMemo(() => {
    if (!data) return "";
    return renderReportHtml(data);
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

  function printReport() {
    window.print();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="report-toolbar shrink-0 border-b border-border px-3 py-3 sm:px-5 lg:px-6">
        <PageHeader
          className="mb-0"
          eyebrow="Deliverable"
          title="Report"
          description="Client-ready draft rendered as paper. ROE, scope, severity tables, and findings."
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
                <Button variant="secondary" size="sm" onClick={printReport} disabled={!data}>
                  <Printer className="size-3.5" />
                  <span className="hidden sm:inline">Print</span>
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

      <div className="report-scroll min-h-0 flex-1 overflow-y-auto bg-background/80 p-3 pb-16 sm:p-6">
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
            className="report-paper paper-surface w-full max-w-3xl rounded-sm px-5 py-8 text-[14px] leading-[1.65] sm:mx-auto sm:px-12 sm:py-12 sm:text-[15px]"
            data-testid="report-paper"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </div>
  );
}
