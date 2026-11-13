import { useEffect, useState, type ReactNode } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { TierBadge } from '@/components/ui/tier-badge'
import { PageSkeleton } from '@/components/layout/PageSkeleton'
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
    return <PageSkeleton />
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
    <div key={`${section}-${id}`} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="truncate font-medium">{label}</div>
        {hint && <div className="font-mono text-xs text-muted-foreground tabular-nums">{hint}</div>}
      </div>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="decimal"
          aria-label={`${label} ${section}`}
          value={proposal[section][id as LiftName] ?? ''}
          onChange={(e) => setValue(section, id, e.target.value)}
          className="h-10 w-24 text-right text-base font-semibold tabular-nums md:text-base"
          step={unit === 'kg' ? 2.5 : 5}
          min={0}
        />
        <span className="w-6 text-xs text-muted-foreground">{unit}</span>
      </div>
    </div>
  )

  const t1Ids = Object.keys(proposal.t1) as LiftName[]
  const t3StyleIds = Object.keys(proposal.t3StyleLifts) as LiftName[]

  const section = (title: ReactNode, rows: ReactNode) => (
    <section className="space-y-3">
      <h2 className="px-1 text-sm text-muted-foreground">{title}</h2>
      <Card>
        <CardContent className="divide-y divide-border">{rows}</CardContent>
      </Card>
    </section>
  )

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col pb-[calc(var(--nav-height)+1rem)]">
      <header className="flex items-start gap-2 px-3 pt-4 pb-3">
        <Button variant="ghost" size="icon-lg" onClick={() => navigate('/')} aria-label="Back">
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-xl font-semibold tracking-tight">Restart program</h1>
          <p className="text-sm text-muted-foreground">Every lift restarts at stage 1. Adjust anything before confirming.</p>
        </div>
      </header>

      <main className="flex-1 space-y-5 px-4">
        {section(
          <><TierBadge tier="T1" className="w-auto" /> <span className="font-mono">5×3+</span> at 85% of 5RM</>,
          t1Ids.map((id) => row('t1', id, liftName(id, 'T1'), `5RM ${results[id]} ${unit}`))
        )}
        {section(
          <><TierBadge tier="T2" className="w-auto" /> <span className="font-mono">3×10</span> at 65% of 5RM</>,
          t1Ids.map((id) => row('t2', id, liftName(id, 'T2')))
        )}
        {section(
          <><TierBadge tier="T3" className="w-auto" /> unchanged</>,
          <>
            {t3StyleIds.map((id) => row('t3StyleLifts', id, liftName(id, 'T1'), 'Substitute, 3×15+'))}
            {Object.keys(proposal.t3).map((id) => row('t3', id, liftName(id, 'T3')))}
          </>
        )}
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 h-(--nav-height) border-t border-border bg-background">
        <div className="mx-auto flex h-full max-w-md items-center px-4">
          <Button size="xl" className="w-full" onClick={handleConfirm} disabled={!allValid}>
            <Check />
            Confirm & start at A1
          </Button>
        </div>
      </div>
    </div>
  )
}
