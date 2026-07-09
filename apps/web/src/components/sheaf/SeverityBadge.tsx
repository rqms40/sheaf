import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const styles: Record<string, string> = {
  critical: "bg-crit/15 text-crit ring-1 ring-crit/25",
  high: "bg-high/15 text-high ring-1 ring-high/25",
  medium: "bg-med/15 text-med ring-1 ring-med/25",
  low: "bg-low/15 text-low ring-1 ring-low/25",
  info: "bg-info/15 text-info ring-1 ring-info/25",
};

export function SeverityBadge({ severity }: { severity: string }) {
  return (
    <Badge className={cn("font-medium", styles[severity] ?? styles.info)}>
      {severity}
    </Badge>
  );
}
