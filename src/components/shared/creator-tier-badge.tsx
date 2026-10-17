/**
 * Creator Tier Badge
 * Visual indicator (badge + icon) for a creator's current tier level.
 */

import { Award, Gem, Medal, Trophy, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CreatorTierLevel } from '@/lib/creator-tiers';
import {
  CREATOR_TIER_DEFINITIONS,
  getCreatorTierDefinition,
} from '@/lib/creator-tiers';

interface TierStyle {
  classes: string;
  icon: JSX.Element;
}

const ICON_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
};

function tierStyle(tier: CreatorTierLevel, size: 'sm' | 'md' | 'lg'): TierStyle {
  const iconClass = ICON_CLASSES[size];

  switch (tier) {
    case 'free':
      return {
        classes: 'border-border/40 bg-muted/40 text-muted-foreground',
        icon: <User className={iconClass} aria-hidden="true" />,
      };
    case 'bronze':
      return {
        classes: 'border-amber-300/40 bg-amber-500/15 text-amber-500',
        icon: <Medal className={iconClass} aria-hidden="true" />,
      };
    case 'silver':
      return {
        classes: 'border-slate-300/40 bg-slate-400/15 text-slate-300',
        icon: <Award className={iconClass} aria-hidden="true" />,
      };
    case 'gold':
      return {
        classes: 'border-yellow-400/40 bg-yellow-400/15 text-yellow-400',
        icon: <Trophy className={iconClass} aria-hidden="true" />,
      };
    case 'platinum':
      return {
        classes: 'border-cyan-300/40 bg-cyan-400/15 text-cyan-300',
        icon: <Gem className={iconClass} aria-hidden="true" />,
      };
  }
}

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'gap-1 px-2 py-0.5 text-[11px]',
  md: 'gap-1.5 px-2.5 py-1 text-xs',
  lg: 'gap-2 px-3 py-1.5 text-sm',
};

export interface CreatorTierBadgeProps {
  tier: CreatorTierLevel;
  /** Compact pill for tables, or a larger badge for profile headers. */
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  title?: string;
}

export function CreatorTierBadge({
  tier,
  size = 'md',
  className,
  title,
}: CreatorTierBadgeProps): JSX.Element {
  const definition = getCreatorTierDefinition(tier);
  const { classes, icon } = tierStyle(tier, size);
  const tooltip = title ?? `${definition.label} creator tier`;

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border font-semibold',
        classes,
        SIZE_CLASSES[size],
        className
      )}
      data-creator-tier={tier}
      title={tooltip}
      aria-label={`${definition.label} creator tier`}
      role="status"
    >
      {icon}
      <span>{definition.label}</span>
    </span>
  );
}

/** All tier styles exposed for reference/testing. */
export { CREATOR_TIER_DEFINITIONS };
