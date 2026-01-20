import { useState, useEffect } from 'react'
import { Calendar } from 'lucide-react'
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
        plateInventory={settings.plateInventory}
        customExercises={settings.customExercises}
        onBack={() => setSelectedWorkout(null)}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col pb-(--nav-height)">
      <header className="border-b border-zinc-800 p-4">
        <h1 className="text-xl font-bold">History</h1>
      </header>

      <main className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-zinc-400">Loading...</div>
          </div>
        ) : workouts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Calendar className="mb-4 h-12 w-12 text-zinc-600" />
            <p className="text-zinc-400">No workouts yet</p>
            <p className="mt-1 text-sm text-zinc-500">
              Complete your first workout to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {workouts.map((workout) => (
              <WorkoutCard
                key={workout.id}
                workout={workout}
                unit={settings.weightUnit}
                customExercises={settings.customExercises}
                onClick={() => setSelectedWorkout(workout)}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav active="history" />
    </div>
  )
}
