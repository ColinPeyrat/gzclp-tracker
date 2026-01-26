import type { Tier, LiftName, ExerciseLog, ExerciseDefinition, LiftSubstitution, WorkoutType, AdditionalT3Assignment, SetLog } from './types'
import { LIFTS, T3_EXERCISES, WORKOUTS } from './types'
import { getStageConfig } from './progression'

const BUILTIN_DUMBBELL_EXERCISES = ['dumbbell-row']

// Get the substitution for a lift (if any)
export function getLiftSubstitution(
  originalId: string,
  liftSubstitutions?: LiftSubstitution[]
): LiftSubstitution | undefined {
  return liftSubstitutions?.find((sub) => sub.originalLiftId === originalId)
}

// Get exercise definition from library
export function getExerciseFromLibrary(
  exerciseId: string,
  exerciseLibrary?: ExerciseDefinition[]
): ExerciseDefinition | undefined {
  return exerciseLibrary?.find((ex) => ex.id === exerciseId)
}

export function isDumbbellExercise(
  liftId: string,
  liftSubstitutions?: LiftSubstitution[],
  exerciseLibrary?: ExerciseDefinition[]
): boolean {
  // Check if there's a substitution for this lift
  const substitution = getLiftSubstitution(liftId, liftSubstitutions)
  if (substitution) {
    // Look up the substitute exercise in the library
    const substituteExercise = getExerciseFromLibrary(substitution.substituteId, exerciseLibrary)
    if (substituteExercise) {
      return substituteExercise.isDumbbell ?? false
    }
  }

  // Check exercise library directly (for T3s that might be in the library)
  const exercise = getExerciseFromLibrary(liftId, exerciseLibrary)
  if (exercise) {
    return exercise.isDumbbell ?? false
  }

  return BUILTIN_DUMBBELL_EXERCISES.includes(liftId)
}

export function getExerciseName(
  liftId: string,
  tier: Tier,
  liftSubstitutions?: LiftSubstitution[],
  exerciseLibrary?: ExerciseDefinition[]
): string {
  // Check if there's a substitution for this lift
  const substitution = getLiftSubstitution(liftId, liftSubstitutions)
  if (substitution) {
    // Look up the substitute exercise in the library
    const substituteExercise = getExerciseFromLibrary(substitution.substituteId, exerciseLibrary)
    if (substituteExercise) {
      return substituteExercise.name
    }
    return substitution.substituteId
  }

  // For T3s, check exercise library first
  if (tier === 'T3') {
    const exercise = getExerciseFromLibrary(liftId, exerciseLibrary)
    if (exercise) return exercise.name
    return T3_EXERCISES[liftId]?.name ?? liftId
  }

  return LIFTS[liftId as LiftName]?.name ?? liftId
}

export const TIER_COLORS: Record<Tier, string> = {
  T1: 'text-blue-400',
  T2: 'text-green-400',
  T3: 'text-yellow-400',
}

// Simple name lookup without substitution logic (for Settings page)
export function getExerciseDisplayName(
  exerciseId: string,
  exerciseLibrary?: ExerciseDefinition[]
): string {
  const exercise = exerciseLibrary?.find((e) => e.id === exerciseId)
  if (exercise) return exercise.name
  const t3 = T3_EXERCISES[exerciseId]
  if (t3) return t3.name
  const lift = LIFTS[exerciseId as LiftName]
  if (lift) return lift.name
  return exerciseId
}

export function getStageFromConfig(exercise: ExerciseLog): 1 | 2 | 3 {
  const { tier, targetSets, targetReps } = exercise

  if (tier === 'T1') {
    if (targetSets === 5 && targetReps === 3) return 1
    if (targetSets === 6 && targetReps === 2) return 2
    if (targetSets === 10 && targetReps === 1) return 3
  }

  if (tier === 'T2') {
    if (targetReps === 10) return 1
    if (targetReps === 8) return 2
    if (targetReps === 6) return 3
  }

  return 1
}

// Get effective stage config, accounting for forceT3Progression substitutions
export function getEffectiveStageConfig(
  tier: 'T1' | 'T2',
  stage: 1 | 2 | 3,
  liftId: string,
  liftSubstitutions?: LiftSubstitution[]
): { sets: number; reps: number; hasAmrap: boolean } {
  const sub = getLiftSubstitution(liftId, liftSubstitutions)
  if (sub?.forceT3Progression) {
    const config = getStageConfig('T3', 1)
    return { sets: config.sets, reps: config.reps, hasAmrap: true }
  }
  const config = getStageConfig(tier, stage)
  return { sets: config.sets, reps: config.reps, hasAmrap: tier === 'T1' }
}

// Get all T3 exercise IDs for a workout (default + additional)
export function getT3IdsForWorkout(
  workoutType: WorkoutType,
  additionalT3s?: AdditionalT3Assignment[]
): string[] {
  const defaultT3 = WORKOUTS[workoutType].t3
  const t3Ids = [defaultT3]
  const additional = additionalT3s?.find((a) => a.workoutType === workoutType)
  if (additional) {
    t3Ids.push(...additional.exerciseIds)
  }
  return t3Ids
}

// Create set logs for an exercise
export function createSetLogs(count: number, hasAmrap: boolean): SetLog[] {
  return Array.from({ length: count }, (_, i) => ({
    setNumber: i + 1,
    reps: 0,
    completed: false,
    isAmrap: hasAmrap && i === count - 1,
  }))
}
