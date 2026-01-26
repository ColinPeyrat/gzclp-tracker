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
  barWeight: 45,
  dumbbellHandleWeight: 5,
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
  // Legacy field names (pre-rename)
  barWeightLbs?: number
  dumbbellHandleWeightLbs?: number
}

const DEFAULT_T3_IDS: Record<string, string> = {
  A1: 'lat-pulldown',
  A2: 'dumbbell-row',
  B1: 'lat-pulldown',
  B2: 'dumbbell-row',
}

// --- Settings Migration Helpers ---

function migrateSettingsFieldNames(stored: LegacySettings): { settings: Partial<UserSettings>; migrated: boolean } {
  const migrated = stored.barWeightLbs !== undefined || stored.dumbbellHandleWeightLbs !== undefined
  return {
    settings: {
      barWeight: stored.barWeight ?? stored.barWeightLbs ?? DEFAULT_SETTINGS.barWeight,
      dumbbellHandleWeight: stored.dumbbellHandleWeight ?? stored.dumbbellHandleWeightLbs ?? DEFAULT_SETTINGS.dumbbellHandleWeight,
    },
    migrated,
  }
}

function migrateFromOldModel(stored: LegacySettings): {
  exerciseLibrary: ExerciseDefinition[]
  liftSubstitutions: LiftSubstitution[]
  additionalT3s: AdditionalT3Assignment[]
} | null {
  const hasOldModel = stored.customExercises || stored.t3Library || stored.t3Assignments
  const hasNewModel = stored.exerciseLibrary || stored.liftSubstitutions || stored.additionalT3s
  if (!hasOldModel || hasNewModel) return null

  const exerciseLibrary: ExerciseDefinition[] = [...DEFAULT_EXERCISE_LIBRARY]
  const liftSubstitutions: LiftSubstitution[] = []
  const additionalT3s: AdditionalT3Assignment[] = []

  // Migrate customExercises → exerciseLibrary + liftSubstitutions
  for (const custom of stored.customExercises ?? []) {
    if (!exerciseLibrary.some((e) => e.id === custom.id)) {
      exerciseLibrary.push({ id: custom.id, name: custom.name, isDumbbell: custom.isDumbbell })
    }
    liftSubstitutions.push({
      originalLiftId: custom.replacesId,
      substituteId: custom.id,
      forceT3Progression: custom.forceT3Progression,
    })
  }

  // Migrate t3Library → exerciseLibrary
  for (const t3 of stored.t3Library ?? []) {
    if (!exerciseLibrary.some((e) => e.id === t3.id)) {
      exerciseLibrary.push({ id: t3.id, name: t3.name, isDumbbell: t3.isDumbbell })
    }
  }

  // Migrate t3Assignments → additionalT3s (only non-default T3s)
  for (const assignment of stored.t3Assignments ?? []) {
    const defaultT3 = DEFAULT_T3_IDS[assignment.workoutType]
    const extraIds = assignment.t3Ids.filter((id) => id !== defaultT3)
    if (extraIds.length > 0) {
      additionalT3s.push({ workoutType: assignment.workoutType, exerciseIds: extraIds })
    }
  }

  return { exerciseLibrary, liftSubstitutions, additionalT3s }
}

function ensureDefaults(settings: UserSettings & { id: string }): boolean {
  let updated = false
  if (!settings.exerciseLibrary) {
    settings.exerciseLibrary = DEFAULT_EXERCISE_LIBRARY
    updated = true
  }
  if (!settings.liftSubstitutions) {
    settings.liftSubstitutions = DEFAULT_LIFT_SUBSTITUTIONS
    updated = true
  }
  if (!settings.additionalT3s) {
    settings.additionalT3s = DEFAULT_ADDITIONAL_T3S
    updated = true
  }
  return updated
}

function cleanLegacyFields(settings: Record<string, unknown>): void {
  delete settings.customExercises
  delete settings.t3Library
  delete settings.t3Assignments
  delete settings.barWeightLbs
  delete settings.dumbbellHandleWeightLbs
}

// --- Main Settings Functions ---

export async function getSettings(): Promise<UserSettings> {
  const stored = await db.settings.get('user') as (LegacySettings & { id: string }) | undefined
  if (!stored) return DEFAULT_SETTINGS

  // Migrate field names
  const fieldMigration = migrateSettingsFieldNames(stored)
  let needsUpdate = fieldMigration.migrated

  const migrated: UserSettings & { id: string } = {
    ...fieldMigration.settings as Pick<UserSettings, 'barWeight' | 'dumbbellHandleWeight'>,
    plateInventory: stored.plateInventory,
    restTimers: stored.restTimers,
    weightUnit: stored.weightUnit,
    exerciseLibrary: stored.exerciseLibrary,
    liftSubstitutions: stored.liftSubstitutions,
    additionalT3s: stored.additionalT3s,
    id: 'user',
  }

  // Migrate from old model if needed
  const oldModelMigration = migrateFromOldModel(stored)
  if (oldModelMigration) {
    needsUpdate = true
    migrated.exerciseLibrary = oldModelMigration.exerciseLibrary
    migrated.liftSubstitutions = oldModelMigration.liftSubstitutions
    migrated.additionalT3s = oldModelMigration.additionalT3s
  }

  // Ensure defaults
  if (ensureDefaults(migrated)) {
    needsUpdate = true
  }

  if (needsUpdate) {
    const toSave = { ...migrated }
    cleanLegacyFields(toSave as Record<string, unknown>)
    await db.settings.put(toSave)
    await migrateWorkouts()
  }

  return migrated
}

export async function saveSettings(settings: UserSettings): Promise<void> {
  await db.settings.put({ ...settings, id: 'user' })
}

// Legacy interfaces for program state migration
interface LegacyLiftState {
  liftId: string
  tier: string
  weight?: number
  weightLbs?: number
  stage: 1 | 2 | 3
  lastStage1Weight?: number
  lastStage1WeightLbs?: number
  pending5RMTest?: boolean
  bestSetReps?: number
  bestSetWeight?: number
}

interface LegacyProgramState {
  t1: Record<string, LegacyLiftState>
  t2: Record<string, LegacyLiftState>
  t3: Record<string, { weight?: number; weightLbs?: number }>
  nextWorkoutType: 'A1' | 'A2' | 'B1' | 'B2'
  workoutCount: number
}

function migrateLiftState(lift: LegacyLiftState): LegacyLiftState {
  const migrated = { ...lift }
  if (migrated.weightLbs !== undefined && migrated.weight === undefined) {
    migrated.weight = migrated.weightLbs
    delete migrated.weightLbs
  }
  if (migrated.lastStage1WeightLbs !== undefined && migrated.lastStage1Weight === undefined) {
    migrated.lastStage1Weight = migrated.lastStage1WeightLbs
    delete migrated.lastStage1WeightLbs
  }
  return migrated
}

function migrateLiftStateMap(lifts: Record<string, LegacyLiftState>): { result: Record<string, LegacyLiftState>; migrated: boolean } {
  let migrated = false
  const result: Record<string, LegacyLiftState> = {}
  for (const [key, lift] of Object.entries(lifts)) {
    if (lift.weightLbs !== undefined || lift.lastStage1WeightLbs !== undefined) {
      migrated = true
    }
    result[key] = migrateLiftState(lift)
  }
  return { result, migrated }
}

function migrateT3Weights(t3s: Record<string, { weight?: number; weightLbs?: number }>): { result: Record<string, { weight: number }>; migrated: boolean } {
  let migrated = false
  const result: Record<string, { weight: number }> = {}
  for (const [key, t3State] of Object.entries(t3s)) {
    if (t3State.weightLbs !== undefined && t3State.weight === undefined) {
      migrated = true
      result[key] = { weight: t3State.weightLbs }
    } else {
      result[key] = { weight: t3State.weight ?? 0 }
    }
  }
  return { result, migrated }
}

export async function getProgramState(): Promise<ProgramState | undefined> {
  const stored = await db.programState.get('current') as (LegacyProgramState & { id: string }) | undefined
  if (!stored) return undefined

  const t1Migration = migrateLiftStateMap(stored.t1)
  const t2Migration = migrateLiftStateMap(stored.t2)
  const t3Migration = migrateT3Weights(stored.t3)
  const needsUpdate = t1Migration.migrated || t2Migration.migrated || t3Migration.migrated

  const migrated: ProgramState = {
    t1: t1Migration.result as ProgramState['t1'],
    t2: t2Migration.result as ProgramState['t2'],
    t3: t3Migration.result,
    nextWorkoutType: stored.nextWorkoutType,
    workoutCount: stored.workoutCount,
  }

  if (needsUpdate) {
    await db.programState.put({ ...migrated, id: 'current' })
    await migrateWorkouts()
  }

  return migrated
}

export async function saveProgramState(state: ProgramState): Promise<void> {
  await db.programState.put({ ...state, id: 'current' })
}

// Migrate legacy workout data (weightLbs -> weight in ExerciseLog)
interface LegacyExerciseLog {
  liftId: string
  tier: 'T1' | 'T2' | 'T3'
  weight?: number
  weightLbs?: number
  targetSets: number
  targetReps: number
  sets: Array<{ setNumber: number; reps: number; completed: boolean; isAmrap: boolean }>
}

interface LegacyWorkout {
  id: string
  date: string
  type: 'A1' | 'A2' | 'B1' | 'B2'
  exercises: LegacyExerciseLog[]
  completed: boolean
  notes?: string
}

export async function migrateWorkouts(): Promise<void> {
  const workouts = await db.workouts.toArray() as unknown as LegacyWorkout[]
  const toUpdate: Workout[] = []

  for (const workout of workouts) {
    let needsMigration = false
    const migratedExercises = workout.exercises.map((ex) => {
      if (ex.weightLbs !== undefined && ex.weight === undefined) {
        needsMigration = true
        const { weightLbs, ...rest } = ex
        return { ...rest, weight: weightLbs }
      }
      return ex
    })

    if (needsMigration) {
      toUpdate.push({
        ...workout,
        exercises: migratedExercises as Workout['exercises'],
      })
    }
  }

  if (toUpdate.length > 0) {
    await db.workouts.bulkPut(toUpdate)
  }
}
