import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ArrowLeft, Check, Dumbbell, Minus, Plus, TriangleAlert, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { PageSkeleton } from '@/components/layout/PageSkeleton'
import { cn } from '@/lib/utils'
import { useProgramStore } from '../stores/programStore'
import { useSettingsStore } from '../stores/settingsStore'
import { useTestDayStore } from '../stores/testDayStore'
import { useMedalToastStore } from '../stores/medalToastStore'
import { useRestTimer } from '../hooks/useRestTimer'
import { RestTimer } from '../components/workout/RestTimer'
import { WarmupModal } from '../components/workout/WarmupModal'
import { PlateDisplay } from '../components/plates/PlateDisplay'
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
    return <PageSkeleton />
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
  const currentLiftId = (unconcluded[0] ?? lifts.find((l) => !l.progress.done))?.liftId

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
    <div
      className={cn(
        'mx-auto flex min-h-screen max-w-md flex-col',
        restTimer.isRunning
          ? 'pb-[calc(var(--nav-height)+var(--rest-timer-height)+1rem)]'
          : 'pb-[calc(var(--nav-height)+1rem)]'
      )}
    >
      <header className="flex items-start gap-2 px-3 pt-4 pb-3">
        <Button variant="ghost" size="icon-lg" onClick={() => navigate('/')} aria-label="Back">
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1 pt-1">
          <h1 className="text-xl font-semibold tracking-tight">Test Day</h1>
          <p className="text-sm text-muted-foreground">
            Sets of {TEST_REPS}, one step heavier each time, until a set falls short
          </p>
        </div>
      </header>

      <main className="flex-1 space-y-5 px-4">
        {showSplitHint && (
          <p className="flex gap-2 rounded-lg bg-warning/10 px-3 py-2.5 text-sm text-warning">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" />
            <span>
              {liftName('squat')} and {liftName('deadlift')} tire the same muscles. Test them on separate
              days for a fair {liftName('deadlift')} result.
            </span>
          </p>
        )}
        {lifts.map((lift) => (
          <TestLiftCard
            key={lift.liftId}
            {...lift}
            isCurrent={lift.liftId === currentLiftId}
            unit={unit}
            barWeight={settings.barWeight}
            plateInventory={settings.plateInventory}
            onLog={(weight, reps) => handleLog(lift.liftId, weight, reps)}
            onUndo={() => undoAttempt(lift.liftId)}
            onWarmup={() => setWarmupLift(lift.liftId)}
          />
        ))}
        <p className="px-1 text-xs text-muted-foreground">
          You don't have to test every lift today — untested lifts carry over to your next Test Day.
        </p>
      </main>

      <div className="fixed inset-x-0 bottom-0 z-30 h-(--nav-height) border-t border-border bg-background">
        <div className="mx-auto flex h-full max-w-md items-center px-4">
          <Button
            size="xl"
            variant={hasAnyAttempt && unconcluded.length === 0 ? 'default' : 'secondary'}
            className="w-full"
            onClick={() => (unconcluded.length > 0 ? setShowFinishModal(true) : handleFinish())}
            disabled={!hasAnyAttempt}
          >
            <Check />
            Finish Test Day
          </Button>
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

      <AlertDialog open={showFinishModal} onOpenChange={setShowFinishModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unfinished tests</AlertDialogTitle>
            <AlertDialogDescription>
              {unconcluded.map((l) => l.name).join(', ')} {unconcluded.length === 1 ? 'has' : 'have'} no
              set that fell short yet, so no 5RM. Sets are kept in History, but {unconcluded.length === 1 ? 'it stays' : 'they stay'} untested.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep testing</AlertDialogCancel>
            <AlertDialogAction onClick={handleFinish}>Finish anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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
  isCurrent: boolean
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
  isCurrent,
  unit,
  barWeight,
  plateInventory,
  onLog,
  onUndo,
  onWarmup,
}: TestLiftCardProps) {
  const [reps, setReps] = useState(TEST_REPS)

  return (
    <Card data-testid={`test-lift-${liftId}`}>
      <CardContent className="space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight">{name}</h2>
            <p className="text-sm text-muted-foreground tabular-nums">
              Opens at {opening} {unit} · +{step} {unit} per set
            </p>
          </div>
          <Button variant="secondary" onClick={onWarmup} className="h-9">
            <Dumbbell />
            Warmup
            {warmupsDone > 0 && <Check className="text-primary" />}
          </Button>
        </div>

        {attempts.length > 0 && (
          <ol className="divide-y divide-border border-y border-border">
            {attempts.map((a, i) => {
              const short = a.reps < TEST_REPS
              return (
                <li key={i} className="flex items-center justify-between py-2 text-sm tabular-nums">
                  <span>
                    <span className="text-muted-foreground">Set {i + 1}</span>
                    <span className="ml-3 font-semibold">{a.weight}</span>
                    <span className="ml-1 text-xs text-muted-foreground">{unit}</span>
                  </span>
                  <span className={cn(short ? 'text-warning' : 'text-muted-foreground')}>{a.reps} reps</span>
                </li>
              )
            })}
          </ol>
        )}

        {progress.done ? (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-primary tabular-nums">
              <Check className="size-5" />
              <span className="text-2xl font-semibold">{progress.fiveRepMax}</span>
              <span className="text-sm opacity-70">{unit} 5RM</span>
            </span>
            <Button variant="ghost" onClick={onUndo} className="text-muted-foreground">
              <Undo2 /> Undo
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="text-sm text-muted-foreground">Set {attempts.length + 1}</div>
              <div className="tabular-nums">
                <span className="text-5xl font-semibold tracking-tight">{progress.nextWeight}</span>
                <span className="ml-1.5 text-base text-muted-foreground">{unit}</span>
              </div>
            </div>
            <div className="border-t border-border pt-4 empty:hidden">
              <PlateDisplay
                targetWeight={progress.nextWeight}
                barWeight={barWeight}
                plateInventory={plateInventory}
                unit={unit}
                isDumbbell={isDumbbell}
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <Button
                variant="secondary"
                size="icon-lg"
                className="size-12"
                onClick={() => setReps((r) => Math.max(0, r - 1))}
                aria-label="Fewer reps"
              >
                <Minus className="size-5" />
              </Button>
              <span className="text-center tabular-nums">
                <span className="text-3xl font-semibold">{reps}</span>
                <span className="ml-1.5 text-sm text-muted-foreground">reps</span>
              </span>
              <Button
                variant="secondary"
                size="icon-lg"
                className="size-12"
                onClick={() => setReps((r) => r + 1)}
                aria-label="More reps"
              >
                <Plus className="size-5" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Button
                size="xl"
                variant={isCurrent ? 'default' : 'secondary'}
                className="flex-1"
                onClick={() => {
                  onLog(progress.nextWeight, reps)
                  setReps(TEST_REPS)
                }}
              >
                Log set
              </Button>
              {attempts.length > 0 && (
                <Button variant="secondary" size="icon-lg" className="size-12" onClick={onUndo} aria-label="Undo last set">
                  <Undo2 className="size-5" />
                </Button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
