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

// Calculate plates smallest-first for better warmup subsets
// e.g., 15kg per side = 5+10 instead of just 15
function calculateWarmupPlates(
  targetWeight: number,
  barWeight: number,
  plateInventory: Record<string, number>
): number[] {
  const weightPerSide = (targetWeight - barWeight) / 2
  if (weightPerSide <= 0) return []

  // Sort smallest first for granular combinations
  const availablePlates = Object.entries(plateInventory)
    .filter(([_, qty]) => qty > 0)
    .map(([weight]) => parseFloat(weight))
    .sort((a, b) => a - b)

  const perSide: number[] = []
  let remaining = weightPerSide

  // Greedy smallest-first
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

// Find best subset of maxPlates that gets closest to targetWeight (without exceeding)
function findBestSubset(
  maxPlates: number[],
  targetWeightPerSide: number
): number[] {
  if (targetWeightPerSide <= 0) return []

  // Get unique plates sorted largest first
  const uniquePlates = [...new Set(maxPlates)].sort((a, b) => b - a)

  // Count how many of each plate we have available
  const available = new Map<number, number>()
  for (const p of maxPlates) {
    available.set(p, (available.get(p) || 0) + 1)
  }

  // Greedy: pick largest plates that fit
  const result: number[] = []
  let remaining = targetWeightPerSide

  for (const plate of uniquePlates) {
    const maxCount = available.get(plate) || 0
    let used = 0
    while (remaining >= plate && used < maxCount) {
      result.push(plate)
      remaining -= plate
      used++
    }
  }

  return result
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

  // Calculate heaviest warmup (85%) first using only big plates
  // Use smallest-first algorithm for granular combinations (5+10 instead of 15)
  const warmupInventory = getWarmupPlateInventory(plateInventory, unit)
  const heaviestTarget = Math.round(workWeight * 0.85)

  if (heaviestTarget <= barWeight) return sets

  const maxPlates = calculateWarmupPlates(heaviestTarget, barWeight, warmupInventory)
  if (maxPlates.length === 0) return sets

  // Earlier sets use subsets of the heaviest plates (additive loading)
  const percentages = [
    { pct: 0.45, reps: 5, label: '45%' },
    { pct: 0.65, reps: 3, label: '65%' },
  ]

  for (const { pct, reps, label } of percentages) {
    const targetWeight = Math.round(workWeight * pct)
    if (targetWeight <= barWeight) continue

    const targetPerSide = (targetWeight - barWeight) / 2
    const subset = findBestSubset(maxPlates, targetPerSide)

    if (subset.length === 0) continue

    const actualPerSide = subset.reduce((sum, p) => sum + p, 0)
    const actualWeight = barWeight + actualPerSide * 2

    sets.push({
      weight: actualWeight,
      reps,
      plates: subset,
      completed: false,
      label,
    })
  }

  // Add the heaviest set (85%)
  const heaviestPerSide = maxPlates.reduce((sum, p) => sum + p, 0)
  const heaviestWeight = barWeight + heaviestPerSide * 2

  sets.push({
    weight: heaviestWeight,
    reps: 2,
    plates: maxPlates,
    completed: false,
    label: '85%',
  })

  return sets
}
