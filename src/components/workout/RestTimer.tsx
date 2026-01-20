import { Plus, Minus, SkipForward } from 'lucide-react'
import { formatTime } from '../../hooks/useRestTimer'

interface RestTimerProps {
  seconds: number
  totalSeconds: number
  isRunning: boolean
  onAddTime: (seconds: number) => void
  onSkip: () => void
}

export function RestTimer({ seconds, totalSeconds, isRunning, onAddTime, onSkip }: RestTimerProps) {
  if (!isRunning && seconds === 0) return null

  const progress = isRunning ? (seconds / totalSeconds) * 100 : 0

  return (
    <div className="fixed left-0 right-0 border-t border-zinc-700 bg-zinc-900 p-4 bottom-(--nav-height)">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm text-zinc-400">Rest</span>
        <span className="text-3xl font-bold tabular-nums">{formatTime(seconds)}</span>
      </div>

      <div className="mb-3 h-1 overflow-hidden rounded-full bg-zinc-700">
        <div
          className="h-full bg-blue-500 transition-all duration-1000"
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>

      <div className="flex items-center justify-center gap-3">
        <button
          onClick={() => onAddTime(-30)}
          className="flex items-center gap-1 rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
        >
          <Minus className="h-4 w-4" />
          30s
        </button>
        <button
          onClick={() => onAddTime(30)}
          className="flex items-center gap-1 rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
        >
          <Plus className="h-4 w-4" />
          30s
        </button>
        <button
          onClick={onSkip}
          className="flex items-center gap-1 rounded-lg bg-zinc-800 px-4 py-2 text-sm hover:bg-zinc-700"
        >
          <SkipForward className="h-4 w-4" />
          Skip
        </button>
      </div>
    </div>
  )
}
