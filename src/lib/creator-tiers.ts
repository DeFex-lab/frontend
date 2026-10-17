/**
 * Creator Tiers
 *
 * Pure, framework-free display logic for a creator's tier level. A creator's
 * tier is derived from their all-time total earnings. This module only derives
 * display state from numbers it is given; it does not touch the network and
 * does not modify any existing tier calculation or upgrade logic.
 */

import { formatCurrency } from '@/utils/formatters';
import type React from 'react';

export type CreatorTierLevel = 'free' | 'bronze' | 'silver' | 'gold' | 'platinum';

/** Ordered creator tiers from lowest to highest. */
export const CREATOR_TIER_LEVELS: CreatorTierLevel[] = [
  'free',
  'bronze',
  'silver',
  'gold',
  'platinum',
];

/** All-time earnings thresholds (USDC) that unlock each creator tier. */
export const CREATOR_TIER_THRESHOLDS: Record<CreatorTierLevel, number> = {
  free: 0,
  bronze: 250,
  silver: 1000,
  gold: 5000,
  platinum: 15000,
};

/** Static display metadata for a creator tier, in ascending order. */
export interface CreatorTierDefinition {
  tier: CreatorTierLevel;
  label: string;
  description: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  /** Benefits unlocked at this tier. */
  benefits: string[];
  /** Default earnings threshold used to unlock this tier. */
  defaultThreshold: number;
}

export const CREATOR_TIER_DEFINITIONS: CreatorTierDefinition[] = [
  {
    tier: 'free',
    label: 'Free',
    description: 'Just getting started.',
    benefits: ['Public creator profile', 'Receive tips from supporters'],
    defaultThreshold: CREATOR_TIER_THRESHOLDS.free,
    icon: () => null,
  },
  {
    tier: 'bronze',
    label: 'Bronze',
    description: 'A rising creator building their audience.',
    benefits: ['Custom tip tiers', 'Creator badge on profile', 'Priority creator support'],
    defaultThreshold: CREATOR_TIER_THRESHOLDS.bronze,
    icon: () => null,
  },
  {
    tier: 'silver',
    label: 'Silver',
    description: 'An established creator with a loyal supporter base.',
    benefits: ['Subscription tiers', 'Exclusive tier-locked content', 'Basic earnings analytics'],
    defaultThreshold: CREATOR_TIER_THRESHOLDS.silver,
    icon: () => null,
  },
  {
    tier: 'gold',
    label: 'Gold',
    description: 'A top creator with significant earnings.',
    benefits: ['All Silver benefits', 'Higher payout limits', 'Featured placement on browse'],
    defaultThreshold: CREATOR_TIER_THRESHOLDS.gold,
    icon: () => null,
  },
  {
    tier: 'platinum',
    label: 'Platinum',
    description: 'An elite creator championed by the community.',
    benefits: [
      'All Gold benefits',
      'Dedicated account manager',
      'Platform-wide promotion',
      'Early access to new creator features',
    ],
    defaultThreshold: CREATOR_TIER_THRESHOLDS.platinum,
    icon: () => null,
  },
];

/** Look up a creator tier's display metadata. */
export function getCreatorTierDefinition(tier: CreatorTierLevel): CreatorTierDefinition {
  return (
    CREATOR_TIER_DEFINITIONS.find((definition) => definition.tier === tier) ??
    CREATOR_TIER_DEFINITIONS[0]
  );
}

/** Resolve the creator tier from all-time total earnings. */
export function resolveCreatorTier(totalEarnings: number): CreatorTierLevel {
  const earnings = Number.isFinite(totalEarnings) ? Math.max(0, totalEarnings) : 0;

  for (let index = CREATOR_TIER_LEVELS.length - 1; index >= 0; index--) {
    const tier = CREATOR_TIER_LEVELS[index];
    if (earnings >= CREATOR_TIER_THRESHOLDS[tier]) return tier;
  }

  return 'free';
}

/** The tier immediately above the given one, or `null` at the top. */
export function getNextCreatorTier(tier: CreatorTierLevel): CreatorTierLevel | null {
  const index = CREATOR_TIER_LEVELS.indexOf(tier);
  return CREATOR_TIER_LEVELS[index + 1] ?? null;
}

/**
 * Progress from the current creator tier toward the next one. The ratio is
 * measured from the current tier's threshold up to the next tier's threshold.
 */
export interface CreatorTierProgress {
  tier: CreatorTierLevel;
  nextTier: CreatorTierLevel | null;
  nextThreshold: number | null;
  amountToNext: number;
  ratio: number;
}

export function getCreatorTierProgress(
  totalEarnings: number
): CreatorTierProgress {
  const earnings = Number.isFinite(totalEarnings) ? Math.max(0, totalEarnings) : 0;
  const tier = resolveCreatorTier(earnings);
  const nextTier = getNextCreatorTier(tier);

  if (!nextTier) {
    return { tier, nextTier: null, nextThreshold: null, amountToNext: 0, ratio: 1 };
  }

  const nextThreshold = CREATOR_TIER_THRESHOLDS[nextTier];
  const previousThreshold = CREATOR_TIER_THRESHOLDS[tier];
  const span = nextThreshold - previousThreshold;
  const ratio = span > 0 ? Math.min(1, Math.max(0, (earnings - previousThreshold) / span)) : 0;

  return {
    tier,
    nextTier,
    nextThreshold,
    amountToNext: Math.max(0, nextThreshold - earnings),
    ratio,
  };
}

/** Human-readable upgrade incentive for the next creator tier. */
export function getNextTierIncentive(tier: CreatorTierLevel): string | null {
  const nextTier = getNextCreatorTier(tier);
  if (!nextTier) return null;
  const definition = getCreatorTierDefinition(nextTier);
  const threshold = CREATOR_TIER_THRESHOLDS[nextTier];
  return `Reach ${formatCurrency(threshold)} in total earnings to unlock ${definition.label} tier and its benefits: ${definition.benefits.join(', ')}.`;
}
