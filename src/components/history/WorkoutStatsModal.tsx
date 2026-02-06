import { X } from 'lucide-react'
import { Modal } from '../ui/Modal'
import type { Workout, WeightUnit, LiftSubstitution, ExerciseDefinition } from '../../lib/types'
import { getExerciseName } from '../../lib/exercises'
import { calculateWorkoutStats } from '../../lib/workoutStats'

interface WorkoutStatsModalProps {
  workout: Workout
  unit: WeightUnit
  barWeight: number
  plateInventory: Record<string, number>
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

export function WorkoutStatsModal({ workout, unit, barWeight, plateInventory, liftSubstitutions, exerciseLibrary, onClose }: WorkoutStatsModalProps) {
  const stats = calculateWorkoutStats(
    workout,
    barWeight,
    plateInventory,
    unit,
    liftSubstitutions,
    (liftId, tier) => getExerciseName(liftId, tier, liftSubstitutions, exerciseLibrary),
    exerciseLibrary
  )

  const formattedWarmupVolume = stats.warmupVolume.toLocaleString()
  const formattedWorkingVolume = stats.workingVolume.toLocaleString()
  const formattedTotalVolume = stats.totalVolume.toLocaleString()

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
          {stats.warmupVolume > 0 && (
            <StatRow
              label="Warmup Volume"
              value={formattedWarmupVolume}
              subValue={unit}
            />
          )}
          <StatRow
            label="Working Volume"
            value={formattedWorkingVolume}
            subValue={unit}
          />
          {stats.warmupVolume > 0 && (
            <StatRow
              label="Total Volume"
              value={formattedTotalVolume}
              subValue={unit}
            />
          )}
          <StatRow
            label="Total Reps"
            value={stats.totalReps}
          />
          <StatRow
            label="Sets Completed"
            value={`${stats.completedSets}/${stats.totalSets}`}
            subValue={`${stats.successRate}%`}
          />
          <StatRow
            label="Exercises"
            value={workout.exercises.length}
          />
          {stats.heaviestLift.weight > 0 && (
            <StatRow
              label="Heaviest Lift"
              value={`${stats.heaviestLift.weight} ${unit}`}
              subValue={stats.heaviestLift.name}
            />
          )}
        </div>
      </div>
    </Modal>
  )
}
