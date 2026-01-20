import { describe, it, expect } from 'vitest'
import {
  UNIT_CONFIG,
  formatWeight,
  getIncrement,
  getDefaultPlateInventory,
  getDefaultSettings,
  getDefaultStartingWeights,
} from './units'

describe('UNIT_CONFIG', () => {
  it('has correct kg config', () => {
    expect(UNIT_CONFIG.kg.barWeight).toBe(20)
    expect(UNIT_CONFIG.kg.incrementT1Upper).toBe(2.5)
    expect(UNIT_CONFIG.kg.incrementT1Lower).toBe(5)
    expect(UNIT_CONFIG.kg.incrementT2Upper).toBe(1.25)
    expect(UNIT_CONFIG.kg.incrementT2Lower).toBe(2.5)
    expect(UNIT_CONFIG.kg.incrementT3).toBe(2.5)
  })

  it('has correct lbs config', () => {
    expect(UNIT_CONFIG.lbs.barWeight).toBe(45)
    expect(UNIT_CONFIG.lbs.incrementT1Upper).toBe(5)
    expect(UNIT_CONFIG.lbs.incrementT1Lower).toBe(10)
    expect(UNIT_CONFIG.lbs.incrementT2Upper).toBe(2.5)
    expect(UNIT_CONFIG.lbs.incrementT2Lower).toBe(5)
    expect(UNIT_CONFIG.lbs.incrementT3).toBe(5)
  })
})

describe('formatWeight', () => {
  it('formats kg weight', () => {
    expect(formatWeight(60, 'kg')).toBe('60 kg')
  })

  it('formats lbs weight', () => {
    expect(formatWeight(135, 'lbs')).toBe('135 lbs')
  })

  it('formats decimal weights', () => {
    expect(formatWeight(62.5, 'kg')).toBe('62.5 kg')
  })
})

describe('getIncrement', () => {
  describe('T1 increments', () => {
    it('returns correct T1 lower body increment in kg', () => {
      expect(getIncrement('T1', true, 'kg')).toBe(5)
    })

    it('returns correct T1 upper body increment in kg', () => {
      expect(getIncrement('T1', false, 'kg')).toBe(2.5)
    })

    it('returns correct T1 lower body increment in lbs', () => {
      expect(getIncrement('T1', true, 'lbs')).toBe(10)
    })

    it('returns correct T1 upper body increment in lbs', () => {
      expect(getIncrement('T1', false, 'lbs')).toBe(5)
    })
  })

  describe('T2 increments', () => {
    it('returns correct T2 lower body increment in kg', () => {
      expect(getIncrement('T2', true, 'kg')).toBe(2.5)
    })

    it('returns correct T2 upper body increment in kg', () => {
      expect(getIncrement('T2', false, 'kg')).toBe(1.25)
    })

    it('returns correct T2 lower body increment in lbs', () => {
      expect(getIncrement('T2', true, 'lbs')).toBe(5)
    })

    it('returns correct T2 upper body increment in lbs', () => {
      expect(getIncrement('T2', false, 'lbs')).toBe(2.5)
    })
  })
})

describe('getDefaultPlateInventory', () => {
  it('returns kg plate inventory with 2 of each', () => {
    const inventory = getDefaultPlateInventory('kg')
    expect(inventory['20']).toBe(2)
    expect(inventory['15']).toBe(2)
    expect(inventory['10']).toBe(2)
    expect(inventory['5']).toBe(2)
    expect(inventory['2.5']).toBe(2)
    expect(inventory['1.25']).toBe(2)
    expect(inventory['0.5']).toBe(2)
  })

  it('returns lbs plate inventory with 2 of each', () => {
    const inventory = getDefaultPlateInventory('lbs')
    expect(inventory['45']).toBe(2)
    expect(inventory['35']).toBe(2)
    expect(inventory['25']).toBe(2)
    expect(inventory['10']).toBe(2)
    expect(inventory['5']).toBe(2)
    expect(inventory['2.5']).toBe(2)
  })
})

describe('getDefaultSettings', () => {
  it('returns correct kg defaults', () => {
    const settings = getDefaultSettings('kg')
    expect(settings.barWeightLbs).toBe(20)
    expect(settings.plateInventory['20']).toBe(2)
  })

  it('returns correct lbs defaults', () => {
    const settings = getDefaultSettings('lbs')
    expect(settings.barWeightLbs).toBe(45)
    expect(settings.plateInventory['45']).toBe(2)
  })
})

describe('getDefaultStartingWeights', () => {
  it('returns correct kg starting weights', () => {
    const weights = getDefaultStartingWeights('kg')
    expect(weights.squat).toBe(60)
    expect(weights.bench).toBe(40)
    expect(weights.deadlift).toBe(60)
    expect(weights.ohp).toBe(30)
    expect(weights.latPulldown).toBe(25)
    expect(weights.dbRow).toBe(12.5)
  })

  it('returns correct lbs starting weights', () => {
    const weights = getDefaultStartingWeights('lbs')
    expect(weights.squat).toBe(135)
    expect(weights.bench).toBe(95)
    expect(weights.deadlift).toBe(135)
    expect(weights.ohp).toBe(65)
    expect(weights.latPulldown).toBe(50)
    expect(weights.dbRow).toBe(25)
  })
})
