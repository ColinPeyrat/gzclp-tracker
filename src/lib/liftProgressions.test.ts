import { describe, it, expect } from 'vitest'
import { buildLiftProgressions } from './liftProgressions'
import type { Workout } from './types'

function session(date: string, weight: number, reps = [3, 3, 3, 3, 5]): Workout {
  return {
    id: `s-${date}`,
    date: `${date}T18:00:00.000Z`,
    type: 'A1',
    completed: true,
    exercises: [
      {
        liftId: 'squat',
        tier: 'T1',
        weight,
        targetSets: 5,
        targetReps: 3,
        sets: reps.map((r, i) => ({ setNumber: i + 1, reps: r, completed: true, isAmrap: i === reps.length - 1 })),
      },
    ],
  }
}

function testDay(date: string, fiveRepMax: number | undefined): Workout {
  return {
    id: `td-${date}`,
    date: `${date}T18:00:00.000Z`,
    type: 'TD',
    completed: true,
    exercises: [
      {
        liftId: 'squat',
        tier: 'T1',
        weight: fiveRepMax ?? 100,
        targetSets: 1,
        targetReps: 5,
        sets: [{ setNumber: 1, reps: 5, completed: true, isAmrap: false }],
        fiveRepMax,
      },
    ],
  }
}

const NOW = new Date('2026-06-01T00:00:00Z')

describe('buildLiftProgressions', () => {
  it('keeps test days out of the working-weight series', () => {
    const { squat } = buildLiftProgressions([session('2026-03-01', 80), testDay('2026-03-10', 100), session('2026-03-12', 85)], {}, NOW)
    expect(squat.dataPoints.map((p) => p.weight)).toEqual([80, 85])
  })

  it('collects tested 5RMs in date order with last and previous', () => {
    const { squat } = buildLiftProgressions(
      [testDay('2026-05-01', 110), session('2026-03-01', 80), testDay('2026-02-01', 95)],
      {},
      NOW
    )
    expect(squat.tests.map((t) => t.weight)).toEqual([95, 110])
    expect(squat.lastTest?.weight).toBe(110)
    expect(squat.previousTest?.weight).toBe(95)
  })

  it('ignores abandoned tests without a 5RM', () => {
    const { squat } = buildLiftProgressions([testDay('2026-03-01', 100), testDay('2026-04-01', undefined)], {}, NOW)
    expect(squat.tests).toHaveLength(1)
    expect(squat.lastTest?.weight).toBe(100)
  })

  it('measures since-reset gain from the first session after the last test', () => {
    const { squat } = buildLiftProgressions(
      [
        session('2026-02-01', 70),
        testDay('2026-03-01', 100),
        session('2026-03-03', 85),
        session('2026-03-10', 90),
        session('2026-03-17', 95),
      ],
      {},
      NOW
    )
    expect(squat.sinceResetGain).toBe(10)
    expect(squat.currentWeight).toBe(95)
  })

  it('uses the program weight as working weight, with no gain before the first session after the test', () => {
    const { squat } = buildLiftProgressions([session('2026-02-01', 70), testDay('2026-03-01', 100)], { squat: 85 }, NOW)
    expect(squat.workingWeight).toBe(85)
    expect(squat.sinceResetGain).toBe(0)
  })

  it('ignores maintenance sessions when finding the reset weight', () => {
    const maintenance = { ...session('2026-03-05', 60, [5]), type: 'MN' as const }
    const { squat } = buildLiftProgressions(
      [testDay('2026-03-01', 100), maintenance, session('2026-03-08', 85), session('2026-03-15', 90)],
      { squat: 95 },
      NOW
    )
    expect(squat.sinceResetGain).toBe(10)
  })

  it('has no since-reset gain without a test', () => {
    const { squat } = buildLiftProgressions([session('2026-02-01', 70)], { squat: 75 }, NOW)
    expect(squat.sinceResetGain).toBeUndefined()
  })

  it('skips incomplete workouts', () => {
    const { squat } = buildLiftProgressions([{ ...testDay('2026-03-01', 100), completed: false }], {}, NOW)
    expect(squat.tests).toHaveLength(0)
  })
})
