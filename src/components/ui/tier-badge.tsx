import { cn } from '@/lib/utils'
import type { Tier } from '@/lib/types'

const TIER_STYLES: Record<Tier, string> = {
  T1: 'text-tier-1',
  T2: 'text-tier-2',
  T3: 'text-tier-3',
}

export function TierBadge({ tier, className }: { tier: Tier; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex w-6 font-mono text-xs font-medium',
        TIER_STYLES[tier],
        className
      )}
    >
      {tier}
    </span>
  )
}
