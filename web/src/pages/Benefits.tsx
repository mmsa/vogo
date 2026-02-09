import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Gift, Plus, Search, Filter, X } from "lucide-react";
import { api, Benefit, Membership } from "@/lib/api";
import { useAuth } from "@/store/auth";
import { SectionHeader } from "@/components/SectionHeader";
import { BenefitCard } from "@/components/BenefitCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Accordion, AccordionItem } from "@/components/ui/Accordion";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

interface BenefitWithMembership extends Benefit {
  membership?: Membership;
}

export default function Benefits() {
  const { user } = useAuth();
  const [benefits, setBenefits] = useState<BenefitWithMembership[]>([]);
  const [memberships, setMemberships] = useState<Map<number, Membership>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategories, setActiveCategories] = useState<string[]>([]);

  useEffect(() => {
    if (user?.id) {
      loadBenefits();
    }
  }, [user?.id]);

  const loadBenefits = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      const [benefitsData, membershipsData] = await Promise.all([
        api.getUserBenefits(user.id),
        api.getMemberships(),
      ]);

      // Create membership lookup map
      const membershipMap = new Map(membershipsData.map((m: Membership) => [m.id, m]));
      setMemberships(membershipMap);

      // Attach membership info to benefits
      const enrichedBenefits = benefitsData.map((benefit: Benefit) => ({
        ...benefit,
        membership: membershipMap.get(benefit.membership_id),
      }));

      setBenefits(enrichedBenefits);
    } catch (error) {
      console.error("Failed to load benefits:", error);
    } finally {
      setLoading(false);
    }
  };

  // Group benefits by membership
  const filteredBenefits = benefits.filter((benefit) => {
    const query = searchQuery.trim().toLowerCase();
    const matchesQuery = query.length
      ? [
          benefit.title,
          benefit.description,
          benefit.membership?.name,
        ]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(query))
      : true;

    const matchesCategory = activeCategories.length
      ? activeCategories.includes((benefit.category || "other").toLowerCase())
      : true;

    return matchesQuery && matchesCategory;
  });

  const benefitsByMembership = filteredBenefits.reduce((acc, benefit) => {
    const membershipId = benefit.membership_id;
    if (!acc[membershipId]) {
      acc[membershipId] = [];
    }
    acc[membershipId].push(benefit);
    return acc;
  }, {} as Record<number, BenefitWithMembership[]>);

  const categories = Array.from(
    new Set(
      benefits.map((benefit) => (benefit.category || "other").toLowerCase())
    )
  ).sort();

  const toggleCategory = (category: string) => {
    setActiveCategories((prev) =>
      prev.includes(category)
        ? prev.filter((item) => item !== category)
        : [...prev, category]
    );
  };

  const clearFilters = () => {
    setSearchQuery("");
    setActiveCategories([]);
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <SectionHeader
        title="Your Benefits"
        description="All the perks and benefits from your active memberships"
      />

      {/* Search & Filters */}
      {benefits.length > 0 && (
        <Card className="p-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row lg:items-center gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-zinc-400 absolute left-4 top-1/2 -translate-y-1/2" />
                <Input
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search benefits, descriptions, or memberships"
                  className="pl-10"
                />
              </div>
              <Button
                variant="outline"
                className="gap-2"
                onClick={clearFilters}
                disabled={!searchQuery && activeCategories.length === 0}
              >
                <X className="w-4 h-4" />
                Clear filters
              </Button>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-400">
                <Filter className="w-4 h-4" />
                Filter by category:
              </div>
              {categories.length === 0 && (
                <span className="text-sm text-zinc-500">No categories available</span>
              )}
              {categories.map((category) => {
                const active = activeCategories.includes(category);
                return (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium border transition",
                      active
                        ? "bg-primary text-white border-primary"
                        : "border-zinc-200 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300 hover:border-primary/60"
                    )}
                  >
                    {category.replace("_", " ")}
                  </button>
                );
              })}
            </div>
            <div className="text-sm text-zinc-600 dark:text-zinc-400">
              <Badge variant="secondary" className="mr-2">
                {filteredBenefits.length}
              </Badge>
              benefit{filteredBenefits.length === 1 ? "" : "s"} match your search
            </div>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {benefits.length === 0 ? (
        <Card className="p-12 text-center">
          <Gift className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            No benefits yet
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Add memberships to unlock benefits and perks
          </p>
          <Link to="/memberships">
            <Button className="gap-2">
              <Plus className="w-5 h-5" />
              Add Memberships
            </Button>
          </Link>
        </Card>
      ) : filteredBenefits.length === 0 ? (
        <Card className="p-12 text-center">
          <Gift className="w-16 h-16 text-zinc-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
            No benefits found
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-6">
            Try a different search term or clear your filters.
          </p>
          <Button variant="outline" className="gap-2" onClick={clearFilters}>
            <X className="w-4 h-4" />
            Clear filters
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="xl:col-span-2">
            <Accordion>
              {Object.entries(benefitsByMembership).map(
                ([membershipId, membershipBenefits], index) => {
                  const membership = memberships.get(Number(membershipId));
                  return (
                    <div
                      key={membershipId}
                      className="animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <AccordionItem
                        title={membership?.name || "Unknown Membership"}
                        description={`${membershipBenefits.length} benefit${
                          membershipBenefits.length !== 1 ? "s" : ""
                        }`}
                        defaultOpen={index === 0}
                      >
                        {membershipBenefits.map((benefit) => (
                          <BenefitCard key={benefit.id} benefit={benefit} />
                        ))}
                      </AccordionItem>
                    </div>
                  );
                }
              )}
            </Accordion>
          </div>

          {/* Sidebar - Sticky on XL+ */}
          <div className="space-y-6">
            {/* Quick Stats */}
            <Card className="p-6 sticky top-24">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-4">
                Overview
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Total Benefits
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {benefits.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    Active Memberships
                  </span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">
                    {Object.keys(benefitsByMembership).length}
                  </span>
                </div>
                <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <Link to="/recommendations">
                    <Button variant="secondary" className="w-full">
                      View Recommendations
                    </Button>
                  </Link>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
