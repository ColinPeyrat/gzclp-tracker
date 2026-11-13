import { cn } from '@/lib/utils'
import type { LiftProgression } from '../../hooks/useProgressionData'
import type { WeightUnit } from '../../lib/types'

interface LiftCardProps {
  lift: LiftProgression
  unit: WeightUnit
  onClick: () => void
}

function formatGain(value: number, unit: WeightUnit): string {
  if (value === 0) return '—'
  return `${value > 0 ? '+' : ''}${value} ${unit}`
}

function gainClass(value: number) {
  return value > 0 ? 'text-success' : value < 0 ? 'text-destructive' : 'text-muted-foreground'
}

export function LiftCard({ lift, unit, onClick }: LiftCardProps) {
  const hasData = lift.dataPoints.length > 0

  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col rounded-lg bg-card p-4 text-left transition-colors hover:bg-accent"
    >
      <h3 className="text-sm text-muted-foreground">{lift.liftName}</h3>
      <p className="mt-1 tabular-nums">
        {hasData ? (
          <>
            <span className="text-2xl font-semibold tracking-tight">{lift.currentWeight}</span>
            <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
          </>
        ) : (
          <span className="text-2xl font-semibold text-muted-foreground">—</span>
        )}
      </p>

      {hasData ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">3 month</span>
            <p className={cn('font-medium tabular-nums', gainClass(lift.recentGain))}>
              {formatGain(lift.recentGain, unit)}
            </p>
          </div>
          <div>
            <span className="text-muted-foreground">Total</span>
            <p className={cn('font-medium tabular-nums', gainClass(lift.totalGain))}>
              {formatGain(lift.totalGain, unit)}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">No data yet</p>
      )}
    </button>
  )
}
