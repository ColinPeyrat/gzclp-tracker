import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Dumbbell, Plus } from 'lucide-react'
import { useProgramStore } from '../stores/programStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useWorkoutSession } from '../hooks/useWorkoutSession'
import { useRestTimer } from '../hooks/useRestTimer'
import { useBeforeUnload } from '../hooks/useBeforeUnload'
import { ExerciseCard } from '../components/workout/ExerciseCard'
import { RestTimer } from '../components/workout/RestTimer'
import { WarmupModal } from '../components/workout/WarmupModal'
import { Modal } from '../components/ui/Modal'
import { db } from '../lib/db'
import {
  calculateT1Progression,
  calculateT2Progression,
  calculateT3Progression,
} from '../lib/progression'
import { LIFTS, WORKOUTS } from '../lib/types'
import { getIncrement } from '../lib/units'
import { getSmallestPlate } from '../lib/plates'
import { vibrate } from '../lib/haptics'
import { getLiftSubstitution, getExerciseName } from '../lib/exercises'

export function Workout() {
  const navigate = useNavigate()
  const { state: programState, loaded: programLoaded, load: loadProgram, save: saveProgram } = useProgramStore()
  const { settings, loaded: settingsLoaded, load: loadSettings } = useSettingsStore()
  const { session, startWorkout, completeSet, failRemainingCurrentExerciseSets, updateCurrentExerciseWeight, nextExercise, prevExercise, finishWorkout, addT3Exercise } = useWorkoutSession()
  const [showFailModal, setShowFailModal] = useState(false)
  const [showWarmupModal, setShowWarmupModal] = useState(false)
  const [showAddT3Modal, setShowAddT3Modal] = useState(false)
  const [newT3Id, setNewT3Id] = useState('')
  const [newT3Weight, setNewT3Weight] = useState('')
  const [warmupChecked, setWarmupChecked] = useState(false)
  const restTimer = useRestTimer()

  // Auto-show warmup modal for T1 only (unless it uses T3 progression)
  useEffect(() => {
    if (session && !warmupChecked && session.currentExerciseIndex === 0) {
      const t1Exercise = session.workout.exercises.find((e) => e.tier === 'T1')
      if (t1Exercise && session.currentExercise.tier === 'T1') {
        const t1Sub = getLiftSubstitution(t1Exercise.liftId, settings.liftSubstitutions)
        const usesT3Progression = t1Sub?.forceT3Progression
        // Show warmup modal by default only if T1 doesn't use T3 progression
        setShowWarmupModal(!usesT3Progression)
      }
      setWarmupChecked(true)
    }
  }, [session, warmupChecked, settings.liftSubstitutions])

  // Block navigation if workout has started
  const hasStarted = session?.workout.exercises.some((ex) =>
    ex.sets.some((s) => s.completed)
  ) ?? false
  const blocker = useBeforeUnload(hasStarted, 'You have an active workout. Are you sure you want to leave?')

  useEffect(() => {
    if (!programLoaded) loadProgram()
    if (!settingsLoaded) loadSettings()
  }, [programLoaded, settingsLoaded, loadProgram, loadSettings])

  useEffect(() => {
    if (programLoaded && programState && settingsLoaded && !session) {
      startWorkout(programState, settings)
    }
  }, [programLoaded, programState, session, startWorkout, settingsLoaded, settings])

  const handleCompleteSet = (setIndex: number, reps: number) => {
    completeSet(setIndex, reps)
    vibrate()

    // Start rest timer based on tier
    if (session) {
      const tier = session.currentExercise.tier
      const restDuration =
        tier === 'T1'
          ? settings.restTimers.t1Seconds
          : tier === 'T2'
            ? settings.restTimers.t2Seconds
            : settings.restTimers.t3Seconds
      restTimer.start(restDuration)
    }
  }

  const handleNextExercise = () => {
    if (!session) return
    const hasIncompleteSets = session.currentExercise.sets.some((s) => !s.completed)
    if (hasIncompleteSets) {
      setShowFailModal(true)
    } else {
      nextExercise()
    }
  }

  const handleConfirmFail = () => {
    failRemainingCurrentExerciseSets()
    setShowFailModal(false)
    nextExercise()
  }

  const handleAddT3 = () => {
    if (!newT3Id || !newT3Weight) return
    const weight = parseFloat(newT3Weight)
    if (isNaN(weight) || weight <= 0) return

    addT3Exercise(newT3Id, weight)
    setNewT3Id('')
    setNewT3Weight('')
    setShowAddT3Modal(false)
  }

  // Get T3s available to add (from library but not already in workout)
  const availableT3s = settings.exerciseLibrary?.filter(
    (ex) => !session?.workout.exercises.some((e) => e.liftId === ex.id)
  ) ?? []

  const handleFinishWorkout = async () => {
    if (!session || !programState) return

    const completedWorkout = finishWorkout()
    if (!completedWorkout) return

    // Save workout to database
    await db.workouts.add(completedWorkout)

    // Calculate progression for each exercise
    const workoutDef = WORKOUTS[completedWorkout.type]
    const newProgramState = { ...programState }

    const unit = settings.weightUnit

    // T1 progression
    const t1Exercise = completedWorkout.exercises.find((e) => e.tier === 'T1')
    if (t1Exercise) {
      const liftId = workoutDef.t1
      const currentState = programState.t1[liftId]
      const t1Sub = getLiftSubstitution(liftId, settings.liftSubstitutions)

      if (t1Sub?.forceT3Progression) {
        // Use T3-style progression
        const amrapSet = t1Exercise.sets.find((s) => s.isAmrap)
        if (amrapSet) {
          const t3Increment = getSmallestPlate(settings.plateInventory)
          const result = calculateT3Progression(currentState.weight, amrapSet.reps, t3Increment)
          if (result.increased) {
            newProgramState.t1 = {
              ...newProgramState.t1,
              [liftId]: { ...currentState, weight: result.newWeight },
            }
          }
        }
      } else {
        const increment = getIncrement('T1', LIFTS[liftId].isLower, unit)
        const result = calculateT1Progression(currentState, t1Exercise, increment, unit)
        newProgramState.t1 = { ...newProgramState.t1, [liftId]: result.newState }
      }
    }

    // T2 progression
    const t2Exercise = completedWorkout.exercises.find((e) => e.tier === 'T2')
    if (t2Exercise) {
      const liftId = workoutDef.t2
      const currentState = programState.t2[liftId]
      const t2Sub = getLiftSubstitution(liftId, settings.liftSubstitutions)

      if (t2Sub?.forceT3Progression) {
        // Use T3-style progression
        const amrapSet = t2Exercise.sets.find((s) => s.isAmrap)
        if (amrapSet) {
          const t3Increment = getSmallestPlate(settings.plateInventory)
          const result = calculateT3Progression(currentState.weight, amrapSet.reps, t3Increment)
          if (result.increased) {
            newProgramState.t2 = {
              ...newProgramState.t2,
              [liftId]: { ...currentState, weight: result.newWeight },
            }
          }
        }
      } else {
        const increment = getIncrement('T2', LIFTS[liftId].isLower, unit)
        const result = calculateT2Progression(currentState, t2Exercise, increment, unit)
        newProgramState.t2 = { ...newProgramState.t2, [liftId]: result.newState }
      }
    }

    // T3 progression - process all T3 exercises
    const t3Exercises = completedWorkout.exercises.filter((e) => e.tier === 'T3')
    for (const t3Exercise of t3Exercises) {
      const amrapSet = t3Exercise.sets.find((s) => s.isAmrap)
      if (amrapSet) {
        const t3Id = t3Exercise.liftId
        const currentWeight = programState.t3[t3Id]?.weight ?? t3Exercise.weight
        const t3Increment = getSmallestPlate(settings.plateInventory)
        const result = calculateT3Progression(currentWeight, amrapSet.reps, t3Increment)
        if (result.increased) {
          newProgramState.t3 = { ...newProgramState.t3, [t3Id]: { weight: result.newWeight } }
        }
      }
    }

    // Advance to next workout
    newProgramState.nextWorkoutType = (['A1', 'A2', 'B1', 'B2'] as const)[
      (['A1', 'A2', 'B1', 'B2'].indexOf(completedWorkout.type) + 1) % 4
    ]
    newProgramState.workoutCount += 1

    await saveProgram(newProgramState)
    navigate('/')
  }

  if (!programLoaded || !settingsLoaded || !session) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  const allExercisesComplete = session.workout.exercises.every((ex) =>
    ex.sets.every((s) => s.completed)
  )

  return (
    <div className="flex min-h-screen flex-col pb-[calc(var(--nav-height)+var(--rest-timer-height))]">
      <header className="border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="p-1 text-zinc-400 hover:text-white">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="font-bold">{session.workout.type}</h1>
              <p className="text-xs text-zinc-400">
                Exercise {session.currentExerciseIndex + 1} of {session.workout.exercises.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {availableT3s.length > 0 && (
              <button
                onClick={() => setShowAddT3Modal(true)}
                className="p-2 text-zinc-400 hover:text-white"
                title="Add T3 exercise"
              >
                <Plus className="h-5 w-5" />
              </button>
            )}
            <button
              onClick={() => setShowWarmupModal(true)}
              className="p-2 text-zinc-400 hover:text-white"
              title="View warmup sets"
            >
              <Dumbbell className="h-5 w-5" />
            </button>
            {allExercisesComplete && (
              <button
                onClick={handleFinishWorkout}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 font-medium hover:bg-green-500"
              >
                <Check className="h-4 w-4" />
                Finish
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 p-4">
        <ExerciseCard
          exercise={session.currentExercise}
          barWeight={settings.barWeight}
          dumbbellHandleWeight={settings.dumbbellHandleWeight}
          plateInventory={settings.plateInventory}
          unit={settings.weightUnit}
          liftSubstitutions={settings.liftSubstitutions}
          exerciseLibrary={settings.exerciseLibrary}
          onCompleteSet={handleCompleteSet}
          onWeightChange={updateCurrentExerciseWeight}
        />
      </main>

      <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-900 px-4 h-(--nav-height) flex items-center">
        <div className="flex w-full items-center justify-between">
          <button
            onClick={prevExercise}
            disabled={session.currentExerciseIndex === 0}
            className="flex items-center gap-1 rounded-lg px-4 py-2 text-zinc-400 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
            Prev
          </button>

          <div className="flex gap-1">
            {session.workout.exercises.map((ex, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i === session.currentExerciseIndex
                    ? 'bg-blue-500'
                    : ex.sets.every((s) => s.completed)
                      ? 'bg-green-500'
                      : 'bg-zinc-600'
                }`}
              />
            ))}
          </div>

          <button
            onClick={handleNextExercise}
            disabled={session.isLastExercise}
            className="flex items-center gap-1 rounded-lg px-4 py-2 text-zinc-400 hover:text-white disabled:opacity-30"
          >
            Next
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {restTimer.isRunning && (
        <RestTimer
          seconds={restTimer.seconds}
          totalSeconds={restTimer.totalSeconds}
          isRunning={restTimer.isRunning}
          onAddTime={restTimer.addTime}
          onSkip={restTimer.skip}
        />
      )}

      {blocker.state === 'blocked' && (
        <Modal>
          <h2 className="mb-2 text-lg font-bold">Leave Workout?</h2>
          <p className="mb-6 text-sm text-zinc-400">
            Your progress will be lost. Are you sure you want to leave?
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => blocker.proceed?.()}
              className="flex-1 rounded-lg bg-red-600 py-2 font-medium hover:bg-red-500"
            >
              Leave
            </button>
            <button
              onClick={() => blocker.reset?.()}
              className="flex-1 rounded-lg bg-zinc-700 py-2 font-medium hover:bg-zinc-600"
            >
              Stay
            </button>
          </div>
        </Modal>
      )}

      {showFailModal && (
        <Modal onClose={() => setShowFailModal(false)}>
          <h2 className="mb-2 text-lg font-bold">Incomplete Sets</h2>
          <p className="mb-6 text-sm text-zinc-400">
            You have {session.currentExercise.sets.filter((s) => !s.completed).length} incomplete sets. Mark them as failed and move on?
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleConfirmFail}
              className="flex-1 rounded-lg bg-red-600 py-2 font-medium hover:bg-red-500"
            >
              Mark Failed
            </button>
            <button
              onClick={() => setShowFailModal(false)}
              className="flex-1 rounded-lg bg-zinc-700 py-2 font-medium hover:bg-zinc-600"
            >
              Go Back
            </button>
          </div>
        </Modal>
      )}

      {showWarmupModal && (
        <WarmupModal
          exerciseName={getExerciseName(session.currentExercise.liftId, session.currentExercise.tier, settings.liftSubstitutions, settings.exerciseLibrary)}
          workWeight={session.currentExercise.weight}
          barWeight={settings.barWeight}
          plateInventory={settings.plateInventory}
          unit={settings.weightUnit}
          onComplete={() => setShowWarmupModal(false)}
        />
      )}

      {showAddT3Modal && (
        <Modal onClose={() => setShowAddT3Modal(false)}>
          <h2 className="mb-4 text-lg font-bold">Add T3 Exercise</h2>

          {!newT3Id ? (
            <div className="space-y-2">
              {availableT3s.map((t3) => {
                const savedWeight = programState?.t3[t3.id]?.weight
                return (
                  <button
                    key={t3.id}
                    onClick={() => {
                      setNewT3Id(t3.id)
                      if (savedWeight) {
                        setNewT3Weight(savedWeight.toString())
                      }
                    }}
                    className="w-full rounded-lg bg-zinc-700 px-4 py-3 text-left hover:bg-zinc-600"
                  >
                    <span className="font-medium">{t3.name}</span>
                    {savedWeight && (
                      <span className="ml-2 text-sm text-zinc-400">
                        {savedWeight} {settings.weightUnit}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-zinc-700 px-4 py-3">
                <span className="font-medium">
                  {availableT3s.find((t) => t.id === newT3Id)?.name}
                </span>
              </div>

              <div>
                <label className="mb-1 block text-sm text-zinc-400">Weight</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newT3Weight}
                    onChange={(e) => setNewT3Weight(e.target.value)}
                    placeholder="Weight"
                    className="flex-1 rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 focus:border-blue-500 focus:outline-none"
                    step={settings.weightUnit === 'kg' ? 2.5 : 5}
                    min={0}
                    autoFocus
                  />
                  <span className="text-zinc-400">{settings.weightUnit}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleAddT3}
                  disabled={!newT3Weight}
                  className="flex-1 rounded-lg bg-blue-600 py-2 font-medium hover:bg-blue-500 disabled:opacity-50"
                >
                  Add
                </button>
                <button
                  onClick={() => {
                    setNewT3Id('')
                    setNewT3Weight('')
                  }}
                  className="flex-1 rounded-lg bg-zinc-700 py-2 font-medium hover:bg-zinc-600"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
