import { HTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "success" | "warning" | "secondary" | "destructive";
}

const Badge = forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors",
          {
            "bg-primary/10 text-primary": variant === "default",
            "bg-accent/10 text-accent": variant === "success",
            "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-500":
              variant === "warning",
            "bg-zinc-100 text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100":
              variant === "secondary",
            "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-500":
              variant === "destructive",
          },
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };
