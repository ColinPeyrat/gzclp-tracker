import type { WeightUnit } from './types'

export const UNIT_CONFIG = {
  lbs: {
    label: 'lbs',
    barWeight: 45,
    plates: [45, 35, 25, 10, 5, 2.5],
    incrementT1Upper: 5,
    incrementT1Lower: 10,
    incrementT2Upper: 2.5,
    incrementT2Lower: 5,
    incrementT3: 5,
  },
  kg: {
    label: 'kg',
    barWeight: 20,
    plates: [20, 15, 10, 5, 2.5, 1.25, 0.5],
    incrementT1Upper: 2.5,
    incrementT1Lower: 5,
    incrementT2Upper: 1.25,
    incrementT2Lower: 2.5,
    incrementT3: 2.5,
  },
} as const

export function formatWeight(weight: number, unit: WeightUnit): string {
  return `${weight} ${unit}`
}

export function getIncrement(tier: 'T1' | 'T2', isLower: boolean, unit: WeightUnit): number {
  const config = UNIT_CONFIG[unit]
  if (tier === 'T1') {
    return isLower ? config.incrementT1Lower : config.incrementT1Upper
  }
  return isLower ? config.incrementT2Lower : config.incrementT2Upper
}

export function getDefaultPlateInventory(unit: WeightUnit): Record<string, number> {
  const config = UNIT_CONFIG[unit]
  const inventory: Record<string, number> = {}
  for (const plate of config.plates) {
    inventory[plate.toString()] = 2
  }
  return inventory
}

export function getDefaultSettings(unit: WeightUnit) {
  const config = UNIT_CONFIG[unit]
  return {
    barWeightLbs: config.barWeight,
    plateInventory: getDefaultPlateInventory(unit),
  }
}

export function getDefaultStartingWeights(unit: WeightUnit) {
  if (unit === 'kg') {
    return {
      squat: 60,
      bench: 40,
      deadlift: 60,
      ohp: 30,
      latPulldown: 25,
      dbRow: 12.5,
    }
  }
  return {
    squat: 135,
    bench: 95,
    deadlift: 135,
    ohp: 65,
    latPulldown: 50,
    dbRow: 25,
  }
}
