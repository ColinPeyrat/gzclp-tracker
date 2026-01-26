import { describe, it, expect } from 'vitest'
import { getExerciseName, getLiftSubstitution, getExerciseFromLibrary, isDumbbellExercise, TIER_COLORS, getStageFromConfig } from './exercises'
import type { ExerciseLog, LiftSubstitution, ExerciseDefinition } from './types'

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

describe('getLiftSubstitution', () => {
  const liftSubstitutions: LiftSubstitution[] = [
    { originalLiftId: 'lat-pulldown', substituteId: 'pullups' },
    { originalLiftId: 'ohp', substituteId: 'landmine-press', forceT3Progression: true },
  ]

  it('returns substitution when found', () => {
    const result = getLiftSubstitution('lat-pulldown', liftSubstitutions)
    expect(result).toEqual({ originalLiftId: 'lat-pulldown', substituteId: 'pullups' })
  })

  it('returns undefined when not found', () => {
    expect(getLiftSubstitution('squat', liftSubstitutions)).toBeUndefined()
  })

  it('returns undefined when liftSubstitutions is undefined', () => {
    expect(getLiftSubstitution('lat-pulldown', undefined)).toBeUndefined()
  })

  it('returns undefined when liftSubstitutions is empty', () => {
    expect(getLiftSubstitution('lat-pulldown', [])).toBeUndefined()
  })

  it('returns substitution with forceT3Progression', () => {
    const result = getLiftSubstitution('ohp', liftSubstitutions)
    expect(result?.forceT3Progression).toBe(true)
  })
})

describe('getExerciseFromLibrary', () => {
  const exerciseLibrary: ExerciseDefinition[] = [
    { id: 'pullups', name: 'Pullups' },
    { id: 'face-pulls', name: 'Face Pulls', isDumbbell: true },
  ]

  it('returns exercise when found', () => {
    const result = getExerciseFromLibrary('pullups', exerciseLibrary)
    expect(result).toEqual({ id: 'pullups', name: 'Pullups' })
  })

  it('returns undefined when not found', () => {
    expect(getExerciseFromLibrary('unknown', exerciseLibrary)).toBeUndefined()
  })

  it('returns undefined when exerciseLibrary is undefined', () => {
    expect(getExerciseFromLibrary('pullups', undefined)).toBeUndefined()
  })

  it('returns exercise with isDumbbell flag', () => {
    const result = getExerciseFromLibrary('face-pulls', exerciseLibrary)
    expect(result?.isDumbbell).toBe(true)
  })
})

describe('getExerciseName with substitutions', () => {
  const exerciseLibrary: ExerciseDefinition[] = [
    { id: 'pullups', name: 'Pullups' },
    { id: 'landmine-press', name: 'Landmine Press' },
  ]

  const liftSubstitutions: LiftSubstitution[] = [
    { originalLiftId: 'lat-pulldown', substituteId: 'pullups' },
    { originalLiftId: 'ohp', substituteId: 'landmine-press' },
  ]

  it('returns substitute name when exercise is replaced', () => {
    expect(getExerciseName('lat-pulldown', 'T3', liftSubstitutions, exerciseLibrary)).toBe('Pullups')
    expect(getExerciseName('ohp', 'T1', liftSubstitutions, exerciseLibrary)).toBe('Landmine Press')
  })

  it('returns original name when no substitution', () => {
    expect(getExerciseName('squat', 'T1', liftSubstitutions, exerciseLibrary)).toBe('Squat')
    expect(getExerciseName('dumbbell-row', 'T3', liftSubstitutions, exerciseLibrary)).toBe('Dumbbell Row')
  })

  it('returns original name when liftSubstitutions is undefined', () => {
    expect(getExerciseName('lat-pulldown', 'T3', undefined)).toBe('Lat Pulldown')
  })

  it('falls back to substituteId when exercise not in library', () => {
    const subsOnly: LiftSubstitution[] = [
      { originalLiftId: 'squat', substituteId: 'goblet-squat' },
    ]
    expect(getExerciseName('squat', 'T1', subsOnly, [])).toBe('goblet-squat')
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

  it('returns true for exercise in library with isDumbbell flag', () => {
    const exerciseLibrary: ExerciseDefinition[] = [
      { id: 'bicep-curls', name: 'Bicep Curls', isDumbbell: true },
    ]
    expect(isDumbbellExercise('bicep-curls', undefined, exerciseLibrary)).toBe(true)
  })

  it('returns false for exercise in library without isDumbbell flag', () => {
    const exerciseLibrary: ExerciseDefinition[] = [
      { id: 'face-pulls', name: 'Face Pulls' },
    ]
    expect(isDumbbellExercise('face-pulls', undefined, exerciseLibrary)).toBe(false)
  })
})

describe('isDumbbellExercise with substitutions', () => {
  const exerciseLibrary: ExerciseDefinition[] = [
    { id: 'db-press', name: 'Dumbbell Press', isDumbbell: true },
    { id: 'cable-row', name: 'Cable Row', isDumbbell: false },
    { id: 'pullups', name: 'Pullups' },
  ]

  it('returns true when substitute exercise is a dumbbell exercise', () => {
    const liftSubstitutions: LiftSubstitution[] = [
      { originalLiftId: 'bench', substituteId: 'db-press' },
    ]
    expect(isDumbbellExercise('bench', liftSubstitutions, exerciseLibrary)).toBe(true)
  })

  it('returns false when substitute exercise is not a dumbbell exercise', () => {
    const liftSubstitutions: LiftSubstitution[] = [
      { originalLiftId: 'dumbbell-row', substituteId: 'cable-row' },
    ]
    expect(isDumbbellExercise('dumbbell-row', liftSubstitutions, exerciseLibrary)).toBe(false)
  })

  it('returns false when substitute exercise has no isDumbbell flag', () => {
    const liftSubstitutions: LiftSubstitution[] = [
      { originalLiftId: 'lat-pulldown', substituteId: 'pullups' },
    ]
    expect(isDumbbellExercise('lat-pulldown', liftSubstitutions, exerciseLibrary)).toBe(false)
  })

  it('built-in dumbbell exercises still work without substitution', () => {
    const liftSubstitutions: LiftSubstitution[] = []
    expect(isDumbbellExercise('dumbbell-row', liftSubstitutions, exerciseLibrary)).toBe(true)
  })
})

describe('getExerciseName with exerciseLibrary for T3s', () => {
  const exerciseLibrary: ExerciseDefinition[] = [
    { id: 'face-pulls', name: 'Face Pulls' },
    { id: 'bicep-curls', name: 'Bicep Curls', isDumbbell: true },
  ]

  it('returns T3 name from library', () => {
    expect(getExerciseName('face-pulls', 'T3', undefined, exerciseLibrary)).toBe('Face Pulls')
    expect(getExerciseName('bicep-curls', 'T3', undefined, exerciseLibrary)).toBe('Bicep Curls')
  })

  it('returns built-in T3 name when not in library', () => {
    expect(getExerciseName('lat-pulldown', 'T3', undefined, exerciseLibrary)).toBe('Lat Pulldown')
  })

  it('falls back to liftId for unknown T3', () => {
    expect(getExerciseName('unknown-t3', 'T3', undefined, exerciseLibrary)).toBe('unknown-t3')
  })

  it('substitution takes precedence over library', () => {
    const liftSubstitutions: LiftSubstitution[] = [
      { originalLiftId: 'face-pulls', substituteId: 'bicep-curls' },
    ]
    expect(getExerciseName('face-pulls', 'T3', liftSubstitutions, exerciseLibrary)).toBe('Bicep Curls')
  })

  it('handles undefined exerciseLibrary', () => {
    expect(getExerciseName('lat-pulldown', 'T3', undefined, undefined)).toBe('Lat Pulldown')
  })

  it('handles empty exerciseLibrary', () => {
    expect(getExerciseName('lat-pulldown', 'T3', undefined, [])).toBe('Lat Pulldown')
  })
})

describe('isDumbbellExercise with exerciseLibrary', () => {
  const exerciseLibrary: ExerciseDefinition[] = [
    { id: 'face-pulls', name: 'Face Pulls' },
    { id: 'bicep-curls', name: 'Bicep Curls', isDumbbell: true },
    { id: 'tricep-pushdown', name: 'Tricep Pushdown', isDumbbell: false },
  ]

  it('returns true for exercise with isDumbbell flag', () => {
    expect(isDumbbellExercise('bicep-curls', undefined, exerciseLibrary)).toBe(true)
  })

  it('returns false for exercise without isDumbbell flag', () => {
    expect(isDumbbellExercise('face-pulls', undefined, exerciseLibrary)).toBe(false)
    expect(isDumbbellExercise('tricep-pushdown', undefined, exerciseLibrary)).toBe(false)
  })

  it('returns false for unknown exercise not in library', () => {
    expect(isDumbbellExercise('unknown-exercise', undefined, exerciseLibrary)).toBe(false)
  })

  it('substitution takes precedence over library', () => {
    const liftSubstitutions: LiftSubstitution[] = [
      { originalLiftId: 'bicep-curls', substituteId: 'face-pulls' },
    ]
    // bicep-curls in library is dumbbell, but substituted with face-pulls which is not
    expect(isDumbbellExercise('bicep-curls', liftSubstitutions, exerciseLibrary)).toBe(false)
  })

  it('substitution can mark non-dumbbell as dumbbell', () => {
    const liftSubstitutions: LiftSubstitution[] = [
      { originalLiftId: 'face-pulls', substituteId: 'bicep-curls' },
    ]
    // face-pulls in library is not dumbbell, but substituted with bicep-curls which is
    expect(isDumbbellExercise('face-pulls', liftSubstitutions, exerciseLibrary)).toBe(true)
  })

  it('built-in dumbbell exercises still work with exerciseLibrary', () => {
    expect(isDumbbellExercise('dumbbell-row', undefined, exerciseLibrary)).toBe(true)
  })

  it('handles undefined exerciseLibrary', () => {
    expect(isDumbbellExercise('bicep-curls', undefined, undefined)).toBe(false)
    expect(isDumbbellExercise('dumbbell-row', undefined, undefined)).toBe(true)
  })

  it('handles empty exerciseLibrary', () => {
    expect(isDumbbellExercise('bicep-curls', undefined, [])).toBe(false)
    expect(isDumbbellExercise('dumbbell-row', undefined, [])).toBe(true)
  })
})
