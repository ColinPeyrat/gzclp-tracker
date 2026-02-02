import { useState } from 'react'
import { Pencil } from 'lucide-react'
import type { ExerciseLog, WeightUnit, LiftSubstitution, ExerciseDefinition } from '../../lib/types'
import { SetLogger } from './SetLogger'
import { PlateDisplay } from '../plates/PlateDisplay'
import { WeightEditModal } from '../plates/WeightEditModal'
import { getExerciseName, TIER_COLORS, isDumbbellExercise } from '../../lib/exercises'
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

  return (
    <div className="space-y-4">
      <div className="text-center">
        <span className={`text-sm font-medium ${TIER_COLORS[exercise.tier]}`}>
          {exercise.tier}
          {isTrial && (
            <span className="ml-2 px-1.5 py-0.5 text-xs bg-amber-500/20 text-amber-400 rounded">
              trial
            </span>
          )}
        </span>
        <h2 className="text-2xl font-bold">{exerciseName}</h2>
        <p className="text-lg text-zinc-400">
          {exercise.targetSets}×{exercise.targetReps}
          {exercise.sets.some((s) => s.isAmrap) ? '+' : ''} @ {exercise.weight} {unit}
          {onWeightChange && (
            <button
              onClick={() => setIsWeightModalOpen(true)}
              className="ml-2 p-1 text-zinc-500 hover:text-zinc-300 inline-flex align-middle"
            >
              <Pencil size={16} />
            </button>
          )}
        </p>
        {isTrial && (
          <p className="text-sm text-zinc-500">
            (original: {exercise.originalWeight} {unit})
          </p>
        )}
      </div>

      {onWeightChange && (
        <WeightEditModal
          isOpen={isWeightModalOpen}
          onClose={() => setIsWeightModalOpen(false)}
          currentWeight={exercise.weight}
          unit={unit}
          onSave={onWeightChange}
        />
      )}

      {showPlates && (
        <PlateDisplay
          targetWeight={exercise.weight}
          barWeight={effectiveBarWeight}
          plateInventory={plateInventory}
          unit={unit}
          isDumbbell={isDumbbell}
          onWeightChange={onWeightChange}
        />
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm text-zinc-400">
          <span>Sets</span>
          <span>
            {completedSets} / {exercise.targetSets}
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
      </div>
    </div>
  )
}
