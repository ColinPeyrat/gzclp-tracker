import { useState } from 'react'
import { Check, Circle } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { calculateWarmupSets, type WarmupSet } from '../../lib/warmup'
import { PlateChips } from '../plates/PlateChips'
import type { WeightUnit, CompletedWarmupSet } from '../../lib/types'
import { vibrate } from '../../lib/haptics'

interface WarmupModalProps {
  exerciseName: string
  workWeight: number
  barWeight: number
  plateInventory: Record<string, number>
  unit: WeightUnit
  completedWarmupSets?: CompletedWarmupSet[]
  onComplete: (completedSets?: CompletedWarmupSet[]) => void
}

export function WarmupModal({
  exerciseName,
  workWeight,
  barWeight,
  plateInventory,
  unit,
  completedWarmupSets,
  onComplete,
}: WarmupModalProps) {
  const [sets, setSets] = useState<WarmupSet[]>(() => {
    const calculated = calculateWarmupSets(workWeight, barWeight, plateInventory, unit)
    if (!completedWarmupSets?.length) return calculated
    // Restore completed state by matching weight+reps
    return calculated.map((s) => ({
      ...s,
      completed: completedWarmupSets.some((c) => c.weight === s.weight && c.reps === s.reps),
    }))
  })

  const toggleSet = (index: number) => {
    vibrate()
    setSets((prev) =>
      prev.map((set, i) =>
        i === index ? { ...set, completed: !set.completed } : set
      )
    )
  }

  const allCompleted = sets.every((s) => s.completed)

  return (
    <Modal>
      <div className="space-y-4">
        <div className="text-center">
          <h2 className="text-lg font-bold">Warmup Sets</h2>
          <p className="text-zinc-400">{exerciseName}</p>
          <p className="text-sm text-zinc-500">
            Work: {workWeight} {unit}
          </p>
        </div>

        <div className="space-y-2">
          {sets.map((set, index) => (
            <button
              key={index}
              onClick={() => toggleSet(index)}
              className={`flex w-full items-center gap-3 rounded-lg p-3 text-left transition-colors ${
                set.completed
                  ? 'bg-zinc-700/50 text-zinc-500'
                  : 'bg-zinc-700 hover:bg-zinc-600'
              }`}
            >
              {set.completed ? (
                <Check className="h-5 w-5 shrink-0 text-green-500" />
              ) : (
                <Circle className="h-5 w-5 shrink-0 text-zinc-400" />
              )}
              <div className="flex flex-1 items-center justify-between">
                <div>
                  <span className="font-medium">
                    {set.weight} {unit} x {set.reps}
                  </span>
                  <span className="ml-2 text-sm text-zinc-400">
                    ({set.label})
                  </span>
                </div>
                {set.plates.length === 0 ? (
                  <span className="text-xs text-zinc-500">Empty bar</span>
                ) : (
                  <PlateChips plates={set.plates} size="sm" />
                )}
              </div>
            </button>
          ))}
        </div>

        <div className="pt-2">
          <button
            onClick={() => {
              const completed = sets
                .filter((s) => s.completed)
                .map(({ weight, reps }) => ({ weight, reps }))
              onComplete(completed.length > 0 ? completed : undefined)
            }}
            className={`w-full rounded-lg py-2 font-medium transition-colors ${
              allCompleted
                ? 'bg-blue-600 hover:bg-blue-500'
                : 'bg-zinc-700 hover:bg-zinc-600'
            }`}
          >
            {allCompleted ? 'Start Workout' : 'Close'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
