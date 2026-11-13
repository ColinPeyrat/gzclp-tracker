import type { ReactNode } from 'react'
import { ChevronRight, Trophy } from 'lucide-react'
import type { Workout, WeightUnit, LiftSubstitution, ExerciseDefinition, RotatingWorkoutType, LiftName } from '../../lib/types'
import { LIFT_CODES, WORKOUTS, getWorkoutLabel } from '../../lib/types'
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

const STATUS_TEXT: Record<LiftStatus, string> = {
  success: 'text-success',
  fail: 'text-destructive',
  neutral: 'text-muted-foreground/60',
}

function liftCode(liftId: string): string {
  return LIFT_CODES[liftId as LiftName] ?? liftId
}

export function WorkoutCard({ workout, unit, liftSubstitutions, exerciseLibrary, onClick }: WorkoutCardProps) {
  const isMaintenance = workout.type === 'MN'
  const isTestDay = workout.type === 'TD'
  const medalCount = workout.medals?.length ?? 0

  let summary: ReactNode
  if (isTestDay) {
    summary = `5RM · ${workout.exercises.map((ex) => `${liftCode(ex.liftId)} ${ex.fiveRepMax ?? '—'}`).join(' · ')} ${unit}`
  } else if (isMaintenance) {
    const first = workout.exercises[0]
    const scheme = first ? `${first.targetSets}×${first.targetReps} · ` : ''
    summary = `${scheme}${workout.exercises.map((ex) => `${liftCode(ex.liftId)} ${ex.weight}`).join(' · ')} ${unit}`
  } else {
    const workoutDef = WORKOUTS[workout.type as RotatingWorkoutType]
    const t1Exercise = workout.exercises.find((e) => e.tier === 'T1')
    const t2Exercise = workout.exercises.find((e) => e.tier === 'T2')
    const t3Exercises = workout.exercises.filter((e) => e.tier === 'T3')
    const t3Labels = getT3Labels(t3Exercises.length)
    const statuses: { label: string; status: LiftStatus }[] = [
      { label: 'T1', status: t1Exercise ? getLiftStatus(t1Exercise) : 'neutral' },
      { label: 'T2', status: t2Exercise ? getLiftStatus(t2Exercise) : 'neutral' },
      ...t3Exercises.map((t3, i) => ({ label: t3Labels[i], status: getLiftStatus(t3) })),
    ]
    summary = (
      <>
        <span className="truncate">
          {getExerciseName(workoutDef.t1, 'T1', liftSubstitutions, exerciseLibrary)} {t1Exercise?.weight ?? '?'} {unit}
        </span>
        <span className="flex shrink-0 gap-1.5 font-mono text-xs">
          {statuses.map(({ label, status }) => (
            <span key={label} className={STATUS_TEXT[status]}>
              {label}
            </span>
          ))}
        </span>
      </>
    )
  }

  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-accent"
    >
      <div className="min-w-0 flex-1 space-y-0.5">
        <div className="flex items-center gap-2">
          <span className="font-medium">{getWorkoutLabel(workout.type)}</span>
          <span className="text-sm text-muted-foreground">{formatWorkoutDate(workout.date)}</span>
          {medalCount > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-medium text-warning tabular-nums">
              <Trophy className="size-3" />
              {medalCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground tabular-nums">
          {typeof summary === 'string' ? <span className="truncate">{summary}</span> : summary}
        </div>
      </div>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </button>
  )
}
