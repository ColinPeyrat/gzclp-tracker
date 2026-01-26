import type { Tier, LiftName, ExerciseLog, ExerciseDefinition, LiftSubstitution } from './types'
import { LIFTS, T3_EXERCISES } from './types'

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
