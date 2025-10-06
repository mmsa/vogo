import { LucideIcon } from "lucide-react";
import { Card } from "./ui/Card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconColor?: string;
  delay?: number;
}

export function StatCard({
  icon: Icon,
  label,
  value,
  iconColor,
  delay = 0,
}: StatCardProps) {
  return (
    <Card
      className="p-6 hover:scale-105 transition-transform cursor-pointer animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400">
            {label}
          </p>
          <p className="text-3xl font-bold text-zinc-900 dark:text-zinc-100">
            {value}
          </p>
        </div>
        <div
          className={cn(
            "rounded-xl p-3",
            iconColor || "bg-primary/10 text-primary"
          )}
        >
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </Card>
  );
}
