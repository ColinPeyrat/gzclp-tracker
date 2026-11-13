import { useState } from 'react'
import { Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
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
  doneLabel?: string
}

export function WarmupModal({
  exerciseName,
  workWeight,
  barWeight,
  plateInventory,
  unit,
  completedWarmupSets,
  onComplete,
  doneLabel = 'Start Workout',
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
    <Modal
      title="Warmup"
      description={
        <>
          {exerciseName} · work weight{' '}
          <span className="font-semibold text-foreground tabular-nums">{workWeight}</span> {unit}
        </>
      }
    >
      <div className="space-y-4">
        <ul className="space-y-2">
          {sets.map((set, index) => (
            <li key={index}>
              <button
                onClick={() => toggleSet(index)}
                aria-pressed={set.completed}
                className={cn(
                  'flex min-h-14 w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
                  set.completed ? 'bg-transparent text-muted-foreground' : 'bg-secondary hover:bg-accent'
                )}
              >
                <span
                  className={cn(
                    'flex size-6 shrink-0 items-center justify-center rounded-full border',
                    set.completed ? 'border-primary bg-primary text-primary-foreground' : 'border-input'
                  )}
                >
                  {set.completed && <Check className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium tabular-nums">
                    {set.weight} <span className="text-xs text-muted-foreground">{unit}</span> × {set.reps}
                  </span>
                  <span className="block font-mono text-xs text-muted-foreground">{set.label}</span>
                </span>
                {set.plates.length === 0 ? (
                  <span className="text-xs text-muted-foreground">Empty bar</span>
                ) : (
                  <span className={cn(set.completed && 'opacity-50')}>
                    <PlateChips plates={set.plates} size="sm" />
                  </span>
                )}
              </button>
            </li>
          ))}
        </ul>

        <Button
          size="xl"
          variant={allCompleted ? 'default' : 'secondary'}
          className="w-full"
          onClick={() => {
            const completed = sets
              .filter((s) => s.completed)
              .map(({ weight, reps }) => ({ weight, reps }))
            onComplete(completed.length > 0 ? completed : undefined)
          }}
        >
          {allCompleted ? doneLabel : 'Close'}
        </Button>
      </div>
    </Modal>
  )
}
