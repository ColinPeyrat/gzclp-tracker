import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import type { LiftName, Workout } from '../lib/types'
import { calculateProjection, getLiftDisplayName, type LiftDataPoint } from '../lib/projections'

export interface LiftProgression {
  liftId: LiftName
  liftName: string
  dataPoints: LiftDataPoint[]
  startWeight: number
  currentWeight: number
  totalGain: number
  percentGain: number
  recentGain: number // gain in last 3 months
  projectedWeight: number
}

const T1_LIFTS: LiftName[] = ['squat', 'bench', 'deadlift', 'ohp']

function extractLiftData(workouts: Workout[], liftId: LiftName): LiftDataPoint[] {
  const dataPoints: LiftDataPoint[] = []

  for (const workout of workouts) {
    const t1Exercise = workout.exercises.find(
      (ex) => ex.liftId === liftId && ex.tier === 'T1'
    )
    if (!t1Exercise) continue

    const totalReps = t1Exercise.sets.reduce((sum, set) => sum + (set.completed ? set.reps : 0), 0)
    const targetTotal = t1Exercise.targetSets * t1Exercise.targetReps
    const success = totalReps >= targetTotal

    dataPoints.push({
      date: workout.date,
      weight: t1Exercise.weight,
      success,
    })
  }

  return dataPoints
}

export function useProgressionData(): {
  lifts: Record<LiftName, LiftProgression>
  loading: boolean
} {
  const workouts = useLiveQuery(
    () => db.workouts.orderBy('date').toArray(),
    []
  )

  if (workouts === undefined) {
    const emptyLifts = {} as Record<LiftName, LiftProgression>
    for (const liftId of T1_LIFTS) {
      emptyLifts[liftId] = {
        liftId,
        liftName: getLiftDisplayName(liftId),
        dataPoints: [],
        startWeight: 0,
        currentWeight: 0,
        totalGain: 0,
        percentGain: 0,
        recentGain: 0,
        projectedWeight: 0,
      }
    }
    return { lifts: emptyLifts, loading: true }
  }

  const completedWorkouts = workouts.filter((w) => w.completed)
  const lifts = {} as Record<LiftName, LiftProgression>

  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0]

  for (const liftId of T1_LIFTS) {
    const dataPoints = extractLiftData(completedWorkouts, liftId)
    const startWeight = dataPoints[0]?.weight ?? 0
    const currentWeight = dataPoints[dataPoints.length - 1]?.weight ?? 0
    const totalGain = currentWeight - startWeight
    const percentGain = startWeight > 0 ? (totalGain / startWeight) * 100 : 0
    const projectedWeight = calculateProjection(dataPoints)

    // Calculate 3-month gain
    const recentPoints = dataPoints.filter((p) => p.date >= threeMonthsAgoStr)
    const weightThreeMonthsAgo = recentPoints[0]?.weight ?? currentWeight
    const recentGain = currentWeight - weightThreeMonthsAgo

    lifts[liftId] = {
      liftId,
      liftName: getLiftDisplayName(liftId),
      dataPoints,
      startWeight,
      currentWeight,
      totalGain,
      percentGain,
      recentGain,
      projectedWeight,
    }
  }

  return { lifts, loading: false }
}
