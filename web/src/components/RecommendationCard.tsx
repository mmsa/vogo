import { useState, useEffect } from "react";
import { Star, ArrowUpRight, Info, ExternalLink } from "lucide-react";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
  DialogContent,
  DialogClose,
} from "./ui/Dialog";
import { Recommendation, Benefit, api } from "@/lib/api";
import { formatSavingRange } from "@/lib/utils";

interface RecommendationCardProps {
  recommendation: Recommendation;
  delay?: number;
}

export function RecommendationCard({
  recommendation,
  delay = 0,
}: RecommendationCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loadingBenefits, setLoadingBenefits] = useState(false);

  const savingText = formatSavingRange(
    recommendation.estimated_saving_min,
    recommendation.estimated_saving_max
  );

  // Load benefit details when dialog opens
  useEffect(() => {
    if (showDetails && !benefits.length) {
      loadBenefitDetails();
    }
  }, [showDetails]);

  const loadBenefitDetails = async () => {
    try {
      setLoadingBenefits(true);
      const benefitIds =
        recommendation.benefit_match_ids ||
        (recommendation.benefit_id ? [recommendation.benefit_id] : []);

      if (benefitIds.length > 0) {
        const fetchedBenefits = await api.getBenefits(benefitIds);
        setBenefits(fetchedBenefits);
      }
    } catch (error) {
      console.error("Failed to load benefit details:", error);
    } finally {
      setLoadingBenefits(false);
    }
  };

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
              <Button
                variant="ghost"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => setShowDetails(true)}
              >
                <Info className="w-3 h-3" />
                Details
              </Button>
              {recommendation.action_url ? (
                <Button
                  size="sm"
                  className="gap-1 text-xs font-semibold"
                  onClick={() =>
                    window.open(recommendation.action_url, "_blank")
                  }
                >
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

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogHeader className="border-b border-zinc-200 dark:border-zinc-800">
          <DialogTitle>{recommendation.title}</DialogTitle>
          <DialogClose onClose={() => setShowDetails(false)} />
        </DialogHeader>

        <DialogContent>
          {/* Saving Info */}
          {savingText && (
            <div className="mb-6 p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="font-bold text-green-700 dark:text-green-400 mb-1">
                💰 Potential Savings
              </div>
              <div className="text-2xl font-bold text-green-900 dark:text-green-300">
                {savingText}
              </div>
            </div>
          )}

          {/* Rationale */}
          <div className="mb-6">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
              Why this recommendation?
            </h4>
            <p className="text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {recommendation.rationale}
            </p>
          </div>

          {/* Related Benefits */}
          {benefits.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-3">
                Related Benefits
              </h4>
              <div className="space-y-3">
                {benefits.map((benefit) => (
                  <div
                    key={benefit.id}
                    className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h5 className="font-medium text-zinc-900 dark:text-zinc-100">
                        {benefit.title}
                      </h5>
                      {benefit.category && (
                        <Badge variant="secondary" className="text-xs shrink-0">
                          {benefit.category}
                        </Badge>
                      )}
                    </div>
                    {benefit.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-3">
                        {benefit.description}
                      </p>
                    )}
                    {benefit.source_url && (
                      <a
                        href={benefit.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                      >
                        Learn more
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingBenefits && (
            <div className="text-center text-zinc-500 dark:text-zinc-400 py-4">
              Loading benefit details...
            </div>
          )}

          {/* Action Button */}
          {recommendation.action_url && (
            <Button
              className="w-full gap-2"
              onClick={() => window.open(recommendation.action_url, "_blank")}
            >
              Take Action
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
