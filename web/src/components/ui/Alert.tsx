import { ReactNode } from "react";
import { AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface AlertProps {
  variant?: "info" | "warning";
  children: ReactNode;
  className?: string;
}

export function Alert({ variant = "info", children, className }: AlertProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 border",
        {
          "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900":
            variant === "info",
          "bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-900":
            variant === "warning",
        },
        className
      )}
    >
      <div className="flex gap-3">
        <div className="flex-shrink-0">
          {variant === "warning" ? (
            <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-500" />
          ) : (
            <Info className="w-5 h-5 text-blue-600 dark:text-blue-500" />
          )}
        </div>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}

export function AlertTitle({ children }: { children: ReactNode }) {
  return (
    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
      {children}
    </h3>
  );
}

export function AlertDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-zinc-700 dark:text-zinc-300">{children}</p>;
}
