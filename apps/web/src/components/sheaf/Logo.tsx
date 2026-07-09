import { cn } from "@/lib/utils";

/** Product mark: pre-rounded PNG with transparent corners (no white square). */
export function SheafMark({
  className,
  title = "Sheaf",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 overflow-hidden rounded-[22%] bg-transparent",
        className,
      )}
      title={title}
    >
      <img
        src="/logo-mark.png?v=3"
        alt={title}
        className="size-full object-cover"
        draggable={false}
      />
    </span>
  );
}

export function SheafWordmark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <SheafMark className="size-8" />
      <span className="flex flex-col leading-none">
        <span className="text-[15px] font-medium tracking-[0.06em] text-foreground">
          Sheaf
        </span>
        <span className="mt-0.5 text-[10px] tracking-[0.12em] uppercase text-faint">
          Casefile
        </span>
      </span>
    </span>
  );
}
