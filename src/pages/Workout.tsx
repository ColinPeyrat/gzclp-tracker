import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Dumbbell, Plus } from 'lucide-react'
import { useProgramStore } from '../stores/programStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useWorkoutSessionStore } from '../stores/workoutSessionStore'
import { useRestTimer } from '../hooks/useRestTimer'
import { ExerciseCard } from '../components/workout/ExerciseCard'
import { RestTimer } from '../components/workout/RestTimer'
import { WarmupModal } from '../components/workout/WarmupModal'
import { Modal } from '../components/ui/Modal'
import { db } from '../lib/db'
import { applyWorkoutProgression } from '../lib/progression'
import { buildHistoryMap, detectWeightPR, detectVolumePR, detectStageClearMedal, detectStreakMedal } from '../lib/medals'
import { getSmallestPlate } from '../lib/plates'
import { vibrate } from '../lib/haptics'
import { getLiftSubstitution, getExerciseName } from '../lib/exercises'
import { useMedalToastStore } from '../stores/medalToastStore'
import type { Medal, Workout as WorkoutType } from '../lib/types'
import type { HistoryRecord } from '../lib/medals'

interface MedalChecks {
  weightPR: boolean
  volumePR: boolean
  stageClear: boolean
}

export function Workout() {
  const navigate = useNavigate()
  const { state: programState, loaded: programLoaded, load: loadProgram, save: saveProgram } = useProgramStore()
  const { settings, loaded: settingsLoaded, load: loadSettings } = useSettingsStore()

  // Workout session store
  const workout = useWorkoutSessionStore((s) => s.workout)
  const currentExerciseIndex = useWorkoutSessionStore((s) => s.currentExerciseIndex)
  const startWorkout = useWorkoutSessionStore((s) => s.startWorkout)
  const completeSet = useWorkoutSessionStore((s) => s.completeSet)
  const failRemainingCurrentExerciseSets = useWorkoutSessionStore((s) => s.failRemainingCurrentExerciseSets)
  const updateCurrentExerciseWeight = useWorkoutSessionStore((s) => s.updateCurrentExerciseWeight)
  const nextExercise = useWorkoutSessionStore((s) => s.nextExercise)
  const prevExercise = useWorkoutSessionStore((s) => s.prevExercise)
  const finishWorkout = useWorkoutSessionStore((s) => s.finishWorkout)
  const addT3Exercise = useWorkoutSessionStore((s) => s.addT3Exercise)
  const isLastExercise = useWorkoutSessionStore((s) => s.isLastExercise)

  const [showFailModal, setShowFailModal] = useState(false)
  const [showWarmupModal, setShowWarmupModal] = useState(false)
  const [showAddT3Modal, setShowAddT3Modal] = useState(false)
  const [newT3Id, setNewT3Id] = useState('')
  const [newT3Weight, setNewT3Weight] = useState('')
  const [warmupChecked, setWarmupChecked] = useState(false)
  const restTimer = useRestTimer()

  // Track when we're finishing to prevent auto-starting a new workout
  const isFinishingRef = useRef(false)

  // Medal tracking refs
  const medalChecksRef = useRef<Map<number, MedalChecks>>(new Map())
  const accumulatedMedalsRef = useRef<Medal[]>([])
  const historyRef = useRef<{ workouts: WorkoutType[]; map: Map<string, HistoryRecord> } | null>(null)

  const currentExercise = workout?.exercises[currentExerciseIndex] ?? null

  // Check if workout has started (any set completed)
  const hasStarted = workout?.exercises.some((ex) => ex.sets.some((s) => s.completed)) ?? false

  const loadHistoryIfNeeded = useCallback(async () => {
    if (historyRef.current) return historyRef.current
    const workouts = await db.workouts.toArray()
    const map = buildHistoryMap(workouts)
    historyRef.current = { workouts, map }
    return historyRef.current
  }, [])

  const showMedals = useCallback((medals: Medal[]) => {
    if (medals.length === 0) return
    accumulatedMedalsRef.current.push(...medals)
    useMedalToastStore.getState().addMedals(medals)
  }, [])

  const getChecks = useCallback((index: number): MedalChecks => {
    if (!medalChecksRef.current.has(index)) {
      medalChecksRef.current.set(index, { weightPR: false, volumePR: false, stageClear: false })
    }
    return medalChecksRef.current.get(index)!
  }, [])

  const checkExerciseComplete = useCallback(async (exerciseIndex: number) => {
    const state = useWorkoutSessionStore.getState()
    const ex = state.workout?.exercises[exerciseIndex]
    if (!ex) return
    if (!ex.sets.every((s) => s.completed)) return

    const checks = getChecks(exerciseIndex)

    // For T2 (no AMRAP), check volume PR on exercise complete
    if (!checks.volumePR) {
      const history = await loadHistoryIfNeeded()
      const volumeMedals = detectVolumePR(ex, history.map)
      if (volumeMedals.length > 0) {
        showMedals(volumeMedals)
      }
      checks.volumePR = true
    }

    // Stage clear
    if (!checks.stageClear && programState) {
      const smallestPlate = getSmallestPlate(settings.plateInventory)
      const stageMedal = detectStageClearMedal(
        ex,
        programState,
        settings.weightUnit,
        settings.liftSubstitutions,
        smallestPlate
      )
      if (stageMedal) {
        showMedals([stageMedal])
      }
      checks.stageClear = true
    }
  }, [programState, settings, getChecks, loadHistoryIfNeeded, showMedals])

  // Auto-show warmup modal for T1 only (unless it uses T3 progression)
  // Don't show if resuming a workout that's already started
  useEffect(() => {
    if (workout && !warmupChecked && currentExerciseIndex === 0 && !hasStarted) {
      const t1Exercise = workout.exercises.find((e) => e.tier === 'T1')
      if (t1Exercise && currentExercise?.tier === 'T1') {
        const t1Sub = getLiftSubstitution(t1Exercise.liftId, settings.liftSubstitutions)
        const usesT3Progression = t1Sub?.forceT3Progression
        setShowWarmupModal(!usesT3Progression)
      }
      setWarmupChecked(true)
    }
  }, [workout, warmupChecked, currentExerciseIndex, currentExercise, hasStarted, settings.liftSubstitutions])

  useEffect(() => {
    if (!programLoaded) loadProgram()
    if (!settingsLoaded) loadSettings()
  }, [programLoaded, settingsLoaded, loadProgram, loadSettings])

  useEffect(() => {
    // Don't auto-start if we're in the middle of finishing
    if (isFinishingRef.current) return
    if (programLoaded && programState && settingsLoaded && !workout) {
      startWorkout(programState, settings)
    }
  }, [programLoaded, programState, workout, startWorkout, settingsLoaded, settings])

  const handleCompleteSet = async (setIndex: number, reps: number) => {
    completeSet(setIndex, reps)
    vibrate()

    // Start rest timer based on tier
    if (currentExercise) {
      const tier = currentExercise.tier
      const restDuration =
        tier === 'T1'
          ? settings.restTimers.t1Seconds
          : tier === 'T2'
            ? settings.restTimers.t2Seconds
            : settings.restTimers.t3Seconds
      restTimer.start(restDuration)
    }

    // Medal detection
    const state = useWorkoutSessionStore.getState()
    const ex = state.workout?.exercises[currentExerciseIndex]
    if (!ex || reps === 0) return

    const checks = getChecks(currentExerciseIndex)
    const history = await loadHistoryIfNeeded()

    // Weight PR: first completed set with reps > 0
    if (!checks.weightPR) {
      const weightMedal = detectWeightPR(ex, history.map)
      if (weightMedal) showMedals([weightMedal])
      checks.weightPR = true
    }

    // Volume PR: on AMRAP set completion (T1/T3 have AMRAP)
    const completedSet = ex.sets[setIndex]
    if (completedSet?.isAmrap && !checks.volumePR) {
      const volumeMedals = detectVolumePR(ex, history.map)
      if (volumeMedals.length > 0) showMedals(volumeMedals)
      checks.volumePR = true
    }

    // Check if exercise is now complete
    if (ex.sets.every((s) => s.completed)) {
      await checkExerciseComplete(currentExerciseIndex)
    }
  }

  const handleNextExercise = () => {
    if (!currentExercise) return
    const hasIncompleteSets = currentExercise.sets.some((s) => !s.completed)
    if (hasIncompleteSets) {
      setShowFailModal(true)
    } else {
      nextExercise()
    }
  }

  const handleConfirmFail = async () => {
    failRemainingCurrentExerciseSets()
    setShowFailModal(false)

    // Check exercise complete after failing remaining sets
    await checkExerciseComplete(currentExerciseIndex)

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
    (ex) => !workout?.exercises.some((e) => e.liftId === ex.id)
  ) ?? []

  const handleFinishWorkout = async () => {
    if (!workout || !programState) return

    // Prevent auto-start effect from creating a new workout
    isFinishingRef.current = true

    // Sweep any unchecked exercises
    const history = await loadHistoryIfNeeded()
    for (let i = 0; i < workout.exercises.length; i++) {
      const ex = workout.exercises[i]
      const checks = getChecks(i)

      if (!checks.weightPR) {
        const weightMedal = detectWeightPR(ex, history.map)
        if (weightMedal) showMedals([weightMedal])
        checks.weightPR = true
      }
      if (!checks.volumePR) {
        const volumeMedals = detectVolumePR(ex, history.map)
        if (volumeMedals.length > 0) showMedals(volumeMedals)
        checks.volumePR = true
      }
      if (!checks.stageClear) {
        const smallestPlate = getSmallestPlate(settings.plateInventory)
        const stageMedal = detectStageClearMedal(
          ex,
          programState,
          settings.weightUnit,
          settings.liftSubstitutions,
          smallestPlate
        )
        if (stageMedal) showMedals([stageMedal])
        checks.stageClear = true
      }
    }

    const completedWorkout = finishWorkout()
    if (!completedWorkout) return

    const newProgramState = applyWorkoutProgression(completedWorkout, programState, {
      unit: settings.weightUnit,
      plateInventory: settings.plateInventory,
      liftSubstitutions: settings.liftSubstitutions,
      getSmallestPlate,
    })

    // Streak medal
    const workoutCount = history.workouts.length + 1
    const streakMedal = detectStreakMedal(workoutCount)
    if (streakMedal) showMedals([streakMedal])

    const allMedals = accumulatedMedalsRef.current
    const workoutWithMedals = allMedals.length > 0 ? { ...completedWorkout, medals: allMedals } : completedWorkout

    await db.workouts.add(workoutWithMedals)
    await saveProgram(newProgramState)

    // Reset refs for next workout
    medalChecksRef.current.clear()
    accumulatedMedalsRef.current = []
    historyRef.current = null

    navigate('/')
  }

  if (!programLoaded || !settingsLoaded || !workout || !currentExercise) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  const allExercisesComplete = workout.exercises.every((ex) =>
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
              <h1 className="font-bold">{workout.type}</h1>
              <p className="text-xs text-zinc-400">
                Exercise {currentExerciseIndex + 1} of {workout.exercises.length}
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
          exercise={currentExercise}
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
            disabled={currentExerciseIndex === 0}
            className="flex items-center gap-1 rounded-lg px-4 py-2 text-zinc-400 hover:text-white disabled:opacity-30"
          >
            <ChevronLeft className="h-5 w-5" />
            Prev
          </button>

          <div className="flex gap-1">
            {workout.exercises.map((ex, i) => (
              <div
                key={i}
                className={`h-2 w-2 rounded-full ${
                  i === currentExerciseIndex
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
            disabled={isLastExercise()}
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

      {showFailModal && (
        <Modal onClose={() => setShowFailModal(false)}>
          <h2 className="mb-2 text-lg font-bold">Incomplete Sets</h2>
          <p className="mb-6 text-sm text-zinc-400">
            You have {currentExercise.sets.filter((s) => !s.completed).length} incomplete sets. Mark them as failed and move on?
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
          exerciseName={getExerciseName(currentExercise.liftId, currentExercise.tier, settings.liftSubstitutions, settings.exerciseLibrary)}
          workWeight={currentExercise.weight}
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
