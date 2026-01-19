import { useState } from 'react'
import { Check, X, Minus } from 'lucide-react'
import type { SetLog } from '../../lib/types'

interface SetLoggerProps {
  set: SetLog
  targetReps: number
  onComplete: (reps: number) => void
  isActive: boolean
}

export function SetLogger({ set, targetReps, onComplete, isActive }: SetLoggerProps) {
  const [amrapInput, setAmrapInput] = useState('')
  const [showAmrapInput, setShowAmrapInput] = useState(false)

  const handleTap = () => {
    if (set.completed) return

    if (set.isAmrap) {
      setShowAmrapInput(true)
    } else {
      onComplete(targetReps)
    }
  }

  const handleAmrapSubmit = () => {
    const reps = parseInt(amrapInput, 10)
    if (!isNaN(reps) && reps > 0) {
      onComplete(reps)
      setShowAmrapInput(false)
      setAmrapInput('')
    }
  }

  if (showAmrapInput) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-zinc-800 p-3">
        <span className="w-12 text-sm text-zinc-400">Set {set.setNumber}</span>
        <input
          type="number"
          value={amrapInput}
          onChange={(e) => setAmrapInput(e.target.value)}
          placeholder="Reps"
          className="w-20 rounded border border-zinc-600 bg-zinc-900 px-3 py-2 text-center text-lg focus:border-blue-500 focus:outline-none"
          autoFocus
          min={1}
        />
        <button
          onClick={handleAmrapSubmit}
          className="rounded-lg bg-green-600 p-2 hover:bg-green-500"
        >
          <Check className="h-5 w-5" />
        </button>
        <button
          onClick={() => {
            setShowAmrapInput(false)
            setAmrapInput('')
          }}
          className="rounded-lg bg-zinc-700 p-2 hover:bg-zinc-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleTap}
      disabled={set.completed}
      className={`flex w-full items-center gap-3 rounded-lg p-3 transition-colors ${
        set.completed
          ? 'bg-green-900/30 text-green-400'
          : isActive
            ? 'bg-zinc-700 hover:bg-zinc-600'
            : 'bg-zinc-800 hover:bg-zinc-700'
      }`}
    >
      <span className="w-12 text-sm text-zinc-400">Set {set.setNumber}</span>

      <div className="flex flex-1 items-center justify-center gap-2">
        {set.completed ? (
          <span className="text-lg font-medium">{set.reps}</span>
        ) : set.isAmrap ? (
          <span className="text-zinc-400">{targetReps}+ AMRAP</span>
        ) : (
          <span className="text-zinc-400">{targetReps}</span>
        )}
      </div>

      <div className="w-8">
        {set.completed ? (
          <Check className="h-5 w-5 text-green-400" />
        ) : (
          <Minus className="h-5 w-5 text-zinc-500" />
        )}
      </div>
    </button>
  )
}
