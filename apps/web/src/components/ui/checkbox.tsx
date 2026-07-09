import * as React from "react";
import { cn } from "@/lib/utils";

/** Lightweight checkbox styled to match Sheaf chrome (no extra radix dep). */
export const Checkbox = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, ...props }, ref) => (
  <input
    type="checkbox"
    ref={ref}
    className={cn(
      "size-3.5 shrink-0 rounded border border-border bg-background accent-primary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
      className,
    )}
    {...props}
  />
));
Checkbox.displayName = "Checkbox";
