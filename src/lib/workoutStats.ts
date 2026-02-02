import type { Workout, WeightUnit, LiftSubstitution, Tier } from './types'
import { getLiftSubstitution } from './exercises'
import { calculateWarmupSets } from './warmup'

export interface WorkoutStats {
  workingVolume: number
  warmupVolume: number
  totalVolume: number
  totalSets: number
  totalReps: number
  completedSets: number
  successRate: number
  heaviestLift: { name: string; weight: number }
}

export function calculateWorkoutStats(
  workout: Workout,
  barWeight: number,
  plateInventory: Record<string, number>,
  unit: WeightUnit,
  liftSubstitutions?: LiftSubstitution[],
  getExerciseNameFn?: (liftId: string, tier: Tier) => string
): WorkoutStats {
  let workingVolume = 0
  let warmupVolume = 0
  let totalSets = 0
  let totalReps = 0
  let completedSets = 0
  let heaviestLift = { name: '', weight: 0 }

  for (const exercise of workout.exercises) {
    const exerciseName = getExerciseNameFn
      ? getExerciseNameFn(exercise.liftId, exercise.tier)
      : exercise.liftId

    // Calculate warmup volume for T1 exercises (excluding those with forceT3Progression)
    if (exercise.tier === 'T1') {
      const liftSubstitution = getLiftSubstitution(exercise.liftId, liftSubstitutions)
      if (!liftSubstitution?.forceT3Progression) {
        const warmupSets = calculateWarmupSets(exercise.weight, barWeight, plateInventory, unit)
        for (const warmupSet of warmupSets) {
          warmupVolume += warmupSet.weight * warmupSet.reps
        }
      }
    }

    for (const set of exercise.sets) {
      totalSets++
      if (set.completed && set.reps > 0) {
        completedSets++
        totalReps += set.reps
        workingVolume += exercise.weight * set.reps
      }
    }

    if (exercise.weight > heaviestLift.weight) {
      heaviestLift = { name: exerciseName, weight: exercise.weight }
    }
  }

  const totalVolume = workingVolume + warmupVolume
  const successRate = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0

  return {
    workingVolume,
    warmupVolume,
    totalVolume,
    totalSets,
    totalReps,
    completedSets,
    successRate,
    heaviestLift,
  }
}
