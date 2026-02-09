import { ChevronRight, Trophy } from 'lucide-react'
import type { Workout, WeightUnit, LiftSubstitution, ExerciseDefinition } from '../../lib/types'
import { WORKOUTS } from '../../lib/types'
import { formatWorkoutDate } from '../../hooks/useWorkoutHistory'
import { getExerciseName } from '../../lib/exercises'
import { getLiftStatus, getT3Labels, type LiftStatus } from '../../lib/workoutStatus'

interface WorkoutCardProps {
  workout: Workout
  unit: WeightUnit
  liftSubstitutions?: LiftSubstitution[]
  exerciseLibrary?: ExerciseDefinition[]
  onClick: () => void
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

export function WorkoutCard({ workout, unit, liftSubstitutions, exerciseLibrary, onClick }: WorkoutCardProps) {
  const workoutDef = WORKOUTS[workout.type]
  const t1Name = getExerciseName(workoutDef.t1, 'T1', liftSubstitutions, exerciseLibrary)
  const t1Exercise = workout.exercises.find((e) => e.tier === 'T1')
  const t2Exercise = workout.exercises.find((e) => e.tier === 'T2')
  const t3Exercises = workout.exercises.filter((e) => e.tier === 'T3')

  const t1Status = t1Exercise ? getLiftStatus(t1Exercise) : 'neutral'
  const t2Status = t2Exercise ? getLiftStatus(t2Exercise) : 'neutral'

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
            {workout.medals && workout.medals.length > 0 && (
              <span className="flex items-center gap-0.5 text-amber-400">
                <Trophy className="h-3.5 w-3.5" />
                <span className="text-xs font-medium">{workout.medals.length}</span>
              </span>
            )}
          </div>
          <div className="mt-1 text-sm text-zinc-400">
            {t1Name} @ {t1Exercise?.weight ?? '?'} {unit}
          </div>
          <div className="mt-2 flex items-center gap-3">
            <StatusIndicator status={t1Status} label="T1" />
            <StatusIndicator status={t2Status} label="T2" />
            {t3Exercises.map((t3, i) => (
              <StatusIndicator key={i} status={getLiftStatus(t3)} label={getT3Labels(t3Exercises.length)[i]} />
            ))}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 text-zinc-500" />
      </div>
    </button>
  )
}
