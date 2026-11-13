import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TierBadge } from '@/components/ui/tier-badge'
import { ArrowLeft, Check, X, Minus, TrendingUp, TrendingDown, BarChart2, Trophy, Flame, Zap, Target } from 'lucide-react'
import type { Workout, WeightUnit, Tier, ExerciseLog, LiftName, LiftSubstitution, ExerciseDefinition, Medal, MedalType } from '../../lib/types'
import { WorkoutStatsModal } from './WorkoutStatsModal'
import { LIFTS, getWorkoutLabel } from '../../lib/types'
import { getTotalReps, getTargetTotalReps, didHitRepTarget, getStageConfig } from '../../lib/progression'
import { getIncrement, UNIT_CONFIG } from '../../lib/units'
import { getSmallestPlate } from '../../lib/plates'
import { getExerciseName, getLiftSubstitution, getStageFromConfig } from '../../lib/exercises'

interface WorkoutDetailProps {
  workout: Workout
  unit: WeightUnit
  barWeight: number
  plateInventory: Record<string, number>
  liftSubstitutions?: LiftSubstitution[]
  exerciseLibrary?: ExerciseDefinition[]
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
  liftSubstitutions?: LiftSubstitution[]
}

function ExerciseResult({ exercise, tier, unit, plateInventory, liftSubstitutions }: ExerciseResultProps) {
  const totalReps = getTotalReps(exercise)
  const targetTotal = getTargetTotalReps(exercise)
  const success = didHitRepTarget(exercise)

  // forceT3Progression substitutions progress like T3 regardless of tier
  const liftSubstitution = getLiftSubstitution(exercise.liftId, liftSubstitutions)
  const usesT3Progression = tier === 'T3' || liftSubstitution?.forceT3Progression

  if (usesT3Progression) {
    const amrapSet = exercise.sets.find((s) => s.isAmrap)
    const amrapReps = amrapSet?.reps ?? 0
    const shouldIncrease = amrapReps >= 25
    const t3Increment = getSmallestPlate(plateInventory)
    const newWeight = exercise.weight + t3Increment

    return (
      <div
        className={cn(
          'flex items-center justify-between rounded-md px-3 py-2 text-sm tabular-nums',
          shouldIncrease ? 'bg-success/10 text-success' : 'bg-secondary text-muted-foreground'
        )}
      >
        <span>AMRAP {amrapReps} reps</span>
        {shouldIncrease ? (
          <span className="flex items-center gap-1.5">
            <TrendingUp className="size-4" /> Next {newWeight} {unit}
          </span>
        ) : (
          <span>25 reps to increase</span>
        )}
      </div>
    )
  }

  const currentStage = getStageFromConfig(exercise)
  const nextStageLabel = getNextStageLabel(tier, currentStage)

  const liftId = exercise.liftId as LiftName
  const lift = LIFTS[liftId]
  const tierForIncrement = tier as 'T1' | 'T2'
  const increment = lift ? getIncrement(tierForIncrement, lift.isLower, unit) : UNIT_CONFIG[unit].incrementT1Upper
  const newWeight = exercise.weight + increment

  return (
    <div
      className={cn(
        'flex items-center justify-between rounded-md px-3 py-2 text-sm tabular-nums',
        success ? 'bg-success/10 text-success' : 'bg-destructive/10 text-destructive'
      )}
    >
      <span>
        {totalReps} / {targetTotal} reps
      </span>
      {success ? (
        <span className="flex items-center gap-1.5">
          <TrendingUp className="size-4" /> Next {newWeight} {unit}
        </span>
      ) : (
        <span className="flex items-center gap-1.5">
          <TrendingDown className="size-4" /> <span className="font-mono">{nextStageLabel}</span>
        </span>
      )}
    </div>
  )
}

const MEDAL_ICONS: Record<MedalType, typeof Trophy> = {
  'weight-pr': Trophy,
  'volume-pr': Flame,
  'streak': Zap,
  'amrap-record': Target,
  'stage-clear': TrendingUp,
  '5rm-pr': Trophy,
}

const MEDAL_LABELS: Record<MedalType, string> = {
  'weight-pr': 'Weight PR',
  'volume-pr': 'Volume PR',
  'streak': 'Streak',
  'amrap-record': 'T3 Level Up',
  'stage-clear': 'Weight Up',
  '5rm-pr': '5RM PR',
}

function MedalsSection({ medals, unit, liftSubstitutions, exerciseLibrary }: {
  medals: Medal[]
  unit: WeightUnit
  liftSubstitutions?: LiftSubstitution[]
  exerciseLibrary?: ExerciseDefinition[]
}) {
  return (
    <section className="space-y-3">
      <h2 className="px-1 text-sm text-muted-foreground">Achievements</h2>
      <ul className="divide-y divide-border rounded-lg bg-card">
        {medals.map((medal, i) => {
          const Icon = MEDAL_ICONS[medal.type]
          const label = medal.type === 'streak' ? `${medal.value} Workouts` : MEDAL_LABELS[medal.type]
          const liftName = medal.liftId
            ? getExerciseName(medal.liftId, medal.tier ?? 'T1', liftSubstitutions, exerciseLibrary)
            : null
          const showValue = medal.type === 'weight-pr' || medal.type === 'stage-clear' || medal.type === 'volume-pr' || medal.type === '5rm-pr'
          return (
            <li key={i} className="flex items-center gap-3 px-4 py-3 text-sm">
              <Icon className="size-4 shrink-0 text-warning" />
              <div className="min-w-0 flex-1">
                <div className="font-medium">{label}</div>
                {liftName && (
                  <div className="truncate text-xs text-muted-foreground">
                    {liftName}{medal.tier ? ` · ${medal.tier}` : ''}
                  </div>
                )}
              </div>
              {showValue && (
                <span className="tabular-nums">
                  <span className="font-semibold">{medal.value}</span>
                  <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
                </span>
              )}
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function WorkoutDetail({ workout, unit, barWeight, plateInventory, liftSubstitutions, exerciseLibrary, onBack }: WorkoutDetailProps) {
  const [showStats, setShowStats] = useState(false)
  const isTestDay = workout.type === 'TD'

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
    <div className="mx-auto flex min-h-screen max-w-md flex-col pb-8">
      <header className="flex items-center gap-2 px-3 pt-5 pb-4">
        <Button variant="ghost" size="icon" onClick={onBack} aria-label="Back">
          <ArrowLeft />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">{getWorkoutLabel(workout.type)}</h1>
          <p className="truncate text-xs text-muted-foreground">
            {formattedDate} · {formattedTime}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground"
          onClick={() => setShowStats(true)}
          aria-label="Workout stats"
        >
          <BarChart2 />
        </Button>
      </header>

      {showStats && (
        <WorkoutStatsModal
          workout={workout}
          unit={unit}
          barWeight={barWeight}
          plateInventory={plateInventory}
          liftSubstitutions={liftSubstitutions}
          exerciseLibrary={exerciseLibrary}
          onClose={() => setShowStats(false)}
        />
      )}

      <main className="flex-1 space-y-5 px-4">
        {workout.medals && workout.medals.length > 0 && (
          <MedalsSection medals={workout.medals} unit={unit} liftSubstitutions={liftSubstitutions} exerciseLibrary={exerciseLibrary} />
        )}
        {workout.exercises.map((exercise, i) => (
          <Card key={i}>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <TierBadge tier={exercise.tier} />
                <div className="min-w-0 flex-1">
                  <h3 className="truncate font-medium">
                    {getExerciseName(exercise.liftId, exercise.tier, liftSubstitutions, exerciseLibrary)}
                  </h3>
                  {!isTestDay && (
                    <div className="font-mono text-xs text-muted-foreground">
                      {exercise.targetSets}×{exercise.targetReps}
                      {exercise.sets.some((s) => s.isAmrap) ? '+' : ''}
                    </div>
                  )}
                </div>
                <div className="text-right tabular-nums">
                  {isTestDay ? (
                    exercise.fiveRepMax !== undefined ? (
                      <>
                        <span className="mr-1 text-xs text-muted-foreground">5RM</span>
                        <span className="text-lg font-semibold">{exercise.fiveRepMax}</span>
                        <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
                      </>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not concluded</span>
                    )
                  ) : (
                    <>
                      <span className="text-lg font-semibold">{exercise.weight}</span>
                      <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
                    </>
                  )}
                </div>
              </div>

              <ul className="divide-y divide-border">
                {exercise.sets.map((set, j) => {
                  const isFailed = set.completed && set.reps === 0
                  const isPartial = set.completed && set.reps !== undefined && set.reps > 0 && set.reps < exercise.targetReps
                  const isSuccess = set.completed && set.reps !== undefined && set.reps >= exercise.targetReps
                  return (
                    <li key={j} className="flex items-center justify-between py-2 text-sm">
                      <span className="text-muted-foreground tabular-nums">
                        Set {set.setNumber}
                        {set.weight !== undefined && ` · ${set.weight} ${unit}`}
                      </span>
                      <div className="flex items-center gap-2 tabular-nums">
                        <span
                          className={cn(
                            'font-medium',
                            isFailed && 'text-destructive',
                            isPartial && 'text-warning',
                            !set.completed && 'text-muted-foreground'
                          )}
                        >
                          {isFailed ? 'Failed' : set.reps}
                          {set.isAmrap && !isFailed && <span className="ml-1 text-xs font-normal text-muted-foreground">AMRAP</span>}
                        </span>
                        {isFailed ? (
                          <X className="size-4 text-destructive" />
                        ) : isPartial ? (
                          <Minus className="size-4 text-warning" />
                        ) : isSuccess ? (
                          <Check className="size-4 text-success" />
                        ) : (
                          <X className="size-4 text-destructive" />
                        )}
                      </div>
                    </li>
                  )
                })}
              </ul>

              {!isTestDay && <ExerciseResult exercise={exercise} tier={exercise.tier} unit={unit} plateInventory={plateInventory} liftSubstitutions={liftSubstitutions} />}
            </CardContent>
          </Card>
        ))}

        {workout.notes && (
          <section className="space-y-3">
            <h2 className="px-1 text-sm text-muted-foreground">Notes</h2>
            <div className="rounded-lg bg-card p-4 text-sm">{workout.notes}</div>
          </section>
        )}
      </main>
    </div>
  )
}
