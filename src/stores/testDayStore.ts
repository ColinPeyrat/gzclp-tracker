import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CompletedWarmupSet, LiftName } from '../lib/types'
import type { TestAttempt } from '../lib/returnToProgression'

interface TestDayStore {
  startedAt: string | null
  attempts: Partial<Record<LiftName, TestAttempt[]>>
  warmups: Partial<Record<LiftName, CompletedWarmupSet[]>>
  begin: () => void
  logAttempt: (liftId: LiftName, attempt: TestAttempt) => void
  undoAttempt: (liftId: LiftName) => void
  setWarmups: (liftId: LiftName, sets: CompletedWarmupSet[]) => void
  reset: () => void
}

export const useTestDayStore = create<TestDayStore>()(
  persist(
    (set, get) => ({
      startedAt: null,
      attempts: {},
      warmups: {},

      begin: () => {
        if (get().startedAt) return
        set({ startedAt: new Date().toISOString(), attempts: {}, warmups: {} })
      },

      logAttempt: (liftId, attempt) => {
        const attempts = get().attempts
        set({ attempts: { ...attempts, [liftId]: [...(attempts[liftId] ?? []), attempt] } })
      },

      undoAttempt: (liftId) => {
        const attempts = get().attempts
        set({ attempts: { ...attempts, [liftId]: (attempts[liftId] ?? []).slice(0, -1) } })
      },

      setWarmups: (liftId, sets) => {
        set({ warmups: { ...get().warmups, [liftId]: sets } })
      },

      reset: () => set({ startedAt: null, attempts: {}, warmups: {} }),
    }),
    { name: 'test-day-session' }
  )
)
