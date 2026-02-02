export type LiftName = 'squat' | 'bench' | 'deadlift' | 'ohp'
export type Tier = 'T1' | 'T2' | 'T3'
export type WorkoutType = 'A1' | 'A2' | 'B1' | 'B2'
export type WeightUnit = 'lbs' | 'kg'

export interface Lift {
  id: LiftName
  name: string
  isLower: boolean // true for squat/deadlift, false for bench/ohp
}

export interface T3Exercise {
  id: string
  name: string
}

// Unified exercise definition for all custom/additional exercises
export interface ExerciseDefinition {
  id: string              // 'face-pulls'
  name: string            // 'Face Pulls'
  isDumbbell?: boolean    // Uses dumbbell plates
}

// Replace a default lift (T1/T2/T3) with one from the exercise library
export interface LiftSubstitution {
  originalLiftId: string        // 'lat-pulldown', 'squat', etc.
  substituteId: string          // ID from exercise library
  forceT3Progression?: boolean  // Use 3×15+ instead of normal stages
}

// Additional T3 exercises per workout (on top of default T3s from WORKOUTS)
export interface AdditionalT3Assignment {
  workoutType: WorkoutType
  exerciseIds: string[]   // IDs from exercise library
}

export interface LiftState {
  liftId: LiftName
  tier: Tier
  weight: number
  stage: 1 | 2 | 3
  lastStage1Weight?: number // For T2 reset calculation
  pending5RMTest?: boolean // T1 only: true when awaiting 5RM input after stage 3 fail
  bestSetReps?: number // Best set reps from failed stage 3 for 5RM estimation
  bestSetWeight?: number // Weight of best set
}

export interface SetLog {
  setNumber: number
  reps: number
  completed: boolean
  isAmrap: boolean
}

export interface ExerciseLog {
  liftId: string
  tier: Tier
  weight: number
  originalWeight?: number // Set at workout start for trial lift detection
  targetSets: number
  targetReps: number
  sets: SetLog[]
}

export interface Workout {
  id: string
  date: string // ISO date
  type: WorkoutType
  exercises: ExerciseLog[]
  completed: boolean
  notes?: string
}

export interface UserSettings {
  barWeight: number
  dumbbellHandleWeight: number // Weight of empty dumbbell handle (default 5 lbs / 2.5 kg)
  plateInventory: Record<string, number> // plate weight -> quantity (total, both sides)
  restTimers: {
    t1Seconds: number
    t2Seconds: number
    t3Seconds: number
  }
  weightUnit: WeightUnit
  exerciseLibrary?: ExerciseDefinition[]        // Unified library of custom exercises
  liftSubstitutions?: LiftSubstitution[]        // Replaces default lifts
  additionalT3s?: AdditionalT3Assignment[]      // Extra T3s per workout (on top of defaults)
}

export interface ProgramState {
  t1: Record<LiftName, LiftState>
  t2: Record<LiftName, LiftState>
  t3: Record<string, { weight: number }>
  nextWorkoutType: WorkoutType
  workoutCount: number
}

// Workout definitions
export const WORKOUTS: Record<WorkoutType, { t1: LiftName; t2: LiftName; t3: string }> = {
  A1: { t1: 'squat', t2: 'bench', t3: 'lat-pulldown' },
  A2: { t1: 'ohp', t2: 'deadlift', t3: 'dumbbell-row' },
  B1: { t1: 'bench', t2: 'squat', t3: 'lat-pulldown' },
  B2: { t1: 'deadlift', t2: 'ohp', t3: 'dumbbell-row' },
}

export const LIFTS: Record<LiftName, Lift> = {
  squat: { id: 'squat', name: 'Squat', isLower: true },
  bench: { id: 'bench', name: 'Bench Press', isLower: false },
  deadlift: { id: 'deadlift', name: 'Deadlift', isLower: true },
  ohp: { id: 'ohp', name: 'Overhead Press', isLower: false },
}

export const T3_EXERCISES: Record<string, T3Exercise> = {
  'lat-pulldown': { id: 'lat-pulldown', name: 'Lat Pulldown' },
  'dumbbell-row': { id: 'dumbbell-row', name: 'Dumbbell Row' },
}

export const WORKOUT_ORDER: WorkoutType[] = ['A1', 'A2', 'B1', 'B2']
