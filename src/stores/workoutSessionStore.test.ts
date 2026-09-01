import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useWorkoutSessionStore } from './workoutSessionStore'
import type { ProgramState, UserSettings } from '../lib/types'

// Mock nanoid to get predictable IDs
vi.mock('nanoid', () => ({
  nanoid: () => 'test-workout-id',
}))

function createMockProgramState(): ProgramState {
  return {
    t1: {
      squat: { liftId: 'squat', tier: 'T1', weight: 100, stage: 1 },
      bench: { liftId: 'bench', tier: 'T1', weight: 80, stage: 1 },
      deadlift: { liftId: 'deadlift', tier: 'T1', weight: 120, stage: 1 },
      ohp: { liftId: 'ohp', tier: 'T1', weight: 50, stage: 1 },
    },
    t2: {
      squat: { liftId: 'squat', tier: 'T2', weight: 60, stage: 1 },
      bench: { liftId: 'bench', tier: 'T2', weight: 50, stage: 1 },
      deadlift: { liftId: 'deadlift', tier: 'T2', weight: 70, stage: 1 },
      ohp: { liftId: 'ohp', tier: 'T2', weight: 30, stage: 1 },
    },
    t3: {
      'lat-pulldown': { weight: 50 },
      'dumbbell-row': { weight: 25 },
    },
    nextWorkoutType: 'A1',
    workoutCount: 0,
  }
}

function createMockSettings(): UserSettings {
  return {
    barWeight: 45,
    dumbbellHandleWeight: 5,
    plateInventory: { '45': 4, '25': 4, '10': 4, '5': 4, '2.5': 4 },
    restTimers: { t1Seconds: 180, t2Seconds: 120, t3Seconds: 60 },
    weightUnit: 'lbs',
  }
}

describe('workoutSessionStore', () => {
  beforeEach(() => {
    // Reset store state before each test
    useWorkoutSessionStore.setState({
      workout: null,
      currentExerciseIndex: 0,
    })
  })

  describe('startWorkout', () => {
    it('creates a new workout with exercises from program state', () => {
      const store = useWorkoutSessionStore.getState()
      const programState = createMockProgramState()
      const settings = createMockSettings()

      store.startWorkout(programState, settings)

      const { workout } = useWorkoutSessionStore.getState()
      expect(workout).not.toBeNull()
      expect(workout?.id).toBe('test-workout-id')
      expect(workout?.type).toBe('A1')
      expect(workout?.completed).toBe(false)
      expect(workout?.exercises).toHaveLength(3) // T1 + T2 + T3
      expect(workout?.exercises[0].tier).toBe('T1')
      expect(workout?.exercises[0].liftId).toBe('squat')
      expect(workout?.exercises[1].tier).toBe('T2')
      expect(workout?.exercises[1].liftId).toBe('bench')
      expect(workout?.exercises[2].tier).toBe('T3')
      expect(workout?.exercises[2].liftId).toBe('lat-pulldown')
    })

    it('does not overwrite existing workout', () => {
      const store = useWorkoutSessionStore.getState()
      const programState = createMockProgramState()
      const settings = createMockSettings()

      store.startWorkout(programState, settings)
      const firstWorkoutDate = useWorkoutSessionStore.getState().workout?.date

      // Try to start another workout
      programState.nextWorkoutType = 'B1'
      store.startWorkout(programState, settings)

      const { workout } = useWorkoutSessionStore.getState()
      expect(workout?.type).toBe('A1') // Still A1, not B1
      expect(workout?.date).toBe(firstWorkoutDate)
    })
  })

  describe('startMaintenanceWorkout', () => {
    it('derives from lastSuccessWeight, not the next-attempt weight', () => {
      // After a successful 110 deadlift, t1.weight = 115 (next target), lastSuccessWeight = 110
      const programState = createMockProgramState()
      programState.t1.deadlift = {
        liftId: 'deadlift', tier: 'T1', weight: 115, stage: 1, lastSuccessWeight: 110,
      }

      useWorkoutSessionStore.getState().startMaintenanceWorkout(programState, createMockSettings())

      const { workout } = useWorkoutSessionStore.getState()
      const deadlift = workout?.exercises.find((e) => e.liftId === 'deadlift')
      expect(deadlift?.weight).toBe(90) // 0.8 × 110 = 88, rounded to 5
    })

    it('falls back to current weight when lastSuccessWeight is undefined', () => {
      const programState = createMockProgramState()
      // No lastSuccessWeight set (initial state, never completed a workout)

      useWorkoutSessionStore.getState().startMaintenanceWorkout(programState, createMockSettings())

      const { workout } = useWorkoutSessionStore.getState()
      const deadlift = workout?.exercises.find((e) => e.liftId === 'deadlift')
      expect(deadlift?.weight).toBe(95) // 0.8 × 120 = 96, rounded to 5
    })

    it('prescribes a straight set of 5 for every maintenance lift', () => {
      useWorkoutSessionStore.getState().startMaintenanceWorkout(createMockProgramState(), createMockSettings())

      const { workout } = useWorkoutSessionStore.getState()
      expect(workout?.type).toBe('MN')
      expect(workout?.exercises).toHaveLength(3)
      for (const exercise of workout!.exercises) {
        expect(exercise.targetSets).toBe(1)
        expect(exercise.targetReps).toBe(5)
        expect(exercise.sets).toHaveLength(1)
        expect(exercise.sets[0].isAmrap).toBe(false)
      }
    })

    it('honours a manual override from settings', () => {
      const programState = createMockProgramState()
      programState.t1.deadlift = {
        liftId: 'deadlift', tier: 'T1', weight: 300, stage: 1, lastSuccessWeight: 235,
      }
      const settings = createMockSettings()
      settings.maintenanceOverrides = { deadlift: { weight: 205, autoAtSet: 190 } }

      useWorkoutSessionStore.getState().startMaintenanceWorkout(programState, settings)

      const { workout } = useWorkoutSessionStore.getState()
      const deadlift = workout?.exercises.find((e) => e.liftId === 'deadlift')
      expect(deadlift?.weight).toBe(205) // override, not the computed 190
      // Lifts without an override still compute
      const squat = workout?.exercises.find((e) => e.liftId === 'squat')
      expect(squat?.weight).toBe(80) // 0.8 x 100
    })

    it('keeps the prescribed load flat as a lift advances through stages', () => {
      // Same lifter deeper into the cycle: lastSuccessWeight climbs, load should not
      const weights = ([1, 2, 3] as const).map((stage, i) => {
        useWorkoutSessionStore.setState({ workout: null, currentExerciseIndex: 0 })
        const programState = createMockProgramState()
        programState.t1.deadlift = {
          liftId: 'deadlift', tier: 'T1', weight: 300, stage,
          lastSuccessWeight: 235 + i * 20, // 235 / 255 / 275
        }
        useWorkoutSessionStore.getState().startMaintenanceWorkout(programState, createMockSettings())
        return useWorkoutSessionStore.getState().workout!.exercises.find((e) => e.liftId === 'deadlift')!.weight
      })

      expect(weights).toEqual([190, 190, 195])
      expect(Math.max(...weights) - Math.min(...weights)).toBeLessThanOrEqual(5)
    })
  })

  describe('hasActiveSession', () => {
    it('returns false when no workout', () => {
      const store = useWorkoutSessionStore.getState()
      expect(store.hasActiveSession()).toBe(false)
    })

    it('returns true when workout exists', () => {
      const store = useWorkoutSessionStore.getState()
      store.startWorkout(createMockProgramState(), createMockSettings())
      expect(store.hasActiveSession()).toBe(true)
    })
  })

  describe('currentExercise', () => {
    it('returns null when no workout', () => {
      const store = useWorkoutSessionStore.getState()
      expect(store.currentExercise()).toBeNull()
    })

    it('returns current exercise based on index', () => {
      const store = useWorkoutSessionStore.getState()
      store.startWorkout(createMockProgramState(), createMockSettings())

      expect(store.currentExercise()?.tier).toBe('T1')

      store.nextExercise()
      expect(store.currentExercise()?.tier).toBe('T2')
    })
  })

  describe('completeSet', () => {
    it('marks set as completed with reps', () => {
      const store = useWorkoutSessionStore.getState()
      store.startWorkout(createMockProgramState(), createMockSettings())

      store.completeSet(0, 3)

      const { workout } = useWorkoutSessionStore.getState()
      expect(workout?.exercises[0].sets[0].completed).toBe(true)
      expect(workout?.exercises[0].sets[0].reps).toBe(3)
    })
  })

  describe('failSet', () => {
    it('marks set as completed with 0 reps', () => {
      const store = useWorkoutSessionStore.getState()
      store.startWorkout(createMockProgramState(), createMockSettings())

      store.failSet(0)

      const { workout } = useWorkoutSessionStore.getState()
      expect(workout?.exercises[0].sets[0].completed).toBe(true)
      expect(workout?.exercises[0].sets[0].reps).toBe(0)
    })
  })

  describe('failRemainingCurrentExerciseSets', () => {
    it('marks all incomplete sets as failed', () => {
      const store = useWorkoutSessionStore.getState()
      store.startWorkout(createMockProgramState(), createMockSettings())

      // Complete first set
      store.completeSet(0, 3)

      // Fail remaining
      store.failRemainingCurrentExerciseSets()

      const { workout } = useWorkoutSessionStore.getState()
      const sets = workout?.exercises[0].sets ?? []
      expect(sets[0].reps).toBe(3) // First set unchanged
      expect(sets[0].completed).toBe(true)
      // All other sets should be failed (0 reps, completed)
      for (let i = 1; i < sets.length; i++) {
        expect(sets[i].reps).toBe(0)
        expect(sets[i].completed).toBe(true)
      }
    })
  })

  describe('updateCurrentExerciseWeight', () => {
    it('updates weight of current exercise', () => {
      const store = useWorkoutSessionStore.getState()
      store.startWorkout(createMockProgramState(), createMockSettings())

      store.updateCurrentExerciseWeight(110)

      const { workout } = useWorkoutSessionStore.getState()
      expect(workout?.exercises[0].weight).toBe(110)
    })
  })

  describe('nextExercise / prevExercise', () => {
    it('navigates between exercises', () => {
      const store = useWorkoutSessionStore.getState()
      store.startWorkout(createMockProgramState(), createMockSettings())

      expect(useWorkoutSessionStore.getState().currentExerciseIndex).toBe(0)

      store.nextExercise()
      expect(useWorkoutSessionStore.getState().currentExerciseIndex).toBe(1)

      store.nextExercise()
      expect(useWorkoutSessionStore.getState().currentExerciseIndex).toBe(2)

      // Can't go past last exercise
      store.nextExercise()
      expect(useWorkoutSessionStore.getState().currentExerciseIndex).toBe(2)

      store.prevExercise()
      expect(useWorkoutSessionStore.getState().currentExerciseIndex).toBe(1)

      store.prevExercise()
      expect(useWorkoutSessionStore.getState().currentExerciseIndex).toBe(0)

      // Can't go before first exercise
      store.prevExercise()
      expect(useWorkoutSessionStore.getState().currentExerciseIndex).toBe(0)
    })
  })

  describe('isLastExercise', () => {
    it('returns false when not on last exercise', () => {
      const store = useWorkoutSessionStore.getState()
      store.startWorkout(createMockProgramState(), createMockSettings())
      expect(store.isLastExercise()).toBe(false)
    })

    it('returns true when on last exercise', () => {
      const store = useWorkoutSessionStore.getState()
      store.startWorkout(createMockProgramState(), createMockSettings())

      store.nextExercise()
      store.nextExercise()
      expect(store.isLastExercise()).toBe(true)
    })
  })

  describe('isWorkoutComplete', () => {
    it('returns false when sets are incomplete', () => {
      const store = useWorkoutSessionStore.getState()
      store.startWorkout(createMockProgramState(), createMockSettings())
      expect(store.isWorkoutComplete()).toBe(false)
    })

    it('returns true when all sets are completed', () => {
      const store = useWorkoutSessionStore.getState()
      store.startWorkout(createMockProgramState(), createMockSettings())

      // Complete all sets in all exercises
      const { workout } = useWorkoutSessionStore.getState()
      workout?.exercises.forEach((_, exerciseIndex) => {
        useWorkoutSessionStore.setState({ currentExerciseIndex: exerciseIndex })
        const exercise = useWorkoutSessionStore.getState().workout?.exercises[exerciseIndex]
        exercise?.sets.forEach((_, setIndex) => {
          useWorkoutSessionStore.getState().completeSet(setIndex, 5)
        })
      })

      expect(useWorkoutSessionStore.getState().isWorkoutComplete()).toBe(true)
    })
  })

  describe('finishWorkout', () => {
    it('returns completed workout and clears state', () => {
      const store = useWorkoutSessionStore.getState()
      store.startWorkout(createMockProgramState(), createMockSettings())

      const result = store.finishWorkout()

      expect(result).not.toBeNull()
      expect(result?.completed).toBe(true)
      expect(result?.type).toBe('A1')

      // State should be cleared
      const state = useWorkoutSessionStore.getState()
      expect(state.workout).toBeNull()
      expect(state.currentExerciseIndex).toBe(0)
    })

    it('returns null when no workout', () => {
      const store = useWorkoutSessionStore.getState()
      const result = store.finishWorkout()
      expect(result).toBeNull()
    })
  })

  describe('abandonWorkout', () => {
    it('clears workout state', () => {
      const store = useWorkoutSessionStore.getState()
      store.startWorkout(createMockProgramState(), createMockSettings())

      expect(store.hasActiveSession()).toBe(true)

      store.abandonWorkout()

      const state = useWorkoutSessionStore.getState()
      expect(state.workout).toBeNull()
      expect(state.currentExerciseIndex).toBe(0)
      expect(state.hasActiveSession()).toBe(false)
    })
  })

  describe('addT3Exercise', () => {
    it('adds a new T3 exercise to the workout', () => {
      const store = useWorkoutSessionStore.getState()
      store.startWorkout(createMockProgramState(), createMockSettings())

      const initialCount = useWorkoutSessionStore.getState().workout?.exercises.length ?? 0

      store.addT3Exercise('face-pulls', 30)

      const { workout } = useWorkoutSessionStore.getState()
      expect(workout?.exercises).toHaveLength(initialCount + 1)

      const newExercise = workout?.exercises[workout.exercises.length - 1]
      expect(newExercise?.liftId).toBe('face-pulls')
      expect(newExercise?.tier).toBe('T3')
      expect(newExercise?.weight).toBe(30)
    })
  })
})
