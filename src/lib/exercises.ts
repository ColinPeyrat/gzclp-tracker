import type { Tier, LiftName, ExerciseLog } from './types'
import { LIFTS, T3_EXERCISES } from './types'

export function getExerciseName(liftId: string, tier: Tier): string {
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
