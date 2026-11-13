import { Plus, Minus, SkipForward } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
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
    <div className="fixed inset-x-0 bottom-(--nav-height) z-30 h-(--rest-timer-height) border-t border-border bg-background">
      <div className="mx-auto flex h-full max-w-md flex-col justify-center gap-3 px-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">Rest</span>
          <span className="text-4xl font-semibold tracking-tight tabular-nums">{formatTime(seconds)}</span>
        </div>

        <Progress value={Math.min(100, progress)} className="[&>*]:duration-1000" />

        <div className="grid grid-cols-3 gap-2">
          <Button variant="secondary" size="lg" className="h-10" onClick={() => onAddTime(-30)}>
            <Minus />
            30s
          </Button>
          <Button variant="secondary" size="lg" className="h-10" onClick={() => onAddTime(30)}>
            <Plus />
            30s
          </Button>
          <Button variant="secondary" size="lg" className="h-10" onClick={onSkip}>
            <SkipForward />
            Skip
          </Button>
        </div>
      </div>
    </div>
  )
}
