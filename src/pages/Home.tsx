import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Dumbbell, History, Settings, Play } from 'lucide-react'
import { useProgramStore } from '../stores/programStore'
import { useSettingsStore } from '../stores/settingsStore'
import { WORKOUTS, LIFTS, T3_EXERCISES } from '../lib/types'
import { getStageConfig } from '../lib/progression'

export function Home() {
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

  if (!state) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-4">
        <Dumbbell className="h-16 w-16 text-zinc-400" />
        <h1 className="text-2xl font-bold">GZCLP Tracker</h1>
        <p className="text-center text-zinc-400">
          Set up your program to get started
        </p>
        <Link
          to="/setup"
          className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-500"
        >
          Get Started
        </Link>
      </div>
    )
  }

  const workout = WORKOUTS[state.nextWorkoutType]
  const t1State = state.t1[workout.t1]
  const t2State = state.t2[workout.t2]
  const t1Config = getStageConfig('T1', t1State.stage)
  const t2Config = getStageConfig('T2', t2State.stage)

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">GZCLP</h1>
          <Link to="/settings" className="p-2 text-zinc-400 hover:text-white">
            <Settings className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="mb-6">
          <p className="text-sm text-zinc-400">Next Workout</p>
          <h2 className="text-2xl font-bold">{state.nextWorkoutType}</h2>
          <p className="text-zinc-400">Workout #{state.workoutCount + 1}</p>
        </div>

        <div className="mb-6 space-y-3">
          <div className="rounded-lg bg-zinc-800 p-4">
            <div className="mb-1 text-xs font-medium text-blue-400">T1</div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-medium">{LIFTS[workout.t1].name}</span>
              <span className="text-zinc-400">
                {t1Config.sets}×{t1Config.reps}+ @ {t1State.weightLbs} {settings.weightUnit}
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-zinc-800 p-4">
            <div className="mb-1 text-xs font-medium text-green-400">T2</div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-medium">{LIFTS[workout.t2].name}</span>
              <span className="text-zinc-400">
                {t2Config.sets}×{t2Config.reps} @ {t2State.weightLbs} {settings.weightUnit}
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-zinc-800 p-4">
            <div className="mb-1 text-xs font-medium text-yellow-400">T3</div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-medium">
                {T3_EXERCISES[workout.t3].name}
              </span>
              <span className="text-zinc-400">
                3×15+ @ {state.t3[workout.t3].weightLbs} {settings.weightUnit}
              </span>
            </div>
          </div>
        </div>

        <Link
          to="/workout"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-4 font-medium text-white hover:bg-blue-500"
        >
          <Play className="h-5 w-5" />
          Start Workout
        </Link>
      </main>

      <nav className="border-t border-zinc-800 p-4">
        <div className="flex justify-around">
          <Link to="/" className="flex flex-col items-center gap-1 text-blue-400">
            <Dumbbell className="h-6 w-6" />
            <span className="text-xs">Home</span>
          </Link>
          <Link
            to="/history"
            className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white"
          >
            <History className="h-6 w-6" />
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
