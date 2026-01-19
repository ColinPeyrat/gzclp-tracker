import Dexie, { type EntityTable } from 'dexie'
import type { Workout, ProgramState, UserSettings } from './types'

const db = new Dexie('gzclp-tracker') as Dexie & {
  workouts: EntityTable<Workout, 'id'>
  programState: EntityTable<ProgramState & { id: string }, 'id'>
  settings: EntityTable<UserSettings & { id: string }, 'id'>
}

db.version(1).stores({
  workouts: 'id, date, type, completed',
  programState: 'id',
  settings: 'id',
})

export { db }

export const DEFAULT_SETTINGS: UserSettings = {
  barWeightLbs: 45,
  plateInventory: {
    '45': 2,
    '35': 2,
    '25': 2,
    '10': 2,
    '5': 2,
    '2.5': 2,
  },
  restTimers: {
    t1Seconds: 180,
    t2Seconds: 120,
    t3Seconds: 90,
  },
  weightUnit: 'lbs',
}

export async function getSettings(): Promise<UserSettings> {
  const stored = await db.settings.get('user')
  return stored ?? DEFAULT_SETTINGS
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await db.settings.put({ ...settings, id: 'user' })
}

export async function getProgramState(): Promise<ProgramState | undefined> {
  const stored = await db.programState.get('current')
  if (!stored) return undefined
  const { id: _, ...state } = stored
  return state
}

export async function saveProgramState(state: ProgramState): Promise<void> {
  await db.programState.put({ ...state, id: 'current' })
}
