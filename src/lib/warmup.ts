import type { WeightUnit } from './types'

export interface WarmupSet {
  weight: number
  reps: number
  plates: number[]
  completed: boolean
  label: string // "Bar" or percentage
}

// Big plates only - makes warmup loading simple
const WARMUP_PLATES_KG = [20, 15, 10, 5]
const WARMUP_PLATES_LBS = [45, 25, 10, 5]

function getWarmupPlateInventory(
  plateInventory: Record<string, number>,
  unit: WeightUnit
): Record<string, number> {
  const warmupPlates = unit === 'kg' ? WARMUP_PLATES_KG : WARMUP_PLATES_LBS
  const filtered: Record<string, number> = {}

  for (const plate of warmupPlates) {
    const key = plate.toString()
    if (plateInventory[key] && plateInventory[key] > 0) {
      filtered[key] = plateInventory[key]
    }
  }

  return filtered
}

function calculateWarmupPlates(
  targetWeight: number,
  barWeight: number,
  plateInventory: Record<string, number>
): number[] {
  const rawPerSide = (targetWeight - barWeight) / 2
  if (rawPerSide <= 0) return []

  // Sort largest first so greedy fills heavy plates before small ones
  const availablePlates = Object.entries(plateInventory)
    .filter(([_, qty]) => qty > 0)
    .map(([weight]) => parseFloat(weight))
    .sort((a, b) => b - a)

  // Round to nearest smallest plate so targets like 4kg with 5kg plates → 5kg
  const smallestPlate = availablePlates[availablePlates.length - 1]
  const weightPerSide = smallestPlate
    ? Math.round(rawPerSide / smallestPlate) * smallestPlate
    : rawPerSide

  const perSide: number[] = []
  let remaining = weightPerSide

  for (const plate of availablePlates) {
    const maxPerSide = Math.floor((plateInventory[plate.toString()] || 0) / 2)
    let used = 0
    while (remaining >= plate - 0.001 && used < maxPerSide) {
      perSide.push(plate)
      remaining -= plate
      used++
    }
  }

  // Sort result largest-first for display
  return perSide.sort((a, b) => b - a)
}


export function calculateWarmupSets(
  workWeight: number,
  barWeight: number,
  plateInventory: Record<string, number>,
  unit: WeightUnit
): WarmupSet[] {
  const sets: WarmupSet[] = []

  // First two sets: bar only × 5
  sets.push({
    weight: barWeight,
    reps: 5,
    plates: [],
    completed: false,
    label: 'Bar',
  })
  sets.push({
    weight: barWeight,
    reps: 5,
    plates: [],
    completed: false,
    label: 'Bar',
  })

  const warmupInventory = getWarmupPlateInventory(plateInventory, unit)

  // Calculate plates independently for each warmup percentage
  const percentages = [
    { pct: 0.45, reps: 5, label: '45%' },
    { pct: 0.65, reps: 3, label: '65%' },
    { pct: 0.85, reps: 2, label: '85%' },
  ]

  for (const { pct, reps, label } of percentages) {
    const targetWeight = Math.round(workWeight * pct)
    if (targetWeight <= barWeight) continue

    const plates = calculateWarmupPlates(targetWeight, barWeight, warmupInventory)
    if (plates.length === 0) continue

    const actualPerSide = plates.reduce((sum, p) => sum + p, 0)
    const actualWeight = barWeight + actualPerSide * 2

    // Skip if same weight as the previous set
    if (sets.length > 0 && sets[sets.length - 1].weight === actualWeight) continue

    sets.push({
      weight: actualWeight,
      reps,
      plates,
      completed: false,
      label,
    })
  }

  return sets
}
