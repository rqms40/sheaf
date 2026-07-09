import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Play, Server, Terminal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/sheaf/EmptyState";
import { PageHeader } from "@/components/sheaf/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/utils";

export function RunsPage() {
  const { engagementId } = useParams({ strict: false }) as { engagementId: string };
  const qc = useQueryClient();
  const [runOpen, setRunOpen] = useState(false);
  const [tool, setTool] = useState("nuclei");
  const [argsLine, setArgsLine] = useState("-u https://example.com -severity medium,high,critical");

  const runs = useQuery({
    queryKey: ["runs", engagementId],
    queryFn: () => api.listRuns(engagementId),
  });
  const assets = useQuery({
    queryKey: ["assets", engagementId],
    queryFn: () => api.listAssets(engagementId),
  });

  const runMut = useMutation({
    mutationFn: () => {
      const args = argsLine.match(/(?:[^\s"]+|"[^"]*")+/g)?.map((a) => a.replace(/^"|"$/g, "")) ?? [];
      return api.runTool(engagementId, tool, args);
    },
    onSuccess: (res) => {
      toast.success(`${tool} finished (exit ${res.data.exitCode})`);
      setRunOpen(false);
      qc.invalidateQueries({ queryKey: ["runs", engagementId] });
      qc.invalidateQueries({ queryKey: ["findings", engagementId] });
      qc.invalidateQueries({ queryKey: ["assets", engagementId] });
      qc.invalidateQueries({ queryKey: ["timeline", engagementId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const runList = runs.data?.data ?? [];
  const assetList = assets.data?.data ?? [];

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="w-full px-3 py-4 pb-16 sm:px-5 lg:px-8">
        <PageHeader
          eyebrow="Imports"
          title="Runs & assets"
          description="Each import creates a run. Optionally spawn tools on PATH (authorized targets only)."
          actions={
            <Button size="sm" className="w-full sm:w-auto" onClick={() => setRunOpen(true)}>
              <Play className="size-3.5" />
              Run tool
            </Button>
          }
        />

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="size-3.5 text-primary" />
                Runs
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 p-0">
              {runs.isLoading && <div className="px-4 pb-4 text-muted">Loading…</div>}
              {!runs.isLoading && runList.length === 0 && (
                <div className="px-4 pb-4">
                  <EmptyState
                    icon={Terminal}
                    title="No runs"
                    description="Import tool output from Findings, or run a tool if installed."
                    className="border-0 bg-transparent py-6"
                  />
                </div>
              )}
              <ul className="divide-y divide-border">
                {runList.map((r) => {
                  const pathBase = r.sourcePath
                    ? r.sourcePath.split(/[/\\]/).filter(Boolean).pop()
                    : null;
                  return (
                    <li key={r.id} className="min-w-0 px-4 py-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <Badge className="shrink-0 bg-elevated text-primary border border-border normal-case tracking-normal">
                          {r.tool}
                        </Badge>
                        <span className="min-w-0 truncate text-[13px] font-medium">
                          {r.label || "import"}
                        </span>
                      </div>
                      <div className="mt-1 min-w-0 text-[12px] text-muted">
                        <div>{formatTime(r.createdAt)}</div>
                        {r.sourcePath ? (
                          <div
                            className="mt-0.5 truncate font-mono text-[11px] text-faint"
                            title={r.sourcePath}
                          >
                            {pathBase || r.sourcePath}
                          </div>
                        ) : null}
                      </div>
                      <div className="mt-1.5 break-all font-mono text-[11px] text-faint">
                        {JSON.stringify(r.meta)}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>

          <Card className="min-w-0 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="size-3.5 text-primary" />
                Assets
              </CardTitle>
            </CardHeader>
            <CardContent className="min-w-0 p-0">
              {assets.isLoading && <div className="px-4 pb-4 text-muted">Loading…</div>}
              {!assets.isLoading && assetList.length === 0 && (
                <div className="px-4 pb-4">
                  <EmptyState
                    icon={Server}
                    title="No assets"
                    description="Import nmap or httpx JSON to populate hosts."
                    className="border-0 bg-transparent py-6"
                  />
                </div>
              )}
              <ul className="divide-y divide-border">
                {assetList.map((a) => (
                  <li key={a.id} className="min-w-0 px-4 py-3">
                    <div className="truncate font-mono text-[13px] text-foreground" title={a.host}>
                      {a.host}
                    </div>
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {(a.ports || []).map((p) => (
                        <span
                          key={`${p.protocol}-${p.port}`}
                          className="rounded border border-border bg-elevated px-1.5 py-0.5 font-mono text-[11px] text-muted"
                        >
                          {p.port}/{p.protocol}
                          {p.service ? ` ${p.service}` : ""}
                        </span>
                      ))}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={runOpen} onOpenChange={setRunOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Run tool</DialogTitle>
            <DialogDescription>
              Spawns a binary on PATH, captures output, and imports results. Only use on
              authorized targets in scope.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Tool</Label>
              <Select value={tool} onValueChange={setTool}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nuclei">nuclei</SelectItem>
                  <SelectItem value="nmap">nmap</SelectItem>
                  <SelectItem value="httpx">httpx</SelectItem>
                  <SelectItem value="ffuf">ffuf</SelectItem>
                  <SelectItem value="naabu">naabu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Arguments</Label>
              <Input
                className="font-mono text-[12px]"
                value={argsLine}
                onChange={(e) => setArgsLine(e.target.value)}
                placeholder="-u https://target.example"
              />
              <p className="text-[11px] text-faint">
                Or from shell:{" "}
                <code className="font-mono text-muted">
                  sheaf wrap -e {engagementId.slice(0, 8)}… -- nmap -sV target
                </code>
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRunOpen(false)}>
              Cancel
            </Button>
            <Button disabled={runMut.isPending} onClick={() => runMut.mutate()}>
              {runMut.isPending ? "Running…" : "Run & import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
