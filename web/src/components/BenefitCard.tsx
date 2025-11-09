import { Gift, ExternalLink } from "lucide-react";
import { Card } from "./ui/Card";
import { Badge } from "./ui/Badge";
import { Button } from "./ui/Button";
import { Benefit } from "@/lib/api";
import { truncate } from "@/lib/utils";

interface BenefitCardProps {
  benefit: Benefit;
}

export function BenefitCard({ benefit }: BenefitCardProps) {
  return (
    <Card className="p-5 hover:shadow-card-hover transition-shadow bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-700">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-accent/10 p-2 flex-shrink-0">
          <Gift className="w-4 h-4 text-accent" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">
              {benefit.title}
            </h4>
            {benefit.category && (
              <Badge variant="secondary" className="text-xs flex-shrink-0">
                {benefit.category.replace("_", " ")}
              </Badge>
            )}
          </div>

          {benefit.description && (
            <p className="text-sm text-zinc-800 dark:text-zinc-200 mb-2 leading-relaxed">
              {truncate(benefit.description, 100)}
            </p>
          )}

          <div className="flex items-center justify-between">
            {benefit.vendor_domain && (
              <span className="text-xs text-zinc-600 dark:text-zinc-400">
                {benefit.vendor_domain}
              </span>
            )}
            {benefit.source_url && (
              <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                Learn more
                <ExternalLink className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
