import { calculatePlates, formatPlates } from '../../lib/plates'
import type { WeightUnit } from '../../lib/types'

interface PlateDisplayProps {
  targetWeight: number
  barWeight: number
  availablePlates: number[]
  unit: WeightUnit
}

const plateColors: Record<number, string> = {
  // lbs plates
  45: 'bg-blue-600',
  35: 'bg-yellow-500',
  25: 'bg-green-600',
  10: 'bg-zinc-100 text-zinc-900',
  5: 'bg-red-600',
  2.5: 'bg-zinc-400 text-zinc-900',
  // kg plates
  20: 'bg-blue-600',
  15: 'bg-yellow-500',
  1.25: 'bg-zinc-400 text-zinc-900',
}

export function PlateDisplay({ targetWeight, barWeight, availablePlates, unit }: PlateDisplayProps) {
  const result = calculatePlates(targetWeight, barWeight, availablePlates)

  if (!result.achievable) {
    return (
      <div className="rounded-lg bg-yellow-900/30 p-3 text-center text-sm text-yellow-400">
        Can't make {targetWeight} {unit} with available plates
      </div>
    )
  }

  if (result.perSide.length === 0) {
    return (
      <div className="rounded-lg bg-zinc-800 p-3 text-center text-sm text-zinc-400">
        Empty bar ({barWeight} {unit})
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-zinc-800 p-3">
      <div className="mb-2 text-center text-xs text-zinc-500">Each side</div>
      <div className="flex items-center justify-center gap-1">
        {result.perSide.map((plate, i) => (
          <div
            key={i}
            className={`flex h-8 min-w-8 items-center justify-center rounded px-2 text-sm font-medium ${
              plateColors[plate] ?? 'bg-zinc-600'
            }`}
          >
            {plate}
          </div>
        ))}
      </div>
      <div className="mt-2 text-center text-xs text-zinc-500">
        {formatPlates(result.perSide)}
      </div>
    </div>
  )
}
