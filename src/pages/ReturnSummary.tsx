import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { useProgramStore } from '../stores/programStore'
import { useSettingsStore } from '../stores/settingsStore'
import { getExerciseName } from '../lib/exercises'
import {
  getLiftsToTest,
  proposeRestart,
  applyRestart,
  type RestartProposal,
} from '../lib/returnToProgression'
import type { LiftName, ProgramState, UserSettings } from '../lib/types'

type Section = 't1' | 't2' | 't3' | 't3StyleLifts'

export function ReturnSummary() {
  const { state, loaded: programLoaded, load: loadProgram } = useProgramStore()
  const { settings, loaded: settingsLoaded, load: loadSettings } = useSettingsStore()

  useEffect(() => {
    if (!programLoaded) loadProgram()
    if (!settingsLoaded) loadSettings()
  }, [programLoaded, settingsLoaded, loadProgram, loadSettings])

  if (!programLoaded || !settingsLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  if (!state?.returnToProgression || getLiftsToTest(state, settings).length > 0) {
    return <Navigate to="/" replace />
  }

  return <ReturnSummaryForm state={state} settings={settings} />
}

function ReturnSummaryForm({ state, settings }: { state: ProgramState; settings: UserSettings }) {
  const navigate = useNavigate()
  const save = useProgramStore((s) => s.save)
  const unit = settings.weightUnit
  const results = state.returnToProgression?.results ?? {}
  const [proposal, setProposal] = useState<RestartProposal>(() => proposeRestart(state, settings))

  const liftName = (id: string, tier: 'T1' | 'T2' | 'T3') =>
    getExerciseName(id, tier, settings.liftSubstitutions, settings.exerciseLibrary)

  const setValue = (section: Section, id: string, raw: string) => {
    const value = parseFloat(raw)
    setProposal((p) => ({ ...p, [section]: { ...p[section], [id]: isNaN(value) ? 0 : value } }))
  }

  const allValid = (['t1', 't2', 't3', 't3StyleLifts'] as Section[]).every((s) =>
    Object.values(proposal[s]).every((v) => v !== undefined && v > 0)
  )

  const handleConfirm = async () => {
    await save(applyRestart(state, proposal))
    navigate('/')
  }

  const row = (section: Section, id: string, label: string, hint?: string) => (
    <div key={`${section}-${id}`} className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-sm">{label}</div>
        {hint && <div className="text-xs text-zinc-500">{hint}</div>}
      </div>
      <div className="flex items-center gap-2">
        <input
          type="number"
          aria-label={`${label} ${section}`}
          value={proposal[section][id as LiftName] ?? ''}
          onChange={(e) => setValue(section, id, e.target.value)}
          className="w-20 rounded border border-zinc-600 bg-zinc-900 px-3 py-2 text-right focus:border-blue-500 focus:outline-none"
          step={unit === 'kg' ? 2.5 : 5}
          min={0}
        />
        <span className="w-6 text-sm text-zinc-400">{unit}</span>
      </div>
    </div>
  )

  const t1Ids = Object.keys(proposal.t1) as LiftName[]
  const t3StyleIds = Object.keys(proposal.t3StyleLifts) as LiftName[]

  return (
    <div className="flex min-h-screen flex-col pb-(--nav-height)">
      <header className="border-b border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1 text-zinc-400 hover:text-white" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-bold">Restart Program</h1>
            <p className="text-xs text-zinc-400">Every lift restarts at stage 1. Adjust anything before confirming.</p>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-6 p-4">
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">T1 · 5×3+ at 85% of 5RM</h2>
          <div className="space-y-3 rounded-lg bg-zinc-800 p-4">
            {t1Ids.map((id) => row('t1', id, liftName(id, 'T1'), `5RM ${results[id]} ${unit}`))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">T2 · 3×10 at 65% of 5RM</h2>
          <div className="space-y-3 rounded-lg bg-zinc-800 p-4">
            {t1Ids.map((id) => row('t2', id, liftName(id, 'T2')))}
          </div>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">T3 · unchanged</h2>
          <div className="space-y-3 rounded-lg bg-zinc-800 p-4">
            {t3StyleIds.map((id) => row('t3StyleLifts', id, liftName(id, 'T1'), 'Substitute, 3×15+'))}
            {Object.keys(proposal.t3).map((id) => row('t3', id, liftName(id, 'T3')))}
          </div>
        </section>
      </main>

      <div className="fixed bottom-0 left-0 right-0 flex h-(--nav-height) items-center border-t border-zinc-800 bg-zinc-900 px-4">
        <button
          onClick={handleConfirm}
          disabled={!allValid}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-medium hover:bg-green-500 disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
          Confirm & start at A1
        </button>
      </div>
    </div>
  )
}
