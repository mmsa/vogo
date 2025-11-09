import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Gift, CreditCard } from "lucide-react";
import { api, Membership, Benefit } from "@/lib/api";
import { BenefitCard } from "@/components/BenefitCard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { Badge } from "@/components/ui/Badge";
import { SectionHeader } from "@/components/SectionHeader";

export default function MembershipBenefits() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [membership, setMembership] = useState<Membership | null>(null);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      loadMembershipBenefits(parseInt(id));
    }
  }, [id]);

  const loadMembershipBenefits = async (membershipId: number) => {
    try {
      setLoading(true);
      setError(null);

      // Load membership and benefits in parallel
      const [allMemberships, benefitsData] = await Promise.all([
        api.getMemberships(),
        api.getBenefitsByMembership(membershipId),
      ]);

      const foundMembership = allMemberships.find((m: Membership) => m.id === membershipId);
      
      if (!foundMembership) {
        setError("Membership not found");
        return;
      }

      setMembership(foundMembership);
      setBenefits(benefitsData);
    } catch (err: any) {
      console.error("Failed to load membership benefits:", err);
      setError(err.message || "Failed to load membership benefits");
    } finally {
      setLoading(false);
    }
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

  if (error || !membership) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate("/memberships")}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Memberships
        </Button>
        <Card className="p-8 text-center">
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            {error || "Membership not found"}
          </p>
          <Button onClick={() => navigate("/memberships")}>
            Go to Memberships
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => navigate("/memberships")}
          className="mb-0"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <SectionHeader
          title={membership.name}
          description={`View all benefits for ${membership.name}`}
        />
      </div>

      {/* Membership Info Card */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <div className="rounded-xl p-4 bg-primary/10 text-primary">
            <CreditCard className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-1">
              {membership.name}
            </h2>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-3">
              {membership.provider_slug}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="flex items-center gap-1">
                <Gift className="w-3 h-3" />
                {benefits.length} {benefits.length === 1 ? "Benefit" : "Benefits"}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Benefits Section */}
      {benefits.length === 0 ? (
        <Card className="p-8 text-center">
          <Gift className="w-12 h-12 mx-auto mb-4 text-zinc-400" />
          <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
            No Benefits Found
          </h3>
          <p className="text-zinc-600 dark:text-zinc-400 mb-4">
            This membership doesn't have any benefits listed yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          <h3 className="text-xl font-semibold text-zinc-900 dark:text-white">
            All Benefits
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {benefits.map((benefit, index) => (
              <div
                key={benefit.id}
                className="animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <BenefitCard benefit={benefit} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

