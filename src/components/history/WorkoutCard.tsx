import { ChevronRight, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Workout, WeightUnit, LiftSubstitution, ExerciseDefinition, RotatingWorkoutType } from '../../lib/types'
import { WORKOUTS, getWorkoutLabel } from '../../lib/types'
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

const STATUS_DOT: Record<LiftStatus, string> = {
  success: 'bg-success',
  fail: 'bg-destructive',
  neutral: 'bg-muted-foreground/50',
}

function StatusIndicator({ status, label }: { status: LiftStatus; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={cn('size-1.5 rounded-full', STATUS_DOT[status])} />
      <span className="font-mono text-xs text-muted-foreground">{label}</span>
    </span>
  )
}

export function WorkoutCard({ workout, unit, liftSubstitutions, exerciseLibrary, onClick }: WorkoutCardProps) {
  const isMaintenance = workout.type === 'MN'
  const isTestDay = workout.type === 'TD'
  const workoutDef = isMaintenance || isTestDay ? null : WORKOUTS[workout.type as RotatingWorkoutType]
  const t1Exercise = workout.exercises.find((e) => e.tier === 'T1')
  const t1Name = isMaintenance || isTestDay
    ? ''
    : getExerciseName(workoutDef!.t1, 'T1', liftSubstitutions, exerciseLibrary)
  const t2Exercise = isMaintenance || isTestDay ? null : workout.exercises.find((e) => e.tier === 'T2')
  const t3Exercises = isMaintenance || isTestDay ? [] : workout.exercises.filter((e) => e.tier === 'T3')

  const t1Status = t1Exercise ? getLiftStatus(t1Exercise) : 'neutral'
  const t2Status = t2Exercise ? getLiftStatus(t2Exercise) : 'neutral'

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="font-medium">{getWorkoutLabel(workout.type)}</span>
          <span className="text-sm text-muted-foreground">{formatWorkoutDate(workout.date)}</span>
          {workout.medals && workout.medals.length > 0 && (
            <span className="ml-auto flex items-center gap-1 self-center text-warning">
              <Trophy className="size-3.5" />
              <span className="text-xs font-medium tabular-nums">{workout.medals.length}</span>
            </span>
          )}
        </div>
        {isTestDay ? (
          <div className="mt-0.5 truncate text-sm text-muted-foreground tabular-nums">
            5RM · {workout.exercises.map((ex) =>
              `${getExerciseName(ex.liftId, ex.tier, liftSubstitutions, exerciseLibrary)} ${ex.fiveRepMax ?? '—'}`
            ).join(' / ')} {unit}
          </div>
        ) : isMaintenance ? (
          <div className="mt-0.5 truncate text-sm text-muted-foreground tabular-nums">
            {workout.exercises.map((ex) =>
              `${getExerciseName(ex.liftId, ex.tier, liftSubstitutions, exerciseLibrary)} ${ex.weight}`
            ).join(' / ')} {unit}
          </div>
        ) : (
          <>
            <div className="mt-0.5 truncate text-sm text-muted-foreground tabular-nums">
              {t1Name} · {t1Exercise?.weight ?? '?'} {unit}
            </div>
            <div className="mt-2 flex items-center gap-3">
              <StatusIndicator status={t1Status} label="T1" />
              <StatusIndicator status={t2Status} label="T2" />
              {t3Exercises.map((t3, i) => (
                <StatusIndicator key={i} status={getLiftStatus(t3)} label={getT3Labels(t3Exercises.length)[i]} />
              ))}
            </div>
          </>
        )}
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  )
}
