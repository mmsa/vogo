import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Gift, Plus } from "lucide-react";
import { api, CURRENT_USER_ID, Benefit, Membership } from "@/lib/api";
import { SectionHeader } from "@/components/SectionHeader";
import { BenefitCard } from "@/components/BenefitCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Accordion, AccordionItem } from "@/components/ui/Accordion";

interface BenefitWithMembership extends Benefit {
  membership?: Membership;
}

export default function Benefits() {
  const [benefits, setBenefits] = useState<BenefitWithMembership[]>([]);
  const [memberships, setMemberships] = useState<Map<number, Membership>>(
    new Map()
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadBenefits();
  }, []);

  const loadBenefits = async () => {
    try {
      setLoading(true);
      const [benefitsData, membershipsData] = await Promise.all([
        api.getUserBenefits(CURRENT_USER_ID),
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
  const benefitsByMembership = benefits.reduce((acc, benefit) => {
    const membershipId = benefit.membership_id;
    if (!acc[membershipId]) {
      acc[membershipId] = [];
    }
    acc[membershipId].push(benefit);
    return acc;
  }, {} as Record<number, BenefitWithMembership[]>);

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
