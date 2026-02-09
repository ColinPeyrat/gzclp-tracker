import { create } from 'zustand'
import type { Medal } from '../lib/types'

interface MedalToastStore {
  pendingMedals: Medal[]
  setPendingMedals: (medals: Medal[]) => void
  addMedals: (medals: Medal[]) => void
  clearMedals: () => void
}

export const useMedalToastStore = create<MedalToastStore>((set) => ({
  pendingMedals: [],
  setPendingMedals: (medals) => set({ pendingMedals: medals }),
  addMedals: (medals) => set((s) => ({ pendingMedals: [...s.pendingMedals, ...medals] })),
  clearMedals: () => set({ pendingMedals: [] }),
}))
