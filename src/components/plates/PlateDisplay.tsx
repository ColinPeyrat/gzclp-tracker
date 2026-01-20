import { calculatePlates, formatPlates } from '../../lib/plates'
import { PlateChips } from './PlateChips'
import type { WeightUnit } from '../../lib/types'

interface PlateDisplayProps {
  targetWeight: number
  barWeight: number
  plateInventory: Record<string, number>
  unit: WeightUnit
  isDumbbell?: boolean
  onWeightChange?: (newWeight: number) => void
}

export function PlateDisplay({ targetWeight, barWeight, plateInventory, unit, isDumbbell, onWeightChange }: PlateDisplayProps) {
  const result = calculatePlates(targetWeight, barWeight, plateInventory)
  const sideLabel = 'Each side'

  if (!result.achievable && result.suggestedWeight) {
    const suggestedResult = calculatePlates(result.suggestedWeight, barWeight, plateInventory)
    return (
      <div className="rounded-lg bg-yellow-900/30 p-3 text-sm">
        <div className="mb-2 text-center text-yellow-400">
          Can't make {targetWeight} {unit} with available plates
        </div>
        <div className="mb-2 text-center text-zinc-300">
          Closest: {result.suggestedWeight} {unit}
        </div>
        {suggestedResult.perSide.length > 0 && (
          <div className="mb-2 flex justify-center">
            <PlateChips plates={suggestedResult.perSide} />
          </div>
        )}
        {onWeightChange && (
          <button
            onClick={() => onWeightChange(result.suggestedWeight!)}
            className="w-full rounded bg-yellow-600 py-2 text-sm font-medium text-white hover:bg-yellow-500"
          >
            Use {result.suggestedWeight} {unit}
          </button>
        )}
      </div>
    )
  }

  if (result.perSide.length === 0) {
    if (isDumbbell) {
      return null
    }
    return (
      <div className="rounded-lg bg-zinc-800 p-3 text-center text-sm text-zinc-400">
        Empty bar ({barWeight} {unit})
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-zinc-800 p-3">
      <div className="mb-2 text-center text-xs text-zinc-500">{sideLabel}</div>
      <div className="flex justify-center">
        <PlateChips plates={result.perSide} />
      </div>
      <div className="mt-2 text-center text-xs text-zinc-500">
        {formatPlates(result.perSide)}
      </div>
    </div>
  )
}
