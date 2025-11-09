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
      className="p-6 hover:shadow-2xl transition-all animate-fade-in border-2 border-zinc-200 dark:border-zinc-800 hover:border-primary/30"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Top Section - Title and Savings */}
      <div className="flex items-start gap-4 mb-4">
        <div className={`rounded-xl p-3 flex-shrink-0 ${color}`}>
          <Icon className="w-6 h-6" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-xl text-zinc-900 dark:text-zinc-100 mb-3">
            {recommendation.title}
          </h3>
          {savingText && (
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800">
              <span className="text-2xl">💰</span>
              <span className="text-sm font-bold text-green-800 dark:text-green-400">
                {savingText} potential savings
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Rationale */}
      <p className="text-base text-zinc-700 dark:text-zinc-300 mb-5 leading-relaxed pl-[4.5rem]">
        {recommendation.rationale}
      </p>

      {/* Tags */}
      <div className="flex items-center flex-wrap gap-2 mb-4 pl-[4.5rem]">
        {recommendation.membership && (
          <Badge variant="secondary" className="text-xs">
            📍 {recommendation.membership}
          </Badge>
        )}
        {recommendation.kind && (
          <Badge
            variant={
              recommendation.kind === "overlap" ? "destructive" : "default"
            }
            className="text-xs capitalize"
          >
            {recommendation.kind === "overlap" && "⚠️ Duplicate"}
            {recommendation.kind === "unused" && "💎 Unused Perk"}
            {recommendation.kind === "switch" && "🔄 Better Option"}
            {recommendation.kind === "bundle" && "📦 Bundle"}
            {recommendation.kind === "tip" && "💡 Quick Win"}
          </Badge>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center gap-3 pt-4 border-t-2 border-zinc-100 dark:border-zinc-800 pl-[4.5rem]">
        {recommendation.action_url ? (
          <>
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => setShowDetails(true)}
            >
              <Info className="w-4 h-4" />
              Details
            </Button>
            <Button
              size="sm"
              className="gap-2 font-semibold"
              onClick={() => window.open(recommendation.action_url, "_blank")}
            >
              Take Action
              <ArrowUpRight className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <Button 
            size="sm" 
            className="gap-2 font-semibold"
            onClick={() => setShowDetails(true)}
          >
            Review Now
          </Button>
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogClose onClose={() => setShowDetails(false)} />

        <DialogHeader>
          <DialogTitle className="pr-12 text-2xl">
            {recommendation.title}
          </DialogTitle>
        </DialogHeader>

        <DialogContent className="space-y-6">
          {/* Saving Info - Large and Clear */}
          {savingText && (
            <div className="p-6 rounded-2xl bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 dark:from-green-900/30 dark:via-emerald-900/30 dark:to-teal-900/30 border-2 border-green-300 dark:border-green-700">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-green-200 dark:bg-green-800 flex items-center justify-center text-2xl">
                  💰
                </div>
                <div className="text-base font-semibold text-green-800 dark:text-green-300">
                  Potential Savings
                </div>
              </div>
              <div className="text-4xl font-black text-green-900 dark:text-green-200">
                {savingText}
              </div>
            </div>
          )}

          {/* Rationale - Clear Section */}
          <div className="p-5 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700">
            <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
              <span className="text-xl">🤔</span> Why this recommendation?
            </h4>
            <p className="text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
              {recommendation.rationale}
            </p>
          </div>

          {/* Related Benefits - Separated and Clear */}
          {benefits.length > 0 && (
            <div>
              <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-4 flex items-center gap-2">
                <span className="text-xl">🎁</span> Related Benefits
              </h4>
              <div className="space-y-3">
                {benefits.map((benefit) => (
                  <div
                    key={benefit.id}
                    className="p-5 rounded-xl bg-white dark:bg-zinc-800 border-2 border-zinc-200 dark:border-zinc-700 hover:border-primary dark:hover:border-primary transition-all hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-4 mb-3">
                      <h5 className="font-bold text-base text-zinc-900 dark:text-zinc-100 flex-1">
                        {benefit.title}
                      </h5>
                      {benefit.category && (
                        <Badge
                          variant="secondary"
                          className="text-xs shrink-0 capitalize"
                        >
                          {benefit.category.replace("_", " ")}
                        </Badge>
                      )}
                    </div>
                    {benefit.description && (
                      <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-4 leading-relaxed">
                        {benefit.description}
                      </p>
                    )}
                    {benefit.source_url && (
                      <a
                        href={benefit.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-primary hover:underline font-semibold"
                      >
                        Learn more
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadingBenefits && (
            <div className="text-center text-zinc-500 dark:text-zinc-400 py-12">
              <div className="inline-block w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin mb-3" />
              <p className="text-sm">Loading benefit details...</p>
            </div>
          )}
        </DialogContent>

        {/* Action Button in Footer - Prominent */}
        {recommendation.action_url && (
          <div className="px-6 py-5 bg-gradient-to-r from-zinc-50 to-zinc-100 dark:from-zinc-900 dark:to-zinc-800 border-t-2 border-zinc-200 dark:border-zinc-700">
            <Button
              className="w-full gap-3 text-lg py-7 font-bold shadow-lg hover:shadow-xl"
              size="lg"
              onClick={() => window.open(recommendation.action_url, "_blank")}
            >
              Take Action
              <ArrowUpRight className="w-6 h-6" />
            </Button>
          </div>
        )}
      </Dialog>
    </Card>
  );
}
