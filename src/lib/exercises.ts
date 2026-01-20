import type { Tier, LiftName, ExerciseLog, CustomExercise } from './types'
import { LIFTS, T3_EXERCISES } from './types'

const BUILTIN_DUMBBELL_EXERCISES = ['dumbbell-row']

export function getCustomExercise(
  originalId: string,
  customExercises?: CustomExercise[]
): CustomExercise | undefined {
  return customExercises?.find((ce) => ce.replacesId === originalId)
}

export function isDumbbellExercise(
  liftId: string,
  customExercises?: CustomExercise[]
): boolean {
  const custom = getCustomExercise(liftId, customExercises)
  if (custom) {
    return custom.isDumbbell ?? false
  }
  return BUILTIN_DUMBBELL_EXERCISES.includes(liftId)
}

export function getExerciseName(
  liftId: string,
  tier: Tier,
  customExercises?: CustomExercise[]
): string {
  const custom = getCustomExercise(liftId, customExercises)
  if (custom) return custom.name

  if (tier === 'T3') {
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
