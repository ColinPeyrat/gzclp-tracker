import { describe, it, expect } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { WorkoutPreviewCard } from './WorkoutPreviewCard'
import { createInitialLiftState } from '@/lib/progression'
import type { LiftName, ProgramState, UserSettings } from '@/lib/types'

const LIFTS: LiftName[] = ['squat', 'bench', 'ohp', 'deadlift']

function makeState(t1: Record<LiftName, number>, t2: Record<LiftName, number>): ProgramState {
  return {
    t1: Object.fromEntries(LIFTS.map((l) => [l, createInitialLiftState(l, 'T1', t1[l])])) as ProgramState['t1'],
    t2: Object.fromEntries(LIFTS.map((l) => [l, createInitialLiftState(l, 'T2', t2[l])])) as ProgramState['t2'],
    t3: {},
    nextWorkoutType: 'A1',
    workoutCount: 0,
  }
}

const baseSettings: UserSettings = {
  barWeight: 45,
  dumbbellHandleWeight: 5,
  plateInventory: {},
  restTimers: { t1Seconds: 180, t2Seconds: 120, t3Seconds: 90 },
  weightUnit: 'lbs',
  exerciseLibrary: [],
  liftSubstitutions: [],
  additionalT3s: [],
}

function comingUpText(state: ProgramState, settings: UserSettings, workoutType: 'B1' | 'A2' = 'B1') {
  const html = renderToStaticMarkup(
    <WorkoutPreviewCard workoutType={workoutType} state={state} settings={settings} isNext={false} />
  )
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

describe('Coming up workout card', () => {
  const state = makeState(
    { squat: 225, bench: 155, ohp: 95, deadlift: 275 },
    { squat: 165, bench: 115, ohp: 65, deadlift: 205 }
  )

  it('shows the T1 and T2 weight next to each lift in the user unit', () => {
    expect(comingUpText(state, baseSettings)).toBe('B1 T1 Bench Press 155 lbs T2 Squat 165 lbs')
  })

  it('shows the substitute and its weight when a T3-progression substitute fills the slot', () => {
    const settings: UserSettings = {
      ...baseSettings,
      exerciseLibrary: [{ id: 'leg-press', name: 'Leg Press' }],
      liftSubstitutions: [{ originalLiftId: 'squat', substituteId: 'leg-press', forceT3Progression: true }],
    }
    const subState = makeState(
      { squat: 300, bench: 155, ohp: 95, deadlift: 275 },
      { squat: 320, bench: 115, ohp: 65, deadlift: 205 }
    )
    expect(comingUpText(subState, settings)).toBe('B1 T1 Bench Press 155 lbs T2 Leg Press 320 lbs')
  })

  it('shows per-dumbbell weights in kg for a dumbbell main lift', () => {
    const settings: UserSettings = { ...baseSettings, weightUnit: 'kg', dumbbellLifts: ['ohp'] }
    const kgState = makeState(
      { squat: 100, bench: 70, ohp: 22.5, deadlift: 120 },
      { squat: 80, bench: 50, ohp: 15, deadlift: 90 }
    )
    expect(comingUpText(kgState, settings, 'A2')).toBe('A2 T1 Overhead Press 22.5 kg T2 Deadlift 90 kg')
  })
})
