import { useState, useEffect } from 'react'
import { ArrowLeft, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageSkeleton } from '@/components/layout/PageSkeleton'
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

  if (selectedLift) {
    const lift = lifts[selectedLift]
    const hasData = lift.dataPoints.length > 0
    const stats = [
      { label: 'Start', value: lift.startWeight },
      { label: 'Current', value: lift.currentWeight },
      { label: '8-week', value: lift.projectedWeight > 0 ? lift.projectedWeight : null },
    ]

    return (
      <div className="mx-auto flex min-h-screen max-w-md flex-col pb-[calc(var(--nav-height)+1rem)]">
        <header className="flex items-center gap-2 px-3 pt-5 pb-4">
          <Button variant="ghost" size="icon" onClick={() => setSelectedLift(null)} aria-label="Back">
            <ArrowLeft />
          </Button>
          <h1 className="text-xl font-semibold tracking-tight">{lift.liftName}</h1>
        </header>

        <main className="flex-1 space-y-5 px-4">
          <LiftDetailChart lift={lift} />

          {hasData && (
            <>
              <div className="grid grid-cols-3 divide-x divide-border rounded-lg bg-card py-3">
                {stats.map((stat) => (
                  <div key={stat.label} className="px-4">
                    <p className="text-xs text-muted-foreground">{stat.label}</p>
                    <p className="mt-0.5 tabular-nums">
                      {stat.value !== null ? (
                        <>
                          <span className="text-lg font-semibold">{stat.value}</span>
                          <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
                        </>
                      ) : (
                        <span className="text-lg font-semibold text-muted-foreground">—</span>
                      )}
                    </p>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 px-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-success" />
                  Hit target
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-destructive" />
                  Missed target
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-4 border-t border-dashed border-primary/60" />
                  Projection
                </span>
              </div>
            </>
          )}
        </main>

        <BottomNav active="progress" />
      </div>
    )
  }

  if (loading) {
    return (
      <>
        <PageSkeleton />
        <BottomNav active="progress" />
      </>
    )
  }

  const isEmpty = LIFT_ORDER.every((id) => lifts[id].dataPoints.length === 0)

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col pb-[calc(var(--nav-height)+1rem)]">
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-semibold tracking-tight">Progress</h1>
      </header>

      <main className="flex-1 space-y-5 px-4">
        <section className="space-y-3">
          <h2 className="px-1 text-sm text-muted-foreground">T1 lifts</h2>
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
        </section>

        {isEmpty && (
          <div className="flex flex-col items-center gap-3 py-10 text-center">
            <TrendingUp className="size-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">No progress data yet</p>
              <p className="text-sm text-muted-foreground">Complete workouts to track your T1 lifts</p>
            </div>
          </div>
        )}
      </main>

      <BottomNav active="progress" />
    </div>
  )
}
