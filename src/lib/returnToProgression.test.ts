import { describe, it, expect } from 'vitest'
import {
  getTestProgress,
  getLiftsToTest,
  getStageLadderLifts,
  shouldSplitSquatAndDeadlift,
  getOpeningWeight,
  getTestStep,
  proposeRestart,
  applyRestart,
  startReturnToProgression,
  cancelReturnToProgression,
  recordTestResults,
  detect5RMPRs,
  getLastProgramActivityDate,
  isReturnNudgeDue,
} from './returnToProgression'
import { createInitialLiftState } from './progression'
import type { LiftSubstitution, ProgramState, Workout } from './types'

function makeState(): ProgramState {
  return {
    t1: {
      // Stage 3, last validated singles: maintenance 0.7 × 125 = 87.5
      deadlift: { ...createInitialLiftState('deadlift', 'T1', 130), stage: 3, lastSuccessWeight: 125 },
      squat: { ...createInitialLiftState('squat', 'T1', 85), lastSuccessWeight: 85 },
      bench: { ...createInitialLiftState('bench', 'T1', 60), stage: 2, lastSuccessWeight: 60 },
      ohp: { ...createInitialLiftState('ohp', 'T1', 40), pending5RMTest: true, bestSetReps: 2, bestSetWeight: 40 },
    },
    t2: {
      deadlift: { ...createInitialLiftState('deadlift', 'T2', 80), stage: 3, lastStage1Weight: 70 },
      squat: createInitialLiftState('squat', 'T2', 60),
      bench: createInitialLiftState('bench', 'T2', 40),
      ohp: createInitialLiftState('ohp', 'T2', 25),
    },
    t3: { 'lat-pulldown': { weight: 50 }, 'dumbbell-row': { weight: 22.5 } },
    nextWorkoutType: 'B2',
    workoutCount: 40,
  }
}

const kg = { weightUnit: 'kg' as const, liftSubstitutions: [] as LiftSubstitution[] }
const legPressT3: LiftSubstitution[] = [{ originalLiftId: 'squat', substituteId: 'leg-press', forceT3Progression: true }]

describe('getTestProgress', () => {
  it('opens at the opening weight', () => {
    expect(getTestProgress(67.5, 5, [])).toEqual({ done: false, nextWeight: 67.5 })
  })

  it('ramps up one step after each set of five', () => {
    expect(getTestProgress(67.5, 5, [{ weight: 67.5, reps: 5 }, { weight: 72.5, reps: 5 }]))
      .toEqual({ done: false, nextWeight: 77.5 })
  })

  it('concludes at the heaviest weight done for five once a set falls short', () => {
    const attempts = [{ weight: 67.5, reps: 5 }, { weight: 72.5, reps: 5 }, { weight: 77.5, reps: 3 }]
    expect(getTestProgress(67.5, 5, attempts)).toEqual({ done: true, fiveRepMax: 72.5 })
  })

  it('counts more than five reps as a success', () => {
    expect(getTestProgress(45, 2.5, [{ weight: 45, reps: 8 }])).toEqual({ done: false, nextWeight: 47.5 })
  })

  it('ramps down when the opening set falls short', () => {
    expect(getTestProgress(30, 2.5, [{ weight: 30, reps: 3 }])).toEqual({ done: false, nextWeight: 27.5 })
    expect(getTestProgress(30, 2.5, [{ weight: 30, reps: 3 }, { weight: 27.5, reps: 4 }]))
      .toEqual({ done: false, nextWeight: 25 })
  })

  it('concludes at the first success when ramping down', () => {
    expect(getTestProgress(30, 2.5, [{ weight: 30, reps: 3 }, { weight: 27.5, reps: 5 }]))
      .toEqual({ done: true, fiveRepMax: 27.5 })
  })

  it('never ramps down to zero', () => {
    expect(getTestProgress(2.5, 2.5, [{ weight: 2.5, reps: 0 }])).toEqual({ done: false, nextWeight: 2.5 })
  })
})

describe('lifts to test', () => {
  it('tests every lift on the stage ladder', () => {
    const state = startReturnToProgression(makeState())
    expect(getLiftsToTest(state, kg)).toEqual(['squat', 'bench', 'deadlift', 'ohp'])
  })

  it('skips substitutes that progress like a T3', () => {
    expect(getStageLadderLifts({ liftSubstitutions: legPressT3 })).toEqual(['bench', 'deadlift', 'ohp'])
  })

  it('drops lifts once they have a result', () => {
    const state = recordTestResults(startReturnToProgression(makeState()), { squat: 95, deadlift: 120 })
    expect(getLiftsToTest(state, kg)).toEqual(['bench', 'ohp'])
  })
})

describe('shouldSplitSquatAndDeadlift', () => {
  it('suggests separate days only while both are untested', () => {
    expect(shouldSplitSquatAndDeadlift(['squat', 'bench', 'deadlift'])).toBe(true)
    expect(shouldSplitSquatAndDeadlift(['bench', 'deadlift'])).toBe(false)
    expect(shouldSplitSquatAndDeadlift(['squat', 'bench'])).toBe(false)
  })
})

describe('getOpeningWeight', () => {
  it('opens at the maintenance weight', () => {
    expect(getOpeningWeight(makeState(), 'deadlift', kg)).toBe(87.5)
    expect(getOpeningWeight(makeState(), 'squat', kg)).toBe(67.5)
    expect(getOpeningWeight(makeState(), 'bench', kg)).toBe(45)
  })

  it('computes one for OHP even though it is not on Maintenance Day', () => {
    expect(getOpeningWeight(makeState(), 'ohp', kg)).toBe(32.5)
  })

  it('uses a pinned maintenance override', () => {
    const settings = { ...kg, maintenanceOverrides: { squat: { weight: 70, autoAtSet: 67.5 } } }
    expect(getOpeningWeight(makeState(), 'squat', settings)).toBe(70)
  })
})

describe('getTestStep', () => {
  it('uses T1 increments', () => {
    expect(getTestStep('squat', 'kg')).toBe(5)
    expect(getTestStep('bench', 'kg')).toBe(2.5)
    expect(getTestStep('deadlift', 'lbs')).toBe(10)
    expect(getTestStep('ohp', 'lbs')).toBe(5)
  })
})

describe('proposeRestart', () => {
  it('restarts T1 at 85% and T2 at 65% of the tested 5RM, T3 unchanged', () => {
    const state = recordTestResults(startReturnToProgression(makeState()), {
      deadlift: 115, squat: 90, bench: 60, ohp: 40,
    })
    expect(proposeRestart(state, kg)).toEqual({
      t1: { deadlift: 97.5, squat: 77.5, bench: 50, ohp: 35 },
      t2: { deadlift: 75, squat: 57.5, bench: 40, ohp: 25 },
      t3: { 'lat-pulldown': 50, 'dumbbell-row': 22.5 },
      t3StyleLifts: {},
    })
  })

  it('only proposes T3s that are in the rotation', () => {
    const state = recordTestResults(startReturnToProgression(makeState()), { deadlift: 115 })
    state.t3['landmine-press'] = { weight: 15 }
    expect(proposeRestart(state, kg).t3).toEqual({ 'lat-pulldown': 50, 'dumbbell-row': 22.5 })
    const withExtra = proposeRestart(state, { ...kg, additionalT3s: [{ workoutType: 'A1', exerciseIds: ['landmine-press'] }] })
    expect(withExtra.t3).toEqual({ 'lat-pulldown': 50, 'dumbbell-row': 22.5, 'landmine-press': 15 })
  })

  it('carries T3-style substitutes at their current weight', () => {
    const state = recordTestResults(startReturnToProgression(makeState()), { deadlift: 115 })
    const proposal = proposeRestart(state, { ...kg, liftSubstitutions: legPressT3 })
    expect(proposal.t3StyleLifts).toEqual({ squat: 85 })
    expect(proposal.t1.squat).toBeUndefined()
  })
})

describe('applyRestart', () => {
  const tested = () => recordTestResults(startReturnToProgression(makeState()), {
    deadlift: 115, squat: 90, bench: 60, ohp: 40,
  })

  it('puts every lift at stage 1 and clears stale stage state', () => {
    const next = applyRestart(tested(), proposeRestart(tested(), kg))
    expect(next.t1.deadlift).toMatchObject({ weight: 97.5, stage: 1, lastSuccessWeight: undefined })
    expect(next.t1.ohp).toMatchObject({ weight: 35, pending5RMTest: undefined, bestSetReps: undefined })
    expect(next.t2.deadlift).toMatchObject({ weight: 75, stage: 1, lastStage1Weight: 75 })
  })

  it('restarts the rotation at A1, keeps the workout count and ends the return', () => {
    const next = applyRestart(tested(), proposeRestart(tested(), kg))
    expect(next.nextWorkoutType).toBe('A1')
    expect(next.workoutCount).toBe(40)
    expect(next.returnToProgression).toBeUndefined()
  })

  it('applies edited proposal values', () => {
    const proposal = proposeRestart(tested(), kg)
    proposal.t1.squat = 80
    proposal.t3['dumbbell-row'] = 20
    const next = applyRestart(tested(), proposal)
    expect(next.t1.squat.weight).toBe(80)
    expect(next.t3['dumbbell-row'].weight).toBe(20)
  })

  it('sets both slots of a T3-style substitute', () => {
    const next = applyRestart(tested(), { t1: {}, t2: {}, t3: {}, t3StyleLifts: { squat: 70 } })
    expect(next.t1.squat.weight).toBe(70)
    expect(next.t2.squat.weight).toBe(70)
    expect(next.t1.squat.stage).toBe(1)
  })
})

describe('cancelReturnToProgression', () => {
  it('leaves program weights exactly as they were', () => {
    const original = makeState()
    const cancelled = cancelReturnToProgression(recordTestResults(startReturnToProgression(original), { squat: 95 }))
    expect(cancelled).toEqual(original)
  })
})

function testDay(date: string, results: Record<string, number | undefined>): Workout {
  return {
    id: date,
    date,
    type: 'TD',
    completed: true,
    exercises: Object.entries(results).map(([liftId, fiveRepMax]) => ({
      liftId, tier: 'T1', weight: fiveRepMax ?? 0, targetSets: 1, targetReps: 5, sets: [], fiveRepMax,
    })),
  }
}

describe('detect5RMPRs', () => {
  it('awards nothing on the first test', () => {
    expect(detect5RMPRs({ squat: 95 }, [])).toEqual([])
  })

  it('awards a PR over the best earlier tested 5RM', () => {
    const history = [testDay('2025-03-01', { squat: 90 }), testDay('2026-03-01', { squat: 85 })]
    expect(detect5RMPRs({ squat: 95 }, history)).toEqual([
      { type: '5rm-pr', liftId: 'squat', tier: 'T1', value: 95, previousValue: 90 },
    ])
  })

  it('ignores Rotating Workout weights and abandoned tests', () => {
    const rotating: Workout = {
      id: 'r', date: '2026-01-01', type: 'A1', completed: true,
      exercises: [{ liftId: 'squat', tier: 'T1', weight: 125, targetSets: 10, targetReps: 1, sets: [] }],
    }
    const history = [rotating, testDay('2025-03-01', { squat: 90, bench: undefined })]
    expect(detect5RMPRs({ squat: 92.5, bench: 60 }, history)).toEqual([
      { type: '5rm-pr', liftId: 'squat', tier: 'T1', value: 92.5, previousValue: 90 },
    ])
  })
})

describe('return nudge', () => {
  const w = (date: string, type: Workout['type']): Workout => ({ id: date, date, type, completed: true, exercises: [] })

  it('ignores Maintenance Days', () => {
    const history = [w('2026-08-01T10:00:00Z', 'B1'), w('2026-10-01T10:00:00Z', 'MN')]
    expect(getLastProgramActivityDate(history)).toBe('2026-08-01T10:00:00Z')
  })

  it('counts a Test Day, so the nudge does not return right after a restart', () => {
    const history = [w('2026-08-01T10:00:00Z', 'B1'), w('2026-11-10T10:00:00Z', 'TD')]
    expect(getLastProgramActivityDate(history)).toBe('2026-11-10T10:00:00Z')
  })

  it('is due after three weeks without a Rotating Workout', () => {
    const now = new Date('2026-11-13T10:00:00Z')
    expect(isReturnNudgeDue('2026-10-20T10:00:00Z', now)).toBe(true)
    expect(isReturnNudgeDue('2026-11-01T10:00:00Z', now)).toBe(false)
    expect(isReturnNudgeDue(null, now)).toBe(false)
  })
})
