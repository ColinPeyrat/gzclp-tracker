import type { LiftName } from './types'

export interface LiftDataPoint {
  date: string
  weight: number
  success: boolean
}

export function calculateProjection(
  dataPoints: LiftDataPoint[],
  weeksAhead: number = 8
): number {
  const successfulPoints = dataPoints.filter((p) => p.success)
  if (successfulPoints.length < 2) {
    return dataPoints[dataPoints.length - 1]?.weight ?? 0
  }

  const first = successfulPoints[0]
  const last = successfulPoints[successfulPoints.length - 1]
  const firstDate = new Date(first.date).getTime()
  const lastDate = new Date(last.date).getTime()
  const daysDiff = (lastDate - firstDate) / (1000 * 60 * 60 * 24)

  if (daysDiff <= 0) {
    return last.weight
  }

  const weightGain = last.weight - first.weight
  const dailyRate = weightGain / daysDiff
  const projectionDays = weeksAhead * 7

  return Math.round(last.weight + dailyRate * projectionDays)
}

export function getLiftDisplayName(liftId: LiftName): string {
  const names: Record<LiftName, string> = {
    squat: 'Squat',
    bench: 'Bench',
    deadlift: 'Deadlift',
    ohp: 'OHP',
  }
  return names[liftId]
}
