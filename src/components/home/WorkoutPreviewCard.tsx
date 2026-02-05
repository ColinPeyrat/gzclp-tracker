import type { WorkoutType, ProgramState, UserSettings } from '../../lib/types'
import { WORKOUTS } from '../../lib/types'
import { getExerciseName, getEffectiveStageConfig, getT3IdsForWorkout, getLiftSubstitution, TIER_COLORS } from '../../lib/exercises'

interface WorkoutPreviewCardProps {
  workoutType: WorkoutType
  state: ProgramState
  settings: UserSettings
  isNext: boolean
}

interface ExerciseRow {
  tier: 'T1' | 'T2' | 'T3'
  name: string
  detail: string
}

function getExerciseRows(workoutType: WorkoutType, state: ProgramState, settings: UserSettings): ExerciseRow[] {
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
    detail: `${t1Config.sets}×${t1Config.reps}+ @ ${t1Weight} ${settings.weightUnit}`,
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
    detail: `${t2Config.sets}×${t2Config.reps}${t2Config.hasAmrap ? '+' : ''} @ ${t2Weight} ${settings.weightUnit}`,
  })

  // T3s
  for (const t3Id of getT3IdsForWorkout(workoutType, settings.additionalT3s)) {
    rows.push({
      tier: 'T3',
      name: getExerciseName(t3Id, 'T3', settings.liftSubstitutions, settings.exerciseLibrary),
      detail: `3×15+ @ ${state.t3[t3Id]?.weight ?? 50} ${settings.weightUnit}`,
    })
  }

  return rows
}

export function WorkoutPreviewCard({ workoutType, state, settings, isNext }: WorkoutPreviewCardProps) {
  const rows = getExerciseRows(workoutType, state, settings)

  if (isNext) {
    return (
      <div className="space-y-3">
        {rows.map((row) => (
          <div key={`${row.tier}-${row.name}`} className="rounded-lg bg-zinc-800 p-4">
            <div className={`mb-1 text-xs font-medium ${TIER_COLORS[row.tier]}`}>{row.tier}</div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-medium">{row.name}</span>
              <span className="text-zinc-400">{row.detail}</span>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-zinc-800/60 p-4">
      <h3 className="mb-2 text-sm font-bold">{workoutType}</h3>
      <div className="divide-y divide-zinc-700/50">
        {rows.map((row) => (
          <div key={`${row.tier}-${row.name}`} className="flex items-baseline justify-between py-1.5">
            <span className="flex items-baseline gap-2">
              <span className={`text-xs font-medium ${TIER_COLORS[row.tier]}`}>{row.tier}</span>
              <span className="text-sm text-zinc-300">{row.name}</span>
            </span>
            <span className="text-sm text-zinc-500">{row.detail}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
