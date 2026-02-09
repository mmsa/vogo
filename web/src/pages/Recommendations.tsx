import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Sparkles, Lightbulb, Plus, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
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
  const [hasMemberships, setHasMemberships] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const allowedKinds = new Set([
    "upgrade",
    "switch",
    "add_membership",
    "bundle",
    "overlap",
    "tip",
  ]);
  const kindPriority: Record<string, number> = {
    upgrade: 0,
    switch: 1,
    add_membership: 2,
    bundle: 3,
    overlap: 4,
    tip: 5,
    unused: 6,
  };

  const sortRecommendations = (recs: Recommendation[]) =>
    [...recs].sort((a, b) => {
      const aPriority = kindPriority[a.kind || ""] ?? 99;
      const bPriority = kindPriority[b.kind || ""] ?? 99;
      if (aPriority !== bPriority) return aPriority - bPriority;
      const aSaving = a.estimated_saving_max ?? a.estimated_saving_min ?? 0;
      const bSaving = b.estimated_saving_max ?? b.estimated_saving_min ?? 0;
      return bSaving - aSaving;
    });

  const LOAD_TIMEOUT_MS = 5000;
  const withTimeout = async <T,>(promise: Promise<T>, label: string) => {
    let timeoutId: number | undefined;
    const timeout = new Promise<T>((_, reject) => {
      timeoutId = window.setTimeout(() => {
        reject(new Error(`${label} timed out`));
      }, LOAD_TIMEOUT_MS);
    });
    try {
      return await Promise.race([promise, timeout]);
    } finally {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    }
  };

  const readCache = () => {
    const cachedAI = localStorage.getItem("vogo_cache_ai");
    if (!cachedAI) return null;
    try {
      const cached = JSON.parse(cachedAI);
      if (cached.userId && cached.userId !== user?.id) {
        localStorage.removeItem("vogo_cache_ai");
        return null;
      }
      return cached;
    } catch (e) {
      console.error("Cache parse error:", e);
      return null;
    }
  };

  useEffect(() => {
    if (user?.id) {
      loadRecommendations();
    }
    // Only reload when user changes, not on every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const loadRecommendations = async (skipCache = false) => {
    if (!user?.id) {
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      const cached = readCache();

      // Check if user has memberships first
      const userBenefits = await withTimeout(
        api.getUserBenefits(user.id),
        "Loading benefits"
      );
      const uniqueMembershipIds = new Set(userBenefits.map((b: Benefit) => b.membership_id));
      setHasMemberships(uniqueMembershipIds.size > 0);
      
      // Check cache first - if cache exists, use it and don't refresh automatically
      // Cache is cleared when memberships are added/removed, so we only refresh then
      // Skip cache if explicitly requested (e.g., from refresh button)
      if (!skipCache) {
        if (cached) {
          // Filter cached recommendations (in case cache was from before filtering)
          const filteredCached = cached.recs.filter((rec: Recommendation) =>
            rec.kind ? allowedKinds.has(rec.kind) : false
          );
          setRecommendations(sortRecommendations(filteredCached));
          setRelevantBenefits(cached.benefits || []);
          setLoading(false);
          // Don't refresh in background - only refresh when cache is cleared (memberships changed)
          return;
        }
      }
      
      // Use LLM-powered recommendations (only if user has memberships)
      if (uniqueMembershipIds.size > 0) {
        const data = await withTimeout(
          api.getLLMRecommendations({
            user_id: user.id,
          }),
          "Loading AI recommendations"
        );
        // Filter out "unused" recommendations - show overlaps, tips, and optimization recommendations
        const filteredRecs = (data.recommendations || []).filter(
          (rec: Recommendation) => (rec.kind ? allowedKinds.has(rec.kind) : false)
        );
        const sortedRecs = sortRecommendations(filteredRecs);
        setRecommendations(sortedRecs);
        setRelevantBenefits(data.relevant_benefits || []);
        const aiCache = {
          userId: user.id, // Store user ID to verify cache belongs to current user
          recs: sortedRecs,
          benefits: data.relevant_benefits || [],
        };
        // Persist to localStorage
        localStorage.setItem("vogo_cache_ai", JSON.stringify(aiCache));
      } else {
        setRecommendations([]);
        setRelevantBenefits([]);
      }
    } catch (error) {
      console.error("Failed to load recommendations:", error);
      const cached = readCache();
      if (cached?.recs?.length) {
        const filteredCached = cached.recs.filter((rec: Recommendation) =>
          rec.kind ? allowedKinds.has(rec.kind) : false
        );
        setRecommendations(sortRecommendations(filteredCached));
        setRelevantBenefits(cached.benefits || []);
        setError("We couldn't refresh recommendations. Showing your last saved results.");
      } else {
        setError("We couldn't load recommendations. Please try again.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    // Clear cache and reload
    localStorage.removeItem("vogo_cache_ai");
    await loadRecommendations(true);
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

        {/* AI Badge and Refresh Button */}
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading || refreshing || !hasMemberships}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Card className="p-4 flex items-center gap-2">
            <Badge variant="default" className="gap-1">
              <Sparkles className="w-3 h-3" />
              AI Analysis
            </Badge>
          </Card>
        </div>
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
          {error && (
            <Card className="p-6 border border-amber-200 bg-amber-50/60 dark:bg-amber-900/10 dark:border-amber-900/40">
              <div className="flex flex-col items-center text-center gap-3">
                <AlertTriangle className="w-8 h-8 text-amber-600" />
                <div>
                  <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {error}
                  </p>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Try again in a moment or refresh this page.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button variant="outline" onClick={() => loadRecommendations(true)}>
                    Retry
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setError(null);
                    }}
                  >
                    Dismiss
                  </Button>
                </div>
              </div>
            </Card>
          )}
          {/* Empty State */}
          {recommendations.length === 0 ? (
            <Card className="p-12 text-center">
              <Lightbulb className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                No recommendations yet
              </h3>
              {hasMemberships ? (
                <p className="text-zinc-600 dark:text-zinc-400">
                  We're analyzing your memberships to find optimization opportunities. Check back soon!
                </p>
              ) : (
                <>
                  <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                    Add memberships to receive personalized recommendations
                  </p>
                  <Link to="/memberships">
                    <Button className="gap-2">
                      <Plus className="w-5 h-5" />
                      Add Memberships
                    </Button>
                  </Link>
                </>
              )}
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
