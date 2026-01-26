import type { ExerciseLog } from './types'
import { didHitRepTarget } from './progression'

export type LiftStatus = 'success' | 'fail' | 'neutral'

export function getLiftStatus(exercise: ExerciseLog): LiftStatus {
  if (exercise.tier === 'T3') {
    const amrapSet = exercise.sets.find((s) => s.isAmrap)
    const amrapReps = amrapSet?.reps ?? 0
    return amrapReps >= 25 ? 'success' : 'neutral'
  }
  return didHitRepTarget(exercise) ? 'success' : 'fail'
}

export function getT3Labels(count: number): string[] {
  if (count <= 1) return ['T3']
  return Array.from({ length: count }, (_, i) => `T3.${i + 1}`)
}
