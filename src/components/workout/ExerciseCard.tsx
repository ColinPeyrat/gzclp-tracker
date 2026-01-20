import type { ExerciseLog, WeightUnit } from '../../lib/types'
import { SetLogger } from './SetLogger'
import { PlateDisplay } from '../plates/PlateDisplay'
import { getExerciseName, TIER_COLORS } from '../../lib/exercises'

interface ExerciseCardProps {
  exercise: ExerciseLog
  barWeight: number
  plateInventory: Record<string, number>
  unit: WeightUnit
  onCompleteSet: (setIndex: number, reps: number) => void
  onWeightChange?: (newWeight: number) => void
}

export function ExerciseCard({
  exercise,
  barWeight,
  plateInventory,
  unit,
  onCompleteSet,
  onWeightChange,
}: ExerciseCardProps) {
  const exerciseName = getExerciseName(exercise.liftId, exercise.tier)
  const completedSets = exercise.sets.filter((s) => s.completed).length
  const nextSetIndex = exercise.sets.findIndex((s) => !s.completed)

  return (
    <div className="space-y-4">
      <div className="text-center">
        <span className={`text-sm font-medium ${TIER_COLORS[exercise.tier]}`}>
          {exercise.tier}
        </span>
        <h2 className="text-2xl font-bold">{exerciseName}</h2>
        <p className="text-lg text-zinc-400">
          {exercise.targetSets}×{exercise.targetReps}
          {exercise.sets.some((s) => s.isAmrap) ? '+' : ''} @ {exercise.weightLbs} {unit}
        </p>
      </div>

      {exercise.tier !== 'T3' && (
        <PlateDisplay
          targetWeight={exercise.weightLbs}
          barWeight={barWeight}
          plateInventory={plateInventory}
          unit={unit}
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
