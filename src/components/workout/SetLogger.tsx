import { useState, useRef } from 'react'
import { Check, X, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { SetLog } from '../../lib/types'

interface SetLoggerProps {
  set: SetLog
  targetReps: number
  onComplete: (reps: number) => void
  isActive: boolean
}

export function SetLogger({ set, targetReps, onComplete, isActive }: SetLoggerProps) {
  const [repInput, setRepInput] = useState('')
  const [showRepInput, setShowRepInput] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressTriggered = useRef(false)

  const handlePointerDown = () => {
    if (!isActive && !set.completed) return

    longPressTriggered.current = false
    pressTimer.current = setTimeout(() => {
      longPressTriggered.current = true
      if (navigator.vibrate) navigator.vibrate(50)
      setShowRepInput(true)
    }, 500)
  }

  const handlePointerUp = () => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current)
      pressTimer.current = null
    }
  }

  const handleClick = () => {
    if (set.completed || !isActive) return
    if (longPressTriggered.current) {
      longPressTriggered.current = false
      return
    }

    if (set.isAmrap) {
      setShowRepInput(true)
    } else {
      onComplete(targetReps)
    }
  }

  const handleRepSubmit = () => {
    const reps = parseInt(repInput, 10)
    if (!isNaN(reps) && reps >= 0) {
      onComplete(reps)
      setShowRepInput(false)
      setRepInput('')
    }
  }

  if (showRepInput) {
    return (
      <form
        className="flex h-14 items-center gap-2 rounded-lg bg-secondary pr-2 pl-4"
        onSubmit={(e) => {
          e.preventDefault()
          handleRepSubmit()
        }}
      >
        <span className="w-12 text-sm text-muted-foreground">Set {set.setNumber}</span>
        <Input
          type="number"
          inputMode="numeric"
          value={repInput}
          onChange={(e) => setRepInput(e.target.value)}
          placeholder="Reps"
          className="h-10 flex-1 text-center text-lg font-semibold tabular-nums md:text-lg"
          autoFocus
          min={0}
        />
        <Button type="submit" size="icon-lg" className="size-10" aria-label="Save reps">
          <Check className="size-5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="icon-lg"
          className="size-10"
          aria-label="Cancel"
          onClick={() => {
            setShowRepInput(false)
            setRepInput('')
          }}
        >
          <X className="size-5" />
        </Button>
      </form>
    )
  }

  const isFailed = set.completed && set.reps === 0
  const isPartial = set.completed && set.reps !== undefined && set.reps > 0 && set.reps < targetReps
  const isSuccess = set.completed && set.reps !== undefined && set.reps >= targetReps
  const isPending = !set.completed && !isActive

  return (
    <button
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onContextMenu={(e) => e.preventDefault()}
      disabled={isPending}
      aria-current={isActive ? 'step' : undefined}
      className={cn(
        'flex h-14 w-full touch-manipulation items-center gap-3 rounded-lg px-4 text-left transition-colors select-none outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        isActive && 'bg-primary text-primary-foreground hover:bg-primary/90 active:bg-primary/80',
        set.completed && 'bg-card',
        isPending && 'bg-card text-muted-foreground'
      )}
    >
      <span className={cn('w-14 text-sm', isActive ? 'opacity-70' : 'text-muted-foreground')}>Set {set.setNumber}</span>

      <span className="flex flex-1 items-baseline justify-center gap-1.5 tabular-nums">
        {isFailed ? (
          <span className="font-medium text-destructive">Failed</span>
        ) : set.completed ? (
          <>
            <span className={cn('text-xl font-semibold', isPartial && 'text-warning')}>{set.reps}</span>
            <span className="text-xs text-muted-foreground">reps</span>
          </>
        ) : (
          <span className={cn('text-xl font-semibold', isPending && 'font-medium')}>
            {targetReps}
            {set.isAmrap && '+'}
          </span>
        )}
      </span>

      <span className="flex w-14 justify-end">
        {isFailed ? (
          <X className="size-5 text-destructive" />
        ) : isPartial ? (
          <Minus className="size-5 text-warning" />
        ) : isSuccess ? (
          <Check className="size-5 text-primary" />
        ) : set.isAmrap ? (
          <span className={cn('font-mono text-xs', isActive ? 'opacity-70' : 'text-muted-foreground')}>AMRAP</span>
        ) : null}
      </span>
    </button>
  )
}
