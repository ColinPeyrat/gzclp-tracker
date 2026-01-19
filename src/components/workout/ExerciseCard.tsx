import type { ExerciseLog, Tier, WeightUnit } from '../../lib/types'
import { SetLogger } from './SetLogger'
import { PlateDisplay } from '../plates/PlateDisplay'
import { getExerciseName } from '../../hooks/useWorkoutSession'

interface ExerciseCardProps {
  exercise: ExerciseLog
  barWeight: number
  availablePlates: number[]
  unit: WeightUnit
  onCompleteSet: (setIndex: number, reps: number) => void
  onWeightChange?: (newWeight: number) => void
}

const tierColors: Record<Tier, string> = {
  T1: 'text-blue-400',
  T2: 'text-green-400',
  T3: 'text-yellow-400',
}

export function ExerciseCard({
  exercise,
  barWeight,
  availablePlates,
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
        <span className={`text-sm font-medium ${tierColors[exercise.tier]}`}>
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
          availablePlates={availablePlates}
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
