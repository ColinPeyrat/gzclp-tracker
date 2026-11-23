import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface RestTimer {
  endsAt: number
  totalSeconds: number
}

interface RestTimerStore {
  timer: RestTimer | null
  start: (durationSeconds: number) => void
  addTime: (seconds: number) => void
  skip: () => void
}

export function restRemaining(timer: RestTimer | null, now: number): number {
  if (!timer) return 0
  return Math.max(0, Math.ceil((timer.endsAt - now) / 1000))
}

export const useRestTimerStore = create<RestTimerStore>()(
  persist(
    (set, get) => ({
      timer: null,

      start: (durationSeconds) =>
        set({ timer: { endsAt: Date.now() + durationSeconds * 1000, totalSeconds: durationSeconds } }),

      addTime: (seconds) => {
        const { timer } = get()
        if (!timer) return
        set({ timer: { ...timer, endsAt: timer.endsAt + seconds * 1000 } })
      },

      skip: () => set({ timer: null }),
    }),
    { name: 'rest-timer' }
  )
)
