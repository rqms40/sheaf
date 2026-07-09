import type { Finding } from "@/lib/api";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";
import { cn } from "@/lib/utils";

export function FindingRow({
  finding,
  selected,
  onClick,
}: {
  finding: Finding;
  selected?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group w-full text-left border-l-[3px] rounded-r-md px-3 py-2.5 transition-colors",
        `severity-${finding.severity}`,
        selected
          ? "bg-elevated ring-1 ring-primary/25"
          : "bg-card/50 hover:bg-elevated/70 border border-transparent border-l-[3px]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-medium text-foreground truncate leading-snug">
            {finding.title}
          </div>
          <div className="mt-1 font-mono text-[11px] text-muted truncate">
            {finding.host || "—"}
            {finding.path ? (
              <span className="text-faint">
                {" "}
                · {finding.path}
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <SeverityBadge severity={finding.severity} />
          <StatusBadge status={finding.status} />
        </div>
      </div>
    </button>
  );
}
