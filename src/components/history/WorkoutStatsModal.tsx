import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
    <div className="flex items-center justify-between gap-4 py-2.5">
      <span className="text-muted-foreground">{label}</span>
      <div className="min-w-0 truncate text-right tabular-nums">
        <span className="font-semibold">{value}</span>
        {subValue && <span className="ml-1 text-xs text-muted-foreground">{subValue}</span>}
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
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Workout stats</DialogTitle>
        </DialogHeader>

        <div className="divide-y divide-border">
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
      </DialogContent>
    </Dialog>
  )
}
