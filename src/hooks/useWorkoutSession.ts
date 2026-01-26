import { useState, useCallback, useMemo } from 'react'
import { nanoid } from 'nanoid'
import type { Workout, ExerciseLog, UserSettings, ProgramState } from '../lib/types'
import { WORKOUTS } from '../lib/types'
import { getStageConfig } from '../lib/progression'
import { getEffectiveStageConfig, getT3IdsForWorkout, createSetLogs } from '../lib/exercises'
export { getExerciseName } from '../lib/exercises'

interface WorkoutSession {
  workout: Workout
  currentExerciseIndex: number
  currentExercise: ExerciseLog
  isLastExercise: boolean
  isWorkoutComplete: boolean
}

interface UseWorkoutSessionReturn {
  session: WorkoutSession | null
  startWorkout: (programState: ProgramState, settings: UserSettings) => void
  completeSet: (setIndex: number, reps: number) => void
  failSet: (setIndex: number) => void
  failRemainingCurrentExerciseSets: () => void
  updateCurrentExerciseWeight: (newWeight: number) => void
  nextExercise: () => void
  prevExercise: () => void
  finishWorkout: () => Workout | null
  addT3Exercise: (t3Id: string, weight: number) => void
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
  exercises.push({
    liftId: workoutDef.t1,
    tier: 'T1',
    weight: t1State.weight,
    targetSets: t1Config.sets,
    targetReps: t1Config.reps,
    sets: createSetLogs(t1Config.sets, t1Config.hasAmrap),
  })

  // T2
  const t2State = programState.t2[workoutDef.t2]
  const t2Config = getEffectiveStageConfig('T2', t2State.stage, workoutDef.t2, settings.liftSubstitutions)
  exercises.push({
    liftId: workoutDef.t2,
    tier: 'T2',
    weight: t2State.weight,
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

export function useWorkoutSession(): UseWorkoutSessionReturn {
  const [workout, setWorkout] = useState<Workout | null>(null)
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0)

  const session = useMemo<WorkoutSession | null>(() => {
    if (!workout) return null
    return {
      workout,
      currentExerciseIndex,
      currentExercise: workout.exercises[currentExerciseIndex],
      isLastExercise: currentExerciseIndex === workout.exercises.length - 1,
      isWorkoutComplete: workout.exercises.every((ex) =>
        ex.sets.every((s) => s.completed)
      ),
    }
  }, [workout, currentExerciseIndex])

  // Helper to update current exercise immutably
  const updateCurrentExercise = useCallback(
    (updater: (exercise: ExerciseLog) => ExerciseLog) => {
      setWorkout((prev) => {
        if (!prev) return null
        const exercises = [...prev.exercises]
        exercises[currentExerciseIndex] = updater(exercises[currentExerciseIndex])
        return { ...prev, exercises }
      })
    },
    [currentExerciseIndex]
  )

  const startWorkout = useCallback(
    (programState: ProgramState, settings: UserSettings) => {
      const exercises = createExerciseLogs(programState, settings)
      setWorkout({
        id: nanoid(),
        date: new Date().toISOString(),
        type: programState.nextWorkoutType,
        exercises,
        completed: false,
      })
      setCurrentExerciseIndex(0)
    },
    []
  )

  const addT3Exercise = useCallback((t3Id: string, weight: number) => {
    setWorkout((prev) => {
      if (!prev) return null
      const t3Config = getStageConfig('T3', 1)
      const newExercise: ExerciseLog = {
        liftId: t3Id,
        tier: 'T3',
        weight,
        targetSets: t3Config.sets,
        targetReps: t3Config.reps,
        sets: createSetLogs(t3Config.sets, true),
      }
      return { ...prev, exercises: [...prev.exercises, newExercise] }
    })
  }, [])

  const completeSet = useCallback(
    (setIndex: number, reps: number) => {
      updateCurrentExercise((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set, i) =>
          i === setIndex ? { ...set, reps, completed: true } : set
        ),
      }))
    },
    [updateCurrentExercise]
  )

  const failSet = useCallback(
    (setIndex: number) => {
      updateCurrentExercise((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set, i) =>
          i === setIndex ? { ...set, reps: 0, completed: true } : set
        ),
      }))
    },
    [updateCurrentExercise]
  )

  const failRemainingCurrentExerciseSets = useCallback(() => {
    updateCurrentExercise((exercise) => ({
      ...exercise,
      sets: exercise.sets.map((set) =>
        set.completed ? set : { ...set, reps: 0, completed: true }
      ),
    }))
  }, [updateCurrentExercise])

  const updateCurrentExerciseWeight = useCallback(
    (newWeight: number) => {
      updateCurrentExercise((exercise) => ({ ...exercise, weight: newWeight }))
    },
    [updateCurrentExercise]
  )

  const nextExercise = useCallback(() => {
    setCurrentExerciseIndex((prev) =>
      prev < (workout?.exercises.length ?? 1) - 1 ? prev + 1 : prev
    )
  }, [workout])

  const prevExercise = useCallback(() => {
    setCurrentExerciseIndex((prev) => (prev > 0 ? prev - 1 : prev))
  }, [])

  const finishWorkout = useCallback((): Workout | null => {
    if (!workout) return null
    const completedWorkout = { ...workout, completed: true }
    setWorkout(null)
    setCurrentExerciseIndex(0)
    return completedWorkout
  }, [workout])

  return {
    session,
    startWorkout,
    completeSet,
    failSet,
    failRemainingCurrentExerciseSets,
    updateCurrentExerciseWeight,
    nextExercise,
    prevExercise,
    finishWorkout,
    addT3Exercise,
  }
}
