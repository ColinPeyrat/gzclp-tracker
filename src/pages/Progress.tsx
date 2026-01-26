import { useState, useEffect } from 'react'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { useProgressionData } from '../hooks/useProgressionData'
import { useSettingsStore } from '../stores/settingsStore'
import { LiftCard } from '../components/progress/LiftCard'
import { LiftDetailChart } from '../components/progress/LiftDetailChart'
import { BottomNav } from '../components/ui/BottomNav'
import type { LiftName } from '../lib/types'

const LIFT_ORDER: LiftName[] = ['squat', 'bench', 'deadlift', 'ohp']

export function Progress() {
  const { lifts, loading } = useProgressionData()
  const { settings, loaded: settingsLoaded, load: loadSettings } = useSettingsStore()
  const [selectedLift, setSelectedLift] = useState<LiftName | null>(null)

  useEffect(() => {
    if (!settingsLoaded) loadSettings()
  }, [settingsLoaded, loadSettings])

  const unit = settings.weightUnit

  // Detail view
  if (selectedLift) {
    const lift = lifts[selectedLift]
    const hasData = lift.dataPoints.length > 0

    return (
      <div className="flex min-h-screen flex-col pb-(--nav-height)">
        <header className="flex items-center gap-3 border-b border-zinc-800 p-4">
          <button
            onClick={() => setSelectedLift(null)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-800 hover:text-white"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-xl font-bold">{lift.liftName} Progress</h1>
        </header>

        <main className="flex-1 space-y-6 p-4">
          <LiftDetailChart lift={lift} />

          {hasData && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-500">Start</p>
                  <p className="text-lg font-bold">
                    {lift.startWeight} {unit}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-500">Current</p>
                  <p className="text-lg font-bold">
                    {lift.currentWeight} {unit}
                  </p>
                </div>
                <div className="rounded-lg border border-zinc-800 bg-zinc-900 p-3">
                  <p className="text-xs text-zinc-500">8-Week</p>
                  <p className="text-lg font-bold text-blue-400">
                    {lift.projectedWeight > 0 ? `${lift.projectedWeight} ${unit}` : '—'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-xs text-zinc-500">
                <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
                <span>Successful lift</span>
                <span className="ml-2 inline-block h-2 w-2 rounded-full bg-red-500" />
                <span>Missed target</span>
              </div>
            </>
          )}
        </main>

        <BottomNav active="progress" />
      </div>
    )
  }

  // Dashboard view
  return (
    <div className="flex min-h-screen flex-col pb-(--nav-height)">
      <header className="border-b border-zinc-800 p-4">
        <h1 className="text-xl font-bold">Progress</h1>
      </header>

      <main className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-zinc-400">Loading...</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {LIFT_ORDER.map((liftId) => (
              <LiftCard
                key={liftId}
                lift={lifts[liftId]}
                unit={unit}
                onClick={() => setSelectedLift(liftId)}
              />
            ))}
          </div>
        )}

        {!loading && LIFT_ORDER.every((id) => lifts[id].dataPoints.length === 0) && (
          <div className="mt-8 flex flex-col items-center text-center">
            <TrendingUp className="mb-4 h-12 w-12 text-zinc-600" />
            <p className="text-zinc-400">No progress data yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Complete workouts to track your T1 lifts
            </p>
          </div>
        )}
      </main>

      <BottomNav active="progress" />
    </div>
  )
}
