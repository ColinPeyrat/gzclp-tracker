import type { Workout, ProgramState, Medal, ExerciseLog, LiftSubstitution, WeightUnit } from './types'
import { LIFTS } from './types'
import { getTotalReps, didHitRepTarget } from './progression'
import { getIncrement } from './units'

const STREAK_MILESTONES = [5, 10, 25, 50, 100]

export interface HistoryRecord {
  maxWeight: number
  maxVolume: number
}

export function buildHistoryMap(workouts: Workout[]): Map<string, HistoryRecord> {
  const map = new Map<string, HistoryRecord>()
  for (const w of workouts) {
    for (const ex of w.exercises) {
      const totalReps = getTotalReps(ex)
      if (totalReps === 0) continue
      const key = `${ex.liftId}:${ex.tier}`
      const record = map.get(key) ?? { maxWeight: 0, maxVolume: 0 }
      record.maxWeight = Math.max(record.maxWeight, ex.weight)
      record.maxVolume = Math.max(record.maxVolume, ex.weight * totalReps)
      map.set(key, record)
    }
  }
  return map
}

export function detectWeightPR(
  exercise: ExerciseLog,
  historyMap: Map<string, HistoryRecord>
): Medal | null {
  const totalReps = getTotalReps(exercise)
  if (totalReps === 0) return null

  const key = `${exercise.liftId}:${exercise.tier}`
  const prev = historyMap.get(key)
  const prevMaxWeight = prev?.maxWeight ?? 0

  if (exercise.weight > prevMaxWeight) {
    return {
      type: 'weight-pr',
      liftId: exercise.liftId,
      tier: exercise.tier,
      value: exercise.weight,
      previousValue: prevMaxWeight || undefined,
    }
  }
  return null
}

export function detectVolumePR(
  exercise: ExerciseLog,
  historyMap: Map<string, HistoryRecord>
): Medal[] {
  const medals: Medal[] = []
  const totalReps = getTotalReps(exercise)
  if (totalReps === 0) return medals

  const key = `${exercise.liftId}:${exercise.tier}`
  const prev = historyMap.get(key)
  const prevMaxVolume = prev?.maxVolume ?? 0
  const volume = exercise.weight * totalReps

  if (volume > prevMaxVolume) {
    medals.push({
      type: 'volume-pr',
      liftId: exercise.liftId,
      tier: exercise.tier,
      value: volume,
      previousValue: prevMaxVolume || undefined,
    })
  }

  // AMRAP record: T3 AMRAP >= 25
  if (exercise.tier === 'T3') {
    const amrapSet = exercise.sets.find((s) => s.isAmrap)
    if (amrapSet && amrapSet.reps >= 25) {
      medals.push({
        type: 'amrap-record',
        liftId: exercise.liftId,
        tier: exercise.tier,
        value: amrapSet.reps,
      })
    }
  }

  return medals
}

function getLiftSubstitution(liftId: string, subs?: LiftSubstitution[]): LiftSubstitution | undefined {
  return subs?.find((s) => s.originalLiftId === liftId)
}

export function detectStageClearMedal(
  exercise: ExerciseLog,
  programState: ProgramState,
  unit: WeightUnit,
  liftSubstitutions?: LiftSubstitution[],
  smallestPlate?: number
): Medal | null {
  if (!didHitRepTarget(exercise)) return null

  const tier = exercise.tier
  const liftId = exercise.liftId

  if (tier === 'T1' || tier === 'T2') {
    const sub = getLiftSubstitution(liftId, liftSubstitutions)

    if (sub?.forceT3Progression) {
      // T3-style progression: check AMRAP >= 25
      const amrapSet = exercise.sets.find((s) => s.isAmrap)
      if (!amrapSet || amrapSet.reps < 25) return null
      const plate = smallestPlate ?? 2.5
      const currentWeight = tier === 'T1'
        ? programState.t1[liftId as keyof typeof programState.t1]?.weight
        : programState.t2[liftId as keyof typeof programState.t2]?.weight
      if (currentWeight === undefined) return null
      const newWeight = currentWeight + plate
      return {
        type: 'stage-clear',
        liftId,
        tier,
        value: newWeight,
        previousValue: currentWeight,
      }
    }

    // Standard T1/T2 progression
    const isLower = LIFTS[liftId as keyof typeof LIFTS]?.isLower ?? false
    const increment = getIncrement(tier, isLower, unit)
    const newWeight = exercise.weight + increment
    return {
      type: 'stage-clear',
      liftId,
      tier,
      value: newWeight,
      previousValue: exercise.weight,
    }
  }

  // T3: AMRAP >= 25 means weight goes up
  if (tier === 'T3') {
    const amrapSet = exercise.sets.find((s) => s.isAmrap)
    if (!amrapSet || amrapSet.reps < 25) return null
    const plate = smallestPlate ?? 2.5
    const newWeight = exercise.weight + plate
    return {
      type: 'stage-clear',
      liftId,
      tier,
      value: newWeight,
      previousValue: exercise.weight,
    }
  }

  return null
}

export function detectStreakMedal(workoutCount: number): Medal | null {
  if (STREAK_MILESTONES.includes(workoutCount)) {
    return { type: 'streak', value: workoutCount }
  }
  return null
}

// Backward-compatible wrapper
export function detectMedals(
  completedWorkout: Workout,
  historicalWorkouts: Workout[],
  oldProgramState: ProgramState,
  newProgramState: ProgramState
): Medal[] {
  const medals: Medal[] = []
  const history = buildHistoryMap(historicalWorkouts)

  for (const ex of completedWorkout.exercises) {
    const totalReps = getTotalReps(ex)
    if (totalReps === 0) continue

    const key = `${ex.liftId}:${ex.tier}`
    const prev = history.get(key)
    const prevMaxWeight = prev?.maxWeight ?? 0
    const prevMaxVolume = prev?.maxVolume ?? 0
    const volume = ex.weight * totalReps

    if (ex.weight > prevMaxWeight) {
      medals.push({
        type: 'weight-pr',
        liftId: ex.liftId,
        tier: ex.tier,
        value: ex.weight,
        previousValue: prevMaxWeight || undefined,
      })
    }

    if (volume > prevMaxVolume) {
      medals.push({
        type: 'volume-pr',
        liftId: ex.liftId,
        tier: ex.tier,
        value: volume,
        previousValue: prevMaxVolume || undefined,
      })
    }

    if (ex.tier === 'T3') {
      const amrapSet = ex.sets.find((s) => s.isAmrap)
      if (amrapSet && amrapSet.reps >= 25) {
        medals.push({
          type: 'amrap-record',
          liftId: ex.liftId,
          tier: ex.tier,
          value: amrapSet.reps,
        })
      }
    }
  }

  // Streak
  const workoutCount = historicalWorkouts.length + 1
  if (STREAK_MILESTONES.includes(workoutCount)) {
    medals.push({ type: 'streak', value: workoutCount })
  }

  // Stage clear: weight increased for any lift+tier
  for (const liftId of Object.keys(oldProgramState.t1) as Array<keyof typeof oldProgramState.t1>) {
    if (newProgramState.t1[liftId].weight > oldProgramState.t1[liftId].weight) {
      medals.push({
        type: 'stage-clear',
        liftId,
        tier: 'T1',
        value: newProgramState.t1[liftId].weight,
        previousValue: oldProgramState.t1[liftId].weight,
      })
    }
    if (newProgramState.t2[liftId].weight > oldProgramState.t2[liftId].weight) {
      medals.push({
        type: 'stage-clear',
        liftId,
        tier: 'T2',
        value: newProgramState.t2[liftId].weight,
        previousValue: oldProgramState.t2[liftId].weight,
      })
    }
  }

  return medals
}
