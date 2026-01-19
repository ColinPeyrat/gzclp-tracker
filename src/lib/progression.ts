import type { LiftState, Tier, LiftName, ExerciseLog, WeightUnit } from './types'

interface StageConfig {
  sets: number
  reps: number
}

const T1_STAGES: Record<1 | 2 | 3, StageConfig> = {
  1: { sets: 5, reps: 3 },
  2: { sets: 6, reps: 2 },
  3: { sets: 10, reps: 1 },
}

const T2_STAGES: Record<1 | 2 | 3, StageConfig> = {
  1: { sets: 3, reps: 10 },
  2: { sets: 3, reps: 8 },
  3: { sets: 3, reps: 6 },
}

const T3_CONFIG: StageConfig = { sets: 3, reps: 15 }

export function getStageConfig(tier: Tier, stage: 1 | 2 | 3): StageConfig {
  if (tier === 'T1') return T1_STAGES[stage]
  if (tier === 'T2') return T2_STAGES[stage]
  return T3_CONFIG
}

export function getTotalReps(exercise: ExerciseLog): number {
  return exercise.sets.reduce((sum, set) => sum + set.reps, 0)
}

export function getTargetTotalReps(exercise: ExerciseLog): number {
  return exercise.targetSets * exercise.targetReps
}

export function didHitRepTarget(exercise: ExerciseLog): boolean {
  const totalReps = getTotalReps(exercise)
  const targetTotal = getTargetTotalReps(exercise)
  return totalReps >= targetTotal
}

export function getAmrapReps(exercise: ExerciseLog): number | undefined {
  const amrapSet = exercise.sets.find((s) => s.isAmrap)
  return amrapSet?.reps
}

export interface ProgressionResult {
  newState: LiftState
  message: string
}

export function calculateT1Progression(
  currentState: LiftState,
  exercise: ExerciseLog,
  increment: number,
  unit: WeightUnit
): ProgressionResult {
  const success = didHitRepTarget(exercise)
  const { stage, weightLbs } = currentState

  if (success) {
    const newWeight = weightLbs + increment
    return {
      newState: { ...currentState, weightLbs: newWeight },
      message: `+${increment} ${unit} → ${newWeight} ${unit}`,
    }
  }

  if (stage === 1) {
    return {
      newState: { ...currentState, stage: 2 },
      message: `Moving to 6×2 at ${weightLbs} ${unit}`,
    }
  }

  if (stage === 2) {
    return {
      newState: { ...currentState, stage: 3 },
      message: `Moving to 10×1 at ${weightLbs} ${unit}`,
    }
  }

  // Stage 3 failure - set pending5RMTest flag, store AMRAP data for estimation
  const amrapReps = getAmrapReps(exercise) ?? 0
  return {
    newState: {
      ...currentState,
      pending5RMTest: true,
      lastAmrapReps: amrapReps,
      lastAmrapWeight: weightLbs,
    },
    message: `Test new 5RM to reset`,
  }
}

export function calculateT2Progression(
  currentState: LiftState,
  exercise: ExerciseLog,
  increment: number,
  unit: WeightUnit
): ProgressionResult {
  const success = didHitRepTarget(exercise)
  const { stage, weightLbs, lastStage1WeightLbs } = currentState

  if (success) {
    const newWeight = weightLbs + increment
    const newState: LiftState = {
      ...currentState,
      weightLbs: newWeight,
      lastStage1WeightLbs: stage === 1 ? weightLbs : lastStage1WeightLbs,
    }
    return {
      newState,
      message: `+${increment} ${unit} → ${newWeight} ${unit}`,
    }
  }

  if (stage === 1) {
    return {
      newState: { ...currentState, stage: 2 },
      message: `Moving to 3×8 at ${weightLbs} ${unit}`,
    }
  }

  if (stage === 2) {
    return {
      newState: { ...currentState, stage: 3 },
      message: `Moving to 3×6 at ${weightLbs} ${unit}`,
    }
  }

  // Stage 3 - reset to stage 1 with +20 lbs / +10 kg from last stage 1 weight
  const baseWeight = lastStage1WeightLbs ?? weightLbs
  const resetIncrement = unit === 'kg' ? 10 : 20
  const resetWeight = baseWeight + resetIncrement
  return {
    newState: {
      ...currentState,
      stage: 1,
      weightLbs: resetWeight,
      lastStage1WeightLbs: undefined,
    },
    message: `Reset to 3×10 at ${resetWeight} ${unit}`,
  }
}

export function shouldIncreaseT3Weight(amrapReps: number): boolean {
  return amrapReps >= 25
}

export function calculateT3Progression(
  currentWeight: number,
  amrapReps: number,
  increment: number
): { newWeight: number; increased: boolean } {
  if (amrapReps >= 25) {
    return { newWeight: currentWeight + increment, increased: true }
  }
  return { newWeight: currentWeight, increased: false }
}

export function createInitialLiftState(
  liftId: LiftName,
  tier: 'T1' | 'T2',
  weight: number
): LiftState {
  return {
    liftId,
    tier,
    weightLbs: weight,
    stage: 1,
  }
}

export function estimate5RM(weight: number, amrapReps: number, unit: WeightUnit): number {
  // Epley formula: 1RM = weight × (1 + reps/30)
  const estimated1RM = weight * (1 + amrapReps / 30)
  // 5RM ≈ 87% of 1RM
  const estimated5RM = estimated1RM * 0.87
  // Round to nearest increment
  const roundTo = unit === 'kg' ? 2.5 : 5
  return Math.round(estimated5RM / roundTo) * roundTo
}

export function applyT1Reset(currentState: LiftState, new5RM: number, unit: WeightUnit): LiftState {
  const roundTo = unit === 'kg' ? 2.5 : 5
  const resetWeight = Math.round((new5RM * 0.85) / roundTo) * roundTo
  return {
    ...currentState,
    stage: 1,
    weightLbs: resetWeight,
    pending5RMTest: undefined,
    lastAmrapReps: undefined,
    lastAmrapWeight: undefined,
  }
}
