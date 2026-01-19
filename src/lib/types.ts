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

export interface LiftState {
  liftId: LiftName
  tier: Tier
  weightLbs: number
  stage: 1 | 2 | 3
  lastStage1WeightLbs?: number // For T2 reset calculation
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
  weightLbs: number
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
  barWeightLbs: number
  availablePlates: number[]
  restTimers: {
    t1Seconds: number
    t2Seconds: number
    t3Seconds: number
  }
  weightUnit: WeightUnit
}

export interface ProgramState {
  t1: Record<LiftName, LiftState>
  t2: Record<LiftName, LiftState>
  t3: Record<string, { weightLbs: number }>
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
