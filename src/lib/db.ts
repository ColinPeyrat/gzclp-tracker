import Dexie, { type EntityTable } from 'dexie'
import type { Workout, ProgramState, UserSettings, ExerciseDefinition, LiftSubstitution, AdditionalT3Assignment } from './types'

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

// Default exercise library includes the default T3s (for display/lookup)
export const DEFAULT_EXERCISE_LIBRARY: ExerciseDefinition[] = [
  { id: 'lat-pulldown', name: 'Lat Pulldown' },
  { id: 'dumbbell-row', name: 'Dumbbell Row', isDumbbell: true },
]

// No lift substitutions by default
export const DEFAULT_LIFT_SUBSTITUTIONS: LiftSubstitution[] = []

// No additional T3s by default (default T3s come from WORKOUTS constant)
export const DEFAULT_ADDITIONAL_T3S: AdditionalT3Assignment[] = []

export const DEFAULT_SETTINGS: UserSettings = {
  barWeightLbs: 45,
  dumbbellHandleWeightLbs: 5,
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
  exerciseLibrary: DEFAULT_EXERCISE_LIBRARY,
  liftSubstitutions: DEFAULT_LIFT_SUBSTITUTIONS,
  additionalT3s: DEFAULT_ADDITIONAL_T3S,
}

// Legacy interfaces for migration
interface LegacyCustomExercise {
  id: string
  name: string
  replacesId: string
  forceT3Progression?: boolean
  isDumbbell?: boolean
  startingWeight?: number
}

interface LegacyT3ExerciseDefinition {
  id: string
  name: string
  isDumbbell?: boolean
}

interface LegacyWorkoutT3Assignment {
  workoutType: 'A1' | 'A2' | 'B1' | 'B2'
  t3Ids: string[]
}

interface LegacySettings extends Omit<UserSettings, 'exerciseLibrary' | 'liftSubstitutions' | 'additionalT3s'> {
  customExercises?: LegacyCustomExercise[]
  t3Library?: LegacyT3ExerciseDefinition[]
  t3Assignments?: LegacyWorkoutT3Assignment[]
  // New model fields (may exist if already migrated)
  exerciseLibrary?: ExerciseDefinition[]
  liftSubstitutions?: LiftSubstitution[]
  additionalT3s?: AdditionalT3Assignment[]
}

const DEFAULT_T3_IDS: Record<string, string> = {
  A1: 'lat-pulldown',
  A2: 'dumbbell-row',
  B1: 'lat-pulldown',
  B2: 'dumbbell-row',
}

export async function getSettings(): Promise<UserSettings> {
  const stored = await db.settings.get('user') as (LegacySettings & { id: string }) | undefined
  if (!stored) return DEFAULT_SETTINGS

  let needsUpdate = false
  const migrated: UserSettings & { id: string } = {
    barWeightLbs: stored.barWeightLbs,
    dumbbellHandleWeightLbs: stored.dumbbellHandleWeightLbs,
    plateInventory: stored.plateInventory,
    restTimers: stored.restTimers,
    weightUnit: stored.weightUnit,
    exerciseLibrary: stored.exerciseLibrary,
    liftSubstitutions: stored.liftSubstitutions,
    additionalT3s: stored.additionalT3s,
    id: 'user',
  }

  // Migration from old model to new unified model
  const hasOldModel = stored.customExercises || stored.t3Library || stored.t3Assignments
  const hasNewModel = stored.exerciseLibrary || stored.liftSubstitutions || stored.additionalT3s

  if (hasOldModel && !hasNewModel) {
    needsUpdate = true

    // Start with default T3s in library
    const exerciseLibrary: ExerciseDefinition[] = [...DEFAULT_EXERCISE_LIBRARY]
    const liftSubstitutions: LiftSubstitution[] = []
    const additionalT3s: AdditionalT3Assignment[] = []

    // Migrate customExercises → exerciseLibrary + liftSubstitutions
    if (stored.customExercises) {
      for (const custom of stored.customExercises) {
        // Add to library if not already there
        if (!exerciseLibrary.some((e) => e.id === custom.id)) {
          exerciseLibrary.push({
            id: custom.id,
            name: custom.name,
            isDumbbell: custom.isDumbbell,
          })
        }
        // Create substitution
        liftSubstitutions.push({
          originalLiftId: custom.replacesId,
          substituteId: custom.id,
          forceT3Progression: custom.forceT3Progression,
        })
      }
    }

    // Migrate t3Library → exerciseLibrary (dedupe by id)
    if (stored.t3Library) {
      for (const t3 of stored.t3Library) {
        if (!exerciseLibrary.some((e) => e.id === t3.id)) {
          exerciseLibrary.push({
            id: t3.id,
            name: t3.name,
            isDumbbell: t3.isDumbbell,
          })
        }
      }
    }

    // Migrate t3Assignments → additionalT3s (only keep non-default T3s)
    if (stored.t3Assignments) {
      for (const assignment of stored.t3Assignments) {
        const defaultT3 = DEFAULT_T3_IDS[assignment.workoutType]
        // Filter out the default T3 - only keep additional ones
        const extraIds = assignment.t3Ids.filter((id) => id !== defaultT3)
        if (extraIds.length > 0) {
          additionalT3s.push({
            workoutType: assignment.workoutType,
            exerciseIds: extraIds,
          })
        }
      }
    }

    migrated.exerciseLibrary = exerciseLibrary
    migrated.liftSubstitutions = liftSubstitutions
    migrated.additionalT3s = additionalT3s
  }

  // Initialize new model fields if not present
  if (!migrated.exerciseLibrary) {
    migrated.exerciseLibrary = DEFAULT_EXERCISE_LIBRARY
    needsUpdate = true
  }
  if (!migrated.liftSubstitutions) {
    migrated.liftSubstitutions = DEFAULT_LIFT_SUBSTITUTIONS
    needsUpdate = true
  }
  if (!migrated.additionalT3s) {
    migrated.additionalT3s = DEFAULT_ADDITIONAL_T3S
    needsUpdate = true
  }

  if (needsUpdate) {
    // Clean up old fields before saving
    const toSave = { ...migrated }
    delete (toSave as Record<string, unknown>).customExercises
    delete (toSave as Record<string, unknown>).t3Library
    delete (toSave as Record<string, unknown>).t3Assignments
    await db.settings.put(toSave)
  }

  return migrated
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
