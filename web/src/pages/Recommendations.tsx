import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Lightbulb, Plus, Loader2 } from "lucide-react";
import { api, Recommendation, Benefit } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { RecommendationCard } from "@/components/RecommendationCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Recommendations() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [relevantBenefits, setRelevantBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      loadRecommendations();
    }
  }, [user?.id]);

  const loadRecommendations = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Check cache first
      const cachedAI = localStorage.getItem("vogo_cache_ai");
      if (cachedAI) {
        try {
          const cached = JSON.parse(cachedAI);
          // Filter cached recommendations (in case cache was from before filtering)
          const filteredCached = cached.recs.filter(
            (rec: Recommendation) => rec.kind === "overlap" || rec.kind === "tip"
          );
          setRecommendations(filteredCached);
          setRelevantBenefits(cached.benefits);
          setLoading(false);
          
          // Load fresh data in background (non-blocking)
          api.getLLMRecommendations({ user_id: user.id })
            .then(data => {
              // Filter out "unused" recommendations - only show overlaps
              const filteredRecs = data.recommendations.filter(
                (rec: Recommendation) => rec.kind === "overlap" || rec.kind === "tip"
              );
              setRecommendations(filteredRecs);
              setRelevantBenefits(data.relevant_benefits);
              const aiCache = {
                recs: filteredRecs,
                benefits: data.relevant_benefits,
              };
              // Update cache
              localStorage.setItem("vogo_cache_ai", JSON.stringify(aiCache));
            })
            .catch(err => console.error("Background refresh failed:", err));
          return;
        } catch (e) {
          // Cache parse failed, continue to load fresh
          console.error("Cache parse error:", e);
        }
      }
      
      // Use LLM-powered recommendations
      const data = await api.getLLMRecommendations({
        user_id: user.id,
      });
      // Filter out "unused" recommendations - only show overlaps
      const filteredRecs = data.recommendations.filter(
        (rec: Recommendation) => rec.kind === "overlap" || rec.kind === "tip"
      );
      setRecommendations(filteredRecs);
      setRelevantBenefits(data.relevant_benefits);
      const aiCache = {
        recs: filteredRecs,
        benefits: data.relevant_benefits,
      };
      // Persist to localStorage
      localStorage.setItem("vogo_cache_ai", JSON.stringify(aiCache));
    } catch (error) {
      console.error("Failed to load recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Recommendations
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Personalized insights to maximize your benefits
          </p>
        </div>

        {/* AI Badge */}
        <Card className="p-4 flex items-center gap-2 shrink-0">
          <Badge variant="default" className="gap-1">
            <Sparkles className="w-3 h-3" />
            AI Analysis
          </Badge>
        </Card>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="space-y-4">
          <Card className="p-8 text-center">
            <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              Analysis using AI...
            </p>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              This may take a few seconds
            </p>
          </Card>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Empty State */}
          {recommendations.length === 0 ? (
            <Card className="p-12 text-center">
              <Lightbulb className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                No recommendations yet
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                Add memberships to receive personalized recommendations
              </p>
              <Link to="/memberships">
                <Button className="gap-2">
                  <Plus className="w-5 h-5" />
                  Add Memberships
                </Button>
              </Link>
            </Card>
          ) : (
            <>
              {/* Recommendations List */}
              <div className="space-y-6">
                {recommendations.map((rec, index) => (
                  <RecommendationCard
                    key={index}
                    recommendation={rec}
                    delay={index * 50}
                  />
                ))}
              </div>

              {/* Relevant Benefits Section */}
              {relevantBenefits.length > 0 && (
                <Card
                  className="p-6 animate-fade-in mt-8"
                  style={{ animationDelay: "300ms" }}
                >
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
                    Relevant Benefits
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {relevantBenefits.slice(0, 6).map((benefit) => (
                      <div
                        key={benefit.id}
                        className="p-4 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all hover:shadow-md border border-transparent hover:border-primary/20"
                      >
                        <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-2">
                          {benefit.title}
                        </h4>
                        {benefit.description && (
                          <p className="text-xs text-zinc-600 dark:text-zinc-400 line-clamp-3 leading-relaxed">
                            {benefit.description}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
