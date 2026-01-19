import { useState, useCallback, useMemo } from 'react'
import { nanoid } from 'nanoid'
import type { Workout, ExerciseLog, Tier } from '../lib/types'
import { WORKOUTS, LIFTS, T3_EXERCISES } from '../lib/types'
import { getStageConfig } from '../lib/progression'
import type { ProgramState } from '../lib/types'

interface WorkoutSession {
  workout: Workout
  currentExerciseIndex: number
  currentExercise: ExerciseLog
  isLastExercise: boolean
  isWorkoutComplete: boolean
}

interface UseWorkoutSessionReturn {
  session: WorkoutSession | null
  startWorkout: (programState: ProgramState) => void
  completeSet: (setIndex: number, reps: number) => void
  failSet: (setIndex: number) => void
  nextExercise: () => void
  prevExercise: () => void
  finishWorkout: () => Workout | null
}

function createExerciseLogs(programState: ProgramState): ExerciseLog[] {
  const workoutDef = WORKOUTS[programState.nextWorkoutType]
  const exercises: ExerciseLog[] = []

  // T1
  const t1State = programState.t1[workoutDef.t1]
  const t1Config = getStageConfig('T1', t1State.stage)
  exercises.push({
    liftId: workoutDef.t1,
    tier: 'T1',
    weightLbs: t1State.weightLbs,
    targetSets: t1Config.sets,
    targetReps: t1Config.reps,
    sets: Array.from({ length: t1Config.sets }, (_, i) => ({
      setNumber: i + 1,
      reps: 0,
      completed: false,
      isAmrap: i === t1Config.sets - 1,
    })),
  })

  // T2
  const t2State = programState.t2[workoutDef.t2]
  const t2Config = getStageConfig('T2', t2State.stage)
  exercises.push({
    liftId: workoutDef.t2,
    tier: 'T2',
    weightLbs: t2State.weightLbs,
    targetSets: t2Config.sets,
    targetReps: t2Config.reps,
    sets: Array.from({ length: t2Config.sets }, (_, i) => ({
      setNumber: i + 1,
      reps: 0,
      completed: false,
      isAmrap: false,
    })),
  })

  // T3
  const t3Weight = programState.t3[workoutDef.t3]?.weightLbs ?? 50
  const t3Config = getStageConfig('T3', 1)
  exercises.push({
    liftId: workoutDef.t3,
    tier: 'T3',
    weightLbs: t3Weight,
    targetSets: t3Config.sets,
    targetReps: t3Config.reps,
    sets: Array.from({ length: t3Config.sets }, (_, i) => ({
      setNumber: i + 1,
      reps: 0,
      completed: false,
      isAmrap: i === t3Config.sets - 1,
    })),
  })

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

  const startWorkout = useCallback((programState: ProgramState) => {
    const exercises = createExerciseLogs(programState)
    setWorkout({
      id: nanoid(),
      date: new Date().toISOString(),
      type: programState.nextWorkoutType,
      exercises,
      completed: false,
    })
    setCurrentExerciseIndex(0)
  }, [])

  const completeSet = useCallback((setIndex: number, reps: number) => {
    setWorkout((prev) => {
      if (!prev) return null
      const exercises = [...prev.exercises]
      const exercise = { ...exercises[currentExerciseIndex] }
      const sets = [...exercise.sets]
      sets[setIndex] = { ...sets[setIndex], reps, completed: true }
      exercise.sets = sets
      exercises[currentExerciseIndex] = exercise
      return { ...prev, exercises }
    })
  }, [currentExerciseIndex])

  const failSet = useCallback((setIndex: number) => {
    setWorkout((prev) => {
      if (!prev) return null
      const exercises = [...prev.exercises]
      const exercise = { ...exercises[currentExerciseIndex] }
      const sets = [...exercise.sets]
      sets[setIndex] = { ...sets[setIndex], reps: 0, completed: false }
      exercise.sets = sets
      exercises[currentExerciseIndex] = exercise
      return { ...prev, exercises }
    })
  }, [currentExerciseIndex])

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
    nextExercise,
    prevExercise,
    finishWorkout,
  }
}

export function getExerciseName(liftId: string, tier: Tier): string {
  if (tier === 'T3') {
    return T3_EXERCISES[liftId]?.name ?? liftId
  }
  return LIFTS[liftId as keyof typeof LIFTS]?.name ?? liftId
}
