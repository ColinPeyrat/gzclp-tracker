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

  // Stage 3 - reset to 85% of current weight
  const roundTo = unit === 'kg' ? 2.5 : 5
  const resetWeight = Math.floor((weightLbs * 0.85) / roundTo) * roundTo
  return {
    newState: { ...currentState, stage: 1, weightLbs: resetWeight },
    message: `Reset to 5×3 at ${resetWeight} ${unit} (85%)`,
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

  // Stage 3 - reset to stage 1 with +15 lbs / +7.5 kg from last stage 1 weight
  const baseWeight = lastStage1WeightLbs ?? weightLbs
  const resetIncrement = unit === 'kg' ? 7.5 : 15
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
