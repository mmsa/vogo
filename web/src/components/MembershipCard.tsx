import { CreditCard, Check, Plus, Trash2 } from "lucide-react";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Membership } from "@/lib/api";
import { cn } from "@/lib/utils";

// Helper function to infer category from membership
function getMembershipCategory(membership: Membership): string | null {
  const slug = membership.provider_slug.toLowerCase();
  const name = membership.name.toLowerCase();
  
  // Banking
  if (
    slug.includes("amex") ||
    slug.includes("chase") ||
    slug.includes("lloyds") ||
    slug.includes("hsbc") ||
    slug.includes("barclays") ||
    slug.includes("revolut") ||
    slug.includes("monzo") ||
    slug.includes("starling")
  ) {
    return "banking";
  }
  
  // Mobile
  if (
    slug.includes("ee") ||
    slug.includes("vodafone") ||
    slug.includes("o2") ||
    slug.includes("three") ||
    slug.includes("giffgaff")
  ) {
    return "mobile";
  }
  
  // Travel
  if (
    slug.includes("aa") ||
    slug.includes("rac") ||
    slug.includes("british-airways") ||
    slug.includes("easyjet") ||
    slug.includes("ba") ||
    slug.includes("virgin-atlantic") ||
    name.includes("travel") ||
    name.includes("airline")
  ) {
    return "travel";
  }
  
  // Entertainment
  if (
    slug.includes("netflix") ||
    slug.includes("spotify") ||
    slug.includes("amazon-prime") ||
    slug.includes("disney") ||
    slug.includes("sky") ||
    slug.includes("now") ||
    name.includes("streaming") ||
    name.includes("music")
  ) {
    return "entertainment";
  }
  
  // Retail
  if (
    slug.includes("amazon") ||
    slug.includes("tesco") ||
    slug.includes("costco") ||
    slug.includes("asda") ||
    slug.includes("sainsbury")
  ) {
    return "retail";
  }
  
  // Gym/Fitness
  if (
    slug.includes("gym") ||
    slug.includes("puregym") ||
    slug.includes("fitness") ||
    name.includes("gym") ||
    name.includes("fitness")
  ) {
    return "fitness";
  }
  
  return null;
}

interface MembershipCardProps {
  membership: Membership;
  isAdded: boolean;
  isChecking: boolean;
  onToggle: () => void;
  onRemove?: () => void;
  isRemoving?: boolean;
  onViewBenefits?: () => void;
}

export function MembershipCard({
  membership,
  isAdded,
  isChecking,
  onToggle,
  onRemove,
  isRemoving = false,
  onViewBenefits,
}: MembershipCardProps) {
  const handleCardClick = (e: React.MouseEvent) => {
    // If there's a remove button or plus button clicked, don't navigate
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    // If onViewBenefits is provided, use it; otherwise fall back to onToggle
    if (onViewBenefits && !isChecking) {
      onViewBenefits();
    } else if (!isChecking) {
      onToggle();
    }
  };

  return (
    <Card
      className={cn(
        "p-4 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg relative h-full flex flex-col",
        isAdded &&
          "ring-2 ring-primary bg-primary/5 dark:bg-primary/10 border-primary/50"
      )}
      onClick={handleCardClick}
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
      <div className="flex items-start justify-between mb-3">
        <div
          className={cn(
            "rounded-lg p-2 transition-colors shrink-0",
            isAdded ? "bg-primary text-white" : "bg-primary/10 text-primary"
          )}
        >
          <CreditCard className="w-5 h-5" />
        </div>
        {!isAdded && (
          <Button
            variant="ghost"
            size="sm"
            className="w-7 h-7 p-0 rounded-full hover:bg-primary/10 hover:text-primary shrink-0"
            disabled={isChecking}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            <Plus className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        <h3 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-1 line-clamp-2">
          {membership.name}
        </h3>
        {(() => {
          const category = getMembershipCategory(membership);
          return category && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-1 capitalize">
              {category.replace(/_/g, ' ')}
            </p>
          );
        })()}
      </div>

      {/* Footer */}
      {isChecking && (
        <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
          <Badge variant="secondary" className="text-xs">
            Checking...
          </Badge>
        </div>
      )}

      {/* Added Status Footer with Remove Button */}
      {isAdded && (
        <div className="mt-3 pt-3 border-t border-primary/20 flex items-center justify-between gap-2">
          <div className="text-xs text-primary font-medium flex items-center gap-1 shrink-0">
            <Check className="w-3 h-3" />
            <span className="hidden sm:inline">Added</span>
          </div>
          {onRemove && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20 shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                onRemove();
              }}
              disabled={isRemoving}
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline ml-1">{isRemoving ? "Removing..." : "Remove"}</span>
            </Button>
          )}
        </div>
      )}
      </div>
    </Card>
  );
}
