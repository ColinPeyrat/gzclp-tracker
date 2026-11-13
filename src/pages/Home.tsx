import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Dumbbell, Bug, Settings, Shield, X, ChevronRight, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { PageSkeleton } from '@/components/layout/PageSkeleton'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../lib/db'
import {
  startReturnToProgression,
  cancelReturnToProgression,
  getLastProgramActivityDate,
  isReturnNudgeDue,
} from '../lib/returnToProgression'
import { ReturnToProgressionCard } from '../components/home/ReturnToProgressionCard'
import { useTestDayStore } from '../stores/testDayStore'
import { useProgramStore } from '../stores/programStore'
import { useSettingsStore } from '../stores/settingsStore'
import { WORKOUTS, WORKOUT_ORDER, MAINTENANCE_LIFTS, MAINTENANCE_SETS, MAINTENANCE_REPS, getUpcomingWorkoutTypes, type RotatingWorkoutType, type ProgramState, type LiftState, type LiftName, type WeightUnit, type LiftSubstitution, type ExerciseDefinition } from '../lib/types'
import { estimate5RM, applyT1Reset, getMaintenancePrescription } from '../lib/progression'
import { getExerciseName } from '../lib/exercises'
import { BottomNav } from '../components/ui/BottomNav'
import { WorkoutPreviewCard } from '../components/home/WorkoutPreviewCard'

const LIFT_CODES: Record<LiftName, string> = { squat: 'SQ', bench: 'BP', deadlift: 'DL', ohp: 'OHP' }

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
  const [nudgeDismissed, setNudgeDismissed] = useState(false)
  const lastActivityDate = useLiveQuery(async () => getLastProgramActivityDate(await db.workouts.toArray()), [])

  useEffect(() => {
    if (!programLoaded) loadProgram()
    if (!settingsLoaded) loadSettings()
  }, [programLoaded, settingsLoaded, loadProgram, loadSettings])

  // A Test Day supersedes any stage-3 retest
  const currentPending = state?.returnToProgression ? null : getPending5RMInfo(state, settings.weightUnit, settings.liftSubstitutions, settings.exerciseLibrary)

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

  const handleStartReturn = async () => {
    if (!state) return
    await saveProgram(startReturnToProgression(state))
  }

  const handleCancelReturn = async () => {
    if (!state) return
    useTestDayStore.getState().reset()
    await saveProgram(cancelReturnToProgression(state))
  }

  const handleSetNextWorkout = async (workoutType: RotatingWorkoutType) => {
    if (!state) return
    await saveProgram({ ...state, nextWorkoutType: workoutType })
    setShowDebugModal(false)
  }

  if (!programLoaded || !settingsLoaded) {
    return <PageSkeleton />
  }

  if (!state) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center">
        <Dumbbell className="size-10 text-muted-foreground" />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">GZCLP Tracker</h1>
          <p className="text-muted-foreground">Set up your program to get started</p>
        </div>
        <Button asChild size="xl" className="w-full max-w-xs">
          <Link to="/setup">Get started</Link>
        </Button>
      </div>
    )
  }

  const upcoming = getUpcomingWorkoutTypes(state.nextWorkoutType)
  const isReturning = !!state.returnToProgression
  const showNudge = !isReturning && !nudgeDismissed && isReturnNudgeDue(lastActivityDate ?? null)
  const unit = settings.weightUnit

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col pb-[calc(var(--nav-height)+1rem)]">
      <header className="flex items-center justify-between px-5 pt-6 pb-4">
        <span className="text-lg font-semibold tracking-tight">GZCLP</span>
        <div className="flex items-center gap-1">
          {import.meta.env.DEV && (
            <Button variant="ghost" size="icon" onClick={() => setShowDebugModal(true)} className="text-warning">
              <Bug />
            </Button>
          )}
          <Button asChild variant="ghost" size="icon" className="text-muted-foreground">
            <Link to="/settings" aria-label="Settings">
              <Settings />
            </Link>
          </Button>
        </div>
      </header>

      <main className="flex-1 space-y-5 px-4">
        {showNudge && (
          <Card>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <RotateCcw className="mt-0.5 size-5 shrink-0 text-muted-foreground" />
                <p className="flex-1 text-sm">
                  <span className="font-semibold">Back from a break?</span>{' '}
                  <span className="text-muted-foreground">
                    No program workout in over 3 weeks. Test a fresh 5RM instead of resuming at old weights.
                  </span>
                </p>
                <Button variant="ghost" size="icon-xs" onClick={() => setNudgeDismissed(true)} aria-label="Dismiss">
                  <X />
                </Button>
              </div>
              <Button variant="secondary" className="w-full" size="lg" onClick={handleStartReturn}>
                Return to Progression
              </Button>
            </CardContent>
          </Card>
        )}

        {isReturning ? (
          <ReturnToProgressionCard state={state} settings={settings} onCancel={handleCancelReturn} />
        ) : (
          <Card>
            <CardContent className="space-y-5">
              <div className="flex items-end justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Next up</p>
                  <h1 className="text-4xl font-semibold tracking-tight">{state.nextWorkoutType}</h1>
                </div>
                <span className="font-mono text-sm text-muted-foreground tabular-nums">#{state.workoutCount + 1}</span>
              </div>
              <WorkoutPreviewCard workoutType={upcoming[0]} state={state} settings={settings} isNext={true} />
              <Button asChild size="xl" className="w-full">
                <Link to="/workout">
                  Start workout
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}

        <Link
          to="/workout?mode=maintenance"
          className="flex items-center gap-3 rounded-lg bg-card p-4 transition-colors hover:bg-accent"
        >
          <Shield className="size-5 shrink-0 text-muted-foreground" />
          <div className="min-w-0 flex-1">
            <div className="font-medium">Maintenance Day</div>
            <div className="truncate font-mono text-xs text-muted-foreground tabular-nums">
              {MAINTENANCE_SETS}×{MAINTENANCE_REPS} ·{' '}
              {MAINTENANCE_LIFTS.map((id) => `${LIFT_CODES[id]} ${getMaintenancePrescription(state.t1[id], unit, settings.maintenanceOverrides?.[id]).weight}`).join(' · ')}
            </div>
          </div>
          <ChevronRight className="size-5 text-muted-foreground" />
        </Link>

        {!isReturning && (
          <section className="space-y-3">
            <h2 className="px-1 text-sm text-muted-foreground">Coming up</h2>
            <div className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-3 overflow-x-auto px-4 pb-1 [scrollbar-width:none]">
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
          </section>
        )}
      </main>

      <Dialog open={!!currentPending}>
        {currentPending && (
          <DialogContent showCloseButton={false} onInteractOutside={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle>Reset {currentPending.liftName}</DialogTitle>
              <DialogDescription>
                {currentPending.bestSetReps > 0
                  ? `Enter your new 5RM or use the estimate from your best set (${currentPending.bestSetReps} reps @ ${currentPending.bestSetWeight} ${unit}).`
                  : 'Enter your tested 5RM to start a new cycle.'}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3">
              {currentPending.bestSetReps > 0 && (
                <>
                  <Button size="xl" className="w-full" onClick={() => handleApply5RM(currentPending.estimated5RM)}>
                    Use estimate: {currentPending.estimated5RM} {unit}
                  </Button>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Separator className="flex-1" />
                    or enter manually
                    <Separator className="flex-1" />
                  </div>
                </>
              )}
              <div className="flex gap-2">
                <Input
                  type="number"
                  inputMode="decimal"
                  value={manual5RM}
                  onChange={(e) => setManual5RM(e.target.value)}
                  placeholder={`5RM in ${unit}`}
                  className="h-11"
                />
                <Button
                  variant="secondary"
                  className="h-11"
                  onClick={() => {
                    const value = parseFloat(manual5RM)
                    if (!isNaN(value) && value > 0) handleApply5RM(value)
                  }}
                  disabled={!manual5RM || isNaN(parseFloat(manual5RM))}
                >
                  Use this
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Your new working weight will be 85% of the 5RM you enter.</p>
            </div>
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={showDebugModal} onOpenChange={setShowDebugModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-warning">Debug: select workout</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            {WORKOUT_ORDER.map((workoutType) => {
              const w = WORKOUTS[workoutType]
              return (
                <Button
                  key={workoutType}
                  variant={state.nextWorkoutType === workoutType ? 'default' : 'secondary'}
                  className="h-auto w-full justify-start py-3"
                  onClick={() => handleSetNextWorkout(workoutType)}
                >
                  <span className="font-semibold">{workoutType}</span>
                  <span className="truncate text-xs opacity-70">
                    T1: {getExerciseName(w.t1, 'T1', settings.liftSubstitutions, settings.exerciseLibrary)} · T2:{' '}
                    {getExerciseName(w.t2, 'T2', settings.liftSubstitutions, settings.exerciseLibrary)}
                  </span>
                </Button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>

      <BottomNav active="home" />
    </div>
  )
}
