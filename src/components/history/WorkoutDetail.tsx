import { ArrowLeft, Check, X, TrendingUp, TrendingDown } from 'lucide-react'
import type { Workout, WeightUnit, Tier, ExerciseLog, LiftName, CustomExercise } from '../../lib/types'
import { LIFTS } from '../../lib/types'
import { getTotalReps, getTargetTotalReps, didHitRepTarget, getStageConfig } from '../../lib/progression'
import { getIncrement, UNIT_CONFIG } from '../../lib/units'
import { getSmallestPlate } from '../../lib/plates'
import { getExerciseName, getCustomExercise, TIER_COLORS, getStageFromConfig } from '../../lib/exercises'

interface WorkoutDetailProps {
  workout: Workout
  unit: WeightUnit
  plateInventory: Record<string, number>
  customExercises?: CustomExercise[]
  onBack: () => void
}

function getNextStageLabel(tier: Tier, currentStage: 1 | 2 | 3): string | null {
  if (currentStage === 3) {
    return tier === 'T1' ? 'New cycle: test 5RM' : 'Reset to 3×10'
  }

  const nextStage = (currentStage + 1) as 1 | 2 | 3
  const config = getStageConfig(tier, nextStage)
  return `${config.sets}×${config.reps}`
}

interface ExerciseResultProps {
  exercise: ExerciseLog
  tier: Tier
  unit: WeightUnit
  plateInventory: Record<string, number>
  customExercises?: CustomExercise[]
}

function ExerciseResult({ exercise, tier, unit, plateInventory, customExercises }: ExerciseResultProps) {
  const totalReps = getTotalReps(exercise)
  const targetTotal = getTargetTotalReps(exercise)
  const success = didHitRepTarget(exercise)

  // Check if this exercise uses T3 progression (either T3 tier or forceT3Progression)
  const customExercise = getCustomExercise(exercise.liftId, customExercises)
  const usesT3Progression = tier === 'T3' || customExercise?.forceT3Progression

  // T3 progression: AMRAP >= 25 for weight increase
  if (usesT3Progression) {
    const amrapSet = exercise.sets.find((s) => s.isAmrap)
    const amrapReps = amrapSet?.reps ?? 0
    const shouldIncrease = amrapReps >= 25
    const t3Increment = getSmallestPlate(plateInventory)
    const newWeight = exercise.weightLbs + t3Increment

    return (
      <div className={`mt-3 rounded px-3 py-2 text-sm ${shouldIncrease ? 'bg-green-900/30 text-green-400' : 'bg-zinc-700 text-zinc-300'}`}>
        <div className="flex items-center justify-between">
          <span>AMRAP: {amrapReps} reps</span>
          {shouldIncrease ? (
            <span className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" /> Next: {newWeight} {unit}
            </span>
          ) : (
            <span>25 reps needed for increase</span>
          )}
        </div>
      </div>
    )
  }

  const currentStage = getStageFromConfig(exercise)
  const nextStageLabel = getNextStageLabel(tier, currentStage)

  // Calculate new weight for success case
  const liftId = exercise.liftId as LiftName
  const lift = LIFTS[liftId]
  const tierForIncrement = tier as 'T1' | 'T2'
  const increment = lift ? getIncrement(tierForIncrement, lift.isLower, unit) : UNIT_CONFIG[unit].incrementT1Upper
  const newWeight = exercise.weightLbs + increment

  return (
    <div className={`mt-3 rounded px-3 py-2 text-sm ${success ? 'bg-green-900/30 text-green-400' : 'bg-red-900/30 text-red-400'}`}>
      <div className="flex items-center justify-between">
        <span>
          {totalReps} / {targetTotal} reps
        </span>
        {success ? (
          <span className="flex items-center gap-1">
            <TrendingUp className="h-4 w-4" /> Next: {newWeight} {unit}
          </span>
        ) : (
          <span className="flex items-center gap-1">
            <TrendingDown className="h-4 w-4" /> {nextStageLabel}
          </span>
        )}
      </div>
    </div>
  )
}

export function WorkoutDetail({ workout, unit, plateInventory, customExercises, onBack }: WorkoutDetailProps) {
  const date = new Date(workout.date)
  const formattedDate = date.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  const formattedTime = date.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1 text-zinc-400 hover:text-white">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-bold">{workout.type}</h1>
            <p className="text-xs text-zinc-400">
              {formattedDate} at {formattedTime}
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 p-4">
        {workout.exercises.map((exercise, i) => (
          <div key={i} className="rounded-lg bg-zinc-800 p-4">
            <div className="mb-1 flex items-center justify-between">
              <div>
                <span className={`text-xs font-medium ${TIER_COLORS[exercise.tier]}`}>
                  {exercise.tier}
                </span>
                <h3 className="font-medium">
                  {getExerciseName(exercise.liftId, exercise.tier, customExercises)}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-zinc-400">
                  {exercise.weightLbs} {unit}
                </span>
                <div className="text-xs text-zinc-500">
                  {exercise.targetSets}×{exercise.targetReps}
                  {exercise.sets.some((s) => s.isAmrap) ? '+' : ''}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              {exercise.sets.map((set, j) => {
                const isFailed = set.completed && set.reps === 0
                return (
                  <div
                    key={j}
                    className={`flex items-center justify-between rounded px-3 py-2 text-sm ${
                      isFailed
                        ? 'bg-red-900/20'
                        : set.completed
                          ? 'bg-zinc-700'
                          : 'bg-zinc-900'
                    }`}
                  >
                    <span className="text-zinc-400">Set {set.setNumber}</span>
                    <div className="flex items-center gap-2">
                      <span className={isFailed ? 'text-red-400' : ''}>
                        {isFailed ? 'Failed' : set.reps}
                        {set.isAmrap && !isFailed && ' (AMRAP)'}
                      </span>
                      {isFailed ? (
                        <X className="h-4 w-4 text-red-400" />
                      ) : set.completed ? (
                        <Check className="h-4 w-4 text-green-400" />
                      ) : (
                        <X className="h-4 w-4 text-red-400" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>

            <ExerciseResult exercise={exercise} tier={exercise.tier} unit={unit} plateInventory={plateInventory} customExercises={customExercises} />
          </div>
        ))}

        {workout.notes && (
          <div className="rounded-lg bg-zinc-800 p-4">
            <h3 className="mb-2 text-sm font-medium text-zinc-400">Notes</h3>
            <p className="text-sm">{workout.notes}</p>
          </div>
        )}
      </main>
    </div>
  )
}
