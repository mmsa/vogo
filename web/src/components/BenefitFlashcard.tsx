import { useState } from "react";
import { ChevronLeft, ChevronRight, RotateCcw, ExternalLink, Gift } from "lucide-react";
import { Benefit, Membership } from "@/lib/api";
import { Card } from "./ui/Card";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { cn } from "@/lib/utils";

interface BenefitFlashcardProps {
  benefit: Benefit;
  membership?: Membership;
  onNext: () => void;
  onPrevious: () => void;
  canGoNext: boolean;
  canGoPrevious: boolean;
  index: number;
  total: number;
}

export function BenefitFlashcard({
  benefit,
  membership,
  onNext,
  onPrevious,
  canGoNext,
  canGoPrevious,
  index,
  total,
}: BenefitFlashcardProps) {
  const [isFlipped, setIsFlipped] = useState(false);

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleReset = () => {
    setIsFlipped(false);
  };

  return (
    <div className="relative w-full max-w-2xl mx-auto">
      {/* Card Counter */}
      <div className="text-center mb-4">
        <span className="text-sm text-zinc-600 dark:text-zinc-400">
          {index + 1} of {total}
        </span>
      </div>

      {/* Flashcard */}
      <div className="perspective-1000">
        <div
          className={cn(
            "relative w-full h-[500px] transition-transform duration-700 transform-style-preserve-3d",
            isFlipped && "rotate-y-180"
          )}
        >
          {/* Front of Card */}
          <Card
            className={cn(
              "absolute inset-0 w-full h-full p-8 flex flex-col items-center justify-center text-center cursor-pointer backface-hidden",
              "bg-gradient-to-br from-primary/10 via-primary/5 to-transparent dark:from-primary/20 dark:via-primary/10",
              "border-2 border-primary/30 hover:border-primary/50 transition-all"
            )}
            onClick={handleFlip}
          >
            <div className="w-20 h-20 rounded-full bg-primary/20 dark:bg-primary/30 flex items-center justify-center mb-6">
              <Gift className="w-10 h-10 text-primary" />
            </div>
            
            <h3 className="text-3xl font-bold text-zinc-900 dark:text-zinc-100 mb-4">
              {benefit.title}
            </h3>

            {membership && (
              <Badge variant="secondary" className="mb-4">
                {membership.name}
              </Badge>
            )}

            {benefit.category && (
              <Badge variant="outline" className="mb-6 capitalize">
                {benefit.category.replace("_", " ")}
              </Badge>
            )}

            <p className="text-zinc-600 dark:text-zinc-400 text-sm mt-4">
              Click to flip and learn more
            </p>
          </Card>

          {/* Back of Card */}
          <Card
            className={cn(
              "absolute inset-0 w-full h-full p-8 flex flex-col cursor-pointer backface-hidden rotate-y-180",
              "bg-gradient-to-br from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-800",
              "border-2 border-primary/30 hover:border-primary/50 transition-all"
            )}
            onClick={handleFlip}
          >
            <div className="flex-1 flex flex-col">
              <div className="mb-4">
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 mb-2">
                  {benefit.title}
                </h3>
                {membership && (
                  <p className="text-sm text-zinc-500 dark:text-zinc-400">
                    From {membership.name}
                  </p>
                )}
              </div>

              {benefit.description && (
                <div className="flex-1 mb-6">
                  <p className="text-base text-zinc-700 dark:text-zinc-300 leading-relaxed">
                    {benefit.description}
                  </p>
                </div>
              )}

              <div className="space-y-4 pt-4 border-t border-zinc-200 dark:border-zinc-700">
                {benefit.vendor_name && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-zinc-600 dark:text-zinc-400">Vendor:</span>
                    <span className="text-zinc-900 dark:text-zinc-100">{benefit.vendor_name}</span>
                  </div>
                )}
                
                {benefit.vendor_domain && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium text-zinc-600 dark:text-zinc-400">Domain:</span>
                    <span className="text-zinc-900 dark:text-zinc-100">{benefit.vendor_domain}</span>
                  </div>
                )}

                {benefit.source_url && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(benefit.source_url, "_blank");
                    }}
                  >
                    <ExternalLink className="w-4 h-4" />
                    Learn More
                  </Button>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="flex items-center justify-center gap-4 mt-6">
        <Button
          variant="outline"
          size="sm"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={handleReset}
          className="gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onNext}
          disabled={!canGoNext}
          className="gap-2"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

