import type { RotatingWorkoutType, ProgramState, UserSettings } from '@/lib/types'
import { WORKOUTS } from '@/lib/types'
import { getExerciseName, getEffectiveStageConfig, getT3IdsForWorkout, getLiftSubstitution } from '@/lib/exercises'
import { TierBadge } from '@/components/ui/tier-badge'

interface WorkoutPreviewCardProps {
  workoutType: RotatingWorkoutType
  state: ProgramState
  settings: UserSettings
  isNext: boolean
}

interface ExerciseRow {
  tier: 'T1' | 'T2' | 'T3'
  name: string
  scheme: string
  weight: number
}

function getExerciseRows(workoutType: RotatingWorkoutType, state: ProgramState, settings: UserSettings): ExerciseRow[] {
  const workout = WORKOUTS[workoutType]
  const rows: ExerciseRow[] = []

  // T1
  const t1State = state.t1[workout.t1]
  const t1Config = getEffectiveStageConfig('T1', t1State.stage, workout.t1, settings.liftSubstitutions)
  const t1Sub = getLiftSubstitution(workout.t1, settings.liftSubstitutions)
  const t1Weight = t1Sub?.forceT3Progression
    ? Math.max(t1State.weight, state.t2[workout.t1]?.weight ?? 0)
    : t1State.weight
  rows.push({
    tier: 'T1',
    name: getExerciseName(workout.t1, 'T1', settings.liftSubstitutions, settings.exerciseLibrary),
    scheme: `${t1Config.sets}×${t1Config.reps}+`,
    weight: t1Weight,
  })

  // T2
  const t2State = state.t2[workout.t2]
  const t2Config = getEffectiveStageConfig('T2', t2State.stage, workout.t2, settings.liftSubstitutions)
  const t2Sub = getLiftSubstitution(workout.t2, settings.liftSubstitutions)
  const t2Weight = t2Sub?.forceT3Progression
    ? Math.max(t2State.weight, state.t1[workout.t2]?.weight ?? 0)
    : t2State.weight
  rows.push({
    tier: 'T2',
    name: getExerciseName(workout.t2, 'T2', settings.liftSubstitutions, settings.exerciseLibrary),
    scheme: `${t2Config.sets}×${t2Config.reps}${t2Config.hasAmrap ? '+' : ''}`,
    weight: t2Weight,
  })

  // T3s
  for (const t3Id of getT3IdsForWorkout(workoutType, settings.additionalT3s)) {
    rows.push({
      tier: 'T3',
      name: getExerciseName(t3Id, 'T3', settings.liftSubstitutions, settings.exerciseLibrary),
      scheme: '3×15+',
      weight: state.t3[t3Id]?.weight ?? 50,
    })
  }

  return rows
}

export function WorkoutPreviewCard({ workoutType, state, settings, isNext }: WorkoutPreviewCardProps) {
  const rows = getExerciseRows(workoutType, state, settings)
  const unit = settings.weightUnit

  if (isNext) {
    return (
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li key={`${row.tier}-${row.name}`} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
            <TierBadge tier={row.tier} />
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{row.name}</div>
              <div className="font-mono text-xs text-muted-foreground">{row.scheme}</div>
            </div>
            <div className="text-right tabular-nums">
              <span className="text-lg font-semibold">{row.weight}</span>
              <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="w-40 shrink-0 snap-start rounded-lg bg-card p-4">
      <div className="mb-3 text-xl font-semibold">{workoutType}</div>
      <ul className="space-y-1.5">
        {rows.slice(0, 2).map((row) => (
          <li key={`${row.tier}-${row.name}`} className="flex items-center gap-2 text-sm">
            <TierBadge tier={row.tier} />
            <span className="truncate text-muted-foreground">{row.name}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
