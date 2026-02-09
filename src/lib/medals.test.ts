import { describe, it, expect } from 'vitest'
import { detectMedals, detectWeightPR, detectVolumePR, detectStageClearMedal, detectStreakMedal, buildHistoryMap } from './medals'
import type { Workout, ProgramState, ExerciseLog, SetLog } from './types'

function makeSet(reps: number, completed = true, isAmrap = false): SetLog {
  return { setNumber: 1, reps, completed, isAmrap }
}

function makeExercise(overrides: Partial<ExerciseLog> & { sets: SetLog[] }): ExerciseLog {
  return {
    liftId: 'squat',
    tier: 'T1',
    weight: 100,
    targetSets: 5,
    targetReps: 3,
    ...overrides,
  }
}

function makeWorkout(overrides: Partial<Workout> = {}): Workout {
  return {
    id: 'w1',
    date: '2024-01-01T10:00:00Z',
    type: 'A1',
    exercises: [],
    completed: true,
    ...overrides,
  }
}

function baseProgramState(): ProgramState {
  const makeLift = (liftId: string, tier: 'T1' | 'T2', weight: number) => ({
    liftId: liftId as any,
    tier,
    weight,
    stage: 1 as const,
  })
  return {
    t1: {
      squat: makeLift('squat', 'T1', 100),
      bench: makeLift('bench', 'T1', 80),
      deadlift: makeLift('deadlift', 'T1', 120),
      ohp: makeLift('ohp', 'T1', 60),
    },
    t2: {
      squat: makeLift('squat', 'T2', 60),
      bench: makeLift('bench', 'T2', 50),
      deadlift: makeLift('deadlift', 'T2', 70),
      ohp: makeLift('ohp', 'T2', 40),
    },
    t3: { 'lat-pulldown': { weight: 50 }, 'dumbbell-row': { weight: 30 } },
    nextWorkoutType: 'A1',
    workoutCount: 0,
  }
}

describe('detectMedals', () => {
  it('gives weight + volume PR on first workout', () => {
    const workout = makeWorkout({
      exercises: [
        makeExercise({ liftId: 'squat', tier: 'T1', weight: 100, sets: [makeSet(3), makeSet(3), makeSet(3), makeSet(3), makeSet(5, true, true)] }),
        makeExercise({ liftId: 'bench', tier: 'T2', weight: 50, sets: [makeSet(10), makeSet(10), makeSet(12, true, true)] }),
      ],
    })
    const state = baseProgramState()
    const medals = detectMedals(workout, [], state, state)

    const weightPRs = medals.filter((m) => m.type === 'weight-pr')
    const volumePRs = medals.filter((m) => m.type === 'volume-pr')
    expect(weightPRs).toHaveLength(2)
    expect(volumePRs).toHaveLength(2)
    // First-time PRs should have no previousValue
    expect(weightPRs[0].previousValue).toBeUndefined()
    expect(volumePRs[0].previousValue).toBeUndefined()
  })

  it('detects weight PR when exceeding history', () => {
    const prevWorkout = makeWorkout({
      exercises: [
        makeExercise({ liftId: 'squat', tier: 'T1', weight: 100, sets: [makeSet(3), makeSet(3), makeSet(5, true, true)] }),
      ],
    })
    const workout = makeWorkout({
      exercises: [
        makeExercise({ liftId: 'squat', tier: 'T1', weight: 105, sets: [makeSet(3), makeSet(3), makeSet(5, true, true)] }),
      ],
    })
    const state = baseProgramState()
    const medals = detectMedals(workout, [prevWorkout], state, state)

    const weightPR = medals.find((m) => m.type === 'weight-pr')
    expect(weightPR).toBeDefined()
    expect(weightPR!.value).toBe(105)
    expect(weightPR!.previousValue).toBe(100)
  })

  it('detects volume PR only (same weight, more reps)', () => {
    const prevWorkout = makeWorkout({
      exercises: [
        makeExercise({ liftId: 'squat', tier: 'T1', weight: 100, sets: [makeSet(3), makeSet(3), makeSet(3)] }),
      ],
    })
    // Same weight but more reps (higher volume but not a weight PR)
    const workout = makeWorkout({
      exercises: [
        makeExercise({ liftId: 'squat', tier: 'T1', weight: 100, sets: [makeSet(3), makeSet(3), makeSet(5, true, true)] }),
      ],
    })
    const state = baseProgramState()
    const medals = detectMedals(workout, [prevWorkout], state, state)

    expect(medals.find((m) => m.type === 'weight-pr')).toBeUndefined()
    expect(medals.find((m) => m.type === 'volume-pr')).toBeDefined()
  })

  it('gives no PR when same weight and fewer reps', () => {
    const prevWorkout = makeWorkout({
      exercises: [
        makeExercise({ liftId: 'squat', tier: 'T1', weight: 100, sets: [makeSet(3), makeSet(3), makeSet(5, true, true)] }),
      ],
    })
    const workout = makeWorkout({
      exercises: [
        makeExercise({ liftId: 'squat', tier: 'T1', weight: 100, sets: [makeSet(3), makeSet(2), makeSet(3, true, true)] }),
      ],
    })
    const state = baseProgramState()
    const medals = detectMedals(workout, [prevWorkout], state, state)

    expect(medals.filter((m) => m.type === 'weight-pr')).toHaveLength(0)
    expect(medals.filter((m) => m.type === 'volume-pr')).toHaveLength(0)
  })

  it('skips exercises with 0 total reps', () => {
    const workout = makeWorkout({
      exercises: [
        makeExercise({ liftId: 'squat', tier: 'T1', weight: 100, sets: [makeSet(0), makeSet(0)] }),
      ],
    })
    const state = baseProgramState()
    const medals = detectMedals(workout, [], state, state)
    expect(medals.filter((m) => m.liftId === 'squat')).toHaveLength(0)
  })

  it('detects streak milestones', () => {
    const history = Array.from({ length: 4 }, (_, i) => makeWorkout({ id: `w${i}` }))
    const workout = makeWorkout({ id: 'w5', exercises: [] })
    const state = baseProgramState()
    const medals = detectMedals(workout, history, state, state)
    expect(medals.find((m) => m.type === 'streak')).toEqual({ type: 'streak', value: 5 })
  })

  it('no streak medal at non-milestone count', () => {
    const history = Array.from({ length: 2 }, (_, i) => makeWorkout({ id: `w${i}` }))
    const workout = makeWorkout({ id: 'w3', exercises: [] })
    const state = baseProgramState()
    const medals = detectMedals(workout, history, state, state)
    expect(medals.find((m) => m.type === 'streak')).toBeUndefined()
  })

  it('detects AMRAP record for T3 >= 25 reps', () => {
    const workout = makeWorkout({
      exercises: [
        makeExercise({
          liftId: 'lat-pulldown',
          tier: 'T3',
          weight: 50,
          targetSets: 3,
          targetReps: 15,
          sets: [makeSet(15), makeSet(15), makeSet(25, true, true)],
        }),
      ],
    })
    const state = baseProgramState()
    const medals = detectMedals(workout, [], state, state)
    const amrap = medals.find((m) => m.type === 'amrap-record')
    expect(amrap).toBeDefined()
    expect(amrap!.value).toBe(25)
  })

  it('no AMRAP record below 25', () => {
    const workout = makeWorkout({
      exercises: [
        makeExercise({
          liftId: 'lat-pulldown',
          tier: 'T3',
          weight: 50,
          sets: [makeSet(15), makeSet(15), makeSet(20, true, true)],
        }),
      ],
    })
    const state = baseProgramState()
    const medals = detectMedals(workout, [], state, state)
    expect(medals.find((m) => m.type === 'amrap-record')).toBeUndefined()
  })

  it('detects stage clear when weight increased', () => {
    const oldState = baseProgramState()
    const newState = {
      ...baseProgramState(),
      t1: {
        ...baseProgramState().t1,
        squat: { ...baseProgramState().t1.squat, weight: 110 },
      },
    }
    const workout = makeWorkout({ exercises: [] })
    const medals = detectMedals(workout, [], oldState, newState)
    const sc = medals.find((m) => m.type === 'stage-clear' && m.liftId === 'squat' && m.tier === 'T1')
    expect(sc).toBeDefined()
    expect(sc!.value).toBe(110)
    expect(sc!.previousValue).toBe(100)
  })

  it('no stage clear when weight unchanged', () => {
    const state = baseProgramState()
    const workout = makeWorkout({ exercises: [] })
    const medals = detectMedals(workout, [], state, state)
    expect(medals.filter((m) => m.type === 'stage-clear')).toHaveLength(0)
  })

  it('isolates PRs per tier (same lift, different tiers)', () => {
    const prevWorkout = makeWorkout({
      exercises: [
        makeExercise({ liftId: 'squat', tier: 'T1', weight: 100, sets: [makeSet(3)] }),
        makeExercise({ liftId: 'squat', tier: 'T2', weight: 60, sets: [makeSet(10)] }),
      ],
    })
    // Only T2 has a new PR
    const workout = makeWorkout({
      exercises: [
        makeExercise({ liftId: 'squat', tier: 'T1', weight: 100, sets: [makeSet(3)] }),
        makeExercise({ liftId: 'squat', tier: 'T2', weight: 65, sets: [makeSet(10)] }),
      ],
    })
    const state = baseProgramState()
    const medals = detectMedals(workout, [prevWorkout], state, state)
    const t1WeightPR = medals.find((m) => m.type === 'weight-pr' && m.tier === 'T1')
    const t2WeightPR = medals.find((m) => m.type === 'weight-pr' && m.tier === 'T2')
    expect(t1WeightPR).toBeUndefined()
    expect(t2WeightPR).toBeDefined()
  })
})

describe('detectWeightPR', () => {
  it('returns medal when weight exceeds history', () => {
    const history = buildHistoryMap([
      makeWorkout({
        exercises: [makeExercise({ weight: 100, sets: [makeSet(3)] })],
      }),
    ])
    const exercise = makeExercise({ weight: 105, sets: [makeSet(3)] })
    const medal = detectWeightPR(exercise, history)
    expect(medal).toEqual({
      type: 'weight-pr',
      liftId: 'squat',
      tier: 'T1',
      value: 105,
      previousValue: 100,
    })
  })

  it('returns null when weight equals history', () => {
    const history = buildHistoryMap([
      makeWorkout({
        exercises: [makeExercise({ weight: 100, sets: [makeSet(3)] })],
      }),
    ])
    const exercise = makeExercise({ weight: 100, sets: [makeSet(3)] })
    expect(detectWeightPR(exercise, history)).toBeNull()
  })

  it('returns medal with no previousValue on first ever', () => {
    const history = buildHistoryMap([])
    const exercise = makeExercise({ weight: 100, sets: [makeSet(3)] })
    const medal = detectWeightPR(exercise, history)
    expect(medal).toBeDefined()
    expect(medal!.previousValue).toBeUndefined()
  })

  it('returns null when exercise has 0 reps', () => {
    const history = buildHistoryMap([])
    const exercise = makeExercise({ weight: 100, sets: [makeSet(0)] })
    expect(detectWeightPR(exercise, history)).toBeNull()
  })
})

describe('detectVolumePR', () => {
  it('returns volume-pr medal when volume exceeds history', () => {
    const history = buildHistoryMap([
      makeWorkout({
        exercises: [makeExercise({ weight: 100, sets: [makeSet(3), makeSet(3)] })],
      }),
    ])
    const exercise = makeExercise({ weight: 100, sets: [makeSet(3), makeSet(3), makeSet(5, true, true)] })
    const medals = detectVolumePR(exercise, history)
    expect(medals).toHaveLength(1)
    expect(medals[0].type).toBe('volume-pr')
    expect(medals[0].value).toBe(1100)
  })

  it('returns empty when volume is lower', () => {
    const history = buildHistoryMap([
      makeWorkout({
        exercises: [makeExercise({ weight: 100, sets: [makeSet(5), makeSet(5), makeSet(5)] })],
      }),
    ])
    const exercise = makeExercise({ weight: 100, sets: [makeSet(3), makeSet(3)] })
    expect(detectVolumePR(exercise, history)).toHaveLength(0)
  })

  it('includes amrap-record for T3 with AMRAP >= 25', () => {
    const history = buildHistoryMap([])
    const exercise = makeExercise({
      liftId: 'lat-pulldown',
      tier: 'T3',
      weight: 50,
      targetSets: 3,
      targetReps: 15,
      sets: [makeSet(15), makeSet(15), makeSet(25, true, true)],
    })
    const medals = detectVolumePR(exercise, history)
    expect(medals.find((m) => m.type === 'volume-pr')).toBeDefined()
    expect(medals.find((m) => m.type === 'amrap-record')).toBeDefined()
  })

  it('no amrap-record for T1 even with high AMRAP', () => {
    const history = buildHistoryMap([])
    const exercise = makeExercise({
      tier: 'T1',
      weight: 100,
      sets: [makeSet(3), makeSet(3), makeSet(30, true, true)],
    })
    const medals = detectVolumePR(exercise, history)
    expect(medals.find((m) => m.type === 'amrap-record')).toBeUndefined()
  })
})

describe('detectStageClearMedal', () => {
  it('returns stage-clear for T1 when rep target hit (lbs)', () => {
    const exercise = makeExercise({
      liftId: 'squat',
      tier: 'T1',
      weight: 100,
      targetSets: 5,
      targetReps: 3,
      sets: [makeSet(3), makeSet(3), makeSet(3), makeSet(3), makeSet(5, true, true)],
    })
    const medal = detectStageClearMedal(exercise, baseProgramState(), 'lbs')
    expect(medal).toEqual({
      type: 'stage-clear',
      liftId: 'squat',
      tier: 'T1',
      value: 110,
      previousValue: 100,
    })
  })

  it('returns stage-clear for T2 upper body (lbs)', () => {
    const exercise = makeExercise({
      liftId: 'bench',
      tier: 'T2',
      weight: 50,
      targetSets: 3,
      targetReps: 10,
      sets: [makeSet(10), makeSet(10), makeSet(12, true, true)],
    })
    const medal = detectStageClearMedal(exercise, baseProgramState(), 'lbs')
    expect(medal).toEqual({
      type: 'stage-clear',
      liftId: 'bench',
      tier: 'T2',
      value: 52.5,
      previousValue: 50,
    })
  })

  it('returns null when rep target not hit', () => {
    const exercise = makeExercise({
      liftId: 'squat',
      tier: 'T1',
      weight: 100,
      targetSets: 5,
      targetReps: 3,
      sets: [makeSet(3), makeSet(3), makeSet(2), makeSet(1), makeSet(2, true, true)],
    })
    expect(detectStageClearMedal(exercise, baseProgramState(), 'lbs')).toBeNull()
  })

  it('handles T3 stage clear (AMRAP >= 25)', () => {
    const exercise = makeExercise({
      liftId: 'lat-pulldown',
      tier: 'T3',
      weight: 50,
      targetSets: 3,
      targetReps: 15,
      sets: [makeSet(15), makeSet(15), makeSet(25, true, true)],
    })
    const medal = detectStageClearMedal(exercise, baseProgramState(), 'lbs', undefined, 5)
    expect(medal).toEqual({
      type: 'stage-clear',
      liftId: 'lat-pulldown',
      tier: 'T3',
      value: 55,
      previousValue: 50,
    })
  })

  it('returns null for T3 when AMRAP < 25 even if rep target met', () => {
    const exercise = makeExercise({
      liftId: 'lat-pulldown',
      tier: 'T3',
      weight: 50,
      targetSets: 3,
      targetReps: 15,
      sets: [makeSet(15), makeSet(15), makeSet(20, true, true)],
    })
    expect(detectStageClearMedal(exercise, baseProgramState(), 'lbs')).toBeNull()
  })

  it('handles forceT3Progression lifts', () => {
    const exercise = makeExercise({
      liftId: 'squat',
      tier: 'T1',
      weight: 100,
      targetSets: 3,
      targetReps: 15,
      sets: [makeSet(15), makeSet(15), makeSet(25, true, true)],
    })
    const subs = [{ originalLiftId: 'squat', substituteId: 'goblet-squat', forceT3Progression: true }]
    const medal = detectStageClearMedal(exercise, baseProgramState(), 'lbs', subs, 5)
    expect(medal).toEqual({
      type: 'stage-clear',
      liftId: 'squat',
      tier: 'T1',
      value: 105,
      previousValue: 100,
    })
  })
})

describe('detectStreakMedal', () => {
  it('returns medal at milestone 5', () => {
    expect(detectStreakMedal(5)).toEqual({ type: 'streak', value: 5 })
  })

  it('returns medal at milestone 100', () => {
    expect(detectStreakMedal(100)).toEqual({ type: 'streak', value: 100 })
  })

  it('returns null at non-milestone', () => {
    expect(detectStreakMedal(3)).toBeNull()
    expect(detectStreakMedal(7)).toBeNull()
    expect(detectStreakMedal(99)).toBeNull()
  })
})

describe('buildHistoryMap', () => {
  it('builds correct map from workouts', () => {
    const workouts = [
      makeWorkout({
        exercises: [
          makeExercise({ liftId: 'squat', tier: 'T1', weight: 100, sets: [makeSet(3), makeSet(3)] }),
          makeExercise({ liftId: 'squat', tier: 'T1', weight: 105, sets: [makeSet(3)] }),
        ],
      }),
      makeWorkout({
        exercises: [
          makeExercise({ liftId: 'squat', tier: 'T1', weight: 95, sets: [makeSet(5), makeSet(5), makeSet(5)] }),
        ],
      }),
    ]
    const map = buildHistoryMap(workouts)
    const record = map.get('squat:T1')!
    expect(record.maxWeight).toBe(105)
    // Max volume: 95 * 15 = 1425 vs 100 * 6 = 600 vs 105 * 3 = 315
    expect(record.maxVolume).toBe(1425)
  })

  it('skips exercises with 0 reps', () => {
    const workouts = [
      makeWorkout({
        exercises: [makeExercise({ weight: 100, sets: [makeSet(0)] })],
      }),
    ]
    const map = buildHistoryMap(workouts)
    expect(map.has('squat:T1')).toBe(false)
  })
})
