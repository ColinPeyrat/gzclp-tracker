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
    // Use smallest plate pair as increment to not miss achievable weights
    const smallestPlate = availablePlates[availablePlates.length - 1]
    const increment = smallestPlate * 2

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
