import { TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'
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

  if (!result.achievable) {
    const suggestedResult = result.suggestedWeight
      ? calculatePlates(result.suggestedWeight, barWeight, plateInventory)
      : null
    return (
      <div className="space-y-3 rounded-lg bg-warning/10 p-3 text-sm">
        <div className="flex items-center gap-2 text-warning">
          <TriangleAlert className="size-4 shrink-0" />
          Can't make {targetWeight} {unit} with your plates
        </div>
        {result.suggestedWeight && suggestedResult && (
          <>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">
                Closest <span className="font-semibold text-foreground tabular-nums">{result.suggestedWeight}</span> {unit}
              </span>
              {suggestedResult.perSide.length > 0 && <PlateChips plates={suggestedResult.perSide} size="sm" />}
            </div>
            {onWeightChange && (
              <Button variant="secondary" size="lg" className="w-full" onClick={() => onWeightChange(result.suggestedWeight!)}>
                Use {result.suggestedWeight} {unit}
              </Button>
            )}
          </>
        )}
      </div>
    )
  }

  if (result.perSide.length === 0) {
    if (isDumbbell) {
      return null
    }
    return (
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Each side</span>
        <span className="text-muted-foreground">
          Empty bar <span className="tabular-nums">({barWeight} {unit})</span>
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="text-sm text-muted-foreground">Each side</div>
        <div className="font-mono text-xs text-muted-foreground tabular-nums">{formatPlates(result.perSide)}</div>
      </div>
      <PlateChips plates={result.perSide} />
    </div>
  )
}
