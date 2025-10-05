import { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800",
        className
      )}
      {...props}
    />
  );
}

export { Skeleton };
