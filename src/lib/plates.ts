export interface PlateResult {
  perSide: number[]
  totalWeight: number
  achievable: boolean
  suggestedWeight?: number
}

export function calculatePlates(
  targetWeight: number,
  barWeight: number,
  availablePlates: number[]
): PlateResult {
  const weightPerSide = (targetWeight - barWeight) / 2

  if (weightPerSide < 0) {
    return { perSide: [], totalWeight: barWeight, achievable: false, suggestedWeight: barWeight }
  }

  if (weightPerSide === 0) {
    return { perSide: [], totalWeight: barWeight, achievable: true }
  }

  // Sort plates from largest to smallest
  const sortedPlates = [...availablePlates].sort((a, b) => b - a)
  const smallestPlate = sortedPlates[sortedPlates.length - 1]

  const perSide: number[] = []
  let remaining = weightPerSide

  for (const plate of sortedPlates) {
    while (remaining >= plate) {
      perSide.push(plate)
      remaining -= plate
    }
  }

  const achievable = remaining === 0
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
