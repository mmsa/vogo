import { CreditCard, Check, Plus, Trash2 } from "lucide-react";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Membership } from "@/lib/api";
import { cn } from "@/lib/utils";

interface MembershipCardProps {
  membership: Membership;
  isAdded: boolean;
  isChecking: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  isRemoving?: boolean;
}

export function MembershipCard({
  membership,
  isAdded,
  isChecking,
  onToggle,
  onRemove,
  isRemoving = false,
}: MembershipCardProps) {
  return (
    <Card
      className={cn(
        "p-6 cursor-pointer transition-all hover:scale-105 hover:shadow-card-hover relative",
        isAdded &&
          "ring-2 ring-primary bg-primary/5 dark:bg-primary/10 border-primary/50"
      )}
      onClick={!isChecking ? onToggle : undefined}
    >
      {/* Added Badge Overlay */}
      {isAdded && (
        <div className="absolute -top-2 -right-2 bg-accent text-white text-xs font-semibold px-3 py-1 rounded-full shadow-lg flex items-center gap-1 animate-scale-in">
          <Check className="w-3 h-3" />
          Active
        </div>
      )}

      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              "rounded-xl p-3 transition-colors",
              isAdded ? "bg-primary text-white" : "bg-primary/10 text-primary"
            )}
          >
            <CreditCard className="w-6 h-6" />
          </div>
          {!isAdded && (
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 rounded-full hover:bg-primary/10 hover:text-primary"
              disabled={isChecking}
            >
              <Plus className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-1">
            {membership.name}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {membership.provider_slug}
          </p>
        </div>

        {/* Footer */}
        {isChecking && (
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <Badge variant="secondary" className="text-xs">
              Checking...
            </Badge>
          </div>
        )}

        {/* Added Status Footer with Remove Button */}
        {isAdded && (
          <div className="mt-4 pt-4 border-t border-primary/20 flex items-center justify-between">
            <div className="text-xs text-primary font-medium flex items-center gap-1">
              <Check className="w-3 h-3" />
              Added to your memberships
            </div>
            {onRemove && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
                disabled={isRemoving}
              >
                <Trash2 className="w-3 h-3 mr-1" />
                {isRemoving ? "Removing..." : "Remove"}
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
