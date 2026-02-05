import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dumbbell, Play, Bug, Settings } from 'lucide-react'
import { useProgramStore } from '../stores/programStore'
import { useSettingsStore } from '../stores/settingsStore'
import { WORKOUTS, WORKOUT_ORDER, getUpcomingWorkoutTypes, type WorkoutType, type ProgramState, type LiftState, type LiftName, type WeightUnit, type LiftSubstitution, type ExerciseDefinition } from '../lib/types'
import { estimate5RM, applyT1Reset } from '../lib/progression'
import { getExerciseName } from '../lib/exercises'
import { Modal } from '../components/ui/Modal'
import { BottomNav } from '../components/ui/BottomNav'
import { WorkoutPreviewCard } from '../components/home/WorkoutPreviewCard'

interface Pending5RMInfo {
  liftId: LiftName
  liftState: LiftState
  liftName: string
  bestSetReps: number
  bestSetWeight: number
  estimated5RM: number
}

function getPending5RMInfo(
  state: ProgramState | null,
  unit: WeightUnit,
  liftSubstitutions?: LiftSubstitution[],
  exerciseLibrary?: ExerciseDefinition[]
): Pending5RMInfo | null {
  if (!state) return null
  const liftId = WORKOUTS[state.nextWorkoutType].t1
  const liftState = state.t1[liftId]
  if (!liftState.pending5RMTest) return null

  const bestSetWeight = liftState.bestSetWeight ?? liftState.weight
  const bestSetReps = liftState.bestSetReps ?? 0

  return {
    liftId,
    liftState,
    liftName: getExerciseName(liftId, 'T1', liftSubstitutions, exerciseLibrary),
    bestSetReps,
    bestSetWeight,
    estimated5RM: estimate5RM(bestSetWeight, bestSetReps, unit),
  }
}

export function Home() {
  const { state, loaded: programLoaded, load: loadProgram, save: saveProgram } = useProgramStore()
  const { settings, loaded: settingsLoaded, load: loadSettings } = useSettingsStore()
  const [manual5RM, setManual5RM] = useState('')
  const [showDebugModal, setShowDebugModal] = useState(false)

  useEffect(() => {
    if (!programLoaded) loadProgram()
    if (!settingsLoaded) loadSettings()
  }, [programLoaded, settingsLoaded, loadProgram, loadSettings])

  const currentPending = getPending5RMInfo(state, settings.weightUnit, settings.liftSubstitutions, settings.exerciseLibrary)

  const handleApply5RM = async (new5RM: number) => {
    if (!state || !currentPending) return
    const newLiftState = applyT1Reset(currentPending.liftState, new5RM, settings.weightUnit)
    const newProgramState = {
      ...state,
      t1: { ...state.t1, [currentPending.liftId]: newLiftState },
    }
    await saveProgram(newProgramState)
    setManual5RM('')
  }

  const handleSetNextWorkout = async (workoutType: WorkoutType) => {
    if (!state) return
    await saveProgram({ ...state, nextWorkoutType: workoutType })
    setShowDebugModal(false)
  }

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

  const upcoming = getUpcomingWorkoutTypes(state.nextWorkoutType)

  return (
    <div className="flex min-h-screen flex-col pb-(--nav-height)">
      <header className="border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">GZCLP</h1>
          <div className="flex items-center gap-2">
            {import.meta.env.DEV && (
              <button
                onClick={() => setShowDebugModal(true)}
                className="p-2 text-yellow-500 hover:text-yellow-400"
              >
                <Bug className="h-5 w-5" />
              </button>
            )}
            <Link to="/settings" className="p-2 text-zinc-400 hover:text-white">
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 p-4">
        <div className="mb-6">
          <p className="text-sm text-zinc-400">Next Workout</p>
          <h2 className="text-2xl font-bold">{state.nextWorkoutType}</h2>
          <p className="text-zinc-400">Workout #{state.workoutCount + 1}</p>
        </div>

        <div className="mb-6">
          <WorkoutPreviewCard
            workoutType={upcoming[0]}
            state={state}
            settings={settings}
            isNext={true}
          />
        </div>

        <Link
          to="/workout"
          className="mb-8 flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-4 font-medium text-white hover:bg-blue-500"
        >
          <Play className="h-5 w-5" />
          Start Workout
        </Link>

        <div>
          <h3 className="mb-3 text-sm font-medium text-zinc-400">Upcoming</h3>
          <div className="space-y-3">
            {upcoming.slice(1).map((workoutType) => (
              <WorkoutPreviewCard
                key={workoutType}
                workoutType={workoutType}
                state={state}
                settings={settings}
                isNext={false}
              />
            ))}
          </div>
        </div>
      </main>

      {currentPending && (
        <Modal>
          <h2 className="mb-2 text-lg font-bold">Reset {currentPending.liftName}</h2>
          <p className="mb-4 text-sm text-zinc-400">
            {currentPending.bestSetReps > 0
              ? `Enter your new 5RM or use the estimate based on your best set (${currentPending.bestSetReps} reps @ ${currentPending.bestSetWeight} ${settings.weightUnit}).`
              : 'Enter your tested 5RM to start a new cycle.'}
          </p>

          <div className="mb-4 space-y-3">
            {currentPending.bestSetReps > 0 && (
              <>
                <button
                  onClick={() => handleApply5RM(currentPending.estimated5RM)}
                  className="w-full rounded-lg bg-blue-600 py-3 font-medium hover:bg-blue-500"
                >
                  Use Estimate: {currentPending.estimated5RM} {settings.weightUnit}
                </button>

                <div className="flex items-center gap-2 text-sm text-zinc-400">
                  <div className="h-px flex-1 bg-zinc-700" />
                  <span>or enter manually</span>
                  <div className="h-px flex-1 bg-zinc-700" />
                </div>
              </>
            )}

            <div className="flex gap-2">
              <input
                type="number"
                value={manual5RM}
                onChange={(e) => setManual5RM(e.target.value)}
                placeholder={`5RM in ${settings.weightUnit}`}
                className="flex-1 rounded-lg bg-zinc-700 px-4 py-3 text-white placeholder:text-zinc-500"
              />
              <button
                onClick={() => {
                  const value = parseFloat(manual5RM)
                  if (!isNaN(value) && value > 0) {
                    handleApply5RM(value)
                  }
                }}
                disabled={!manual5RM || isNaN(parseFloat(manual5RM))}
                className="rounded-lg bg-zinc-600 px-4 py-3 font-medium hover:bg-zinc-500 disabled:opacity-50"
              >
                Use This
              </button>
            </div>
          </div>

          <p className="text-xs text-zinc-500">
            Your new working weight will be 85% of the 5RM you enter.
          </p>
        </Modal>
      )}

      {showDebugModal && (
        <Modal onClose={() => setShowDebugModal(false)}>
          <h2 className="mb-4 text-lg font-bold text-yellow-500">Debug: Select Workout</h2>
          <div className="space-y-2">
            {WORKOUT_ORDER.map((workoutType) => {
              const w = WORKOUTS[workoutType]
              return (
                <button
                  key={workoutType}
                  onClick={() => handleSetNextWorkout(workoutType)}
                  className={`w-full rounded-lg p-3 text-left ${
                    state?.nextWorkoutType === workoutType
                      ? 'bg-blue-600'
                      : 'bg-zinc-700 hover:bg-zinc-600'
                  }`}
                >
                  <span className="font-medium">{workoutType}</span>
                  <span className="ml-2 text-sm text-zinc-400">
                    T1: {getExerciseName(w.t1, 'T1', settings.liftSubstitutions, settings.exerciseLibrary)}, T2: {getExerciseName(w.t2, 'T2', settings.liftSubstitutions, settings.exerciseLibrary)}
                  </span>
                </button>
              )
            })}
          </div>
          <button
            onClick={() => setShowDebugModal(false)}
            className="mt-4 w-full rounded-lg bg-zinc-700 py-2 text-sm hover:bg-zinc-600"
          >
            Cancel
          </button>
        </Modal>
      )}

      <BottomNav active="home" />
    </div>
  )
}
