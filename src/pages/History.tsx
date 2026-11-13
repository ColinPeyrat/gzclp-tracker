import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
import { PageSkeleton } from '@/components/layout/PageSkeleton'
import { useWorkoutHistory } from '../hooks/useWorkoutHistory'
import { useSettingsStore } from '../stores/settingsStore'
import { WorkoutCard } from '../components/history/WorkoutCard'
import { WorkoutDetail } from '../components/history/WorkoutDetail'
import { BottomNav } from '../components/ui/BottomNav'
import type { Workout } from '../lib/types'

export function History() {
  const { workouts, loading } = useWorkoutHistory()
  const { settings, loaded: settingsLoaded, load: loadSettings } = useSettingsStore()
  const [selectedWorkout, setSelectedWorkout] = useState<Workout | null>(null)

  useEffect(() => {
    if (!settingsLoaded) loadSettings()
  }, [settingsLoaded, loadSettings])

  if (selectedWorkout) {
    return (
      <WorkoutDetail
        workout={selectedWorkout}
        unit={settings.weightUnit}
        barWeight={settings.barWeight}
        plateInventory={settings.plateInventory}
        liftSubstitutions={settings.liftSubstitutions}
        exerciseLibrary={settings.exerciseLibrary}
        onBack={() => setSelectedWorkout(null)}
      />
    )
  }

  if (loading) {
    return (
      <>
        <PageSkeleton />
        <BottomNav active="history" />
      </>
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col pb-[calc(var(--nav-height)+1rem)]">
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-semibold tracking-tight">History</h1>
      </header>

      <main className="flex-1 space-y-5 px-4">
        {workouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
            <Calendar className="size-10 text-muted-foreground" />
            <div className="space-y-1">
              <p className="font-medium">No workouts yet</p>
              <p className="text-sm text-muted-foreground">Complete your first workout to see it here</p>
            </div>
          </div>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-lg bg-card">
            {workouts.map((workout) => (
              <li key={workout.id}>
                <WorkoutCard
                  workout={workout}
                  unit={settings.weightUnit}
                  liftSubstitutions={settings.liftSubstitutions}
                  exerciseLibrary={settings.exerciseLibrary}
                  onClick={() => setSelectedWorkout(workout)}
                />
              </li>
            ))}
          </ul>
        )}
      </main>

      <BottomNav active="history" />
    </div>
  )
}
