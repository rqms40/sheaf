import * as React from "react";
import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    type={type}
    className={cn(
      "flex h-8 w-full rounded-md border border-border bg-background px-2.5 py-1 text-[13px] text-foreground placeholder:text-faint focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary",
      className,
    )}
    ref={ref}
    {...props}
  />
));
Input.displayName = "Input";
