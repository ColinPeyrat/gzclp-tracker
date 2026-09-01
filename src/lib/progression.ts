import type { LiftState, Tier, LiftName, ExerciseLog, WeightUnit, MaintenanceOverride } from './types'

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

export function isTrialWeight(exercise: ExerciseLog): boolean {
  return exercise.originalWeight !== undefined &&
         exercise.weight !== exercise.originalWeight
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
  const { stage, weight } = currentState

  if (success) {
    const newWeight = exercise.weight + increment
    return {
      newState: { ...currentState, weight: newWeight, lastSuccessWeight: exercise.weight },
      message: `+${increment} ${unit} → ${newWeight} ${unit}`,
    }
  }

  // Trial weight failure: no penalty, return unchanged state
  if (isTrialWeight(exercise)) {
    return {
      newState: currentState,
      message: `Trial at ${exercise.weight} ${unit} failed, keeping ${weight} ${unit}`,
    }
  }

  if (stage === 1) {
    return {
      newState: { ...currentState, stage: 2 },
      message: `Moving to 6×2 at ${weight} ${unit}`,
    }
  }

  if (stage === 2) {
    return {
      newState: { ...currentState, stage: 3 },
      message: `Moving to 10×1 at ${weight} ${unit}`,
    }
  }

  // Stage 3 failure - set pending5RMTest flag, store best set for estimation
  const bestReps = Math.max(...exercise.sets.filter(s => s.completed).map(s => s.reps), 0)
  return {
    newState: {
      ...currentState,
      pending5RMTest: true,
      bestSetReps: bestReps,
      bestSetWeight: weight,
    },
    message: `New cycle: test 5RM first`,
  }
}

export function calculateT2Progression(
  currentState: LiftState,
  exercise: ExerciseLog,
  increment: number,
  unit: WeightUnit
): ProgressionResult {
  const success = didHitRepTarget(exercise)
  const { stage, weight, lastStage1Weight } = currentState

  if (success) {
    const newWeight = exercise.weight + increment
    const newState: LiftState = {
      ...currentState,
      weight: newWeight,
      lastStage1Weight: stage === 1 ? exercise.weight : lastStage1Weight,
      lastSuccessWeight: exercise.weight,
    }
    return {
      newState,
      message: `+${increment} ${unit} → ${newWeight} ${unit}`,
    }
  }

  // Trial weight failure: no penalty, return unchanged state
  if (isTrialWeight(exercise)) {
    return {
      newState: currentState,
      message: `Trial at ${exercise.weight} ${unit} failed, keeping ${weight} ${unit}`,
    }
  }

  if (stage === 1) {
    return {
      newState: { ...currentState, stage: 2 },
      message: `Moving to 3×8 at ${weight} ${unit}`,
    }
  }

  if (stage === 2) {
    return {
      newState: { ...currentState, stage: 3 },
      message: `Moving to 3×6 at ${weight} ${unit}`,
    }
  }

  // Stage 3 - reset to stage 1 with +20 lbs / +10 kg from last stage 1 weight
  const baseWeight = lastStage1Weight ?? weight
  const resetIncrement = unit === 'kg' ? 10 : 20
  const resetWeight = baseWeight + resetIncrement
  return {
    newState: {
      ...currentState,
      stage: 1,
      weight: resetWeight,
      lastStage1Weight: undefined,
      lastSuccessWeight: undefined,
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
  startingWeight: number
): LiftState {
  return {
    liftId,
    tier,
    weight: startingWeight,
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

// Maintenance targets ~80% of a stage 1 (triples) weight. lastSuccessWeight is a
// shorter-rep weight at later stages, so the percentage drops to compensate and keep
// the prescribed load flat. See docs/adr/0001-maintenance-day-prescription.md
const MAINTENANCE_PERCENTAGE: Record<1 | 2 | 3, number> = { 1: 0.8, 2: 0.75, 3: 0.7 }

export function getMaintenanceWeight(liftState: LiftState, unit: WeightUnit): number {
  const base = liftState.lastSuccessWeight ?? liftState.weight
  const roundTo = unit === 'kg' ? 2.5 : 5
  return Math.round((base * MAINTENANCE_PERCENTAGE[liftState.stage]) / roundTo) * roundTo
}

// A manual override is flagged once the computed weight drifts this far from the value
// it had when the override was set - deliberate offsets stay quiet, a changed lifter does not
const MAINTENANCE_DRIFT_THRESHOLD = 0.1

export interface MaintenancePrescription {
  weight: number
  autoWeight: number
  isOverridden: boolean
  hasDrifted: boolean
}

export function getMaintenancePrescription(
  liftState: LiftState,
  unit: WeightUnit,
  override?: MaintenanceOverride
): MaintenancePrescription {
  const autoWeight = getMaintenanceWeight(liftState, unit)

  if (!override) {
    return { weight: autoWeight, autoWeight, isOverridden: false, hasDrifted: false }
  }

  const drift = override.autoAtSet > 0
    ? Math.abs(autoWeight - override.autoAtSet) / override.autoAtSet
    : 0

  return {
    weight: override.weight,
    autoWeight,
    isOverridden: true,
    hasDrifted: drift > MAINTENANCE_DRIFT_THRESHOLD,
  }
}

export function applyT1Reset(currentState: LiftState, new5RM: number, unit: WeightUnit): LiftState {
  const roundTo = unit === 'kg' ? 2.5 : 5
  const resetWeight = Math.round((new5RM * 0.85) / roundTo) * roundTo
  return {
    ...currentState,
    stage: 1,
    weight: resetWeight,
    pending5RMTest: undefined,
    bestSetReps: undefined,
    bestSetWeight: undefined,
    lastSuccessWeight: undefined,
  }
}

// Unified workout progression - calculates new program state after completing a workout
import type { Workout, ProgramState, LiftSubstitution } from './types'
import { LIFTS, WORKOUTS } from './types'

interface ProgressionContext {
  unit: WeightUnit
  plateInventory: Record<string, number>
  liftSubstitutions?: LiftSubstitution[]
  getSmallestPlate: (inventory: Record<string, number>) => number
}

function applyT3StyleProgression(
  currentWeight: number,
  exercise: ExerciseLog,
  smallestPlate: number
): number | null {
  const amrapSet = exercise.sets.find((s) => s.isAmrap)
  if (!amrapSet) return null
  const result = calculateT3Progression(currentWeight, amrapSet.reps, smallestPlate)
  return result.increased ? result.newWeight : null
}

function getLiftSubstitution(liftId: string, subs?: LiftSubstitution[]): LiftSubstitution | undefined {
  return subs?.find((s) => s.originalLiftId === liftId)
}

function getIncrement(tier: 'T1' | 'T2', isLower: boolean, unit: WeightUnit): number {
  const increments = {
    kg: { T1: { upper: 2.5, lower: 5 }, T2: { upper: 1.25, lower: 2.5 } },
    lbs: { T1: { upper: 5, lower: 10 }, T2: { upper: 2.5, lower: 5 } },
  }
  return increments[unit][tier][isLower ? 'lower' : 'upper']
}

export function applyWorkoutProgression(
  workout: Workout,
  programState: ProgramState,
  ctx: ProgressionContext
): ProgramState {
  if (workout.type === 'MN') return programState
  const workoutDef = WORKOUTS[workout.type]
  const newState = { ...programState }
  const smallestPlate = ctx.getSmallestPlate(ctx.plateInventory)

  // T1 progression
  const t1Exercise = workout.exercises.find((e) => e.tier === 'T1')
  if (t1Exercise) {
    const liftId = workoutDef.t1
    const currentState = programState.t1[liftId]
    const sub = getLiftSubstitution(liftId, ctx.liftSubstitutions)

    if (sub?.forceT3Progression) {
      const syncedWeight = Math.max(currentState.weight, programState.t2[liftId]?.weight ?? 0)
      const newWeight = applyT3StyleProgression(syncedWeight, t1Exercise, smallestPlate)
      const updated: LiftState = {
        ...currentState,
        weight: newWeight ?? currentState.weight,
        lastSuccessWeight: t1Exercise.weight,
      }
      newState.t1 = { ...newState.t1, [liftId]: updated }
    } else {
      const increment = getIncrement('T1', LIFTS[liftId].isLower, ctx.unit)
      const result = calculateT1Progression(currentState, t1Exercise, increment, ctx.unit)
      newState.t1 = { ...newState.t1, [liftId]: result.newState }
    }
  }

  // T2 progression
  const t2Exercise = workout.exercises.find((e) => e.tier === 'T2')
  if (t2Exercise) {
    const liftId = workoutDef.t2
    const currentState = programState.t2[liftId]
    const sub = getLiftSubstitution(liftId, ctx.liftSubstitutions)

    if (sub?.forceT3Progression) {
      const syncedWeight = Math.max(currentState.weight, programState.t1[liftId]?.weight ?? 0)
      const newWeight = applyT3StyleProgression(syncedWeight, t2Exercise, smallestPlate)
      const updated: LiftState = {
        ...currentState,
        weight: newWeight ?? currentState.weight,
        lastSuccessWeight: t2Exercise.weight,
      }
      newState.t2 = { ...newState.t2, [liftId]: updated }
    } else {
      const increment = getIncrement('T2', LIFTS[liftId].isLower, ctx.unit)
      const result = calculateT2Progression(currentState, t2Exercise, increment, ctx.unit)
      newState.t2 = { ...newState.t2, [liftId]: result.newState }
    }
  }

  // Sync forceT3Progression weights between T1 and T2
  for (const liftId of Object.keys(newState.t1) as LiftName[]) {
    const sub = getLiftSubstitution(liftId, ctx.liftSubstitutions)
    if (sub?.forceT3Progression) {
      const t1Weight = newState.t1[liftId].weight
      const t2Weight = newState.t2[liftId].weight
      const syncedWeight = Math.max(t1Weight, t2Weight)
      const t1Last = newState.t1[liftId].lastSuccessWeight ?? 0
      const t2Last = newState.t2[liftId].lastSuccessWeight ?? 0
      const syncedLast = Math.max(t1Last, t2Last) || undefined
      if (t1Weight !== syncedWeight || newState.t1[liftId].lastSuccessWeight !== syncedLast) {
        newState.t1 = { ...newState.t1, [liftId]: { ...newState.t1[liftId], weight: syncedWeight, lastSuccessWeight: syncedLast } }
      }
      if (t2Weight !== syncedWeight || newState.t2[liftId].lastSuccessWeight !== syncedLast) {
        newState.t2 = { ...newState.t2, [liftId]: { ...newState.t2[liftId], weight: syncedWeight, lastSuccessWeight: syncedLast } }
      }
    }
  }

  // T3 progression - all T3 exercises
  for (const t3Exercise of workout.exercises.filter((e) => e.tier === 'T3')) {
    const t3Id = t3Exercise.liftId
    const currentWeight = programState.t3[t3Id]?.weight ?? t3Exercise.weight
    const newWeight = applyT3StyleProgression(currentWeight, t3Exercise, smallestPlate)
    if (newWeight !== null) {
      newState.t3 = { ...newState.t3, [t3Id]: { weight: newWeight } }
    }
  }

  // Advance to next workout
  const workoutOrder = ['A1', 'A2', 'B1', 'B2'] as const
  newState.nextWorkoutType = workoutOrder[(workoutOrder.indexOf(workout.type) + 1) % 4]
  newState.workoutCount += 1

  return newState
}

// Backfills lastSuccessWeight for any T1/T2 lift that doesn't have it set,
// by scanning workout history for the most recent successful exercise. Caps
// the backfilled weight at the lift's current weight so a post-success deload
// can't poison the value.
export function backfillLastSuccessWeight(
  state: ProgramState,
  workouts: Workout[]
): { state: ProgramState; migrated: boolean } {
  const t1Needs = (Object.keys(state.t1) as LiftName[]).filter(
    (id) => state.t1[id].lastSuccessWeight === undefined
  )
  const t2Needs = (Object.keys(state.t2) as LiftName[]).filter(
    (id) => state.t2[id].lastSuccessWeight === undefined
  )
  if (t1Needs.length === 0 && t2Needs.length === 0) {
    return { state, migrated: false }
  }

  const completed = workouts
    .filter((w) => w.completed && w.type !== 'MN')
    .sort((a, b) => b.date.localeCompare(a.date))

  let migrated = false
  const newT1 = { ...state.t1 }
  const newT2 = { ...state.t2 }

  function findMostRecentSuccess(tier: 'T1' | 'T2', liftId: LiftName, currentWeight: number): number | undefined {
    for (const w of completed) {
      const ex = w.exercises.find((e) => e.tier === tier && e.liftId === liftId)
      if (!ex) continue
      if (didHitRepTarget(ex) && ex.weight <= currentWeight) {
        return ex.weight
      }
    }
    return undefined
  }

  for (const liftId of t1Needs) {
    const w = findMostRecentSuccess('T1', liftId, state.t1[liftId].weight)
    if (w !== undefined) {
      newT1[liftId] = { ...newT1[liftId], lastSuccessWeight: w }
      migrated = true
    }
  }

  for (const liftId of t2Needs) {
    const w = findMostRecentSuccess('T2', liftId, state.t2[liftId].weight)
    if (w !== undefined) {
      newT2[liftId] = { ...newT2[liftId], lastSuccessWeight: w }
      migrated = true
    }
  }

  return { state: migrated ? { ...state, t1: newT1, t2: newT2 } : state, migrated }
}
