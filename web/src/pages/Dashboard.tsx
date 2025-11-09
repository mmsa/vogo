import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Gift, Lightbulb, Plus, Sparkles, TrendingUp, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { api, Benefit, Recommendation } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { StatCard } from "@/components/StatCard";
import { SectionHeader } from "@/components/SectionHeader";
import { RecommendationCard } from "@/components/RecommendationCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";

export default function Dashboard() {
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (user?.id) {
      loadDashboardData();
    }
  }, [user?.id]);

  const loadDashboardData = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      // Load benefits first (fast, no filtering needed)
      const benefitsData = await api.getUserBenefits(user.id);
      setBenefits(benefitsData);
      
      // Check cache first for faster loading (AI mode only)
      const cachedAI = localStorage.getItem("vogo_cache_ai");
      if (cachedAI) {
        try {
          const cached = JSON.parse(cachedAI);
          const filteredCached = cached.recs.filter(
            (rec: Recommendation) => rec.kind === "overlap" || rec.kind === "tip"
          );
          // Deduplicate by title to avoid duplicates
          const uniqueCached = filteredCached.filter((rec: Recommendation, index: number, self: Recommendation[]) => 
            index === self.findIndex((r) => r.title === rec.title && r.kind === rec.kind)
          );
          setRecommendations(uniqueCached);
          setLoading(false);
          
          // Load fresh data in background (non-blocking)
          api.getLLMRecommendations({ user_id: user.id })
            .then(data => {
              const filteredRecs = data.recommendations.filter(
                (rec: Recommendation) => rec.kind === "overlap" || rec.kind === "tip"
              );
              // Deduplicate by title to avoid duplicates
              const uniqueRecs = filteredRecs.filter((rec: Recommendation, index: number, self: Recommendation[]) => 
                index === self.findIndex((r) => r.title === rec.title && r.kind === rec.kind)
              );
              setRecommendations(uniqueRecs);
              // Update cache
              localStorage.setItem("vogo_cache_ai", JSON.stringify({
                recs: uniqueRecs,
                benefits: data.relevant_benefits,
              }));
            })
            .catch(err => console.error("Background refresh failed:", err));
          return;
        } catch (e) {
          // Cache parse failed, continue to load fresh
          console.error("Cache parse error:", e);
        }
      }
      
      // Load fresh recommendations (only if no cache)
      const recsData = await api.getLLMRecommendations({ user_id: user.id }).then(data => {
        const filtered = data.recommendations.filter((rec: Recommendation) => rec.kind === "overlap" || rec.kind === "tip");
        // Deduplicate by title to avoid duplicates
        return filtered.filter((rec: Recommendation, index: number, self: Recommendation[]) => 
          index === self.findIndex((r) => r.title === rec.title && r.kind === rec.kind)
        );
      });
      setRecommendations(recsData);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  // Count unique memberships
  const uniqueMemberships = new Set(benefits.map((b) => b.membership_id));
  const membershipCount = uniqueMemberships.size;

  // Calculate potential savings (convert from pence to pounds)
  // Recommendations are already filtered for overlap/tip and deduplicated when loaded
  const potentialSavings = recommendations.reduce((total, rec) => {
    // Double-check kind filter (should already be filtered, but be safe)
    if ((rec.kind === "overlap" || rec.kind === "tip") && rec.estimated_saving_min) {
      // estimated_saving_min is in pence, convert to pounds
      return total + (rec.estimated_saving_min / 100);
    }
    return total;
  }, 0);

  // Get user's first name
  const firstName = user?.email?.split('@')[0] || 'there';

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section with Gradient Background */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-blue-950/30 dark:via-purple-950/30 dark:to-pink-950/30 p-8 md:p-12"
      >
        <div className="relative z-10">
          <motion.h1 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl font-bold text-zinc-900 dark:text-zinc-100 mb-3"
          >
            Good{" "}
            {new Date().getHours() < 12
              ? "morning"
              : new Date().getHours() < 18
              ? "afternoon"
              : "evening"}, {firstName} 👋
          </motion.h1>
          
          {recommendations.length > 0 && potentialSavings > 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg"
            >
              <Sparkles className="w-5 h-5 text-yellow-500" />
              <p className="text-base font-medium text-zinc-900 dark:text-zinc-100">
                Your AI assistant found <span className="text-primary font-bold">{recommendations.length}</span> new ways to save{" "}
                <span className="text-green-600 dark:text-green-500 font-bold">£{potentialSavings.toLocaleString()}</span>/year today.
              </p>
            </motion.div>
          ) : (
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="text-lg text-zinc-600 dark:text-zinc-400"
            >
              Here's your intelligent membership overview
            </motion.p>
          )}
        </div>
        
        {/* Decorative gradient orbs */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-400/20 to-purple-400/20 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-pink-400/20 to-purple-400/20 rounded-full blur-3xl" />
      </motion.div>

      {/* Stats Grid with Motion */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={CreditCard}
          label="Active Memberships"
          value={membershipCount}
          iconColor="bg-primary/10 text-primary"
          delay={0}
          href="/my-perks"
        />
        <StatCard
          icon={Gift}
          label="Total Benefits"
          value={benefits.length}
          iconColor="bg-accent/10 text-accent"
          delay={100}
          href="/benefits"
        />
        <StatCard
          icon={Lightbulb}
          label="Smart Recommendations"
          value={recommendations.length}
          iconColor="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500"
          delay={200}
          href="/recommendations"
        />
        <StatCard
          icon={TrendingUp}
          label="Potential Annual Savings"
          value={`£${potentialSavings.toLocaleString()}`}
          iconColor="bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-500"
          delay={300}
          href="/recommendations"
        />
      </div>

      {/* Quick Actions - One Click CTAs */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
      >
        <Link to="/recommendations" className="group">
          <Card className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-primary/50">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-400/20 to-orange-400/20">
                <Sparkles className="w-6 h-6 text-yellow-600 dark:text-yellow-500" />
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Optimise My Perks
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              AI-powered recommendations to maximize value
            </p>
          </Card>
        </Link>

        <Link to="/memberships" className="group">
          <Card className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-primary/50">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400/20 to-purple-400/20">
                <Plus className="w-6 h-6 text-blue-600 dark:text-blue-500" />
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              Add Membership
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Discover and track new memberships
            </p>
          </Card>
        </Link>

        <Link to="/perks" className="group">
          <Card className="p-6 hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-2 border-transparent hover:border-primary/50">
            <div className="flex items-center justify-between mb-3">
              <div className="p-3 rounded-xl bg-gradient-to-br from-green-400/20 to-teal-400/20">
                <Gift className="w-6 h-6 text-green-600 dark:text-green-500" />
              </div>
              <ArrowRight className="w-5 h-5 text-zinc-400 group-hover:text-primary group-hover:translate-x-1 transition-all" />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
              See All Benefits
            </h3>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              Browse your membership perks by category
            </p>
          </Card>
        </Link>
      </motion.div>

      {/* Recent Recommendations */}
      {recommendations.length > 0 && (
        <div className="animate-fade-in" style={{ animationDelay: "400ms" }}>
          <SectionHeader
            title="Recent Recommendations"
            description="Personalized insights to maximize your benefits"
            action={
              <Link to="/recommendations">
                <Button variant="ghost" size="sm">
                  View all →
                </Button>
              </Link>
            }
          />
          <div className="space-y-4">
            {recommendations.slice(0, 3).map((rec, index) => (
              <RecommendationCard
                key={index}
                recommendation={rec}
                delay={index * 100}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {recommendations.length === 0 && (
        <Card
          className="p-12 text-center animate-fade-in"
          style={{ animationDelay: "400ms" }}
        >
          <Lightbulb className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            No recommendations yet
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Add memberships to get personalized recommendations
          </p>
          <Link to="/memberships">
            <Button className="gap-2">
              <Plus className="w-5 h-5" />
              Add Your First Membership
            </Button>
          </Link>
        </Card>
      )}
    </div>
  );
}
