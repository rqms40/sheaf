import { ChevronDown, History, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { FindingRevision } from "@/lib/api";
import { cn, formatTime } from "@/lib/utils";

const SOURCE_LABEL: Record<string, string> = {
  create: "Created",
  edit: "Edited",
  import: "Import",
  archive: "Archived",
  restore: "Restored",
  status: "Status",
  baseline: "Baseline",
};

function previewValue(v: unknown): string {
  if (v == null || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  const s = String(v);
  if (s.length > 280) return `${s.slice(0, 280)}…`;
  return s;
}

function sourceTone(source: string): string {
  switch (source) {
    case "create":
      return "bg-low/15 text-low border-low/30";
    case "baseline":
      return "bg-faint/15 text-muted border-border";
    case "restore":
      return "bg-primary/15 text-primary border-primary/35";
    case "archive":
      return "bg-faint/20 text-muted border-border";
    case "status":
      return "bg-info/15 text-info border-info/30";
    case "import":
      return "bg-med/15 text-med border-med/30";
    default:
      return "bg-elevated text-muted border-border";
  }
}

type Props = {
  revisions: FindingRevision[];
  loading?: boolean;
  restoringId?: string | null;
  /** @deprecated dirty no longer blocks restore — kept for callers */
  dirty?: boolean;
  onRestore: (revisionId: string) => void;
};

/**
 * Casefile revision ledger — Word-style version history for a finding writeup.
 * Signature: vertical ledger spine with rev stamps and expandable field diffs.
 */
export function FindingHistory({
  revisions,
  loading,
  restoringId,
  onRestore,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (loading) {
    return <div className="py-8 text-center text-[12px] text-muted">Loading history…</div>;
  }

  if (!revisions.length) {
    return (
      <div className="rounded-md border border-dashed border-border bg-elevated/30 px-4 py-10 text-center">
        <History className="mx-auto size-6 text-faint" />
        <p className="mt-3 text-[13px] font-medium text-foreground">No versions yet</p>
        <p className="mt-1 text-[12px] text-muted">
          Click <strong className="font-medium text-foreground">Save changes</strong> after
          editing — the trail records each save (and seeds a baseline for older findings).
        </p>
      </div>
    );
  }

  const latest = revisions[0]?.revision;

  return (
    <div className="space-y-3" data-testid="finding-history">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="eyebrow">Version trail</p>
          <p className="mt-0.5 text-[12px] text-muted">
            {revisions.length} revision{revisions.length === 1 ? "" : "s"} · append-only ledger
          </p>
        </div>
        <p className="max-w-[16rem] text-right text-[11px] text-faint">
          Restore reapplies that snapshot and appends a new revision.
        </p>
      </div>

      <ol className="history-ledger relative m-0 list-none space-y-0 p-0">
        {revisions.map((rev, idx) => {
          const open = openId === rev.id;
          const changeKeys = Object.keys(rev.changes);
          const isLatest = rev.revision === latest;
          return (
            <li key={rev.id} className="history-ledger-item relative pl-7 pb-4 last:pb-0">
              {/* spine */}
              {idx < revisions.length - 1 ? (
                <span
                  className="absolute left-[9px] top-5 bottom-0 w-px bg-border"
                  aria-hidden
                />
              ) : null}
              <span
                className={cn(
                  "absolute left-0 top-1.5 flex size-[19px] items-center justify-center rounded-full border text-[9px] font-mono font-medium",
                  isLatest
                    ? "border-primary/50 bg-primary/15 text-primary"
                    : "border-border bg-card text-faint",
                )}
                title={`Revision ${rev.revision}`}
              >
                {rev.revision}
              </span>

              <div
                className={cn(
                  "rounded-md border bg-card/80 transition-colors",
                  open ? "border-primary/35 shadow-sm" : "border-border hover:border-border/80",
                )}
              >
                <button
                  type="button"
                  className="flex w-full items-start gap-2 px-3 py-2.5 text-left"
                  onClick={() => setOpenId(open ? null : rev.id)}
                  aria-expanded={open}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={cn(
                          "rounded border px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                          sourceTone(rev.source),
                        )}
                      >
                        {SOURCE_LABEL[rev.source] ?? rev.source}
                      </span>
                      {isLatest ? (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] text-primary">
                          current
                        </span>
                      ) : null}
                      <span className="font-mono text-[11px] text-faint">
                        {formatTime(rev.createdAt)}
                      </span>
                    </div>
                    <p className="mt-1 text-[12.5px] leading-snug text-foreground">
                      {rev.summary}
                    </p>
                    {!open && changeKeys.length > 0 ? (
                      <p className="mt-1 font-mono text-[10px] text-faint">
                        {changeKeys.slice(0, 5).join(" · ")}
                        {changeKeys.length > 5 ? ` · +${changeKeys.length - 5}` : ""}
                      </p>
                    ) : null}
                  </div>
                  <ChevronDown
                    className={cn(
                      "mt-0.5 size-4 shrink-0 text-faint transition-transform",
                      open && "rotate-180",
                    )}
                  />
                </button>

                {open ? (
                  <div className="border-t border-border px-3 py-3">
                    {changeKeys.length === 0 ? (
                      <p className="text-[12px] text-muted">
                        Full snapshot recorded
                        {rev.source === "create" ? " at creation." : "."}
                      </p>
                    ) : (
                      <ul className="space-y-2.5">
                        {changeKeys.map((field) => {
                          const c = rev.changes[field];
                          if (!c) return null;
                          return (
                            <li key={field} className="history-diff-row">
                              <div className="mb-1 font-mono text-[10px] uppercase tracking-[0.12em] text-primary/90">
                                {field}
                              </div>
                              <div className="grid gap-1.5 sm:grid-cols-2">
                                <div className="rounded border border-border/80 bg-background/60 px-2 py-1.5">
                                  <div className="text-[9px] uppercase tracking-wide text-faint">
                                    Before
                                  </div>
                                  <pre className="mt-0.5 whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-muted">
                                    {previewValue(c.from)}
                                  </pre>
                                </div>
                                <div className="rounded border border-primary/25 bg-primary/5 px-2 py-1.5">
                                  <div className="text-[9px] uppercase tracking-wide text-primary/80">
                                    After
                                  </div>
                                  <pre className="mt-0.5 whitespace-pre-wrap break-words font-mono text-[11px] leading-snug text-foreground">
                                    {previewValue(c.to)}
                                  </pre>
                                </div>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}

                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
                      <p className="max-w-sm text-[11px] text-faint">
                        {isLatest
                          ? "This is already the current version."
                          : "Restoring discards unsaved form edits and appends a new revision."}
                      </p>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={isLatest || restoringId === rev.id}
                        data-testid="restore-revision"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (isLatest) return;
                          onRestore(rev.id);
                        }}
                      >
                        <RotateCcw className="size-3.5" />
                        {restoringId === rev.id ? "Restoring…" : "Restore version"}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
