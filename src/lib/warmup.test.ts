import { describe, it, expect } from 'vitest'
import { calculateWarmupSets } from './warmup'

const KG_INVENTORY: Record<string, number> = { '20': 2, '10': 2, '5': 2, '2.5': 4, '1.25': 4, '0.5': 4 }

describe('calculateWarmupSets', () => {
  it('starts barbell warmups at the empty bar with big plates only', () => {
    const sets = calculateWarmupSets(100, 20, KG_INVENTORY, 'kg')
    expect(sets[0]).toMatchObject({ weight: 20, label: 'Bar' })
    expect(sets.flatMap((s) => s.plates).every((p) => p >= 5)).toBe(true)
  })

  it('starts dumbbell warmups at the empty handle and uses small plates', () => {
    const sets = calculateWarmupSets(12, 2.5, KG_INVENTORY, 'kg', true)
    expect(sets[0]).toMatchObject({ weight: 2.5, label: 'Handle' })
    expect(sets.length).toBeGreaterThan(2)
    expect(sets.every((s) => s.weight < 12)).toBe(true)
  })
})
