import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Crosshair, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/sheaf/EmptyState";
import { PageHeader } from "@/components/sheaf/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const KINDS = ["domain", "url", "cidr", "wildcard", "ip"] as const;

export function ScopePage() {
  const { engagementId } = useParams({ strict: false }) as { engagementId: string };
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["scope", engagementId],
    queryFn: () => api.listScope(engagementId),
  });
  const eng = useQuery({
    queryKey: ["engagement", engagementId],
    queryFn: () => api.getEngagement(engagementId),
  });
  const [kind, setKind] = useState<(typeof KINDS)[number]>("domain");
  const [value, setValue] = useState("");
  const [exclude, setExclude] = useState(false);
  const [roeText, setRoeText] = useState("");
  const [notesText, setNotesText] = useState("");

  useEffect(() => {
    if (eng.data?.data) {
      setRoeText(eng.data.data.roeText ?? "");
      setNotesText(eng.data.data.notesText ?? "");
    }
  }, [eng.data?.data?.id, eng.data?.data?.roeText, eng.data?.data?.notesText]);

  const add = useMutation({
    mutationFn: () =>
      api.addScope(engagementId, { kind, value, isExclude: exclude }),
    onSuccess: () => {
      toast.success("Scope item added");
      setValue("");
      qc.invalidateQueries({ queryKey: ["scope", engagementId] });
      qc.invalidateQueries({ queryKey: ["timeline", engagementId] });
      qc.invalidateQueries({ queryKey: ["report", engagementId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (scopeId: string) => api.deleteScope(engagementId, scopeId),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["scope", engagementId] });
      qc.invalidateQueries({ queryKey: ["report", engagementId] });
    },
  });

  const saveRoe = useMutation({
    mutationFn: () =>
      api.updateEngagement(engagementId, {
        roeText: roeText.trim() || null,
        notesText: notesText.trim() || null,
      }),
    onSuccess: () => {
      toast.success("ROE & notes saved");
      qc.invalidateQueries({ queryKey: ["engagement", engagementId] });
      qc.invalidateQueries({ queryKey: ["report", engagementId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = data?.data ?? [];

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="w-full px-3 py-4 pb-16 sm:px-5 lg:px-8">
        <PageHeader
          eyebrow="Boundary"
          title="Scope & ROE"
          description="Advisory include/exclude list plus rules of engagement notes for the casefile report."
        />

        <Card className="mb-5">
          <CardHeader className="pb-2">
            <CardTitle className="text-[13px]">Rules of engagement</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="roe-text">ROE constraints</Label>
              <Textarea
                id="roe-text"
                data-testid="roe-text"
                className="min-h-[120px] font-sans"
                placeholder="Testing hours, rate limits, excluded hosts, notification requirements, data handling…"
                value={roeText}
                onChange={(e) => setRoeText(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes-text">Engagement notes</Label>
              <Textarea
                id="notes-text"
                data-testid="notes-text"
                className="min-h-[80px] font-sans"
                placeholder="Internal notes, contacts, credentials vault refs…"
                value={notesText}
                onChange={(e) => setNotesText(e.target.value)}
              />
            </div>
            <Button
              size="sm"
              disabled={saveRoe.isPending}
              onClick={() => saveRoe.mutate()}
              data-testid="save-roe"
            >
              <Save className="size-3.5" />
              {saveRoe.isPending ? "Saving…" : "Save ROE & notes"}
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-5">
          <CardContent className="pt-4">
            <form
              className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
              onSubmit={(e) => {
                e.preventDefault();
                if (!value.trim()) return;
                add.mutate();
              }}
            >
              <div className="space-y-1.5">
                <Label>Kind</Label>
                <Select
                  value={kind}
                  onValueChange={(v) => setKind(v as (typeof KINDS)[number])}
                >
                  <SelectTrigger className="w-full sm:w-[130px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KINDS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {k}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-0 flex-1 space-y-1.5 sm:min-w-[220px]">
                <Label htmlFor="scope-value">Value</Label>
                <Input
                  id="scope-value"
                  data-testid="scope-value"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="*.example.com or 10.0.0.0/24"
                  className="font-mono text-[12px]"
                />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-[12px] text-muted">
                  <Checkbox
                    checked={exclude}
                    onChange={(e) => setExclude(e.target.checked)}
                  />
                  Exclude
                </label>
                <Button
                  type="submit"
                  disabled={!value.trim() || add.isPending}
                  className="w-full sm:w-auto"
                  data-testid="add-scope"
                >
                  Add to scope
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            {isLoading && <div className="p-4 text-muted">Loading…</div>}
            {!isLoading && items.length === 0 && (
              <div className="p-4">
                <EmptyState
                  icon={Crosshair}
                  title="No scope items"
                  description="Add domains, CIDRs, or wildcards that define what is in (or out of) scope."
                  className="border-0 bg-transparent py-8"
                />
              </div>
            )}
            <ul className="divide-y divide-border" data-testid="scope-list">
              {items.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-[13px] text-foreground">
                      {s.value}
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-[12px] text-muted">
                      <span>{s.kind}</span>
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide",
                          s.isExclude
                            ? "bg-destructive/15 text-destructive"
                            : "bg-low/15 text-low",
                        )}
                      >
                        {s.isExclude ? "exclude" : "include"}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => del.mutate(s.id)}
                    title="Remove"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
