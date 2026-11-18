import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import type { LiftProgression } from '../../hooks/useProgressionData'
import type { WeightUnit } from '../../lib/types'

interface LiftCardProps {
  lift: LiftProgression
  unit: WeightUnit
  onClick: () => void
}

function round(value: number) {
  return Math.round(value * 100) / 100
}

function formatGain(value: number, unit: WeightUnit): string {
  if (value === 0) return '—'
  return `${value > 0 ? '+' : ''}${round(value)} ${unit}`
}

function gainClass(value: number) {
  return value > 0 ? 'text-success' : value < 0 ? 'text-destructive' : 'text-muted-foreground'
}

function Stat({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div>
      <span className="text-muted-foreground">{label}</span>
      <p className={cn('font-medium tabular-nums', className)}>{value}</p>
    </div>
  )
}

export function LiftCard({ lift, unit, onClick }: LiftCardProps) {
  const hasData = lift.dataPoints.length > 0
  const test = lift.lastTest

  let stats: ReactNode
  if (test) {
    const past5RM = round(lift.workingWeight - test.weight)
    const sinceReset = lift.sinceResetGain ?? 0
    stats = (
      <>
        <Stat
          label="Since reset"
          value={formatGain(sinceReset, unit)}
          className={sinceReset > 0 ? 'text-success' : 'text-muted-foreground'}
        />
        {past5RM > 0 && <Stat label="Past 5RM" value={`+${past5RM} ${unit}`} className="text-warning" />}
      </>
    )
  } else {
    stats = (
      <>
        <Stat label="3 month" value={formatGain(lift.recentGain, unit)} className={gainClass(lift.recentGain)} />
        <Stat label="Total" value={formatGain(lift.totalGain, unit)} className={gainClass(lift.totalGain)} />
      </>
    )
  }

  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col rounded-lg bg-card p-4 text-left transition-colors hover:bg-accent"
    >
      <h3 className="text-sm text-muted-foreground">{lift.liftName}</h3>
      <p className="mt-1 tabular-nums">
        {hasData ? (
          <>
            <span className="text-2xl font-semibold tracking-tight">{test ? lift.workingWeight : lift.currentWeight}</span>
            <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
          </>
        ) : (
          <span className="text-2xl font-semibold text-muted-foreground">—</span>
        )}
      </p>
      {test && hasData && <p className="text-xs text-muted-foreground">Working weight</p>}

      {hasData ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">{stats}</div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">No data yet</p>
      )}
    </button>
  )
}
