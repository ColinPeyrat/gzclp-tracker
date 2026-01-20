import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Check } from 'lucide-react'
import { useProgramStore } from '../stores/programStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useWorkoutSession } from '../hooks/useWorkoutSession'
import { useRestTimer } from '../hooks/useRestTimer'
import { useBeforeUnload } from '../hooks/useBeforeUnload'
import { ExerciseCard } from '../components/workout/ExerciseCard'
import { RestTimer } from '../components/workout/RestTimer'
import { Modal } from '../components/ui/Modal'
import { db } from '../lib/db'
import {
  calculateT1Progression,
  calculateT2Progression,
  calculateT3Progression,
} from '../lib/progression'
import { LIFTS, WORKOUTS } from '../lib/types'
import { getIncrement, UNIT_CONFIG } from '../lib/units'
import { vibrate } from '../lib/haptics'

export function Workout() {
  const navigate = useNavigate()
  const { state: programState, loaded: programLoaded, load: loadProgram, save: saveProgram } = useProgramStore()
  const { settings, loaded: settingsLoaded, load: loadSettings } = useSettingsStore()
  const { session, startWorkout, completeSet, failRemainingCurrentExerciseSets, updateCurrentExerciseWeight, nextExercise, prevExercise, finishWorkout } = useWorkoutSession()
  const [showFailModal, setShowFailModal] = useState(false)
  const restTimer = useRestTimer()

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
    if (programLoaded && programState && !session) {
      startWorkout(programState)
    }
  }, [programLoaded, programState, session, startWorkout])

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
      const increment = getIncrement('T1', LIFTS[liftId].isLower, unit)
      const result = calculateT1Progression(currentState, t1Exercise, increment, unit)
      newProgramState.t1 = { ...newProgramState.t1, [liftId]: result.newState }
    }

    // T2 progression
    const t2Exercise = completedWorkout.exercises.find((e) => e.tier === 'T2')
    if (t2Exercise) {
      const liftId = workoutDef.t2
      const currentState = programState.t2[liftId]
      const increment = getIncrement('T2', LIFTS[liftId].isLower, unit)
      const result = calculateT2Progression(currentState, t2Exercise, increment, unit)
      newProgramState.t2 = { ...newProgramState.t2, [liftId]: result.newState }
    }

    // T3 progression
    const t3Exercise = completedWorkout.exercises.find((e) => e.tier === 'T3')
    if (t3Exercise) {
      const amrapSet = t3Exercise.sets.find((s) => s.isAmrap)
      if (amrapSet) {
        const t3Id = workoutDef.t3
        const currentWeight = programState.t3[t3Id]?.weightLbs ?? 50
        const t3Increment = UNIT_CONFIG[unit].incrementT3
        const result = calculateT3Progression(currentWeight, amrapSet.reps, t3Increment)
        if (result.increased) {
          newProgramState.t3 = { ...newProgramState.t3, [t3Id]: { weightLbs: result.newWeight } }
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
      </header>

      <main className="flex-1 p-4">
        <ExerciseCard
          exercise={session.currentExercise}
          barWeight={settings.barWeightLbs}
          plateInventory={settings.plateInventory}
          unit={settings.weightUnit}
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
    </div>
  )
}
