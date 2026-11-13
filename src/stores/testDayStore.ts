import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LiftName } from '../lib/types'
import type { TestAttempt } from '../lib/returnToProgression'

interface TestDayStore {
  startedAt: string | null
  attempts: Partial<Record<LiftName, TestAttempt[]>>
  begin: () => void
  logAttempt: (liftId: LiftName, attempt: TestAttempt) => void
  undoAttempt: (liftId: LiftName) => void
  reset: () => void
}

export const useTestDayStore = create<TestDayStore>()(
  persist(
    (set, get) => ({
      startedAt: null,
      attempts: {},

      begin: () => {
        if (get().startedAt) return
        set({ startedAt: new Date().toISOString(), attempts: {} })
      },

      logAttempt: (liftId, attempt) => {
        const attempts = get().attempts
        set({ attempts: { ...attempts, [liftId]: [...(attempts[liftId] ?? []), attempt] } })
      },

      undoAttempt: (liftId) => {
        const attempts = get().attempts
        set({ attempts: { ...attempts, [liftId]: (attempts[liftId] ?? []).slice(0, -1) } })
      },

      reset: () => set({ startedAt: null, attempts: {} }),
    }),
    { name: 'test-day-session' }
  )
)
