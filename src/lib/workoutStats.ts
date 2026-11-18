import type { Workout, WeightUnit, LiftSubstitution, ExerciseDefinition, Tier } from './types'
import { getLiftSubstitution, isDumbbellExercise } from './exercises'
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
  getExerciseNameFn?: (liftId: string, tier: Tier) => string,
  exerciseLibrary?: ExerciseDefinition[]
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

    // Saved flag first: current settings may have switched equipment since this workout
    const isDumbbell =
      exercise.isDumbbell ?? isDumbbellExercise(exercise.liftId, liftSubstitutions, exerciseLibrary)
    const pairFactor = isDumbbell ? 2 : 1
    const effectiveWeight = exercise.weight * pairFactor

    // Use persisted warmup data if available, otherwise estimate for barbell T1s
    if (exercise.completedWarmupSets) {
      for (const warmupSet of exercise.completedWarmupSets) {
        warmupVolume += warmupSet.weight * pairFactor * warmupSet.reps
      }
    } else if (exercise.tier === 'T1' && !isDumbbell) {
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
        const setWeight = set.weight === undefined ? effectiveWeight : set.weight * pairFactor
        workingVolume += setWeight * set.reps
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
