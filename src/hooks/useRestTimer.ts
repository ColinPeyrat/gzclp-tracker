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
  const endTimeRef = useRef(0)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  const complete = useCallback(() => {
    setIsRunning(false)
    setSeconds(0)
    onCompleteRef.current?.()
    playTimerEnd()
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200])
    }
  }, [])

  const updateFromEndTime = useCallback(() => {
    const remaining = Math.ceil((endTimeRef.current - Date.now()) / 1000)
    if (remaining <= 0) {
      complete()
    } else {
      setSeconds(remaining)
    }
  }, [complete])

  // Tick interval
  useEffect(() => {
    if (!isRunning) return

    const interval = setInterval(updateFromEndTime, 1000)
    return () => clearInterval(interval)
  }, [isRunning, updateFromEndTime])

  // Recalculate when app returns from background
  useEffect(() => {
    if (!isRunning) return

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updateFromEndTime()
      }
    }
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => document.removeEventListener('visibilitychange', onVisibilityChange)
  }, [isRunning, updateFromEndTime])

  const start = useCallback((duration: number) => {
    endTimeRef.current = Date.now() + duration * 1000
    setSeconds(duration)
    setTotalSeconds(duration)
    setIsRunning(true)
  }, [])

  const stop = useCallback(() => {
    setIsRunning(false)
  }, [])

  const addTime = useCallback((amount: number) => {
    endTimeRef.current += amount * 1000
    updateFromEndTime()
  }, [updateFromEndTime])

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
