import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Dumbbell, History as HistoryIcon, Settings, Calendar } from 'lucide-react'
import { useWorkoutHistory } from '../hooks/useWorkoutHistory'
import { useSettingsStore } from '../stores/settingsStore'
import { WorkoutCard } from '../components/history/WorkoutCard'
import { WorkoutDetail } from '../components/history/WorkoutDetail'
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
        onBack={() => setSelectedWorkout(null)}
      />
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
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
                onClick={() => setSelectedWorkout(workout)}
              />
            ))}
          </div>
        )}
      </main>

      <nav className="border-t border-zinc-800 p-4">
        <div className="flex justify-around">
          <Link
            to="/"
            className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white"
          >
            <Dumbbell className="h-6 w-6" />
            <span className="text-xs">Home</span>
          </Link>
          <Link to="/history" className="flex flex-col items-center gap-1 text-blue-400">
            <HistoryIcon className="h-6 w-6" />
            <span className="text-xs">History</span>
          </Link>
          <Link
            to="/settings"
            className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white"
          >
            <Settings className="h-6 w-6" />
            <span className="text-xs">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
