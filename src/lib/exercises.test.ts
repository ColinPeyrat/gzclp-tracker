import { describe, it, expect } from 'vitest'
import { getExerciseName, TIER_COLORS, getStageFromConfig } from './exercises'
import type { ExerciseLog } from './types'

function makeExercise(overrides: Partial<ExerciseLog>): ExerciseLog {
  return {
    liftId: 'squat',
    tier: 'T1',
    weightLbs: 100,
    targetSets: 5,
    targetReps: 3,
    sets: [],
    ...overrides,
  }
}

describe('getExerciseName', () => {
  it('returns T1/T2 lift names', () => {
    expect(getExerciseName('squat', 'T1')).toBe('Squat')
    expect(getExerciseName('bench', 'T1')).toBe('Bench Press')
    expect(getExerciseName('deadlift', 'T2')).toBe('Deadlift')
    expect(getExerciseName('ohp', 'T2')).toBe('Overhead Press')
  })

  it('returns T3 exercise names', () => {
    expect(getExerciseName('lat-pulldown', 'T3')).toBe('Lat Pulldown')
    expect(getExerciseName('dumbbell-row', 'T3')).toBe('Dumbbell Row')
  })

  it('falls back to liftId for unknown lifts', () => {
    expect(getExerciseName('unknown-lift', 'T1')).toBe('unknown-lift')
    expect(getExerciseName('custom-exercise', 'T3')).toBe('custom-exercise')
  })
})

describe('TIER_COLORS', () => {
  it('has correct color classes', () => {
    expect(TIER_COLORS.T1).toBe('text-blue-400')
    expect(TIER_COLORS.T2).toBe('text-green-400')
    expect(TIER_COLORS.T3).toBe('text-yellow-400')
  })
})

describe('getStageFromConfig', () => {
  describe('T1 stages', () => {
    it('returns stage 1 for 5×3', () => {
      expect(getStageFromConfig(makeExercise({ tier: 'T1', targetSets: 5, targetReps: 3 }))).toBe(1)
    })

    it('returns stage 2 for 6×2', () => {
      expect(getStageFromConfig(makeExercise({ tier: 'T1', targetSets: 6, targetReps: 2 }))).toBe(2)
    })

    it('returns stage 3 for 10×1', () => {
      expect(getStageFromConfig(makeExercise({ tier: 'T1', targetSets: 10, targetReps: 1 }))).toBe(3)
    })
  })

  describe('T2 stages', () => {
    it('returns stage 1 for 3×10', () => {
      expect(getStageFromConfig(makeExercise({ tier: 'T2', targetSets: 3, targetReps: 10 }))).toBe(1)
    })

    it('returns stage 2 for 3×8', () => {
      expect(getStageFromConfig(makeExercise({ tier: 'T2', targetSets: 3, targetReps: 8 }))).toBe(2)
    })

    it('returns stage 3 for 3×6', () => {
      expect(getStageFromConfig(makeExercise({ tier: 'T2', targetSets: 3, targetReps: 6 }))).toBe(3)
    })
  })

  describe('T3 and fallback', () => {
    it('returns stage 1 for T3', () => {
      expect(getStageFromConfig(makeExercise({ tier: 'T3', targetSets: 3, targetReps: 15 }))).toBe(1)
    })

    it('defaults to stage 1 for unknown config', () => {
      expect(getStageFromConfig(makeExercise({ tier: 'T1', targetSets: 4, targetReps: 4 }))).toBe(1)
    })
  })
})
