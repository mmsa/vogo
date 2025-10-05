import { Star, ArrowUpRight, Info } from "lucide-react";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Recommendation } from "@/lib/api";
import { formatSavingRange } from "@/lib/utils";

interface RecommendationCardProps {
  recommendation: Recommendation;
  delay?: number;
}

export function RecommendationCard({
  recommendation,
  delay = 0,
}: RecommendationCardProps) {
  const savingText = formatSavingRange(
    recommendation.estimated_saving_min,
    recommendation.estimated_saving_max
  );

  // Determine icon and color based on recommendation kind
  const getKindConfig = (kind?: string) => {
    switch (kind) {
      case "overlap":
        return {
          color: "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-500",
          icon: Star,
        };
      case "unused":
        return {
          color:
            "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-500",
          icon: Star,
        };
      case "switch":
        return {
          color:
            "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-500",
          icon: Star,
        };
      case "bundle":
        return {
          color:
            "bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500",
          icon: Star,
        };
      default:
        return {
          color:
            "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500",
          icon: Star,
        };
    }
  };

  const { color, icon: Icon } = getKindConfig(recommendation.kind);

  return (
    <Card
      className="p-6 hover:scale-[1.02] transition-all animate-fade-in hover:shadow-xl border-l-4 border-l-primary"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className={`rounded-xl p-3 flex-shrink-0 ${color}`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header with Savings Badge */}
          <div className="flex items-start justify-between gap-4 mb-3">
            <div className="flex-1">
              <h3 className="font-bold text-lg text-zinc-900 dark:text-zinc-100 mb-1">
                {recommendation.title}
              </h3>
              {savingText && (
                <div className="flex items-center gap-2">
                  <Badge variant="success" className="text-sm font-bold">
                    💰 {savingText} potential savings
                  </Badge>
                </div>
              )}
            </div>
          </div>

          {/* Rationale */}
          <p className="text-sm text-zinc-700 dark:text-zinc-300 mb-4 leading-relaxed">
            {recommendation.rationale}
          </p>

          {/* Footer */}
          <div className="flex items-center justify-between gap-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              {recommendation.membership && (
                <Badge variant="secondary" className="text-xs">
                  📍 {recommendation.membership}
                </Badge>
              )}
              {recommendation.kind && (
                <Badge variant="default" className="text-xs capitalize">
                  {recommendation.kind === "overlap" && "⚠️ Duplicate"}
                  {recommendation.kind === "unused" && "💎 Unused Perk"}
                  {recommendation.kind === "switch" && "🔄 Better Option"}
                  {recommendation.kind === "bundle" && "📦 Bundle"}
                  {recommendation.kind === "tip" && "💡 Quick Win"}
                </Badge>
              )}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" className="gap-1 text-xs">
                <Info className="w-3 h-3" />
                Details
              </Button>
              {recommendation.action_url ? (
                <Button size="sm" className="gap-1 text-xs font-semibold">
                  Take Action
                  <ArrowUpRight className="w-3 h-3" />
                </Button>
              ) : (
                <Button size="sm" className="gap-1 text-xs font-semibold">
                  Review Now
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
}
