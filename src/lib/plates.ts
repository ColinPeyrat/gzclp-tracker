export interface PlateResult {
  perSide: number[]
  totalWeight: number
  achievable: boolean
  suggestedWeight?: number
}

export function calculatePlates(
  targetWeight: number,
  barWeight: number,
  plateInventory: Record<string, number>
): PlateResult {
  const weightPerSide = (targetWeight - barWeight) / 2

  if (weightPerSide < 0) {
    return { perSide: [], totalWeight: barWeight, achievable: false, suggestedWeight: barWeight }
  }

  if (weightPerSide === 0) {
    return { perSide: [], totalWeight: barWeight, achievable: true }
  }

  // Get available plates sorted from largest to smallest
  const availablePlates = Object.entries(plateInventory)
    .filter(([_, qty]) => qty > 0)
    .map(([weight, _]) => parseFloat(weight))
    .sort((a, b) => b - a)

  if (availablePlates.length === 0) {
    return { perSide: [], totalWeight: barWeight, achievable: false }
  }

  const smallestPlate = availablePlates[availablePlates.length - 1]

  // Track how many of each plate we've used per side
  const usedPerSide: Record<string, number> = {}
  const perSide: number[] = []
  let remaining = weightPerSide

  for (const plate of availablePlates) {
    const maxPerSide = Math.floor((plateInventory[plate.toString()] || 0) / 2)
    let usedCount = 0

    while (remaining >= plate && usedCount < maxPerSide) {
      perSide.push(plate)
      remaining -= plate
      usedCount++
    }
    usedPerSide[plate.toString()] = usedCount
  }

  const achievable = Math.abs(remaining) < 0.001 // Float tolerance
  const actualPerSide = perSide.reduce((sum, p) => sum + p, 0)
  const totalWeight = barWeight + actualPerSide * 2

  if (!achievable) {
    // Find closest achievable weight above target by adding smallest plate
    const suggestedPerSide = [...perSide, smallestPlate]
    const suggestedWeight = barWeight + suggestedPerSide.reduce((sum, p) => sum + p, 0) * 2
    return { perSide, totalWeight, achievable, suggestedWeight }
  }

  return { perSide, totalWeight, achievable }
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
