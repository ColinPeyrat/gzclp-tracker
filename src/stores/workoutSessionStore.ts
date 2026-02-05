import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { nanoid } from 'nanoid'
import type { Workout, ExerciseLog, UserSettings, ProgramState } from '../lib/types'
import { WORKOUTS } from '../lib/types'
import { getStageConfig } from '../lib/progression'
import { getEffectiveStageConfig, getT3IdsForWorkout, createSetLogs, getLiftSubstitution } from '../lib/exercises'

interface WorkoutSessionState {
  workout: Workout | null
  currentExerciseIndex: number
}

interface WorkoutSessionStore extends WorkoutSessionState {
  // Selectors (computed from state)
  hasActiveSession: () => boolean
  currentExercise: () => ExerciseLog | null
  isLastExercise: () => boolean
  isWorkoutComplete: () => boolean

  // Actions
  startWorkout: (programState: ProgramState, settings: UserSettings) => void
  completeSet: (setIndex: number, reps: number) => void
  failSet: (setIndex: number) => void
  failRemainingCurrentExerciseSets: () => void
  updateCurrentExerciseWeight: (newWeight: number) => void
  nextExercise: () => void
  prevExercise: () => void
  finishWorkout: () => Workout | null
  addT3Exercise: (t3Id: string, weight: number) => void
  abandonWorkout: () => void
}

function createExerciseLogs(
  programState: ProgramState,
  settings: UserSettings
): ExerciseLog[] {
  const workoutDef = WORKOUTS[programState.nextWorkoutType]
  const exercises: ExerciseLog[] = []

  // T1
  const t1State = programState.t1[workoutDef.t1]
  const t1Config = getEffectiveStageConfig('T1', t1State.stage, workoutDef.t1, settings.liftSubstitutions)
  const t1Sub = getLiftSubstitution(workoutDef.t1, settings.liftSubstitutions)
  const t1Weight = t1Sub?.forceT3Progression
    ? Math.max(t1State.weight, programState.t2[workoutDef.t1]?.weight ?? 0)
    : t1State.weight
  exercises.push({
    liftId: workoutDef.t1,
    tier: 'T1',
    weight: t1Weight,
    originalWeight: t1Weight,
    targetSets: t1Config.sets,
    targetReps: t1Config.reps,
    sets: createSetLogs(t1Config.sets, t1Config.hasAmrap),
  })

  // T2
  const t2State = programState.t2[workoutDef.t2]
  const t2Config = getEffectiveStageConfig('T2', t2State.stage, workoutDef.t2, settings.liftSubstitutions)
  const t2Sub = getLiftSubstitution(workoutDef.t2, settings.liftSubstitutions)
  const t2Weight = t2Sub?.forceT3Progression
    ? Math.max(t2State.weight, programState.t1[workoutDef.t2]?.weight ?? 0)
    : t2State.weight
  exercises.push({
    liftId: workoutDef.t2,
    tier: 'T2',
    weight: t2Weight,
    originalWeight: t2Weight,
    targetSets: t2Config.sets,
    targetReps: t2Config.reps,
    sets: createSetLogs(t2Config.sets, t2Config.hasAmrap),
  })

  // T3s
  const t3Config = getStageConfig('T3', 1)
  for (const t3Id of getT3IdsForWorkout(programState.nextWorkoutType, settings.additionalT3s)) {
    exercises.push({
      liftId: t3Id,
      tier: 'T3',
      weight: programState.t3[t3Id]?.weight ?? 50,
      targetSets: t3Config.sets,
      targetReps: t3Config.reps,
      sets: createSetLogs(t3Config.sets, true),
    })
  }

  return exercises
}

export const useWorkoutSessionStore = create<WorkoutSessionStore>()(
  persist(
    (set, get) => ({
      workout: null,
      currentExerciseIndex: 0,

      hasActiveSession: () => get().workout !== null,

      currentExercise: () => {
        const { workout, currentExerciseIndex } = get()
        return workout?.exercises[currentExerciseIndex] ?? null
      },

      isLastExercise: () => {
        const { workout, currentExerciseIndex } = get()
        if (!workout) return false
        return currentExerciseIndex === workout.exercises.length - 1
      },

      isWorkoutComplete: () => {
        const { workout } = get()
        if (!workout) return false
        return workout.exercises.every((ex) =>
          ex.sets.every((s) => s.completed)
        )
      },

      startWorkout: (programState, settings) => {
        // Don't start a new workout if one is already in progress
        if (get().workout) return

        const exercises = createExerciseLogs(programState, settings)
        set({
          workout: {
            id: nanoid(),
            date: new Date().toISOString(),
            type: programState.nextWorkoutType,
            exercises,
            completed: false,
          },
          currentExerciseIndex: 0,
        })
      },

      completeSet: (setIndex, reps) => {
        const { workout, currentExerciseIndex } = get()
        if (!workout) return

        const exercises = [...workout.exercises]
        const exercise = { ...exercises[currentExerciseIndex] }
        exercise.sets = exercise.sets.map((s, i) =>
          i === setIndex ? { ...s, reps, completed: true } : s
        )
        exercises[currentExerciseIndex] = exercise

        set({ workout: { ...workout, exercises } })
      },

      failSet: (setIndex) => {
        const { workout, currentExerciseIndex } = get()
        if (!workout) return

        const exercises = [...workout.exercises]
        const exercise = { ...exercises[currentExerciseIndex] }
        exercise.sets = exercise.sets.map((s, i) =>
          i === setIndex ? { ...s, reps: 0, completed: true } : s
        )
        exercises[currentExerciseIndex] = exercise

        set({ workout: { ...workout, exercises } })
      },

      failRemainingCurrentExerciseSets: () => {
        const { workout, currentExerciseIndex } = get()
        if (!workout) return

        const exercises = [...workout.exercises]
        const exercise = { ...exercises[currentExerciseIndex] }
        exercise.sets = exercise.sets.map((s) =>
          s.completed ? s : { ...s, reps: 0, completed: true }
        )
        exercises[currentExerciseIndex] = exercise

        set({ workout: { ...workout, exercises } })
      },

      updateCurrentExerciseWeight: (newWeight) => {
        const { workout, currentExerciseIndex } = get()
        if (!workout) return

        const exercises = [...workout.exercises]
        exercises[currentExerciseIndex] = {
          ...exercises[currentExerciseIndex],
          weight: newWeight,
        }

        set({ workout: { ...workout, exercises } })
      },

      nextExercise: () => {
        const { workout, currentExerciseIndex } = get()
        if (!workout) return
        if (currentExerciseIndex < workout.exercises.length - 1) {
          set({ currentExerciseIndex: currentExerciseIndex + 1 })
        }
      },

      prevExercise: () => {
        const { currentExerciseIndex } = get()
        if (currentExerciseIndex > 0) {
          set({ currentExerciseIndex: currentExerciseIndex - 1 })
        }
      },

      finishWorkout: () => {
        const { workout } = get()
        if (!workout) return null

        const completedWorkout = { ...workout, completed: true }
        set({ workout: null, currentExerciseIndex: 0 })
        return completedWorkout
      },

      addT3Exercise: (t3Id, weight) => {
        const { workout } = get()
        if (!workout) return

        const t3Config = getStageConfig('T3', 1)
        const newExercise: ExerciseLog = {
          liftId: t3Id,
          tier: 'T3',
          weight,
          targetSets: t3Config.sets,
          targetReps: t3Config.reps,
          sets: createSetLogs(t3Config.sets, true),
        }

        set({
          workout: {
            ...workout,
            exercises: [...workout.exercises, newExercise],
          },
        })
      },

      abandonWorkout: () => {
        set({ workout: null, currentExerciseIndex: 0 })
      },
    }),
    {
      name: 'workout-session',
      partialize: (state) => ({
        workout: state.workout,
        currentExerciseIndex: state.currentExerciseIndex,
      }),
    }
  )
)
