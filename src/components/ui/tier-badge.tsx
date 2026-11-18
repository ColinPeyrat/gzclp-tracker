import { cn } from '@/lib/utils'
import { TIER_COLORS } from '@/lib/exercises'
import type { Tier } from '@/lib/types'

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-6 font-mono text-xs font-medium',
        TIER_COLORS[tier],
        className
      )}
    >
      {tier}
    </span>
  )
}
