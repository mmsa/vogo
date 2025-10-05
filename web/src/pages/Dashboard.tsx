import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { CreditCard, Gift, Lightbulb, Plus, Sparkles } from "lucide-react";
import { api, CURRENT_USER_ID, Benefit, Recommendation } from "@/lib/api";
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

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [benefitsData, recsData] = await Promise.all([
        api.getUserBenefits(CURRENT_USER_ID),
        api.getRecommendations(CURRENT_USER_ID),
      ]);
      setBenefits(benefitsData);
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
    <div className="space-y-8 animate-fade-in">
      {/* Hero Section */}
      <div>
        <h1 className="text-4xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
          Good{" "}
          {new Date().getHours() < 12
            ? "morning"
            : new Date().getHours() < 18
            ? "afternoon"
            : "evening"}{" "}
          👋
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Here's your membership overview and personalized recommendations
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          icon={CreditCard}
          label="Active Memberships"
          value={membershipCount}
          iconColor="bg-primary/10 text-primary"
          delay={0}
        />
        <StatCard
          icon={Gift}
          label="Available Benefits"
          value={benefits.length}
          iconColor="bg-accent/10 text-accent"
          delay={100}
        />
        <StatCard
          icon={Lightbulb}
          label="Smart Recommendations"
          value={recommendations.length}
          iconColor="bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-500"
          delay={200}
        />
      </div>

      {/* Quick Actions */}
      <Card className="p-6 animate-fade-in" style={{ animationDelay: "300ms" }}>
        <SectionHeader
          title="Quick Actions"
          description="Manage your memberships and explore benefits"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link to="/memberships">
            <Button className="w-full gap-2" size="lg">
              <Plus className="w-5 h-5" />
              Add Membership
            </Button>
          </Link>
          <Link to="/recommendations">
            <Button variant="secondary" className="w-full gap-2" size="lg">
              <Sparkles className="w-5 h-5" />
              View All Recommendations
            </Button>
          </Link>
        </div>
      </Card>

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
