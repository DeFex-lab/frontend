/**
 * Creator Tier Benefits
 * Shows a creator's current tier, its benefits, and the next-tier upgrade
 * incentive on the creator dashboard.
 */

import { TrendingUp } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { CreatorTierBadge } from '@/components/shared/creator-tier-badge';
import { cn } from '@/lib/utils';
import { formatCurrency } from '@/utils/formatters';
import {
  getCreatorTierDefinition,
  getCreatorTierProgress,
  getNextTierIncentive,
} from '@/lib/creator-tiers';

export interface CreatorTierBenefitsProps {
  /** The creator's all-time total earnings, used to derive their tier. */
  totalEarnings: number;
  className?: string;
}

export function CreatorTierBenefits({
  totalEarnings,
  className,
}: CreatorTierBenefitsProps): JSX.Element {
  const progress = getCreatorTierProgress(totalEarnings);
  const definition = getCreatorTierDefinition(progress.tier);
  const incentive = getNextTierIncentive(progress.tier);
  const percent = Math.round(progress.ratio * 100);

  return (
    <Card className={cn('border-l-4', className)} data-testid="creator-tier-benefits">
      <div className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="font-semibold">Creator Tier</h2>
            <p className="text-sm text-muted-foreground">
              Based on your all-time earnings of {formatCurrency(totalEarnings)}.
            </p>
          </div>
          <CreatorTierBadge tier={progress.tier} size="lg" />
        </div>

        <div className="mb-4">
          <h3 className="text-sm font-medium text-muted-foreground mb-2">
            Unlocked benefits ({definition.label})
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            {definition.benefits.map((benefit, index) => (
              <li key={index}>{benefit}</li>
            ))}
          </ul>
        </div>

        {incentive ? (
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percent}
            aria-label={`Progress to next creator tier (${percent}%)`}
            className="h-2 w-full overflow-hidden rounded-full bg-muted/40 mb-2"
          >
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percent}%` }} />
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-1.5 font-medium">
              <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
              Next tier upgrade
            </span>
            <span className="text-muted-foreground">
              {formatCurrency(progress.amountToNext ?? 0)} more in earnings
            </span>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{incentive}</p>
        ) : (
          <p className="text-sm font-medium text-primary">
            Top tier reached — you are a Platinum creator. Thank you!
          </p>
        )}
      </div>
    </Card>
  );
}
