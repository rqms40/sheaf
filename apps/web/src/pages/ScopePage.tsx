import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { Crosshair, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState } from "@/components/sheaf/EmptyState";
import { PageHeader } from "@/components/sheaf/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  const [kind, setKind] = useState<(typeof KINDS)[number]>("domain");
  const [value, setValue] = useState("");
  const [exclude, setExclude] = useState(false);

  const add = useMutation({
    mutationFn: () =>
      api.addScope(engagementId, { kind, value, isExclude: exclude }),
    onSuccess: () => {
      toast.success("Scope item added");
      setValue("");
      qc.invalidateQueries({ queryKey: ["scope", engagementId] });
      qc.invalidateQueries({ queryKey: ["timeline", engagementId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const del = useMutation({
    mutationFn: (scopeId: string) => api.deleteScope(engagementId, scopeId),
    onSuccess: () => {
      toast.success("Removed");
      qc.invalidateQueries({ queryKey: ["scope", engagementId] });
    },
  });

  const items = data?.data ?? [];

  return (
    <div className="h-full min-h-0 overflow-y-auto">
    <div className="w-full px-3 py-4 pb-16 sm:px-5 lg:px-8">
      <PageHeader
        eyebrow="Boundary"
        title="Scope"
        description="Advisory include/exclude list for this engagement. Not a legal boundary."
      />

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
              <Button type="submit" disabled={!value.trim() || add.isPending} className="w-full sm:w-auto">
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
          <ul className="divide-y divide-border">
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
