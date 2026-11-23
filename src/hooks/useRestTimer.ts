import { useState, useEffect, useRef } from 'react'
import { playTimerEnd } from '../lib/audio'
import { useRestTimerStore, restRemaining } from '../stores/restTimerStore'

interface UseRestTimerReturn {
  seconds: number
  totalSeconds: number
  isRunning: boolean
  start: (duration: number) => void
  addTime: (seconds: number) => void
  skip: () => void
}

interface UseRestTimerOptions {
  alertOnEnd?: boolean
}

export function useRestTimer({ alertOnEnd = true }: UseRestTimerOptions = {}): UseRestTimerReturn {
  const timer = useRestTimerStore((s) => s.timer)
  const start = useRestTimerStore((s) => s.start)
  const addTime = useRestTimerStore((s) => s.addTime)
  const skip = useRestTimerStore((s) => s.skip)
  const [seconds, setSeconds] = useState(() => restRemaining(useRestTimerStore.getState().timer, Date.now()))
  const sawRunningRef = useRef(false)

  useEffect(() => {
    const update = () => setSeconds(restRemaining(useRestTimerStore.getState().timer, Date.now()))
    const unsubscribe = useRestTimerStore.subscribe(update)
    const interval = setInterval(update, 1000)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') update()
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      unsubscribe()
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [])

  useEffect(() => {
    if (!timer) {
      sawRunningRef.current = false
      return
    }
    if (restRemaining(timer, Date.now()) > 0) {
      sawRunningRef.current = true
      return
    }
    if (!alertOnEnd) return

    // A rest that ended while this screen wasn't watching (reload, app closed) is dropped silently
    const shouldAlert = sawRunningRef.current
    sawRunningRef.current = false
    skip()
    if (shouldAlert) {
      playTimerEnd()
      navigator.vibrate?.([200, 100, 200])
    }
  }, [timer, seconds, alertOnEnd, skip])

  return {
    seconds,
    totalSeconds: timer?.totalSeconds ?? 0,
    isRunning: timer !== null && seconds > 0,
    start,
    addTime,
    skip,
  }
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
