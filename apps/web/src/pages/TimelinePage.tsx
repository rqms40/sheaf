import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { History } from "lucide-react";
import { EmptyState } from "@/components/sheaf/EmptyState";
import { PageHeader } from "@/components/sheaf/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/utils";

export function TimelinePage() {
  const { engagementId } = useParams({ strict: false }) as { engagementId: string };
  const { data, isLoading } = useQuery({
    queryKey: ["timeline", engagementId],
    queryFn: () => api.listTimeline(engagementId),
  });

  const events = data?.data ?? [];

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="w-full px-3 py-4 pb-16 sm:px-5 lg:px-8">
        <PageHeader
          eyebrow="Ops log"
          title="Timeline"
          description="Imports, status changes, and notes for this engagement — newest first."
        />

        {isLoading && <div className="text-muted">Loading…</div>}

        {!isLoading && events.length === 0 && (
          <EmptyState
            icon={History}
            title="No events yet"
            description="Import tool output or edit findings to start the spine."
          />
        )}

        {events.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <ol className="relative ms-2 border-s border-border">
                {events.map((ev, i) => (
                  <li key={ev.id} className="relative mb-6 ms-6 last:mb-0">
                    <span
                      className={
                        i === 0
                          ? "absolute -start-[29px] top-1.5 size-2.5 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-primary)_25%,transparent)]"
                          : "absolute -start-[28px] top-1.5 size-2 rounded-full bg-border"
                      }
                    />
                    <div className="text-[11px] uppercase tracking-wide text-faint">
                      {ev.kind}
                      <span className="mx-1.5 text-border">·</span>
                      {formatTime(ev.createdAt)}
                    </div>
                    <div className="mt-1 text-[13px] text-foreground leading-snug">
                      {ev.message}
                    </div>
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
