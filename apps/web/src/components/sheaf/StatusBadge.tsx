import { Badge } from "@/components/ui/badge";

export function StatusBadge({ status }: { status: string }) {
  return (
    <Badge className="border border-border bg-elevated/80 text-muted normal-case tracking-normal font-normal">
      {status.replaceAll("_", " ")}
    </Badge>
  );
}
