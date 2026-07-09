import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { ListChecks } from "lucide-react";
import { toast } from "sonner";
import { EmptyState } from "@/components/sheaf/EmptyState";
import { PageHeader } from "@/components/sheaf/PageHeader";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ChecklistPage() {
  const { engagementId } = useParams({ strict: false }) as { engagementId: string };
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["checklist", engagementId],
    queryFn: () => api.listChecklist(engagementId),
  });

  const toggle = useMutation({
    mutationFn: ({ key, done }: { key: string; done: boolean }) =>
      api.setChecklist(engagementId, key, done),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["checklist", engagementId] });
      qc.invalidateQueries({ queryKey: ["timeline", engagementId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const items = data?.data ?? [];
  const doneCount = items.filter((i) => i.done).length;
  const pct = items.length ? Math.round((doneCount / items.length) * 100) : 0;

  const byPhase = new Map<string, typeof items>();
  for (const item of items) {
    const list = byPhase.get(item.phase) ?? [];
    list.push(item);
    byPhase.set(item.phase, list);
  }

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="w-full px-3 py-4 pb-12 sm:px-5 lg:px-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <PageHeader
            className="mb-0"
            eyebrow="Methodology"
            title="Checklist"
            description="Seeded by engagement type. Tick items as you finish each phase."
          />
          {items.length > 0 && (
            <div className="shrink-0 rounded-md border border-border bg-card px-3 py-2 text-[12px] text-muted">
              <span className="font-medium text-foreground">
                {doneCount}/{items.length}
              </span>{" "}
              complete · {pct}%
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-elevated">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
        )}

        {isLoading && <div className="text-muted">Loading…</div>}
        {!isLoading && items.length === 0 && (
          <EmptyState
            icon={ListChecks}
            title="No checklist"
            description="Checklist seeds when you open this page for an engagement type."
          />
        )}

        {items.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-border bg-card">
            {[...byPhase.entries()].map(([phase, phaseItems], phaseIdx) => {
              const phaseDone = phaseItems.filter((i) => i.done).length;
              return (
                <section
                  key={phase}
                  className={cn(phaseIdx > 0 && "border-t border-border")}
                >
                  <div className="sticky top-0 z-[1] flex items-center justify-between gap-2 border-b border-border/80 bg-card/95 px-3 py-2 backdrop-blur sm:px-4">
                    <h2 className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary">
                      {phase || "General"}
                    </h2>
                    <span className="font-mono text-[11px] text-faint">
                      {phaseDone}/{phaseItems.length}
                    </span>
                  </div>
                  <ul className="divide-y divide-border/60">
                    {phaseItems.map((item) => (
                      <li key={item.itemKey}>
                        <label
                          className={cn(
                            "flex min-h-11 cursor-pointer items-start gap-3 px-3 py-3 sm:items-center sm:px-4",
                            "hover:bg-elevated/40 active:bg-elevated/60",
                            item.done && "bg-background/30",
                          )}
                        >
                          <Checkbox
                            className="mt-0.5 shrink-0 sm:mt-0"
                            checked={item.done}
                            onChange={(e) =>
                              toggle.mutate({
                                key: item.itemKey,
                                done: e.target.checked,
                              })
                            }
                          />
                          <span
                            className={cn(
                              "text-[13px] leading-snug sm:text-[14px]",
                              item.done
                                ? "text-muted line-through decoration-border"
                                : "text-foreground",
                            )}
                          >
                            {item.label}
                          </span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
