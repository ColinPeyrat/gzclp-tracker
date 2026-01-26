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

export function LiftCard({ lift, unit, onClick }: LiftCardProps) {
  const hasData = lift.dataPoints.length > 0

  return (
    <button
      onClick={onClick}
      className="flex w-full flex-col rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-left transition-colors hover:border-zinc-700"
    >
      <h3 className="mb-1 font-medium text-white">{lift.liftName}</h3>
      <p className="text-2xl font-bold text-white">
        {hasData ? `${lift.currentWeight} ${unit}` : '—'}
      </p>

      {hasData ? (
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-zinc-500">3 month</span>
            <p className={lift.recentGain > 0 ? 'text-green-400' : lift.recentGain < 0 ? 'text-red-400' : 'text-zinc-400'}>
              {formatGain(lift.recentGain, unit)}
            </p>
          </div>
          <div>
            <span className="text-zinc-500">Total</span>
            <p className={lift.totalGain > 0 ? 'text-green-400' : lift.totalGain < 0 ? 'text-red-400' : 'text-zinc-400'}>
              {formatGain(lift.totalGain, unit)}
            </p>
          </div>
        </div>
      ) : (
        <p className="mt-3 text-sm text-zinc-500">No data yet</p>
      )}
    </button>
  )
}
