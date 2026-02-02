import { describe, it, expect } from 'vitest'
import {
  getStageConfig,
  getTotalReps,
  getTargetTotalReps,
  didHitRepTarget,
  getAmrapReps,
  isTrialWeight,
  calculateT1Progression,
  calculateT2Progression,
  calculateT3Progression,
  shouldIncreaseT3Weight,
  createInitialLiftState,
  estimate5RM,
  applyT1Reset,
} from './progression'
import type { ExerciseLog, LiftState, SetLog } from './types'

function makeSet(reps: number, completed = true, isAmrap = false): SetLog {
  return { setNumber: 1, reps, completed, isAmrap }
}

function makeExercise(
  overrides: Partial<ExerciseLog> & { sets: SetLog[] }
): ExerciseLog {
  return {
    liftId: 'squat',
    tier: 'T1',
    weight: 100,
    targetSets: 5,
    targetReps: 3,
    ...overrides,
  }
}

function makeLiftState(overrides: Partial<LiftState> = {}): LiftState {
  return {
    liftId: 'squat',
    tier: 'T1',
    weight: 100,
    stage: 1,
    ...overrides,
  }
}

describe('getStageConfig', () => {
  it('returns T1 stage configs', () => {
    expect(getStageConfig('T1', 1)).toEqual({ sets: 5, reps: 3 })
    expect(getStageConfig('T1', 2)).toEqual({ sets: 6, reps: 2 })
    expect(getStageConfig('T1', 3)).toEqual({ sets: 10, reps: 1 })
  })

  it('returns T2 stage configs', () => {
    expect(getStageConfig('T2', 1)).toEqual({ sets: 3, reps: 10 })
    expect(getStageConfig('T2', 2)).toEqual({ sets: 3, reps: 8 })
    expect(getStageConfig('T2', 3)).toEqual({ sets: 3, reps: 6 })
  })

  it('returns T3 config for any stage', () => {
    expect(getStageConfig('T3', 1)).toEqual({ sets: 3, reps: 15 })
    expect(getStageConfig('T3', 2)).toEqual({ sets: 3, reps: 15 })
    expect(getStageConfig('T3', 3)).toEqual({ sets: 3, reps: 15 })
  })
})

describe('getTotalReps', () => {
  it('sums all reps from sets', () => {
    const exercise = makeExercise({
      sets: [makeSet(3), makeSet(3), makeSet(3), makeSet(3), makeSet(5)],
    })
    expect(getTotalReps(exercise)).toBe(17)
  })

  it('returns 0 for empty sets', () => {
    const exercise = makeExercise({ sets: [] })
    expect(getTotalReps(exercise)).toBe(0)
  })
})

describe('getTargetTotalReps', () => {
  it('multiplies target sets by target reps', () => {
    const exercise = makeExercise({ targetSets: 5, targetReps: 3, sets: [] })
    expect(getTargetTotalReps(exercise)).toBe(15)
  })
})

describe('didHitRepTarget', () => {
  it('returns true when total reps >= target', () => {
    const exercise = makeExercise({
      targetSets: 5,
      targetReps: 3,
      sets: [makeSet(3), makeSet(3), makeSet(3), makeSet(3), makeSet(3)],
    })
    expect(didHitRepTarget(exercise)).toBe(true)
  })

  it('returns true when exceeding target via AMRAP', () => {
    const exercise = makeExercise({
      targetSets: 5,
      targetReps: 3,
      sets: [makeSet(3), makeSet(3), makeSet(2), makeSet(3), makeSet(5, true, true)],
    })
    expect(didHitRepTarget(exercise)).toBe(true)
  })

  it('returns false when under target', () => {
    const exercise = makeExercise({
      targetSets: 5,
      targetReps: 3,
      sets: [makeSet(3), makeSet(3), makeSet(2), makeSet(2), makeSet(2)],
    })
    expect(didHitRepTarget(exercise)).toBe(false)
  })
})

describe('getAmrapReps', () => {
  it('returns reps from AMRAP set', () => {
    const exercise = makeExercise({
      sets: [makeSet(3), makeSet(3), makeSet(8, true, true)],
    })
    expect(getAmrapReps(exercise)).toBe(8)
  })

  it('returns undefined when no AMRAP set', () => {
    const exercise = makeExercise({
      sets: [makeSet(3), makeSet(3), makeSet(3)],
    })
    expect(getAmrapReps(exercise)).toBeUndefined()
  })
})

describe('isTrialWeight', () => {
  it('returns false when originalWeight not set', () => {
    const exercise = makeExercise({
      weight: 100,
      sets: [makeSet(3)],
    })
    expect(isTrialWeight(exercise)).toBe(false)
  })

  it('returns false when weight equals originalWeight', () => {
    const exercise = makeExercise({
      weight: 100,
      originalWeight: 100,
      sets: [makeSet(3)],
    })
    expect(isTrialWeight(exercise)).toBe(false)
  })

  it('returns true when weight differs from originalWeight', () => {
    const exercise = makeExercise({
      weight: 110,
      originalWeight: 100,
      sets: [makeSet(3)],
    })
    expect(isTrialWeight(exercise)).toBe(true)
  })
})

describe('calculateT1Progression', () => {
  describe('on success', () => {
    it('increases weight by increment', () => {
      const state = makeLiftState({ weight: 100, stage: 1 })
      const exercise = makeExercise({
        weight: 100,
        sets: [makeSet(3), makeSet(3), makeSet(3), makeSet(3), makeSet(3)],
      })
      const result = calculateT1Progression(state, exercise, 5, 'kg')
      expect(result.newState.weight).toBe(105)
      expect(result.newState.stage).toBe(1)
    })

    it('uses exercise weight not state weight for progression', () => {
      const state = makeLiftState({ weight: 100, stage: 1 })
      const exercise = makeExercise({
        weight: 105, // User used adjusted weight
        sets: [makeSet(3), makeSet(3), makeSet(3), makeSet(3), makeSet(3)],
      })
      const result = calculateT1Progression(state, exercise, 5, 'kg')
      expect(result.newState.weight).toBe(110) // 105 + 5, not 100 + 5
    })
  })

  describe('on failure at stage 1', () => {
    it('moves to stage 2', () => {
      const state = makeLiftState({ weight: 100, stage: 1 })
      const exercise = makeExercise({
        sets: [makeSet(3), makeSet(3), makeSet(2), makeSet(2), makeSet(2)],
      })
      const result = calculateT1Progression(state, exercise, 5, 'kg')
      expect(result.newState.stage).toBe(2)
      expect(result.newState.weight).toBe(100)
    })
  })

  describe('on failure at stage 2', () => {
    it('moves to stage 3', () => {
      const state = makeLiftState({ weight: 100, stage: 2 })
      const exercise = makeExercise({
        targetSets: 6,
        targetReps: 2,
        sets: [makeSet(2), makeSet(2), makeSet(2), makeSet(1), makeSet(1), makeSet(1)],
      })
      const result = calculateT1Progression(state, exercise, 5, 'kg')
      expect(result.newState.stage).toBe(3)
      expect(result.newState.weight).toBe(100)
    })
  })

  describe('on failure at stage 3', () => {
    it('sets pending5RMTest flag', () => {
      const state = makeLiftState({ weight: 100, stage: 3 })
      const exercise = makeExercise({
        targetSets: 10,
        targetReps: 1,
        sets: Array(10).fill(null).map(() => makeSet(0, false)),
      })
      const result = calculateT1Progression(state, exercise, 5, 'kg')
      expect(result.newState.pending5RMTest).toBe(true)
    })

    it('stores best set info for estimation', () => {
      const state = makeLiftState({ weight: 100, stage: 3 })
      const exercise = makeExercise({
        targetSets: 10,
        targetReps: 1,
        sets: [
          makeSet(1), makeSet(1), makeSet(1), makeSet(1), makeSet(1),
          makeSet(0, false), makeSet(0, false), makeSet(0, false), makeSet(0, false), makeSet(0, false),
        ],
      })
      const result = calculateT1Progression(state, exercise, 5, 'kg')
      expect(result.newState.bestSetReps).toBe(1)
      expect(result.newState.bestSetWeight).toBe(100)
    })
  })

  describe('with trial weight', () => {
    it('on success with trial weight, uses trial weight for progression', () => {
      const state = makeLiftState({ weight: 100, stage: 1 })
      const exercise = makeExercise({
        weight: 110,
        originalWeight: 100,
        sets: [makeSet(3), makeSet(3), makeSet(3), makeSet(3), makeSet(3)],
      })
      const result = calculateT1Progression(state, exercise, 5, 'kg')
      expect(result.newState.weight).toBe(115) // 110 + 5
      expect(result.newState.stage).toBe(1)
    })

    it('on failure with trial weight, returns unchanged state', () => {
      const state = makeLiftState({ weight: 100, stage: 1 })
      const exercise = makeExercise({
        weight: 110,
        originalWeight: 100,
        sets: [makeSet(3), makeSet(2), makeSet(2), makeSet(2), makeSet(2)],
      })
      const result = calculateT1Progression(state, exercise, 5, 'kg')
      expect(result.newState.weight).toBe(100) // unchanged
      expect(result.newState.stage).toBe(1) // unchanged, NOT 2
      expect(result.message).toContain('Trial at 110 kg failed')
    })

    it('on failure without trial weight, normal stage progression', () => {
      const state = makeLiftState({ weight: 100, stage: 1 })
      const exercise = makeExercise({
        weight: 100,
        originalWeight: 100,
        sets: [makeSet(3), makeSet(2), makeSet(2), makeSet(2), makeSet(2)],
      })
      const result = calculateT1Progression(state, exercise, 5, 'kg')
      expect(result.newState.weight).toBe(100)
      expect(result.newState.stage).toBe(2) // normal failure -> stage 2
    })

    it('on failure with trial weight at stage 3, returns unchanged state', () => {
      const state = makeLiftState({ weight: 100, stage: 3 })
      const exercise = makeExercise({
        weight: 110,
        originalWeight: 100,
        targetSets: 10,
        targetReps: 1,
        sets: Array(10).fill(null).map(() => makeSet(0)),
      })
      const result = calculateT1Progression(state, exercise, 5, 'kg')
      expect(result.newState.weight).toBe(100)
      expect(result.newState.stage).toBe(3)
      expect(result.newState.pending5RMTest).toBeUndefined()
    })

    it('on failure with lower trial weight, returns unchanged state', () => {
      const state = makeLiftState({ weight: 100, stage: 1 })
      const exercise = makeExercise({
        weight: 90,
        originalWeight: 100,
        sets: [makeSet(3), makeSet(2), makeSet(2), makeSet(2), makeSet(2)],
      })
      const result = calculateT1Progression(state, exercise, 5, 'kg')
      expect(result.newState.weight).toBe(100) // unchanged
      expect(result.newState.stage).toBe(1) // unchanged
      expect(result.message).toContain('Trial at 90 kg failed')
    })

    it('on failure with trial weight at stage 2, returns unchanged state', () => {
      const state = makeLiftState({ weight: 100, stage: 2 })
      const exercise = makeExercise({
        weight: 110,
        originalWeight: 100,
        targetSets: 6,
        targetReps: 2,
        sets: [makeSet(2), makeSet(2), makeSet(1), makeSet(1), makeSet(1), makeSet(1)],
      })
      const result = calculateT1Progression(state, exercise, 5, 'kg')
      expect(result.newState.weight).toBe(100)
      expect(result.newState.stage).toBe(2) // stays at 2, doesn't go to 3
    })
  })
})

describe('calculateT2Progression', () => {
  describe('on success', () => {
    it('increases weight by increment', () => {
      const state = makeLiftState({ tier: 'T2', weight: 50, stage: 1 })
      const exercise = makeExercise({
        tier: 'T2',
        weight: 50,
        targetSets: 3,
        targetReps: 10,
        sets: [makeSet(10), makeSet(10), makeSet(10)],
      })
      const result = calculateT2Progression(state, exercise, 2.5, 'kg')
      expect(result.newState.weight).toBe(52.5)
    })

    it('uses exercise weight not state weight for progression', () => {
      const state = makeLiftState({ tier: 'T2', weight: 50, stage: 1 })
      const exercise = makeExercise({
        tier: 'T2',
        weight: 52.5, // Adjusted weight
        targetSets: 3,
        targetReps: 10,
        sets: [makeSet(10), makeSet(10), makeSet(10)],
      })
      const result = calculateT2Progression(state, exercise, 2.5, 'kg')
      expect(result.newState.weight).toBe(55) // 52.5 + 2.5, not 50 + 2.5
    })

    it('stores lastStage1Weight when at stage 1', () => {
      const state = makeLiftState({ tier: 'T2', weight: 50, stage: 1 })
      const exercise = makeExercise({
        tier: 'T2',
        weight: 50,
        targetSets: 3,
        targetReps: 10,
        sets: [makeSet(10), makeSet(10), makeSet(10)],
      })
      const result = calculateT2Progression(state, exercise, 2.5, 'kg')
      expect(result.newState.lastStage1Weight).toBe(50)
    })

    it('preserves lastStage1Weight at stage 2', () => {
      const state = makeLiftState({
        tier: 'T2',
        weight: 55,
        stage: 2,
        lastStage1Weight: 50,
      })
      const exercise = makeExercise({
        tier: 'T2',
        weight: 55,
        targetSets: 3,
        targetReps: 8,
        sets: [makeSet(8), makeSet(8), makeSet(8)],
      })
      const result = calculateT2Progression(state, exercise, 2.5, 'kg')
      expect(result.newState.lastStage1Weight).toBe(50)
    })
  })

  describe('on failure at stage 1', () => {
    it('moves to stage 2', () => {
      const state = makeLiftState({ tier: 'T2', weight: 50, stage: 1 })
      const exercise = makeExercise({
        tier: 'T2',
        targetSets: 3,
        targetReps: 10,
        sets: [makeSet(10), makeSet(8), makeSet(7)],
      })
      const result = calculateT2Progression(state, exercise, 2.5, 'kg')
      expect(result.newState.stage).toBe(2)
    })
  })

  describe('on failure at stage 2', () => {
    it('moves to stage 3', () => {
      const state = makeLiftState({ tier: 'T2', weight: 50, stage: 2 })
      const exercise = makeExercise({
        tier: 'T2',
        targetSets: 3,
        targetReps: 8,
        sets: [makeSet(8), makeSet(6), makeSet(5)],
      })
      const result = calculateT2Progression(state, exercise, 2.5, 'kg')
      expect(result.newState.stage).toBe(3)
    })
  })

  describe('on failure at stage 3', () => {
    it('resets to stage 1 with increased weight in kg', () => {
      const state = makeLiftState({
        tier: 'T2',
        weight: 60,
        stage: 3,
        lastStage1Weight: 50,
      })
      const exercise = makeExercise({
        tier: 'T2',
        targetSets: 3,
        targetReps: 6,
        sets: [makeSet(6), makeSet(4), makeSet(3)],
      })
      const result = calculateT2Progression(state, exercise, 2.5, 'kg')
      expect(result.newState.stage).toBe(1)
      expect(result.newState.weight).toBe(60) // 50 + 10
      expect(result.newState.lastStage1Weight).toBeUndefined()
    })

    it('resets to stage 1 with increased weight in lbs', () => {
      const state = makeLiftState({
        tier: 'T2',
        weight: 120,
        stage: 3,
        lastStage1Weight: 100,
      })
      const exercise = makeExercise({
        tier: 'T2',
        targetSets: 3,
        targetReps: 6,
        sets: [makeSet(6), makeSet(4), makeSet(3)],
      })
      const result = calculateT2Progression(state, exercise, 5, 'lbs')
      expect(result.newState.stage).toBe(1)
      expect(result.newState.weight).toBe(120) // 100 + 20
    })

    it('falls back to current weight if no lastStage1Weight', () => {
      const state = makeLiftState({
        tier: 'T2',
        weight: 60,
        stage: 3,
      })
      const exercise = makeExercise({
        tier: 'T2',
        targetSets: 3,
        targetReps: 6,
        sets: [makeSet(6), makeSet(4), makeSet(3)],
      })
      const result = calculateT2Progression(state, exercise, 2.5, 'kg')
      expect(result.newState.weight).toBe(70) // 60 + 10
    })
  })

  describe('with trial weight', () => {
    it('on success with trial weight, uses trial weight for progression', () => {
      const state = makeLiftState({ tier: 'T2', weight: 50, stage: 1 })
      const exercise = makeExercise({
        tier: 'T2',
        weight: 55,
        originalWeight: 50,
        targetSets: 3,
        targetReps: 10,
        sets: [makeSet(10), makeSet(10), makeSet(10)],
      })
      const result = calculateT2Progression(state, exercise, 2.5, 'kg')
      expect(result.newState.weight).toBe(57.5) // 55 + 2.5
      expect(result.newState.stage).toBe(1)
    })

    it('on failure with trial weight, returns unchanged state', () => {
      const state = makeLiftState({ tier: 'T2', weight: 50, stage: 1 })
      const exercise = makeExercise({
        tier: 'T2',
        weight: 55,
        originalWeight: 50,
        targetSets: 3,
        targetReps: 10,
        sets: [makeSet(10), makeSet(8), makeSet(7)],
      })
      const result = calculateT2Progression(state, exercise, 2.5, 'kg')
      expect(result.newState.weight).toBe(50) // unchanged
      expect(result.newState.stage).toBe(1) // unchanged, NOT 2
      expect(result.message).toContain('Trial at 55 kg failed')
    })

    it('on failure without trial weight, normal stage progression', () => {
      const state = makeLiftState({ tier: 'T2', weight: 50, stage: 1 })
      const exercise = makeExercise({
        tier: 'T2',
        weight: 50,
        originalWeight: 50,
        targetSets: 3,
        targetReps: 10,
        sets: [makeSet(10), makeSet(8), makeSet(7)],
      })
      const result = calculateT2Progression(state, exercise, 2.5, 'kg')
      expect(result.newState.weight).toBe(50)
      expect(result.newState.stage).toBe(2) // normal failure -> stage 2
    })

    it('on failure with trial weight at stage 3, returns unchanged state', () => {
      const state = makeLiftState({
        tier: 'T2',
        weight: 60,
        stage: 3,
        lastStage1Weight: 50,
      })
      const exercise = makeExercise({
        tier: 'T2',
        weight: 65,
        originalWeight: 60,
        targetSets: 3,
        targetReps: 6,
        sets: [makeSet(6), makeSet(4), makeSet(3)],
      })
      const result = calculateT2Progression(state, exercise, 2.5, 'kg')
      expect(result.newState.weight).toBe(60) // unchanged
      expect(result.newState.stage).toBe(3) // unchanged, NOT reset
      expect(result.newState.lastStage1Weight).toBe(50) // preserved
    })

    it('on failure with lower trial weight, returns unchanged state', () => {
      const state = makeLiftState({ tier: 'T2', weight: 50, stage: 1 })
      const exercise = makeExercise({
        tier: 'T2',
        weight: 45,
        originalWeight: 50,
        targetSets: 3,
        targetReps: 10,
        sets: [makeSet(10), makeSet(8), makeSet(7)],
      })
      const result = calculateT2Progression(state, exercise, 2.5, 'kg')
      expect(result.newState.weight).toBe(50) // unchanged
      expect(result.newState.stage).toBe(1) // unchanged
      expect(result.message).toContain('Trial at 45 kg failed')
    })

    it('on failure with trial weight at stage 2, returns unchanged state', () => {
      const state = makeLiftState({ tier: 'T2', weight: 50, stage: 2 })
      const exercise = makeExercise({
        tier: 'T2',
        weight: 55,
        originalWeight: 50,
        targetSets: 3,
        targetReps: 8,
        sets: [makeSet(8), makeSet(6), makeSet(5)],
      })
      const result = calculateT2Progression(state, exercise, 2.5, 'kg')
      expect(result.newState.weight).toBe(50)
      expect(result.newState.stage).toBe(2) // stays at 2, doesn't go to 3
    })
  })
})

describe('shouldIncreaseT3Weight', () => {
  it('returns true when AMRAP >= 25', () => {
    expect(shouldIncreaseT3Weight(25)).toBe(true)
    expect(shouldIncreaseT3Weight(30)).toBe(true)
  })

  it('returns false when AMRAP < 25', () => {
    expect(shouldIncreaseT3Weight(24)).toBe(false)
    expect(shouldIncreaseT3Weight(15)).toBe(false)
  })
})

describe('calculateT3Progression', () => {
  it('increases weight when AMRAP >= 25', () => {
    const result = calculateT3Progression(20, 25, 2.5)
    expect(result.newWeight).toBe(22.5)
    expect(result.increased).toBe(true)
  })

  it('keeps weight when AMRAP < 25', () => {
    const result = calculateT3Progression(20, 20, 2.5)
    expect(result.newWeight).toBe(20)
    expect(result.increased).toBe(false)
  })
})

describe('createInitialLiftState', () => {
  it('creates state with stage 1', () => {
    const state = createInitialLiftState('bench', 'T1', 60)
    expect(state).toEqual({
      liftId: 'bench',
      tier: 'T1',
      weight: 60,
      stage: 1,
    })
  })
})

describe('estimate5RM', () => {
  it('estimates 5RM using Epley formula', () => {
    // 100kg x 5 reps: 1RM = 100 * (1 + 5/30) = 116.67
    // 5RM = 116.67 * 0.87 = 101.5
    // Rounded to 2.5kg: 102.5
    expect(estimate5RM(100, 5, 'kg')).toBe(102.5)
  })

  it('rounds to nearest 5 lbs', () => {
    // 200 x 5 reps: 1RM = 200 * 1.1667 = 233.33
    // 5RM = 233.33 * 0.87 = 203
    // Rounded to 5 lbs: 205
    expect(estimate5RM(200, 5, 'lbs')).toBe(205)
  })

  it('handles higher rep AMRAPs', () => {
    // 80kg x 10 reps: 1RM = 80 * (1 + 10/30) = 106.67
    // 5RM = 106.67 * 0.87 = 92.8
    // Rounded to 2.5kg: 92.5
    expect(estimate5RM(80, 10, 'kg')).toBe(92.5)
  })
})

describe('applyT1Reset', () => {
  it('resets to 85% of 5RM at stage 1', () => {
    const state = makeLiftState({
      stage: 3,
      pending5RMTest: true,
      bestSetReps: 3,
      bestSetWeight: 100,
    })
    const result = applyT1Reset(state, 100, 'kg')
    expect(result.stage).toBe(1)
    expect(result.weight).toBe(85) // 100 * 0.85 = 85
    expect(result.pending5RMTest).toBeUndefined()
    expect(result.bestSetReps).toBeUndefined()
    expect(result.bestSetWeight).toBeUndefined()
  })

  it('rounds to nearest 2.5kg', () => {
    const state = makeLiftState()
    const result = applyT1Reset(state, 97, 'kg')
    // 97 * 0.85 = 82.45 -> rounds to 82.5
    expect(result.weight).toBe(82.5)
  })

  it('rounds to nearest 5 lbs', () => {
    const state = makeLiftState()
    const result = applyT1Reset(state, 200, 'lbs')
    // 200 * 0.85 = 170
    expect(result.weight).toBe(170)
  })
})
