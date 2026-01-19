export interface PlateResult {
  perSide: number[]
  totalWeight: number
  achievable: boolean
}

export function calculatePlates(
  targetWeight: number,
  barWeight: number,
  availablePlates: number[]
): PlateResult {
  const weightPerSide = (targetWeight - barWeight) / 2

  if (weightPerSide < 0) {
    return { perSide: [], totalWeight: barWeight, achievable: false }
  }

  if (weightPerSide === 0) {
    return { perSide: [], totalWeight: barWeight, achievable: true }
  }

  // Sort plates from largest to smallest
  const sortedPlates = [...availablePlates].sort((a, b) => b - a)

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
