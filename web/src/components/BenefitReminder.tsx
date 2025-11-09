import { useState, useEffect } from "react";
import { Gift, ChevronLeft, ChevronRight, RotateCcw, ExternalLink } from "lucide-react";
import { Benefit, Membership, api } from "@/lib/api";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { cn } from "@/lib/utils";

interface BenefitReminderProps {
  userId: number;
}

export function BenefitReminder({ userId }: BenefitReminderProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [benefits, setBenefits] = useState<Benefit[]>([]);
  const [membershipsMap, setMembershipsMap] = useState<Map<number, Membership>>(new Map());
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReminderBenefits();
  }, [userId]);

  const loadReminderBenefits = async () => {
    try {
      setLoading(true);
      
      // Get user's benefits
      const userBenefits = await api.getUserBenefits(userId);
      
      // Get all memberships to create a map
      const allMemberships = await api.getMemberships();
      const map = new Map(allMemberships.map((m: Membership) => [m.id, m]));
      setMembershipsMap(map);

      // Filter for "cool" benefits - high-value categories that users might forget about
      const highValueCategories = [
        "travel_insurance",
        "lounge_access",
        "device_insurance",
        "breakdown_cover",
        "cashback",
        "retail",
        "dining",
        "travel",
      ];

      // Filter benefits that are in high-value categories
      const coolBenefits = userBenefits.filter((benefit: Benefit) => {
        return benefit.category && highValueCategories.includes(benefit.category);
      });

      // Shuffle for variety
      const shuffled = [...coolBenefits].sort(() => Math.random() - 0.5);
      
      if (shuffled.length > 0) {
        setBenefits(shuffled);
        setCurrentIndex(0);
      }
    } catch (error) {
      console.error("Failed to load reminder benefits:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % benefits.length);
    setIsFlipped(false);
  };

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + benefits.length) % benefits.length);
    setIsFlipped(false);
  };

  if (loading || benefits.length === 0) {
    return null;
  }

  const currentBenefit = benefits[currentIndex];
  const membership = membershipsMap.get(currentBenefit.membership_id);

  return (
    <div className="w-full h-full flex flex-col">
      <Card className="flex-1 flex flex-col border-2 border-primary/30 bg-white dark:bg-zinc-900">
        {/* Header */}
        <div className="p-4 pb-3 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center">
              <Gift className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100">
                Did you know you have...
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {currentIndex + 1} of {benefits.length}
              </p>
            </div>
          </div>
        </div>

        {/* Flashcard */}
        <div className="flex-1 perspective-1000 p-4 overflow-hidden">
          <div
            className={cn(
              "relative w-full h-full min-h-[350px] transition-transform duration-700 transform-style-preserve-3d",
              isFlipped && "rotate-y-180"
            )}
          >
            {/* Front of Card */}
            <div
              className={cn(
                "absolute inset-0 w-full h-full p-6 flex flex-col items-center justify-center text-center cursor-pointer backface-hidden rounded-lg",
                "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10",
                "border-2 border-primary/30 hover:border-primary/50 transition-all"
              )}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className="w-16 h-16 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center mb-4">
                <Gift className="w-8 h-8 text-primary" />
              </div>
              
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 mb-3">
                {currentBenefit.title}
              </h3>

              {membership && (
                <Badge variant="secondary" className="mb-3 text-xs">
                  {membership.name}
                </Badge>
              )}

              {currentBenefit.category && (
                <Badge variant="outline" className="mb-4 text-xs capitalize">
                  {currentBenefit.category.replace("_", " ")}
                </Badge>
              )}

              <p className="text-zinc-600 dark:text-zinc-400 text-xs mt-2">
                Click to learn more
              </p>
            </div>

            {/* Back of Card */}
            <div
              className={cn(
                "absolute inset-0 w-full h-full p-6 flex flex-col cursor-pointer backface-hidden rotate-y-180 rounded-lg",
                "bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800",
                "border-2 border-primary/30 hover:border-primary/50 transition-all overflow-y-auto"
              )}
              onClick={() => setIsFlipped(!isFlipped)}
            >
              <div className="flex-1 flex flex-col">
                <div className="mb-3">
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">
                    {currentBenefit.title}
                  </h3>
                  {membership && (
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">
                      From {membership.name}
                    </p>
                  )}
                </div>

                {currentBenefit.description && (
                  <div className="flex-1 mb-4">
                    <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">
                      {currentBenefit.description}
                    </p>
                  </div>
                )}

                <div className="space-y-2 pt-3 border-t border-zinc-200 dark:border-zinc-700">
                  {currentBenefit.vendor_name && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-medium text-zinc-600 dark:text-zinc-400">Vendor:</span>
                      <span className="text-zinc-900 dark:text-zinc-100">{currentBenefit.vendor_name}</span>
                    </div>
                  )}
                  
                  {currentBenefit.source_url && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2 text-xs"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(currentBenefit.source_url, "_blank");
                      }}
                    >
                      <ExternalLink className="w-3 h-3" />
                      Learn More
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        {benefits.length > 1 && (
          <div className="flex items-center justify-between p-4 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              variant="ghost"
              size="sm"
              onClick={handlePrevious}
              className="gap-1 text-xs"
            >
              <ChevronLeft className="w-3 h-3" />
              Previous
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsFlipped(false)}
              className="gap-1 text-xs"
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={handleNext}
              className="gap-1 text-xs"
            >
              Next
              <ChevronRight className="w-3 h-3" />
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

