import { useState, useCallback, useMemo } from 'react'
import { nanoid } from 'nanoid'
import type { Workout, ExerciseLog, UserSettings } from '../lib/types'
import { WORKOUTS } from '../lib/types'
import { getStageConfig } from '../lib/progression'
import { getLiftSubstitution } from '../lib/exercises'
import type { ProgramState } from '../lib/types'
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
  addT3Exercise: (t3Id: string, weightLbs: number) => void
}

function createExerciseLogs(
  programState: ProgramState,
  settings: UserSettings
): ExerciseLog[] {
  const workoutDef = WORKOUTS[programState.nextWorkoutType]
  const liftSubstitutions = settings.liftSubstitutions
  const exercises: ExerciseLog[] = []

  // T1
  const t1Substitution = getLiftSubstitution(workoutDef.t1, liftSubstitutions)
  const t1State = programState.t1[workoutDef.t1]
  if (t1Substitution?.forceT3Progression) {
    // Use T3-style progression (3×15+)
    const t3Config = getStageConfig('T3', 1)
    exercises.push({
      liftId: workoutDef.t1,
      tier: 'T1',
      weightLbs: t1State.weightLbs,
      targetSets: t3Config.sets,
      targetReps: t3Config.reps,
      sets: Array.from({ length: t3Config.sets }, (_, i) => ({
        setNumber: i + 1,
        reps: 0,
        completed: false,
        isAmrap: i === t3Config.sets - 1,
      })),
    })
  } else {
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
  }

  // T2
  const t2Substitution = getLiftSubstitution(workoutDef.t2, liftSubstitutions)
  const t2State = programState.t2[workoutDef.t2]
  if (t2Substitution?.forceT3Progression) {
    // Use T3-style progression (3×15+)
    const t3Config = getStageConfig('T3', 1)
    exercises.push({
      liftId: workoutDef.t2,
      tier: 'T2',
      weightLbs: t2State.weightLbs,
      targetSets: t3Config.sets,
      targetReps: t3Config.reps,
      sets: Array.from({ length: t3Config.sets }, (_, i) => ({
        setNumber: i + 1,
        reps: 0,
        completed: false,
        isAmrap: i === t3Config.sets - 1,
      })),
    })
  } else {
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
  }

  // T3s - default T3 from WORKOUTS + any additional T3s
  const t3Config = getStageConfig('T3', 1)
  const t3Ids: string[] = [workoutDef.t3] // Start with default T3

  // Add any additional T3s for this workout
  const additionalAssignment = settings.additionalT3s?.find(
    (a) => a.workoutType === programState.nextWorkoutType
  )
  if (additionalAssignment) {
    t3Ids.push(...additionalAssignment.exerciseIds)
  }

  for (const t3Id of t3Ids) {
    const t3Weight = programState.t3[t3Id]?.weightLbs ?? 50
    exercises.push({
      liftId: t3Id,
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

  const addT3Exercise = useCallback((t3Id: string, weightLbs: number) => {
    setWorkout((prev) => {
      if (!prev) return null
      const t3Config = getStageConfig('T3', 1)
      const newExercise: ExerciseLog = {
        liftId: t3Id,
        tier: 'T3',
        weightLbs,
        targetSets: t3Config.sets,
        targetReps: t3Config.reps,
        sets: Array.from({ length: t3Config.sets }, (_, i) => ({
          setNumber: i + 1,
          reps: 0,
          completed: false,
          isAmrap: i === t3Config.sets - 1,
        })),
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
      updateCurrentExercise((exercise) => ({ ...exercise, weightLbs: newWeight }))
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
