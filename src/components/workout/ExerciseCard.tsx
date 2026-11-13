import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { TierBadge } from '@/components/ui/tier-badge'
import type { ExerciseLog, WeightUnit, LiftSubstitution, ExerciseDefinition } from '../../lib/types'
import { SetLogger } from './SetLogger'
import { PlateDisplay } from '../plates/PlateDisplay'
import { WeightEditModal } from '../plates/WeightEditModal'
import { getExerciseName, isDumbbellExercise } from '../../lib/exercises'
import { isTrialWeight } from '../../lib/progression'

interface ExerciseCardProps {
  exercise: ExerciseLog
  barWeight: number
  dumbbellHandleWeight: number
  plateInventory: Record<string, number>
  unit: WeightUnit
  liftSubstitutions?: LiftSubstitution[]
  exerciseLibrary?: ExerciseDefinition[]
  onCompleteSet: (setIndex: number, reps: number) => void
  onWeightChange?: (newWeight: number) => void
}

export function ExerciseCard({
  exercise,
  barWeight,
  dumbbellHandleWeight,
  plateInventory,
  unit,
  liftSubstitutions,
  exerciseLibrary,
  onCompleteSet,
  onWeightChange,
}: ExerciseCardProps) {
  const [isWeightModalOpen, setIsWeightModalOpen] = useState(false)
  const exerciseName = getExerciseName(exercise.liftId, exercise.tier, liftSubstitutions, exerciseLibrary)
  const isDumbbell = isDumbbellExercise(exercise.liftId, liftSubstitutions, exerciseLibrary)
  const showPlates = exercise.tier !== 'T3' || isDumbbell
  const effectiveBarWeight = isDumbbell ? dumbbellHandleWeight : barWeight
  const completedSets = exercise.sets.filter((s) => s.completed).length
  const nextSetIndex = exercise.sets.findIndex((s) => !s.completed)
  const isTrial = isTrialWeight(exercise)
  const scheme = `${exercise.targetSets}×${exercise.targetReps}${exercise.sets.some((s) => s.isAmrap) ? '+' : ''}`

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <TierBadge tier={exercise.tier} />
              <span className="font-mono text-sm text-muted-foreground">{scheme}</span>
              {isTrial && (
                <span className="rounded-sm bg-warning/10 px-1.5 py-0.5 text-xs font-medium text-warning">trial</span>
              )}
            </div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">{exerciseName}</h2>
          </div>

          <div className="flex items-end justify-between gap-3">
            <div className="tabular-nums">
              <span className="text-5xl font-semibold tracking-tight">{exercise.weight}</span>
              <span className="ml-1.5 text-base text-muted-foreground">{unit}</span>
              {isTrial && (
                <div className="mt-1 text-sm text-muted-foreground">
                  original {exercise.originalWeight} {unit}
                </div>
              )}
            </div>
            {onWeightChange && (
              <Button
                variant="secondary"
                size="icon-lg"
                className="size-11"
                onClick={() => setIsWeightModalOpen(true)}
                aria-label="Change weight"
              >
                <Pencil />
              </Button>
            )}
          </div>

          {showPlates && (
            <div className="border-t border-border pt-4 empty:hidden">
              <PlateDisplay
                targetWeight={exercise.weight}
                barWeight={effectiveBarWeight}
                plateInventory={plateInventory}
                unit={unit}
                isDumbbell={isDumbbell}
                onWeightChange={onWeightChange}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {onWeightChange && (
        <WeightEditModal
          isOpen={isWeightModalOpen}
          onClose={() => setIsWeightModalOpen(false)}
          currentWeight={exercise.weight}
          unit={unit}
          onSave={onWeightChange}
        />
      )}

      <section className="space-y-2">
        <div className="flex items-center justify-between px-1 text-sm text-muted-foreground">
          <h3>Sets</h3>
          <span className="tabular-nums">
            {completedSets}/{exercise.targetSets}
          </span>
        </div>

        {exercise.sets.map((set, index) => (
          <SetLogger
            key={set.setNumber}
            set={set}
            targetReps={exercise.targetReps}
            onComplete={(reps) => onCompleteSet(index, reps)}
            isActive={index === nextSetIndex}
          />
        ))}
      </section>
    </div>
  )
}
