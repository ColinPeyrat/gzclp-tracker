import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Dumbbell, Minus, Plus, Undo2 } from 'lucide-react'
import { useProgramStore } from '../stores/programStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useTestDayStore } from '../stores/testDayStore'
import { useMedalToastStore } from '../stores/medalToastStore'
import { useRestTimer } from '../hooks/useRestTimer'
import { RestTimer } from '../components/workout/RestTimer'
import { WarmupModal } from '../components/workout/WarmupModal'
import { PlateDisplay } from '../components/plates/PlateDisplay'
import { Modal } from '../components/ui/Modal'
import { db } from '../lib/db'
import { vibrate } from '../lib/haptics'
import { getExerciseName, isDumbbellExercise } from '../lib/exercises'
import {
  TEST_REPS,
  getLiftsToTest,
  getOpeningWeight,
  getTestStep,
  getTestProgress,
  recordTestResults,
  detect5RMPRs,
  shouldSplitSquatAndDeadlift,
} from '../lib/returnToProgression'
import type { ExerciseLog, LiftName, WeightUnit, Workout } from '../lib/types'

export function TestDay() {
  const navigate = useNavigate()
  const { state, loaded: programLoaded, load: loadProgram, save: saveProgram } = useProgramStore()
  const { settings, loaded: settingsLoaded, load: loadSettings } = useSettingsStore()
  const { attempts, warmups, begin, logAttempt, undoAttempt, setWarmups, reset } = useTestDayStore()
  const restTimer = useRestTimer()
  const [warmupLift, setWarmupLift] = useState<LiftName | null>(null)
  const [showFinishModal, setShowFinishModal] = useState(false)

  useEffect(() => {
    if (!programLoaded) loadProgram()
    if (!settingsLoaded) loadSettings()
  }, [programLoaded, settingsLoaded, loadProgram, loadSettings])

  useEffect(() => {
    begin()
  }, [begin])

  if (!programLoaded || !settingsLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  if (!state?.returnToProgression) return <Navigate to="/" replace />

  const unit = settings.weightUnit
  const lifts = getLiftsToTest(state, settings).map((liftId) => {
    const opening = getOpeningWeight(state, liftId, settings)
    const step = getTestStep(liftId, unit)
    const liftAttempts = attempts[liftId] ?? []
    return {
      liftId,
      name: getExerciseName(liftId, 'T1', settings.liftSubstitutions, settings.exerciseLibrary),
      isDumbbell: isDumbbellExercise(liftId, settings.liftSubstitutions, settings.exerciseLibrary),
      opening,
      step,
      attempts: liftAttempts,
      warmupsDone: warmups[liftId]?.length ?? 0,
      progress: getTestProgress(opening, step, liftAttempts),
    }
  })

  const liftName = (id: LiftName) => lifts.find((l) => l.liftId === id)?.name ?? id
  const showSplitHint = shouldSplitSquatAndDeadlift(lifts.map((l) => l.liftId))
  const unconcluded = lifts.filter((l) => l.attempts.length > 0 && !l.progress.done)
  const hasAnyAttempt = lifts.some((l) => l.attempts.length > 0)

  const handleLog = (liftId: LiftName, weight: number, reps: number) => {
    logAttempt(liftId, { weight, reps })
    vibrate()
    restTimer.start(settings.restTimers.t1Seconds)
  }

  const handleFinish = async () => {
    const results: Partial<Record<LiftName, number>> = {}
    const exercises: ExerciseLog[] = []

    for (const lift of lifts) {
      if (lift.attempts.length === 0) continue
      const fiveRepMax = lift.progress.done ? lift.progress.fiveRepMax : undefined
      if (fiveRepMax !== undefined) results[lift.liftId] = fiveRepMax
      exercises.push({
        liftId: lift.liftId,
        tier: 'T1',
        weight: fiveRepMax ?? Math.max(...lift.attempts.map((a) => a.weight)),
        targetSets: lift.attempts.length,
        targetReps: TEST_REPS,
        sets: lift.attempts.map((a, i) => ({
          setNumber: i + 1,
          reps: a.reps,
          completed: true,
          isAmrap: false,
          weight: a.weight,
        })),
        fiveRepMax,
        ...(warmups[lift.liftId]?.length ? { completedWarmupSets: warmups[lift.liftId] } : {}),
      })
    }

    const history = await db.workouts.toArray()
    const medals = detect5RMPRs(results, history)
    if (medals.length > 0) useMedalToastStore.getState().addMedals(medals)

    const workout: Workout = {
      id: crypto.randomUUID(),
      date: useTestDayStore.getState().startedAt ?? new Date().toISOString(),
      type: 'TD',
      exercises,
      completed: true,
      ...(medals.length > 0 ? { medals } : {}),
    }
    await db.workouts.add(workout)
    await saveProgram(recordTestResults(state, results))
    reset()
    navigate('/')
  }

  const warmup = lifts.find((l) => l.liftId === warmupLift)

  return (
    <div className="flex min-h-screen flex-col pb-[calc(var(--nav-height)+var(--rest-timer-height))]">
      <header className="border-b border-zinc-800 p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1 text-zinc-400 hover:text-white" aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-bold">Test Day</h1>
            <p className="text-xs text-zinc-400">
              Sets of {TEST_REPS}, one step heavier each time, until a set falls short
            </p>
          </div>
        </div>
      </header>

      <main className="flex-1 space-y-4 p-4">
        {showSplitHint && (
          <p className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-2 text-sm text-amber-300">
            {liftName('squat')} and {liftName('deadlift')} tire the same muscles. Test them on separate
            days for a fair {liftName('deadlift')} result.
          </p>
        )}
        {lifts.map((lift) => (
          <TestLiftCard
            key={lift.liftId}
            {...lift}
            unit={unit}
            barWeight={settings.barWeight}
            plateInventory={settings.plateInventory}
            onLog={(weight, reps) => handleLog(lift.liftId, weight, reps)}
            onUndo={() => undoAttempt(lift.liftId)}
            onWarmup={() => setWarmupLift(lift.liftId)}
          />
        ))}
        <p className="text-xs text-zinc-500">
          You don't have to test every lift today — untested lifts carry over to your next Test Day.
        </p>
      </main>

      <div className="fixed bottom-0 left-0 right-0 flex h-(--nav-height) items-center border-t border-zinc-800 bg-zinc-900 px-4">
        <button
          onClick={() => (unconcluded.length > 0 ? setShowFinishModal(true) : handleFinish())}
          disabled={!hasAnyAttempt}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-3 font-medium hover:bg-green-500 disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
          Finish Test Day
        </button>
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

      {warmup && (
        <WarmupModal
          exerciseName={warmup.name}
          workWeight={warmup.opening}
          barWeight={settings.barWeight}
          plateInventory={settings.plateInventory}
          unit={unit}
          completedWarmupSets={warmups[warmup.liftId]}
          doneLabel="Start test"
          onComplete={(sets) => {
            setWarmups(warmup.liftId, sets ?? [])
            setWarmupLift(null)
          }}
        />
      )}

      {showFinishModal && (
        <Modal onClose={() => setShowFinishModal(false)}>
          <h2 className="mb-2 text-lg font-bold">Unfinished tests</h2>
          <p className="mb-6 text-sm text-zinc-400">
            {unconcluded.map((l) => l.name).join(', ')} {unconcluded.length === 1 ? 'has' : 'have'} no
            set that fell short yet, so no 5RM. Sets are kept in History, but {unconcluded.length === 1 ? 'it stays' : 'they stay'} untested.
          </p>
          <div className="flex gap-3">
            <button onClick={handleFinish} className="flex-1 rounded-lg bg-green-600 py-2 font-medium hover:bg-green-500">
              Finish anyway
            </button>
            <button
              onClick={() => setShowFinishModal(false)}
              className="flex-1 rounded-lg bg-zinc-700 py-2 font-medium hover:bg-zinc-600"
            >
              Keep testing
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}

interface TestLiftCardProps {
  liftId: LiftName
  name: string
  isDumbbell: boolean
  opening: number
  step: number
  attempts: { weight: number; reps: number }[]
  warmupsDone: number
  progress: ReturnType<typeof getTestProgress>
  unit: WeightUnit
  barWeight: number
  plateInventory: Record<string, number>
  onLog: (weight: number, reps: number) => void
  onUndo: () => void
  onWarmup: () => void
}

function TestLiftCard({
  liftId,
  name,
  isDumbbell,
  opening,
  step,
  attempts,
  warmupsDone,
  progress,
  unit,
  barWeight,
  plateInventory,
  onLog,
  onUndo,
  onWarmup,
}: TestLiftCardProps) {
  const [reps, setReps] = useState(TEST_REPS)

  return (
    <section className="rounded-lg bg-zinc-800 p-4" data-testid={`test-lift-${liftId}`}>
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h2 className="font-bold">{name}</h2>
          <p className="text-xs text-zinc-500">
            Opens at {opening} {unit} · +{step} {unit} per set
          </p>
        </div>
        <button
          onClick={onWarmup}
          className="flex items-center gap-1.5 rounded-lg bg-zinc-700 px-3 py-1.5 text-xs font-medium hover:bg-zinc-600"
        >
          <Dumbbell className="h-3.5 w-3.5" />
          Warmup{warmupsDone > 0 && <Check className="h-3.5 w-3.5 text-green-400" />}
        </button>
      </div>

      {attempts.length > 0 && (
        <ol className="mb-3 space-y-1">
          {attempts.map((a, i) => (
            <li
              key={i}
              className={`flex justify-between rounded px-3 py-1.5 text-sm ${
                a.reps >= TEST_REPS ? 'bg-zinc-700' : 'bg-amber-900/20 text-amber-400'
              }`}
            >
              <span>Set {i + 1} · {a.weight} {unit}</span>
              <span>{a.reps} reps</span>
            </li>
          ))}
        </ol>
      )}

      {progress.done ? (
        <div className="flex items-center justify-between rounded bg-green-900/30 px-3 py-2 text-green-400">
          <span className="font-medium">5RM: {progress.fiveRepMax} {unit}</span>
          <button onClick={onUndo} className="flex items-center gap-1 text-xs text-zinc-400 hover:text-white">
            <Undo2 className="h-3.5 w-3.5" /> Undo
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="text-center">
            <div className="text-xs text-zinc-500">Set {attempts.length + 1}</div>
            <div className="text-3xl font-bold">
              {progress.nextWeight} <span className="text-lg text-zinc-400">{unit}</span>
            </div>
          </div>
          <PlateDisplay
            targetWeight={progress.nextWeight}
            barWeight={barWeight}
            plateInventory={plateInventory}
            unit={unit}
            isDumbbell={isDumbbell}
          />
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setReps((r) => Math.max(0, r - 1))}
              className="rounded-lg bg-zinc-700 p-3 hover:bg-zinc-600"
              aria-label="Fewer reps"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="w-16 text-center text-xl font-bold tabular-nums">{reps} reps</span>
            <button
              onClick={() => setReps((r) => r + 1)}
              className="rounded-lg bg-zinc-700 p-3 hover:bg-zinc-600"
              aria-label="More reps"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                onLog(progress.nextWeight, reps)
                setReps(TEST_REPS)
              }}
              className="flex-1 rounded-lg bg-blue-600 py-3 font-medium hover:bg-blue-500"
            >
              Log set
            </button>
            {attempts.length > 0 && (
              <button onClick={onUndo} className="rounded-lg bg-zinc-700 px-4 hover:bg-zinc-600" aria-label="Undo last set">
                <Undo2 className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
