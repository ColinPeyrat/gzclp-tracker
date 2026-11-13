import type { LiftName, LiftState, Medal, ProgramState, UserSettings, WeightUnit, Workout } from './types'
import { LIFTS } from './types'
import { getMaintenancePrescription } from './progression'
import { getLiftSubstitution } from './exercises'
import { getIncrement } from './units'

// See docs/adr/0003-return-to-progression.md
export const TEST_REPS = 5
export const RESTART_T1_PERCENTAGE = 0.85
export const RESTART_T2_PERCENTAGE = 0.65
export const RETURN_NUDGE_DAYS = 21

const ALL_LIFTS = Object.keys(LIFTS) as LiftName[]

export interface TestAttempt {
  weight: number
  reps: number
}

export type TestProgress =
  | { done: false; nextWeight: number }
  | { done: true; fiveRepMax: number }

type SettingsSubset = Pick<UserSettings, 'weightUnit' | 'liftSubstitutions' | 'maintenanceOverrides'>

function roundTo(unit: WeightUnit): number {
  return unit === 'kg' ? 2.5 : 5
}

function roundWeight(weight: number, unit: WeightUnit): number {
  const step = roundTo(unit)
  return Math.round(weight / step) * step
}

// Substitutes progressing like a T3 have no 5RM to test
export function getStageLadderLifts(settings: Pick<UserSettings, 'liftSubstitutions'>): LiftName[] {
  return ALL_LIFTS.filter((id) => !getLiftSubstitution(id, settings.liftSubstitutions)?.forceT3Progression)
}

export function getT3StyleLifts(settings: Pick<UserSettings, 'liftSubstitutions'>): LiftName[] {
  return ALL_LIFTS.filter((id) => getLiftSubstitution(id, settings.liftSubstitutions)?.forceT3Progression)
}

export function getLiftsToTest(state: ProgramState, settings: Pick<UserSettings, 'liftSubstitutions'>): LiftName[] {
  const results = state.returnToProgression?.results ?? {}
  return getStageLadderLifts(settings).filter((id) => results[id] === undefined)
}

export function getTestStep(liftId: LiftName, unit: WeightUnit): number {
  return getIncrement('T1', LIFTS[liftId].isLower, unit)
}

export function getOpeningWeight(state: ProgramState, liftId: LiftName, settings: SettingsSubset): number {
  return getMaintenancePrescription(
    state.t1[liftId],
    settings.weightUnit,
    settings.maintenanceOverrides?.[liftId]
  ).weight
}

// Ramp up one step per successful set of five; the 5RM is the heaviest weight done for
// five. If the opening set falls short, ramp down until one succeeds.
export function getTestProgress(opening: number, step: number, attempts: TestAttempt[]): TestProgress {
  if (attempts.length === 0) return { done: false, nextWeight: opening }

  const last = attempts[attempts.length - 1]
  const lastSucceeded = last.reps >= TEST_REPS
  const openingFailed = attempts[0].reps < TEST_REPS

  if (openingFailed) {
    if (lastSucceeded) return { done: true, fiveRepMax: last.weight }
    return { done: false, nextWeight: Math.max(step, last.weight - step) }
  }

  if (lastSucceeded) return { done: false, nextWeight: last.weight + step }

  const best = Math.max(...attempts.filter((a) => a.reps >= TEST_REPS).map((a) => a.weight))
  return { done: true, fiveRepMax: best }
}

export interface RestartProposal {
  t1: Partial<Record<LiftName, number>>
  t2: Partial<Record<LiftName, number>>
  t3: Record<string, number>
  t3StyleLifts: Partial<Record<LiftName, number>>
}

export function proposeRestart(state: ProgramState, settings: SettingsSubset): RestartProposal {
  const results = state.returnToProgression?.results ?? {}
  const proposal: RestartProposal = { t1: {}, t2: {}, t3: {}, t3StyleLifts: {} }

  for (const liftId of getStageLadderLifts(settings)) {
    const fiveRM = results[liftId]
    if (fiveRM === undefined) continue
    proposal.t1[liftId] = roundWeight(fiveRM * RESTART_T1_PERCENTAGE, settings.weightUnit)
    proposal.t2[liftId] = roundWeight(fiveRM * RESTART_T2_PERCENTAGE, settings.weightUnit)
  }

  for (const [id, { weight }] of Object.entries(state.t3)) {
    proposal.t3[id] = weight
  }

  // Mirrors the weight a T3-style substitute is prescribed in a Rotating Workout
  for (const liftId of getT3StyleLifts(settings)) {
    proposal.t3StyleLifts[liftId] = Math.max(state.t1[liftId].weight, state.t2[liftId].weight)
  }

  return proposal
}

function restartLift(lift: LiftState, weight: number): LiftState {
  return {
    ...lift,
    weight,
    stage: 1,
    lastStage1Weight: lift.tier === 'T2' ? weight : lift.lastStage1Weight,
    lastSuccessWeight: undefined,
    pending5RMTest: undefined,
    bestSetReps: undefined,
    bestSetWeight: undefined,
  }
}

export function applyRestart(state: ProgramState, proposal: RestartProposal): ProgramState {
  const t1 = { ...state.t1 }
  const t2 = { ...state.t2 }

  for (const [liftId, weight] of Object.entries(proposal.t1) as [LiftName, number][]) {
    t1[liftId] = restartLift(t1[liftId], weight)
  }
  for (const [liftId, weight] of Object.entries(proposal.t2) as [LiftName, number][]) {
    t2[liftId] = restartLift(t2[liftId], weight)
  }
  for (const [liftId, weight] of Object.entries(proposal.t3StyleLifts) as [LiftName, number][]) {
    t1[liftId] = { ...t1[liftId], weight }
    t2[liftId] = { ...t2[liftId], weight }
  }

  const t3: ProgramState['t3'] = { ...state.t3 }
  for (const [id, weight] of Object.entries(proposal.t3)) {
    t3[id] = { weight }
  }

  return cancelReturnToProgression({ ...state, t1, t2, t3, nextWorkoutType: 'A1' })
}

export function startReturnToProgression(state: ProgramState, now: Date = new Date()): ProgramState {
  return { ...state, returnToProgression: { startedAt: now.toISOString(), results: {} } }
}

export function cancelReturnToProgression(state: ProgramState): ProgramState {
  const rest = { ...state }
  delete rest.returnToProgression
  return rest
}

export function recordTestResults(
  state: ProgramState,
  results: Partial<Record<LiftName, number>>
): ProgramState {
  if (!state.returnToProgression) return state
  return {
    ...state,
    returnToProgression: {
      ...state.returnToProgression,
      results: { ...state.returnToProgression.results, ...results },
    },
  }
}

// Compares only against earlier tested 5RMs; the first test sets the baseline.
export function detect5RMPRs(
  results: Partial<Record<LiftName, number>>,
  history: Workout[]
): Medal[] {
  const previousBest = new Map<string, number>()
  for (const w of history) {
    if (w.type !== 'TD') continue
    for (const ex of w.exercises) {
      if (ex.fiveRepMax === undefined) continue
      previousBest.set(ex.liftId, Math.max(previousBest.get(ex.liftId) ?? 0, ex.fiveRepMax))
    }
  }

  const medals: Medal[] = []
  for (const [liftId, value] of Object.entries(results) as [LiftName, number][]) {
    const prev = previousBest.get(liftId)
    if (prev !== undefined && value > prev) {
      medals.push({ type: '5rm-pr', liftId, tier: 'T1', value, previousValue: prev })
    }
  }
  return medals
}

// Test Days count: right after a return the last Rotating Workout is still months old
export function getLastProgramActivityDate(workouts: Workout[]): string | null {
  let latest: string | null = null
  for (const w of workouts) {
    if (!w.completed || w.type === 'MN') continue
    if (latest === null || w.date > latest) latest = w.date
  }
  return latest
}

export function isReturnNudgeDue(lastActivityDate: string | null, now: Date = new Date()): boolean {
  if (!lastActivityDate) return false
  const days = (now.getTime() - new Date(lastActivityDate).getTime()) / 86_400_000
  return days > RETURN_NUDGE_DAYS
}
