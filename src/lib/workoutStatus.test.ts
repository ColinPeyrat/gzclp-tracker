import { describe, it, expect } from 'vitest'
import { getLiftStatus, getT3Labels } from './workoutStatus'
import type { ExerciseLog, SetLog } from './types'

function makeSet(overrides: Partial<SetLog> = {}): SetLog {
  return {
    setNumber: 1,
    reps: 3,
    completed: true,
    isAmrap: false,
    ...overrides,
  }
}

function makeExercise(overrides: Partial<ExerciseLog> = {}): ExerciseLog {
  return {
    liftId: 'squat',
    tier: 'T1',
    weightLbs: 100,
    targetSets: 5,
    targetReps: 3,
    sets: [
      makeSet({ setNumber: 1, reps: 3 }),
      makeSet({ setNumber: 2, reps: 3 }),
      makeSet({ setNumber: 3, reps: 3 }),
      makeSet({ setNumber: 4, reps: 3 }),
      makeSet({ setNumber: 5, reps: 5, isAmrap: true }),
    ],
    ...overrides,
  }
}

describe('getLiftStatus', () => {
  describe('T1 exercises', () => {
    it('returns success when rep target is met', () => {
      const exercise = makeExercise({
        tier: 'T1',
        targetSets: 5,
        targetReps: 3,
        sets: [
          makeSet({ reps: 3 }),
          makeSet({ reps: 3 }),
          makeSet({ reps: 3 }),
          makeSet({ reps: 3 }),
          makeSet({ reps: 5, isAmrap: true }),
        ],
      })
      expect(getLiftStatus(exercise)).toBe('success')
    })

    it('returns fail when rep target is not met', () => {
      const exercise = makeExercise({
        tier: 'T1',
        targetSets: 5,
        targetReps: 3,
        sets: [
          makeSet({ reps: 3 }),
          makeSet({ reps: 3 }),
          makeSet({ reps: 2 }),
          makeSet({ reps: 2 }),
          makeSet({ reps: 2, isAmrap: true }),
        ],
      })
      expect(getLiftStatus(exercise)).toBe('fail')
    })

    it('returns success when AMRAP makes up for missed reps', () => {
      const exercise = makeExercise({
        tier: 'T1',
        targetSets: 5,
        targetReps: 3,
        sets: [
          makeSet({ reps: 3 }),
          makeSet({ reps: 3 }),
          makeSet({ reps: 2 }),
          makeSet({ reps: 2 }),
          makeSet({ reps: 6, isAmrap: true }), // 16 total >= 15 target
        ],
      })
      expect(getLiftStatus(exercise)).toBe('success')
    })
  })

  describe('T2 exercises', () => {
    it('returns success when rep target is met', () => {
      const exercise = makeExercise({
        tier: 'T2',
        targetSets: 3,
        targetReps: 10,
        sets: [
          makeSet({ reps: 10 }),
          makeSet({ reps: 10 }),
          makeSet({ reps: 10 }),
        ],
      })
      expect(getLiftStatus(exercise)).toBe('success')
    })

    it('returns fail when rep target is not met', () => {
      const exercise = makeExercise({
        tier: 'T2',
        targetSets: 3,
        targetReps: 10,
        sets: [
          makeSet({ reps: 10 }),
          makeSet({ reps: 8 }),
          makeSet({ reps: 7 }),
        ],
      })
      expect(getLiftStatus(exercise)).toBe('fail')
    })
  })

  describe('T3 exercises', () => {
    it('returns success when AMRAP is 25 or more', () => {
      const exercise = makeExercise({
        tier: 'T3',
        liftId: 'lat-pulldown',
        targetSets: 3,
        targetReps: 15,
        sets: [
          makeSet({ reps: 15 }),
          makeSet({ reps: 15 }),
          makeSet({ reps: 25, isAmrap: true }),
        ],
      })
      expect(getLiftStatus(exercise)).toBe('success')
    })

    it('returns success when AMRAP exceeds 25', () => {
      const exercise = makeExercise({
        tier: 'T3',
        liftId: 'lat-pulldown',
        targetSets: 3,
        targetReps: 15,
        sets: [
          makeSet({ reps: 15 }),
          makeSet({ reps: 15 }),
          makeSet({ reps: 30, isAmrap: true }),
        ],
      })
      expect(getLiftStatus(exercise)).toBe('success')
    })

    it('returns neutral when AMRAP is less than 25', () => {
      const exercise = makeExercise({
        tier: 'T3',
        liftId: 'lat-pulldown',
        targetSets: 3,
        targetReps: 15,
        sets: [
          makeSet({ reps: 15 }),
          makeSet({ reps: 15 }),
          makeSet({ reps: 20, isAmrap: true }),
        ],
      })
      expect(getLiftStatus(exercise)).toBe('neutral')
    })

    it('returns neutral when AMRAP is exactly 24', () => {
      const exercise = makeExercise({
        tier: 'T3',
        liftId: 'lat-pulldown',
        targetSets: 3,
        targetReps: 15,
        sets: [
          makeSet({ reps: 15 }),
          makeSet({ reps: 15 }),
          makeSet({ reps: 24, isAmrap: true }),
        ],
      })
      expect(getLiftStatus(exercise)).toBe('neutral')
    })

    it('returns neutral when no AMRAP set exists', () => {
      const exercise = makeExercise({
        tier: 'T3',
        liftId: 'lat-pulldown',
        targetSets: 3,
        targetReps: 15,
        sets: [
          makeSet({ reps: 15, isAmrap: false }),
          makeSet({ reps: 15, isAmrap: false }),
          makeSet({ reps: 15, isAmrap: false }),
        ],
      })
      expect(getLiftStatus(exercise)).toBe('neutral')
    })

    it('returns neutral when AMRAP reps is 0', () => {
      const exercise = makeExercise({
        tier: 'T3',
        liftId: 'lat-pulldown',
        targetSets: 3,
        targetReps: 15,
        sets: [
          makeSet({ reps: 15 }),
          makeSet({ reps: 15 }),
          makeSet({ reps: 0, isAmrap: true }),
        ],
      })
      expect(getLiftStatus(exercise)).toBe('neutral')
    })
  })
})

describe('getT3Labels', () => {
  it('returns ["T3"] for 0 T3s', () => {
    expect(getT3Labels(0)).toEqual(['T3'])
  })

  it('returns ["T3"] for 1 T3', () => {
    expect(getT3Labels(1)).toEqual(['T3'])
  })

  it('returns ["T3.1", "T3.2"] for 2 T3s', () => {
    expect(getT3Labels(2)).toEqual(['T3.1', 'T3.2'])
  })

  it('returns ["T3.1", "T3.2", "T3.3"] for 3 T3s', () => {
    expect(getT3Labels(3)).toEqual(['T3.1', 'T3.2', 'T3.3'])
  })

  it('returns correct labels for 5 T3s', () => {
    expect(getT3Labels(5)).toEqual(['T3.1', 'T3.2', 'T3.3', 'T3.4', 'T3.5'])
  })
})
