import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import { useEffect } from 'react'
import type { LiftName } from '../lib/types'
import { useProgramStore } from '../stores/programStore'
import { buildLiftProgressions, emptyLiftProgression, T1_LIFTS, type LiftProgression } from '../lib/liftProgressions'

export type { LiftProgression } from '../lib/liftProgressions'

export function useProgressionData(): {
  lifts: Record<LiftName, LiftProgression>
  loading: boolean
} {
  const workouts = useLiveQuery(() => db.workouts.orderBy('date').toArray(), [])
  const { state: program, loaded: programLoaded, load: loadProgram } = useProgramStore()

  useEffect(() => {
    if (!programLoaded) loadProgram()
  }, [programLoaded, loadProgram])

  if (workouts === undefined || !programLoaded) {
    const emptyLifts = {} as Record<LiftName, LiftProgression>
    for (const liftId of T1_LIFTS) emptyLifts[liftId] = emptyLiftProgression(liftId)
    return { lifts: emptyLifts, loading: true }
  }

  const programWeights: Partial<Record<LiftName, number>> = {}
  for (const liftId of T1_LIFTS) {
    const weight = program?.t1[liftId]?.weight
    if (weight !== undefined) programWeights[liftId] = weight
  }

  return { lifts: buildLiftProgressions(workouts, programWeights), loading: false }
}
