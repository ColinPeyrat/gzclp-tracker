import { useState, useRef } from 'react'
import { Check, X, Minus } from 'lucide-react'
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
      <div className="flex h-12 items-center gap-2 rounded-lg bg-zinc-800 px-3">
        <span className="w-12 text-sm text-zinc-400">Set {set.setNumber}</span>
        <input
          type="number"
          value={repInput}
          onChange={(e) => setRepInput(e.target.value)}
          placeholder="Reps"
          className="h-8 w-20 rounded border border-zinc-600 bg-zinc-900 px-2 text-center text-base focus:border-blue-500 focus:outline-none"
          autoFocus
          min={0}
        />
        <button
          onClick={handleRepSubmit}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-600 hover:bg-green-500"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            setShowRepInput(false)
            setRepInput('')
          }}
          className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-700 hover:bg-zinc-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  const isFailed = set.completed && set.reps === 0
  const isPartial = set.completed && set.reps !== undefined && set.reps > 0 && set.reps < targetReps
  const isSuccess = set.completed && set.reps !== undefined && set.reps >= targetReps

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onContextMenu={(e) => e.preventDefault()}
        disabled={!isActive && !set.completed}
        className={`flex h-12 flex-1 items-center gap-3 rounded-lg px-3 transition-colors touch-manipulation ${
          isFailed
            ? 'bg-red-900/30 text-red-400'
            : isPartial
              ? 'bg-amber-900/30 text-amber-400'
              : isSuccess
                ? 'bg-green-900/30 text-green-400'
                : isActive
                  ? 'bg-zinc-700 hover:bg-zinc-600'
                  : 'bg-zinc-800'
        }`}
      >
        <span className="w-12 text-sm text-zinc-400">Set {set.setNumber}</span>

        <div className="flex flex-1 items-center justify-center gap-2">
          {isFailed ? (
            <span className="text-lg font-medium">Failed</span>
          ) : set.completed ? (
            <span className="text-lg font-medium">{set.reps}</span>
          ) : set.isAmrap ? (
            <span className="text-zinc-400">{targetReps}+ AMRAP</span>
          ) : (
            <span className="text-zinc-400">{targetReps}</span>
          )}
        </div>

        <div className="w-8">
          {isFailed ? (
            <X className="h-5 w-5 text-red-400" />
          ) : isPartial ? (
            <Minus className="h-5 w-5 text-amber-400" />
          ) : isSuccess ? (
            <Check className="h-5 w-5 text-green-400" />
          ) : (
            <Minus className="h-5 w-5 text-zinc-500" />
          )}
        </div>
      </button>

    </div>
  )
}
