import { ChevronRight } from 'lucide-react'
import type { Workout, WeightUnit, ExerciseLog } from '../../lib/types'
import { LIFTS, WORKOUTS } from '../../lib/types'
import { formatWorkoutDate } from '../../hooks/useWorkoutHistory'
import { didHitRepTarget } from '../../lib/progression'

interface WorkoutCardProps {
  workout: Workout
  unit: WeightUnit
  onClick: () => void
}

type LiftStatus = 'success' | 'fail' | 'neutral'

function getLiftStatus(exercise: ExerciseLog): LiftStatus {
  if (exercise.tier === 'T3') {
    const amrapSet = exercise.sets.find((s) => s.isAmrap)
    const amrapReps = amrapSet?.reps ?? 0
    return amrapReps >= 25 ? 'success' : 'neutral'
  }
  return didHitRepTarget(exercise) ? 'success' : 'fail'
}

function StatusIndicator({ status, label }: { status: LiftStatus; label: string }) {
  const colors = {
    success: 'bg-green-500',
    fail: 'bg-red-500',
    neutral: 'bg-zinc-500',
  }

  return (
    <div className="flex items-center gap-1">
      <div className={`h-2 w-2 rounded-full ${colors[status]}`} />
      <span className="text-xs text-zinc-500">{label}</span>
    </div>
  )
}

export function WorkoutCard({ workout, unit, onClick }: WorkoutCardProps) {
  const workoutDef = WORKOUTS[workout.type]
  const t1Name = LIFTS[workoutDef.t1].name
  const t1Exercise = workout.exercises.find((e) => e.tier === 'T1')
  const t2Exercise = workout.exercises.find((e) => e.tier === 'T2')
  const t3Exercise = workout.exercises.find((e) => e.tier === 'T3')

  const t1Status = t1Exercise ? getLiftStatus(t1Exercise) : 'neutral'
  const t2Status = t2Exercise ? getLiftStatus(t2Exercise) : 'neutral'
  const t3Status = t3Exercise ? getLiftStatus(t3Exercise) : 'neutral'

  return (
    <button
      onClick={onClick}
      className="w-full rounded-lg bg-zinc-800 p-4 text-left hover:bg-zinc-700"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="font-bold">{workout.type}</span>
            <span className="text-sm text-zinc-400">
              {formatWorkoutDate(workout.date)}
            </span>
          </div>
          <div className="mt-1 text-sm text-zinc-400">
            {t1Name} @ {t1Exercise?.weightLbs ?? '?'} {unit}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <StatusIndicator status={t1Status} label="T1" />
            <StatusIndicator status={t2Status} label="T2" />
            <StatusIndicator status={t3Status} label="T3" />
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-zinc-500" />
      </div>
    </button>
  )
}
