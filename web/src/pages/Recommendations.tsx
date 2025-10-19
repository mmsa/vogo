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
import { Switch } from "@/components/ui/Switch";

export default function Recommendations() {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [relevantBenefits, setRelevantBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiMode, setAiMode] = useState(() => {
    // Restore AI mode preference
    const saved = localStorage.getItem("vogo_ai_mode");
    return saved === "true";
  });

  // Cache for instant toggle switching (persisted to localStorage)
  const [cachedRuleBased, setCachedRuleBased] = useState<
    Recommendation[] | null
  >(() => {
    const saved = localStorage.getItem("vogo_cache_rule");
    return saved ? JSON.parse(saved) : null;
  });
  const [cachedAI, setCachedAI] = useState<{
    recs: Recommendation[];
    benefits: Benefit[];
  } | null>(() => {
    const saved = localStorage.getItem("vogo_cache_ai");
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => {
    if (user?.id) {
      loadRecommendations();
    }
  }, [aiMode, user?.id]);

  const loadRecommendations = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      if (aiMode) {
        // Check cache first
        if (cachedAI) {
          setRecommendations(cachedAI.recs);
          setRelevantBenefits(cachedAI.benefits);
          setLoading(false);
          return;
        }
        // Use LLM-powered recommendations
        const data = await api.getLLMRecommendations({
          user_id: user.id,
        });
        setRecommendations(data.recommendations);
        setRelevantBenefits(data.relevant_benefits);
        const aiCache = {
          recs: data.recommendations,
          benefits: data.relevant_benefits,
        };
        setCachedAI(aiCache);
        // Persist to localStorage
        localStorage.setItem("vogo_cache_ai", JSON.stringify(aiCache));
      } else {
        // Check cache first
        if (cachedRuleBased) {
          setRecommendations(cachedRuleBased);
          setRelevantBenefits([]);
          setLoading(false);
          return;
        }
        // Use rule-based recommendations
        const data = await api.getRecommendations(user.id);
        setRecommendations(data);
        setRelevantBenefits([]);
        setCachedRuleBased(data);
        // Persist to localStorage
        localStorage.setItem("vogo_cache_rule", JSON.stringify(data));
      }
    } catch (error) {
      console.error("Failed to load recommendations:", error);
    } finally {
      setLoading(false);
    }
  };

  // Save AI mode preference when it changes
  useEffect(() => {
    localStorage.setItem("vogo_ai_mode", String(aiMode));
  }, [aiMode]);

  return (
    <div className="space-y-8 animate-fade-in pb-8">
      {/* Header with Mode Toggle */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div className="flex-1">
          <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
            Recommendations
          </h1>
          <p className="text-lg text-zinc-600 dark:text-zinc-400">
            Personalized insights to maximize your benefits
          </p>
        </div>

        {/* Mode Toggle */}
        <Card className="p-4 flex items-center gap-4 shrink-0">
          <span
            className={`text-sm font-medium transition-colors ${
              !aiMode ? "text-primary" : "text-zinc-500 dark:text-zinc-400"
            }`}
          >
            Rule-based
          </span>
          <Switch checked={aiMode} onChange={setAiMode} disabled={loading} />
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium transition-colors ${
                aiMode ? "text-primary" : "text-zinc-500 dark:text-zinc-400"
              }`}
            >
              AI Mode
            </span>
            <Badge variant="default" className="gap-1">
              <Sparkles className="w-3 h-3" />
              AI Analysis
            </Badge>
          </div>
        </Card>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="space-y-4">
          {aiMode && (
            <Card className="p-8 text-center">
              <Loader2 className="w-12 h-12 text-primary mx-auto mb-4 animate-spin" />
              <p className="font-medium text-zinc-900 dark:text-zinc-100">
                Analysis using AI...
              </p>
              <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
                This may take a few seconds
              </p>
            </Card>
          )}
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

              {/* Relevant Benefits Section (AI Mode) */}
              {aiMode && relevantBenefits.length > 0 && (
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
