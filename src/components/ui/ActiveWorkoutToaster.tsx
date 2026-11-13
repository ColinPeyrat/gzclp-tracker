import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { useWorkoutSessionStore } from '../../stores/workoutSessionStore'
import { getWorkoutLabel } from '@/lib/types'

export function ActiveWorkoutToaster() {
  const navigate = useNavigate()
  const location = useLocation()
  const workout = useWorkoutSessionStore((s) => s.workout)

  if (!workout || location.pathname === '/workout') {
    return null
  }

  const completedExercises = workout.exercises.filter((ex) => ex.sets.every((s) => s.completed)).length
  const totalExercises = workout.exercises.length

  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--nav-height)+0.5rem)] z-40 px-4">
      <button
        aria-label="Resume workout"
        onClick={() => navigate('/workout')}
        className="relative mx-auto flex h-11 w-full max-w-md items-center gap-2 overflow-hidden rounded-lg bg-secondary px-4 text-left text-sm transition-colors hover:bg-accent"
      >
        <span className="font-medium">{getWorkoutLabel(workout.type)} in progress</span>
        <span className="text-muted-foreground tabular-nums">
          {completedExercises}/{totalExercises}
        </span>
        <ChevronRight className="ml-auto size-4 text-muted-foreground" />
        <span
          className="absolute inset-x-0 bottom-0 h-0.5 bg-primary"
          style={{ width: `${(completedExercises / totalExercises) * 100}%` }}
        />
      </button>
    </div>
  )
}
