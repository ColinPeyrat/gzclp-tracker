import { useEffect, useState, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ChevronLeft, ChevronRight, Check, Dumbbell, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { TierBadge } from '@/components/ui/tier-badge'
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { PageSkeleton } from '@/components/layout/PageSkeleton'
import { cn } from '@/lib/utils'
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
  const [searchParams] = useSearchParams()
  const isMaintenanceMode = searchParams.get('mode') === 'maintenance'
  const { state: programState, loaded: programLoaded, load: loadProgram, save: saveProgram } = useProgramStore()
  const { settings, loaded: settingsLoaded, load: loadSettings } = useSettingsStore()

  // Workout session store
  const workout = useWorkoutSessionStore((s) => s.workout)
  const currentExerciseIndex = useWorkoutSessionStore((s) => s.currentExerciseIndex)
  const startWorkout = useWorkoutSessionStore((s) => s.startWorkout)
  const startMaintenanceWorkout = useWorkoutSessionStore((s) => s.startMaintenanceWorkout)
  const completeSet = useWorkoutSessionStore((s) => s.completeSet)
  const failRemainingCurrentExerciseSets = useWorkoutSessionStore((s) => s.failRemainingCurrentExerciseSets)
  const updateCurrentExerciseWeight = useWorkoutSessionStore((s) => s.updateCurrentExerciseWeight)
  const nextExercise = useWorkoutSessionStore((s) => s.nextExercise)
  const prevExercise = useWorkoutSessionStore((s) => s.prevExercise)
  const finishWorkout = useWorkoutSessionStore((s) => s.finishWorkout)
  const setWarmupSets = useWorkoutSessionStore((s) => s.setWarmupSets)
  const addT3Exercise = useWorkoutSessionStore((s) => s.addT3Exercise)
  const isLastExercise = useWorkoutSessionStore((s) => s.isLastExercise)
  const abandonWorkout = useWorkoutSessionStore((s) => s.abandonWorkout)

  const [showFailModal, setShowFailModal] = useState(false)
  const [showDiscardModal, setShowDiscardModal] = useState(false)
  const [showWarmupModal, setShowWarmupModal] = useState(false)
  const [showAddT3Modal, setShowAddT3Modal] = useState(false)
  const [newT3Id, setNewT3Id] = useState('')
  const [newT3Weight, setNewT3Weight] = useState('')
  const restTimer = useRestTimer()

  // Track when we're finishing to prevent auto-starting a new workout
  const isFinishingRef = useRef(false)

  // Medal tracking refs
  const medalChecksRef = useRef<Map<number, MedalChecks>>(new Map())
  const accumulatedMedalsRef = useRef<Medal[]>([])
  const historyRef = useRef<{ workouts: WorkoutType[]; map: Map<string, HistoryRecord> } | null>(null)

  const currentExercise = workout?.exercises[currentExerciseIndex] ?? null

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

  // Auto-show warmup modal for T1/T2 when navigating to an exercise with no completed sets
  const lastAutoShownIndex = useRef<number>(-1)
  useEffect(() => {
    if (!workout || !currentExercise) return
    if (lastAutoShownIndex.current === currentExerciseIndex) return

    const hasCompletedSets = currentExercise.sets.some((s) => s.completed)
    if (hasCompletedSets) return

    if (currentExercise.tier === 'T1' || currentExercise.tier === 'T2') {
      const sub = getLiftSubstitution(currentExercise.liftId, settings.liftSubstitutions)
      if (!sub?.forceT3Progression) {
        lastAutoShownIndex.current = currentExerciseIndex
        // eslint-disable-next-line react-hooks/set-state-in-effect -- auto-open on exercise navigation, guarded by ref
        setShowWarmupModal(true)
      }
    }
  }, [workout, currentExercise, currentExerciseIndex, settings.liftSubstitutions])

  useEffect(() => {
    if (!programLoaded) loadProgram()
    if (!settingsLoaded) loadSettings()
  }, [programLoaded, settingsLoaded, loadProgram, loadSettings])

  useEffect(() => {
    // Don't auto-start if we're in the middle of finishing
    if (isFinishingRef.current) return
    if (programLoaded && programState && settingsLoaded && !workout) {
      if (isMaintenanceMode) {
        startMaintenanceWorkout(programState, settings)
      } else {
        startWorkout(programState, settings)
      }
    }
  }, [programLoaded, programState, workout, startWorkout, startMaintenanceWorkout, settingsLoaded, settings, isMaintenanceMode])

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

    // No medal detection for maintenance workouts
    const state = useWorkoutSessionStore.getState()
    if (state.workout?.type === 'MN') return

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

  const handleDiscardWorkout = () => {
    // Stop the auto-start effect from opening a fresh session
    isFinishingRef.current = true
    abandonWorkout()
    navigate('/')
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

    const isMaintenance = workout.type === 'MN'

    // Skip medal detection for maintenance workouts
    if (!isMaintenance) {
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

      // Streak medal
      const workoutCount = history.workouts.filter((w) => w.type !== 'TD').length + 1
      const streakMedal = detectStreakMedal(workoutCount)
      if (streakMedal) showMedals([streakMedal])
    }

    const completedWorkout = finishWorkout()
    if (!completedWorkout) return

    if (!isMaintenance) {
      const newProgramState = applyWorkoutProgression(completedWorkout, programState, {
        unit: settings.weightUnit,
        plateInventory: settings.plateInventory,
        liftSubstitutions: settings.liftSubstitutions,
        getSmallestPlate,
      })
      await saveProgram(newProgramState)
    }

    const allMedals = accumulatedMedalsRef.current
    const workoutWithMedals = allMedals.length > 0 ? { ...completedWorkout, medals: allMedals } : completedWorkout

    await db.workouts.add(workoutWithMedals)

    // Reset refs for next workout
    medalChecksRef.current.clear()
    accumulatedMedalsRef.current = []
    historyRef.current = null

    navigate('/')
  }

  if (!programLoaded || !settingsLoaded || !workout || !currentExercise) {
    return <PageSkeleton />
  }

  const allExercisesComplete = workout.exercises.every((ex) =>
    ex.sets.every((s) => s.completed)
  )
  const incompleteCount = currentExercise.sets.filter((s) => !s.completed).length
  const selectedT3 = availableT3s.find((t) => t.id === newT3Id)

  return (
    <div
      className={cn(
        'mx-auto flex min-h-screen max-w-md flex-col',
        restTimer.isRunning
          ? 'pb-[calc(var(--nav-height)+var(--rest-timer-height)+1rem)]'
          : 'pb-[calc(var(--nav-height)+1rem)]'
      )}
    >
      <header className="flex items-center gap-2 px-3 pt-4 pb-3">
        <Button variant="ghost" size="icon-lg" onClick={() => navigate('/')} aria-label="Back">
          <ArrowLeft className="size-5" />
        </Button>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-semibold tracking-tight">{workout.type === 'MN' ? 'Maintenance' : workout.type}</h1>
          <p className="text-sm text-muted-foreground tabular-nums">
            Exercise {currentExerciseIndex + 1} of {workout.exercises.length}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon-lg"
          className="text-muted-foreground"
          onClick={() => setShowWarmupModal(true)}
          title="View warmup sets"
          aria-label="View warmup sets"
        >
          <Dumbbell className="size-5" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-lg" className="text-muted-foreground" aria-label="More actions">
              <MoreHorizontal className="size-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-48">
            {workout.type !== 'MN' && availableT3s.length > 0 && (
              <DropdownMenuItem className="py-2.5" onSelect={() => setShowAddT3Modal(true)}>
                <Plus />
                Add T3 exercise
              </DropdownMenuItem>
            )}
            <DropdownMenuItem variant="destructive" className="py-2.5" onSelect={() => setShowDiscardModal(true)}>
              <Trash2 />
              Discard workout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {allExercisesComplete && (
          <Button size="lg" className="px-4" onClick={handleFinishWorkout}>
            <Check />
            Finish
          </Button>
        )}
      </header>

      <main className="flex-1 px-4">
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

      <div className="fixed inset-x-0 bottom-0 z-30 h-(--nav-height) border-t border-border bg-background">
        <div className="mx-auto flex h-full max-w-md items-center justify-between gap-2 px-4">
          <Button
            variant="ghost"
            size="lg"
            className="h-12 px-3 text-muted-foreground"
            onClick={prevExercise}
            disabled={currentExerciseIndex === 0}
          >
            <ChevronLeft className="size-5" />
            Prev
          </Button>

          <div className="flex items-center gap-1.5">
            {workout.exercises.map((ex, i) => (
              <div
                key={i}
                className={cn(
                  'h-1.5 rounded-full transition-all',
                  i === currentExerciseIndex
                    ? 'w-5 bg-primary'
                    : ex.sets.every((s) => s.completed)
                      ? 'w-1.5 bg-primary/40'
                      : 'w-1.5 bg-secondary'
                )}
              />
            ))}
          </div>

          <Button
            variant="secondary"
            size="lg"
            className="h-12 px-4"
            onClick={handleNextExercise}
            disabled={isLastExercise()}
          >
            Next
            <ChevronRight className="size-5" />
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

      <AlertDialog open={showDiscardModal} onOpenChange={setShowDiscardModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Discard workout?</AlertDialogTitle>
            <AlertDialogDescription>The sets you've logged in this workout will be lost.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleDiscardWorkout}>
              Discard
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showFailModal} onOpenChange={setShowFailModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Incomplete sets</AlertDialogTitle>
            <AlertDialogDescription>
              You have {incompleteCount} incomplete sets. Mark them as failed and move on?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleConfirmFail}>
              Mark failed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {showWarmupModal && (
        <WarmupModal
          exerciseName={getExerciseName(currentExercise.liftId, currentExercise.tier, settings.liftSubstitutions, settings.exerciseLibrary)}
          workWeight={currentExercise.weight}
          barWeight={settings.barWeight}
          plateInventory={settings.plateInventory}
          unit={settings.weightUnit}
          completedWarmupSets={currentExercise.completedWarmupSets}
          onComplete={(completedSets) => {
            if (completedSets) {
              setWarmupSets(currentExerciseIndex, completedSets)
            }
            setShowWarmupModal(false)
          }}
        />
      )}

      {showAddT3Modal && (
        <Modal onClose={() => setShowAddT3Modal(false)} title="Add T3 exercise">
          {!newT3Id ? (
            <div className="space-y-2">
              {availableT3s.map((t3) => {
                const savedWeight = programState?.t3[t3.id]?.weight
                return (
                  <Button
                    key={t3.id}
                    variant="secondary"
                    className="h-12 w-full justify-between px-4 text-base font-normal"
                    onClick={() => {
                      setNewT3Id(t3.id)
                      if (savedWeight) {
                        setNewT3Weight(savedWeight.toString())
                      }
                    }}
                  >
                    <span className="truncate font-medium">{t3.name}</span>
                    {savedWeight && (
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {savedWeight} {settings.weightUnit}
                      </span>
                    )}
                  </Button>
                )
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <TierBadge tier="T3" />
                <span className="font-medium">{selectedT3?.name}</span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-t3-weight">Weight</Label>
                <div className="flex items-center gap-3">
                  <Input
                    id="new-t3-weight"
                    type="number"
                    inputMode="decimal"
                    value={newT3Weight}
                    onChange={(e) => setNewT3Weight(e.target.value)}
                    placeholder="Weight"
                    className="h-11 tabular-nums"
                    step={settings.weightUnit === 'kg' ? 2.5 : 5}
                    min={0}
                    autoFocus
                  />
                  <span className="text-muted-foreground">{settings.weightUnit}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="xl"
                  onClick={() => {
                    setNewT3Id('')
                    setNewT3Weight('')
                  }}
                >
                  Back
                </Button>
                <Button size="xl" onClick={handleAddT3} disabled={!newT3Weight}>
                  Add
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
