import { create } from 'zustand'
import type { UserSettings } from '../lib/types'
import { DEFAULT_SETTINGS, getSettings, saveSettings } from '../lib/db'

interface SettingsStore {
  settings: UserSettings
  loaded: boolean
  load: () => Promise<void>
  update: (settings: Partial<UserSettings>) => Promise<void>
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,

  load: async () => {
    const settings = await getSettings()
    set({ settings, loaded: true })
  },

  update: async (partial) => {
    const newSettings = { ...get().settings, ...partial }
    await saveSettings(newSettings)
    set({ settings: newSettings })
  },
}))
