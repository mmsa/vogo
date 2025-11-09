import { CreditCard, ChevronDown } from "lucide-react";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Membership } from "@/lib/api";
import { cn } from "@/lib/utils";

interface GroupedMembershipCardProps {
  providerName: string;
  memberships: Membership[];
  onClick: () => void;
}

export function GroupedMembershipCard({
  providerName,
  memberships,
  onClick,
}: GroupedMembershipCardProps) {
  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg relative h-full flex flex-col border-2 border-primary/30 hover:border-primary/50"
      )}
      onClick={onClick}
    >
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="rounded-lg p-2 bg-primary/10 text-primary shrink-0">
            <CreditCard className="w-5 h-5" />
          </div>
          <ChevronDown className="w-5 h-5 text-zinc-400 shrink-0" />
        </div>

        {/* Content */}
        <div className="flex-1 min-h-0">
          <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-1">
            {providerName}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-2">
            {memberships.length} {memberships.length === 1 ? "plan" : "plans"} available
          </p>
        </div>

        {/* Footer */}
        <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <Badge variant="secondary" className="text-xs">
            Click to choose plan
          </Badge>
        </div>
      </div>
    </Card>
  );
}

