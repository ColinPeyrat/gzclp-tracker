import type { LiftName, Workout } from './types'
import { calculateProjection, getLiftDisplayName, type LiftDataPoint } from './projections'

export interface TestPoint {
  date: string
  weight: number
}

export interface LiftProgression {
  liftId: LiftName
  liftName: string
  dataPoints: LiftDataPoint[]
  tests: TestPoint[]
  lastTest?: TestPoint
  previousTest?: TestPoint
  workingWeight: number // what the program has queued next, falling back to the last logged weight
  sinceResetGain?: number // working weight added since the 85% reset that followed the last test
  startWeight: number
  currentWeight: number
  totalGain: number
  percentGain: number
  recentGain: number // gain in last 3 months
  projectedWeight: number
}

export const T1_LIFTS: LiftName[] = ['squat', 'bench', 'deadlift', 'ohp']

function extractLiftData(workouts: Workout[], liftId: LiftName) {
  const dataPoints: LiftDataPoint[] = []
  const tests: TestPoint[] = []
  const rotating: { date: string; weight: number }[] = []

  for (const workout of workouts) {
    const t1Exercise = workout.exercises.find((ex) => ex.liftId === liftId && ex.tier === 'T1')
    if (!t1Exercise) continue

    if (workout.type === 'TD') {
      if (t1Exercise.fiveRepMax !== undefined) tests.push({ date: workout.date, weight: t1Exercise.fiveRepMax })
      continue
    }

    const totalReps = t1Exercise.sets.reduce((sum, set) => sum + (set.completed ? set.reps : 0), 0)
    dataPoints.push({
      date: workout.date,
      weight: t1Exercise.weight,
      success: totalReps >= t1Exercise.targetSets * t1Exercise.targetReps,
    })
    if (workout.type !== 'MN') rotating.push({ date: workout.date, weight: t1Exercise.weight })
  }

  return { dataPoints, tests, rotating }
}

export function emptyLiftProgression(liftId: LiftName): LiftProgression {
  return {
    liftId,
    liftName: getLiftDisplayName(liftId),
    dataPoints: [],
    tests: [],
    workingWeight: 0,
    startWeight: 0,
    currentWeight: 0,
    totalGain: 0,
    percentGain: 0,
    recentGain: 0,
    projectedWeight: 0,
  }
}

export function buildLiftProgressions(
  workouts: Workout[],
  programWeights: Partial<Record<LiftName, number>> = {},
  now = new Date()
): Record<LiftName, LiftProgression> {
  const completed = workouts.filter((w) => w.completed).sort((a, b) => a.date.localeCompare(b.date))

  const threeMonthsAgo = new Date(now)
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const threeMonthsAgoStr = threeMonthsAgo.toISOString().split('T')[0]

  const lifts = {} as Record<LiftName, LiftProgression>
  for (const liftId of T1_LIFTS) {
    const { dataPoints, tests, rotating } = extractLiftData(completed, liftId)
    const startWeight = dataPoints[0]?.weight ?? 0
    const currentWeight = dataPoints[dataPoints.length - 1]?.weight ?? 0
    const totalGain = currentWeight - startWeight

    const recentPoints = dataPoints.filter((p) => p.date >= threeMonthsAgoStr)
    const recentGain = currentWeight - (recentPoints[0]?.weight ?? currentWeight)

    const workingWeight = programWeights[liftId] ?? currentWeight
    const lastTest = tests[tests.length - 1]
    // Maintenance sessions run their own lighter weights, so they don't mark the reset
    const resetWeight = lastTest && (rotating.find((p) => p.date > lastTest.date)?.weight ?? workingWeight)

    lifts[liftId] = {
      liftId,
      liftName: getLiftDisplayName(liftId),
      dataPoints,
      tests,
      lastTest,
      previousTest: tests[tests.length - 2],
      workingWeight,
      sinceResetGain: resetWeight !== undefined ? workingWeight - resetWeight : undefined,
      startWeight,
      currentWeight,
      totalGain,
      percentGain: startWeight > 0 ? (totalGain / startWeight) * 100 : 0,
      recentGain,
      projectedWeight: calculateProjection(dataPoints),
    }
  }

  return lifts
}
