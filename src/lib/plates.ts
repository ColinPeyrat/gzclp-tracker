export const plateColors: Record<number, string> = {
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

export interface PlateResult {
  perSide: number[]
  totalWeight: number
  achievable: boolean
  suggestedWeight?: number
}

function calculatePlatesInternal(
  targetWeight: number,
  barWeight: number,
  plateInventory: Record<string, number>,
  availablePlates: number[]
): { perSide: number[]; totalWeight: number; achievable: boolean } {
  const weightPerSide = (targetWeight - barWeight) / 2

  if (weightPerSide <= 0) {
    return { perSide: [], totalWeight: barWeight, achievable: weightPerSide === 0 }
  }

  const perSide: number[] = []
  let remaining = weightPerSide

  for (const plate of availablePlates) {
    const maxPerSide = Math.floor((plateInventory[plate.toString()] || 0) / 2)
    let usedCount = 0

    while (remaining >= plate - 0.001 && usedCount < maxPerSide) {
      perSide.push(plate)
      remaining -= plate
      usedCount++
    }
  }

  const achievable = Math.abs(remaining) < 0.001
  const actualPerSide = perSide.reduce((sum, p) => sum + p, 0)
  const totalWeight = barWeight + actualPerSide * 2

  return { perSide, totalWeight, achievable }
}

export function calculatePlates(
  targetWeight: number,
  barWeight: number,
  plateInventory: Record<string, number>
): PlateResult {
  // Get available plates sorted from largest to smallest
  const availablePlates = Object.entries(plateInventory)
    .filter(([_, qty]) => qty > 0)
    .map(([weight, _]) => parseFloat(weight))
    .sort((a, b) => b - a)

  if (availablePlates.length === 0) {
    return { perSide: [], totalWeight: barWeight, achievable: false }
  }

  const result = calculatePlatesInternal(targetWeight, barWeight, plateInventory, availablePlates)

  if (!result.achievable) {
    // Find minimum achievable weight above target
    // Use small increment to not miss any achievable weights
    const smallestPlate = availablePlates[availablePlates.length - 1]
    const increment = Math.min(smallestPlate, 0.5)

    for (let tryWeight = targetWeight + increment; tryWeight <= targetWeight + 50; tryWeight += increment) {
      // Round to avoid floating point issues
      const roundedWeight = Math.round(tryWeight * 100) / 100
      const tryResult = calculatePlatesInternal(roundedWeight, barWeight, plateInventory, availablePlates)
      if (tryResult.achievable) {
        return { ...result, suggestedWeight: roundedWeight }
      }
    }
  }

  return result
}

export function formatPlates(plates: number[]): string {
  if (plates.length === 0) return 'Empty bar'

  const counts = new Map<number, number>()
  for (const plate of plates) {
    counts.set(plate, (counts.get(plate) || 0) + 1)
  }

  const parts: string[] = []
  for (const [weight, count] of counts) {
    parts.push(count > 1 ? `${count}×${weight}` : `${weight}`)
  }

  return parts.join(' + ')
}

export function getSmallestPlate(plateInventory: Record<string, number>): number {
  const availablePlates = Object.entries(plateInventory)
    .filter(([_, qty]) => qty > 0)
    .map(([weight, _]) => parseFloat(weight))
  return availablePlates.length > 0 ? Math.min(...availablePlates) : 2.5
}
