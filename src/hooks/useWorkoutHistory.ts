import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import type { Workout } from '../lib/types'

export function useWorkoutHistory() {
  const workouts = useLiveQuery(
    () => db.workouts.orderBy('date').reverse().toArray(),
    []
  )

  return {
    workouts: workouts ?? [],
    loading: workouts === undefined,
  }
}

export function useWorkout(id: string) {
  const workout = useLiveQuery(
    () => db.workouts.get(id),
    [id]
  )

  return {
    workout,
    loading: workout === undefined,
  }
}

export function formatWorkoutDate(isoDate: string): string {
  const date = new Date(isoDate)
  const now = new Date()
  const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  })
}

export function getWorkoutSummary(workout: Workout): string {
  const totalSets = workout.exercises.reduce((sum, ex) => sum + ex.sets.length, 0)
  const completedSets = workout.exercises.reduce(
    (sum, ex) => sum + ex.sets.filter((s) => s.completed).length,
    0
  )
  return `${completedSets}/${totalSets} sets`
}
