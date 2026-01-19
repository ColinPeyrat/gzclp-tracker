import type { WeightUnit } from './types'

export const UNIT_CONFIG = {
  lbs: {
    label: 'lbs',
    barWeight: 45,
    plates: [45, 35, 25, 10, 5, 2.5],
    incrementUpper: 5,
    incrementLower: 10,
    incrementT3: 5,
  },
  kg: {
    label: 'kg',
    barWeight: 20,
    plates: [20, 15, 10, 5, 2.5, 1.25],
    incrementUpper: 2.5,
    incrementLower: 5,
    incrementT3: 2.5,
  },
} as const

export function formatWeight(weight: number, unit: WeightUnit): string {
  return `${weight} ${unit}`
}

export function getIncrement(isLower: boolean, unit: WeightUnit): number {
  const config = UNIT_CONFIG[unit]
  return isLower ? config.incrementLower : config.incrementUpper
}

export function getDefaultSettings(unit: WeightUnit) {
  const config = UNIT_CONFIG[unit]
  return {
    barWeightLbs: config.barWeight, // rename to barWeight later
    availablePlates: [...config.plates],
  }
}

export function getDefaultStartingWeights(unit: WeightUnit) {
  if (unit === 'kg') {
    return {
      squat: 60,
      bench: 40,
      deadlift: 60,
      ohp: 30,
    }
  }
  return {
    squat: 135,
    bench: 95,
    deadlift: 135,
    ohp: 65,
  }
}
