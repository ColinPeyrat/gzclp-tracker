import { useState, useEffect, useCallback, useRef } from 'react'
import { playTimerEnd } from '../lib/audio'

interface UseRestTimerReturn {
  seconds: number
  totalSeconds: number
  isRunning: boolean
  start: (duration: number) => void
  stop: () => void
  addTime: (seconds: number) => void
  skip: () => void
}

export function useRestTimer(onComplete?: () => void): UseRestTimerReturn {
  const [seconds, setSeconds] = useState(0)
  const [totalSeconds, setTotalSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    if (!isRunning || seconds <= 0) return

    const interval = setInterval(() => {
      setSeconds((prev) => {
        if (prev <= 1) {
          setIsRunning(false)
          onCompleteRef.current?.()
          playTimerEnd()
          if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200])
          }
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isRunning, seconds])

  const start = useCallback((duration: number) => {
    setSeconds(duration)
    setTotalSeconds(duration)
    setIsRunning(true)
  }, [])

  const stop = useCallback(() => {
    setIsRunning(false)
  }, [])

  const addTime = useCallback((amount: number) => {
    setSeconds((prev) => Math.max(0, prev + amount))
  }, [])

  const skip = useCallback(() => {
    setSeconds(0)
    setIsRunning(false)
  }, [])

  return { seconds, totalSeconds, isRunning, start, stop, addTime, skip }
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}
