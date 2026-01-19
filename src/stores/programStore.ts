import { create } from 'zustand'
import type { ProgramState } from '../lib/types'
import { WORKOUT_ORDER } from '../lib/types'
import { getProgramState, saveProgramState } from '../lib/db'
import { createInitialLiftState } from '../lib/progression'

interface StartingWeights {
  squat: number
  bench: number
  deadlift: number
  ohp: number
  latPulldown: number
  dbRow: number
}

interface ProgramStore {
  state: ProgramState | null
  loaded: boolean
  load: () => Promise<void>
  initialize: (startingWeights: StartingWeights) => Promise<void>
  save: (state: ProgramState) => Promise<void>
  advanceWorkout: () => Promise<void>
}

function createInitialState(weights: StartingWeights): ProgramState {
  return {
    t1: {
      squat: createInitialLiftState('squat', 'T1', weights.squat),
      bench: createInitialLiftState('bench', 'T1', weights.bench),
      deadlift: createInitialLiftState('deadlift', 'T1', weights.deadlift),
      ohp: createInitialLiftState('ohp', 'T1', weights.ohp),
    },
    t2: {
      squat: createInitialLiftState('squat', 'T2', Math.round(weights.squat * 0.6)),
      bench: createInitialLiftState('bench', 'T2', Math.round(weights.bench * 0.6)),
      deadlift: createInitialLiftState('deadlift', 'T2', Math.round(weights.deadlift * 0.6)),
      ohp: createInitialLiftState('ohp', 'T2', Math.round(weights.ohp * 0.6)),
    },
    t3: {
      'lat-pulldown': { weightLbs: weights.latPulldown },
      'dumbbell-row': { weightLbs: weights.dbRow },
    },
    nextWorkoutType: 'A1',
    workoutCount: 0,
  }
}

export const useProgramStore = create<ProgramStore>((set, get) => ({
  state: null,
  loaded: false,

  load: async () => {
    const state = await getProgramState()
    set({ state: state ?? null, loaded: true })
  },

  initialize: async (startingWeights) => {
    const state = createInitialState(startingWeights)
    await saveProgramState(state)
    set({ state })
  },

  save: async (state) => {
    await saveProgramState(state)
    set({ state })
  },

  advanceWorkout: async () => {
    const current = get().state
    if (!current) return

    const currentIndex = WORKOUT_ORDER.indexOf(current.nextWorkoutType)
    const nextIndex = (currentIndex + 1) % WORKOUT_ORDER.length
    const nextType = WORKOUT_ORDER[nextIndex]

    const newState: ProgramState = {
      ...current,
      nextWorkoutType: nextType,
      workoutCount: current.workoutCount + 1,
    }

    await saveProgramState(newState)
    set({ state: newState })
  },
}))
