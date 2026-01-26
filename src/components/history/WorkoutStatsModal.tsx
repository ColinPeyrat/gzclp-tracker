import { X } from 'lucide-react'
import { Modal } from '../ui/Modal'
import type { Workout, WeightUnit, LiftSubstitution, ExerciseDefinition } from '../../lib/types'
import { getExerciseName } from '../../lib/exercises'

interface WorkoutStatsModalProps {
  workout: Workout
  unit: WeightUnit
  liftSubstitutions?: LiftSubstitution[]
  exerciseLibrary?: ExerciseDefinition[]
  onClose: () => void
}

interface StatRowProps {
  label: string
  value: string | number
  subValue?: string
}

function StatRow({ label, value, subValue }: StatRowProps) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-zinc-400">{label}</span>
      <div className="text-right">
        <span className="font-medium">{value}</span>
        {subValue && <span className="ml-1 text-sm text-zinc-500">{subValue}</span>}
      </div>
    </div>
  )
}

export function WorkoutStatsModal({ workout, unit, liftSubstitutions, exerciseLibrary, onClose }: WorkoutStatsModalProps) {
  // Calculate statistics
  let totalVolume = 0
  let totalSets = 0
  let totalReps = 0
  let completedSets = 0
  let heaviestLift = { name: '', weight: 0 }

  for (const exercise of workout.exercises) {
    const exerciseName = getExerciseName(exercise.liftId, exercise.tier, liftSubstitutions, exerciseLibrary)

    for (const set of exercise.sets) {
      totalSets++
      if (set.completed && set.reps > 0) {
        completedSets++
        totalReps += set.reps
        totalVolume += exercise.weight * set.reps
      }
    }

    if (exercise.weight > heaviestLift.weight) {
      heaviestLift = { name: exerciseName, weight: exercise.weight }
    }
  }

  const successRate = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0

  // Format volume with thousands separator
  const formattedVolume = totalVolume.toLocaleString()

  return (
    <Modal onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Workout Stats</h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-zinc-400 hover:bg-zinc-700 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="divide-y divide-zinc-700">
          <StatRow
            label="Total Volume"
            value={formattedVolume}
            subValue={unit}
          />
          <StatRow
            label="Total Reps"
            value={totalReps}
          />
          <StatRow
            label="Sets Completed"
            value={`${completedSets}/${totalSets}`}
            subValue={`${successRate}%`}
          />
          <StatRow
            label="Exercises"
            value={workout.exercises.length}
          />
          {heaviestLift.weight > 0 && (
            <StatRow
              label="Heaviest Lift"
              value={`${heaviestLift.weight} ${unit}`}
              subValue={heaviestLift.name}
            />
          )}
        </div>
      </div>
    </Modal>
  )
}
