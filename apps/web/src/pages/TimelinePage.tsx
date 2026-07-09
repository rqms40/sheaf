import { useQuery } from "@tanstack/react-query";
import { useParams } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, History } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "@/components/sheaf/EmptyState";
import { PageHeader } from "@/components/sheaf/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { api } from "@/lib/api";
import { formatTime } from "@/lib/utils";

const PAGE_SIZES = [25, 50, 100] as const;

export function TimelinePage() {
  const { engagementId } = useParams({ strict: false }) as { engagementId: string };
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZES)[number]>(50);
  const [page, setPage] = useState(0);
  const offset = page * pageSize;

  // Reset to first page when engagement or page size changes
  useEffect(() => {
    setPage(0);
  }, [engagementId, pageSize]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["timeline", engagementId, pageSize, offset],
    queryFn: () =>
      api.listTimeline(engagementId, { limit: pageSize, offset }),
    placeholderData: (prev) => prev,
  });

  const events = data?.data ?? [];
  const total = data?.meta?.total ?? 0;
  const hasMore = data?.meta?.hasMore ?? false;
  const totalPages = Math.max(1, Math.ceil(total / pageSize) || 1);
  const from = total === 0 ? 0 : offset + 1;
  const to = Math.min(offset + events.length, total);

  return (
    <div className="h-full min-h-0 overflow-y-auto">
      <div className="w-full px-3 py-4 pb-16 sm:px-5 lg:px-8">
        <PageHeader
          className="mb-4"
          eyebrow="Ops log"
          title="Timeline"
          description="Imports, status changes, and notes for this engagement — newest first."
          actions={
            total > 0 ? (
              <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">
                <span className="tabular-nums">
                  {from}–{to} of {total}
                  {isFetching ? " · …" : ""}
                </span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(v) =>
                    setPageSize(Number(v) as (typeof PAGE_SIZES)[number])
                  }
                >
                  <SelectTrigger className="h-8 w-[110px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n} / page
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null
          }
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
          <>
            <Card className="min-w-0 overflow-hidden">
              <CardContent className="p-5">
                <ol className="relative ms-2 border-s border-border">
                  {events.map((ev, i) => (
                    <li key={ev.id} className="relative mb-6 ms-6 min-w-0 last:mb-0">
                      <span
                        className={
                          page === 0 && i === 0
                            ? "absolute -start-[29px] top-1.5 size-2.5 rounded-full bg-primary shadow-[0_0_0_3px_color-mix(in_oklab,var(--color-primary)_25%,transparent)]"
                            : "absolute -start-[28px] top-1.5 size-2 rounded-full bg-border"
                        }
                      />
                      <div className="text-[11px] uppercase tracking-wide text-faint">
                        {ev.kind}
                        <span className="mx-1.5 text-border">·</span>
                        {formatTime(ev.createdAt)}
                      </div>
                      <div className="mt-1 break-words text-[13px] leading-snug text-foreground">
                        {ev.message}
                      </div>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px] text-muted tabular-nums">
                Page {Math.min(page + 1, totalPages)} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={page <= 0 || isFetching}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="size-3.5" />
                  Previous
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  disabled={!hasMore || isFetching}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
