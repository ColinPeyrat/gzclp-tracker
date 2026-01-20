import { describe, it, expect } from 'vitest'
import { getExerciseName, getCustomExercise, isDumbbellExercise, TIER_COLORS, getStageFromConfig } from './exercises'
import type { ExerciseLog, CustomExercise } from './types'

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

describe('getCustomExercise', () => {
  const customExercises: CustomExercise[] = [
    { id: 'pullups', name: 'Pullups', replacesId: 'lat-pulldown' },
    { id: 'landmine-press', name: 'Landmine Press', replacesId: 'ohp', forceT3Progression: true },
  ]

  it('returns custom exercise when found', () => {
    const result = getCustomExercise('lat-pulldown', customExercises)
    expect(result).toEqual({ id: 'pullups', name: 'Pullups', replacesId: 'lat-pulldown' })
  })

  it('returns undefined when not found', () => {
    expect(getCustomExercise('squat', customExercises)).toBeUndefined()
  })

  it('returns undefined when customExercises is undefined', () => {
    expect(getCustomExercise('lat-pulldown', undefined)).toBeUndefined()
  })

  it('returns undefined when customExercises is empty', () => {
    expect(getCustomExercise('lat-pulldown', [])).toBeUndefined()
  })
})

describe('getExerciseName with custom exercises', () => {
  const customExercises: CustomExercise[] = [
    { id: 'pullups', name: 'Pullups', replacesId: 'lat-pulldown' },
    { id: 'landmine-press', name: 'Landmine Press', replacesId: 'ohp' },
  ]

  it('returns custom name when exercise is replaced', () => {
    expect(getExerciseName('lat-pulldown', 'T3', customExercises)).toBe('Pullups')
    expect(getExerciseName('ohp', 'T1', customExercises)).toBe('Landmine Press')
  })

  it('returns original name when no custom exercise', () => {
    expect(getExerciseName('squat', 'T1', customExercises)).toBe('Squat')
    expect(getExerciseName('dumbbell-row', 'T3', customExercises)).toBe('Dumbbell Row')
  })

  it('returns original name when customExercises is undefined', () => {
    expect(getExerciseName('lat-pulldown', 'T3', undefined)).toBe('Lat Pulldown')
  })
})

describe('isDumbbellExercise', () => {
  it('returns true for built-in dumbbell-row', () => {
    expect(isDumbbellExercise('dumbbell-row')).toBe(true)
    expect(isDumbbellExercise('dumbbell-row', [])).toBe(true)
    expect(isDumbbellExercise('dumbbell-row', undefined)).toBe(true)
  })

  it('returns false for non-dumbbell exercises', () => {
    expect(isDumbbellExercise('squat')).toBe(false)
    expect(isDumbbellExercise('bench')).toBe(false)
    expect(isDumbbellExercise('lat-pulldown')).toBe(false)
  })

  it('returns true for custom exercise with isDumbbell flag', () => {
    const customExercises: CustomExercise[] = [
      { id: 'db-press', name: 'Dumbbell Press', replacesId: 'bench', isDumbbell: true },
    ]
    expect(isDumbbellExercise('bench', customExercises)).toBe(true)
  })

  it('returns false for custom exercise without isDumbbell flag', () => {
    const customExercises: CustomExercise[] = [
      { id: 'pullups', name: 'Pullups', replacesId: 'lat-pulldown' },
    ]
    expect(isDumbbellExercise('lat-pulldown', customExercises)).toBe(false)
  })

  it('custom exercise overrides built-in dumbbell status', () => {
    const customExercises: CustomExercise[] = [
      { id: 'cable-row', name: 'Cable Row', replacesId: 'dumbbell-row', isDumbbell: false },
    ]
    expect(isDumbbellExercise('dumbbell-row', customExercises)).toBe(false)
  })
})
