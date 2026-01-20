import { describe, it, expect } from 'vitest'
import { calculatePlates, formatPlates, getSmallestPlate } from './plates'

describe('calculatePlates', () => {
  const standardKgInventory: Record<string, number> = {
    '20': 2,
    '15': 2,
    '10': 2,
    '5': 2,
    '2.5': 2,
    '1.25': 2,
  }

  const standardLbsInventory: Record<string, number> = {
    '45': 2,
    '35': 2,
    '25': 2,
    '10': 4,
    '5': 2,
    '2.5': 2,
  }

  describe('achievable weights', () => {
    it('calculates plates for exact weight (kg)', () => {
      const result = calculatePlates(60, 20, standardKgInventory)
      expect(result.achievable).toBe(true)
      expect(result.totalWeight).toBe(60)
      expect(result.perSide).toEqual([20])
    })

    it('calculates plates for complex weight (kg)', () => {
      const result = calculatePlates(77.5, 20, standardKgInventory)
      expect(result.achievable).toBe(true)
      expect(result.totalWeight).toBe(77.5)
      expect(result.perSide).toEqual([20, 5, 2.5, 1.25])
    })

    it('calculates plates for exact weight (lbs)', () => {
      const result = calculatePlates(135, 45, standardLbsInventory)
      expect(result.achievable).toBe(true)
      expect(result.totalWeight).toBe(135)
      expect(result.perSide).toEqual([45])
    })

    it('calculates plates for complex weight (lbs)', () => {
      const result = calculatePlates(185, 45, standardLbsInventory)
      expect(result.achievable).toBe(true)
      expect(result.totalWeight).toBe(185)
      expect(result.perSide).toEqual([45, 25])
    })

    it('returns empty bar when target equals bar weight', () => {
      const result = calculatePlates(20, 20, standardKgInventory)
      expect(result.achievable).toBe(true)
      expect(result.totalWeight).toBe(20)
      expect(result.perSide).toEqual([])
    })
  })

  describe('unachievable weights', () => {
    it('suggests higher weight when target is not achievable', () => {
      // Can't make 24kg with standard plates (need 2kg per side)
      const result = calculatePlates(24, 20, standardKgInventory)
      expect(result.achievable).toBe(false)
      expect(result.suggestedWeight).toBe(25) // 20 + 2.5*2
    })

    it('handles weight below bar weight', () => {
      const result = calculatePlates(15, 20, standardKgInventory)
      expect(result.achievable).toBe(false)
      expect(result.totalWeight).toBe(20)
    })

    it('suggests weight based on smallest available plate', () => {
      const inventoryWithSmallPlates = {
        '20': 2,
        '10': 2,
        '0.5': 2,
      }
      // 21kg IS achievable: 20 bar + 0.5*2 = 21kg
      const result = calculatePlates(21, 20, inventoryWithSmallPlates)
      expect(result.achievable).toBe(true)
      expect(result.totalWeight).toBe(21)
      expect(result.perSide).toEqual([0.5])
    })
  })

  describe('inventory constraints', () => {
    it('respects plate quantity limits', () => {
      const limitedInventory = {
        '20': 2, // only 1 pair (1 per side)
        '10': 2, // only 1 pair (1 per side)
      }
      // Can't make 100kg with only one pair of 20s and one pair of 10s
      // Best: 20 + 10 per side = 30 per side = 60 plates + 20 bar = 80kg
      const result = calculatePlates(100, 20, limitedInventory)
      expect(result.achievable).toBe(false)
      expect(result.perSide).toEqual([20, 10])
      expect(result.totalWeight).toBe(80)
    })

    it('uses multiple of same plate when available', () => {
      const multiPairInventory = {
        '20': 4, // 2 pairs
        '10': 2,
      }
      const result = calculatePlates(100, 20, multiPairInventory)
      expect(result.achievable).toBe(true)
      expect(result.perSide).toEqual([20, 20])
      expect(result.totalWeight).toBe(100)
    })

    it('handles empty inventory', () => {
      const result = calculatePlates(60, 20, {})
      expect(result.achievable).toBe(false)
      expect(result.perSide).toEqual([])
      expect(result.totalWeight).toBe(20)
    })

    it('handles inventory with zero quantities', () => {
      const emptyInventory = {
        '20': 0,
        '10': 0,
      }
      const result = calculatePlates(60, 20, emptyInventory)
      expect(result.achievable).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('handles very small weights', () => {
      const result = calculatePlates(22.5, 20, standardKgInventory)
      expect(result.achievable).toBe(true)
      expect(result.perSide).toEqual([1.25])
      expect(result.totalWeight).toBe(22.5)
    })

    it('handles floating point precision', () => {
      const inventory = {
        '1.25': 2,
        '0.5': 2,
      }
      const result = calculatePlates(23.5, 20, inventory)
      expect(result.achievable).toBe(true)
      expect(result.perSide).toEqual([1.25, 0.5])
      expect(result.totalWeight).toBe(23.5)
    })
  })
})

describe('formatPlates', () => {
  it('returns "Empty bar" for no plates', () => {
    expect(formatPlates([])).toBe('Empty bar')
  })

  it('formats single plate', () => {
    expect(formatPlates([20])).toBe('20')
  })

  it('formats multiple different plates', () => {
    expect(formatPlates([20, 10, 5])).toBe('20 + 10 + 5')
  })

  it('groups multiple of same plate', () => {
    expect(formatPlates([20, 20, 10])).toBe('2×20 + 10')
  })

  it('formats complex plate setup', () => {
    expect(formatPlates([20, 20, 10, 10, 5, 2.5])).toBe('2×20 + 2×10 + 5 + 2.5')
  })
})

describe('getSmallestPlate', () => {
  it('returns the smallest plate from inventory', () => {
    const inventory = { '45': 2, '25': 2, '10': 2, '5': 2, '2.5': 2 }
    expect(getSmallestPlate(inventory)).toBe(2.5)
  })

  it('returns smallest plate when inventory has micro plates', () => {
    const inventory = { '20': 2, '10': 2, '5': 2, '2.5': 2, '1.25': 2, '0.5': 2 }
    expect(getSmallestPlate(inventory)).toBe(0.5)
  })

  it('ignores plates with zero quantity', () => {
    const inventory = { '45': 2, '25': 2, '10': 2, '5': 0, '2.5': 0 }
    expect(getSmallestPlate(inventory)).toBe(10)
  })

  it('returns 2.5 as default when inventory is empty', () => {
    const inventory = {}
    expect(getSmallestPlate(inventory)).toBe(2.5)
  })

  it('returns 2.5 when all plates have zero quantity', () => {
    const inventory = { '45': 0, '25': 0, '10': 0 }
    expect(getSmallestPlate(inventory)).toBe(2.5)
  })

  it('handles single plate inventory', () => {
    const inventory = { '5': 4 }
    expect(getSmallestPlate(inventory)).toBe(5)
  })
})
