import { useState, useEffect } from 'react'
import { Download, Upload, Trash2, Plus, Minus, X, TriangleAlert, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { PageSkeleton } from '@/components/layout/PageSkeleton'
import { cn } from '@/lib/utils'
import { useSettingsStore } from '../stores/settingsStore'
import { useProgramStore } from '../stores/programStore'
import { db, DEFAULT_EXERCISE_LIBRARY } from '../lib/db'
import { UNIT_CONFIG, getDefaultPlateInventory } from '../lib/units'
import { BottomNav } from '../components/ui/BottomNav'
import { LIFTS, T3_EXERCISES, WORKOUTS, WORKOUT_ORDER, MAINTENANCE_LIFTS, MAINTENANCE_SETS, MAINTENANCE_REPS, type ExerciseDefinition, type LiftSubstitution, type RotatingWorkoutType, type LiftName } from '../lib/types'
import { getMaintenanceWeight, getMaintenancePrescription } from '../lib/progression'
import { getExerciseDisplayName } from '../lib/exercises'
import { useNavigate } from 'react-router-dom'
import { startReturnToProgression, getLiftsToTest, getStageLadderLifts } from '../lib/returnToProgression'

const REPLACEABLE_LIFTS = [
  { id: 'squat', name: 'Squat', tier: 'T1/T2' },
  { id: 'bench', name: 'Bench Press', tier: 'T1/T2' },
  { id: 'deadlift', name: 'Deadlift', tier: 'T1/T2' },
  { id: 'ohp', name: 'Overhead Press', tier: 'T1/T2' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', tier: 'T3' },
  { id: 'dumbbell-row', name: 'Dumbbell Row', tier: 'T3' },
] as const

const ROW = 'flex items-center gap-3 px-4 py-3'
const LIST_BUTTON = 'h-auto min-h-11 w-full justify-start gap-2 px-3 py-2.5 text-left font-normal'

function SettingsSection({
  title,
  description,
  children,
}: {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <h2 className="px-1 text-sm text-muted-foreground">{title}</h2>
      {children}
      {description && <p className="px-1 text-xs text-muted-foreground">{description}</p>}
    </section>
  )
}

function SettingsList({ children }: { children: React.ReactNode }) {
  return (
    <Card className="gap-0 py-0">
      <ul className="divide-y divide-border">{children}</ul>
    </Card>
  )
}

function NumberField({ suffix, className, ...props }: React.ComponentProps<typeof Input> & { suffix: string }) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <Input type="number" className={cn('h-9 w-20 text-right font-semibold tabular-nums', className)} {...props} />
      <span className="w-7 text-xs text-muted-foreground">{suffix}</span>
    </div>
  )
}

function DumbbellBadge() {
  return (
    <Badge variant="secondary" className="rounded-md text-muted-foreground">
      Dumbbell
    </Badge>
  )
}

export function Settings() {
  const { settings, loaded, load, update } = useSettingsStore()
  const { state: programState, load: loadProgram, save: saveProgram } = useProgramStore()
  const navigate = useNavigate()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  // Exercise Library state
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseIsDumbbell, setNewExerciseIsDumbbell] = useState(false)
  const [newExerciseStartingWeight, setNewExerciseStartingWeight] = useState('')

  // Lift Substitution state
  const [showAddSubstitutionModal, setShowAddSubstitutionModal] = useState(false)
  const [substitutionStep, setSubstitutionStep] = useState<'select-original' | 'select-substitute'>('select-original')
  const [selectedOriginalLift, setSelectedOriginalLift] = useState('')
  const [selectedSubstituteId, setSelectedSubstituteId] = useState('')
  const [substituteForceT3, setSubstituteForceT3] = useState(false)
  const [substituteStartingWeight, setSubstituteStartingWeight] = useState('')

  // Additional T3s state
  const [showAssignT3Modal, setShowAssignT3Modal] = useState(false)
  const [assignT3RotatingWorkoutType, setAssignT3RotatingWorkoutType] = useState<RotatingWorkoutType | null>(null)

  useEffect(() => {
    if (!loaded) load()
    loadProgram()
  }, [loaded, load, loadProgram])

  const handleBarWeightChange = (value: string) => {
    const num = parseFloat(value)
    if (!isNaN(num) && num > 0) {
      update({ barWeight: num })
    }
  }

  const handleDumbbellHandleWeightChange = (value: string) => {
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0) {
      update({ dumbbellHandleWeight: num })
    }
  }

  const handleMaintenanceOverrideChange = (liftId: LiftName, value: string) => {
    if (!programState) return
    const overrides = { ...settings.maintenanceOverrides }
    const parsed = parseFloat(value)

    if (!value.trim() || isNaN(parsed) || parsed <= 0) {
      delete overrides[liftId]
    } else {
      // Snapshot the computed weight so later drift can be detected
      overrides[liftId] = {
        weight: parsed,
        autoAtSet: getMaintenanceWeight(programState.t1[liftId], settings.weightUnit),
      }
    }

    update({ maintenanceOverrides: overrides })
  }

  const handleRestTimerChange = (tier: 't1Seconds' | 't2Seconds' | 't3Seconds', value: string) => {
    const num = parseInt(value, 10)
    if (!isNaN(num) && num > 0) {
      update({
        restTimers: { ...settings.restTimers, [tier]: num },
      })
    }
  }

  const handleExport = async () => {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      settings,
      programState,
      workouts: await db.workouts.toArray(),
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `gzclp-backup-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (data.settings) {
        await update(data.settings)
      }
      if (data.programState) {
        await db.programState.put({ ...data.programState, id: 'current' })
      }
      if (data.workouts) {
        await db.workouts.bulkPut(data.workouts)
      }

      window.location.reload()
    } catch {
      alert('Failed to import data. Invalid file format.')
    }
  }

  const handleReset = async () => {
    await db.workouts.clear()
    await db.programState.clear()
    await db.settings.clear()
    window.location.href = '/setup'
  }

  // Exercise Library handlers
  const handleAddExerciseToLibrary = async () => {
    if (!newExerciseName.trim()) return

    const id = newExerciseName.toLowerCase().replace(/\s+/g, '-')
    const startingWeight = newExerciseStartingWeight ? parseFloat(newExerciseStartingWeight) : undefined
    const newExercise: ExerciseDefinition = {
      id,
      name: newExerciseName.trim(),
      isDumbbell: newExerciseIsDumbbell || undefined,
    }

    const existing = settings.exerciseLibrary ?? DEFAULT_EXERCISE_LIBRARY
    if (existing.some((e) => e.id === id)) {
      alert('An exercise with this name already exists.')
      return
    }

    update({ exerciseLibrary: [...existing, newExercise] })

    // Initialize weight in program state if provided
    if (startingWeight && startingWeight > 0 && programState) {
      await saveProgram({
        ...programState,
        t3: {
          ...programState.t3,
          [id]: { weight: startingWeight },
        },
      })
    }

    setNewExerciseName('')
    setNewExerciseIsDumbbell(false)
    setNewExerciseStartingWeight('')
    setShowAddExerciseModal(false)
  }

  const handleRemoveExerciseFromLibrary = (exerciseId: string) => {
    const existing = settings.exerciseLibrary ?? DEFAULT_EXERCISE_LIBRARY
    update({ exerciseLibrary: existing.filter((e) => e.id !== exerciseId) })

    // Also remove any substitutions using this exercise
    const existingSubs = settings.liftSubstitutions ?? []
    update({ liftSubstitutions: existingSubs.filter((s) => s.substituteId !== exerciseId) })

    // Also remove from all additional T3 assignments
    const existingAssignments = settings.additionalT3s ?? []
    update({
      additionalT3s: existingAssignments.map((a) => ({
        ...a,
        exerciseIds: a.exerciseIds.filter((id) => id !== exerciseId),
      })).filter((a) => a.exerciseIds.length > 0),
    })
  }

  // Lift Substitution handlers
  const handleAddSubstitution = async () => {
    if (!selectedOriginalLift || !selectedSubstituteId) return

    const startingWeight = substituteStartingWeight ? parseFloat(substituteStartingWeight) : undefined
    const newSub: LiftSubstitution = {
      originalLiftId: selectedOriginalLift,
      substituteId: selectedSubstituteId,
      forceT3Progression: substituteForceT3 || undefined,
    }

    const existing = settings.liftSubstitutions ?? []
    // Remove any existing substitution for this original lift
    const filtered = existing.filter((s) => s.originalLiftId !== selectedOriginalLift)
    update({ liftSubstitutions: [...filtered, newSub] })

    // Update program state with starting weight if provided
    if (startingWeight && startingWeight > 0 && programState) {
      const isMainLift = selectedOriginalLift in LIFTS

      if (isMainLift) {
        const liftId = selectedOriginalLift as keyof typeof LIFTS
        await saveProgram({
          ...programState,
          t1: {
            ...programState.t1,
            [liftId]: { ...programState.t1[liftId], weight: startingWeight },
          },
          t2: {
            ...programState.t2,
            [liftId]: { ...programState.t2[liftId], weight: Math.round(startingWeight * 0.6) },
          },
        })
      } else {
        // T3 exercise
        await saveProgram({
          ...programState,
          t3: {
            ...programState.t3,
            [selectedOriginalLift]: { weight: startingWeight },
          },
        })
      }
    }

    resetSubstitutionModal()
  }

  const handleRemoveSubstitution = (originalLiftId: string) => {
    const existing = settings.liftSubstitutions ?? []
    update({ liftSubstitutions: existing.filter((s) => s.originalLiftId !== originalLiftId) })
  }

  const resetSubstitutionModal = () => {
    setSelectedOriginalLift('')
    setSelectedSubstituteId('')
    setSubstituteForceT3(false)
    setSubstituteStartingWeight('')
    setSubstitutionStep('select-original')
    setShowAddSubstitutionModal(false)
  }

  // Additional T3s handlers
  const handleAssignAdditionalT3 = (exerciseId: string) => {
    if (!assignT3RotatingWorkoutType) return

    const existingAssignments = settings.additionalT3s ?? []
    const assignment = existingAssignments.find((a) => a.workoutType === assignT3RotatingWorkoutType)

    if (assignment) {
      if (!assignment.exerciseIds.includes(exerciseId)) {
        update({
          additionalT3s: existingAssignments.map((a) =>
            a.workoutType === assignT3RotatingWorkoutType
              ? { ...a, exerciseIds: [...a.exerciseIds, exerciseId] }
              : a
          ),
        })
      }
    } else {
      update({
        additionalT3s: [...existingAssignments, { workoutType: assignT3RotatingWorkoutType, exerciseIds: [exerciseId] }],
      })
    }

    setShowAssignT3Modal(false)
    setAssignT3RotatingWorkoutType(null)
  }

  const handleUnassignAdditionalT3 = (workoutType: RotatingWorkoutType, exerciseId: string) => {
    const existingAssignments = settings.additionalT3s ?? []
    update({
      additionalT3s: existingAssignments
        .map((a) =>
          a.workoutType === workoutType
            ? { ...a, exerciseIds: a.exerciseIds.filter((id) => id !== exerciseId) }
            : a
        )
        .filter((a) => a.exerciseIds.length > 0),
    })
  }

  // Helper functions
  const getOriginalLiftName = (liftId: string) => {
    const lift = LIFTS[liftId as keyof typeof LIFTS]
    if (lift) return lift.name
    const t3 = T3_EXERCISES[liftId]
    if (t3) return t3.name
    return liftId
  }

  const getExerciseDefinition = (exerciseId: string) => {
    return settings.exerciseLibrary?.find((e) => e.id === exerciseId)
  }

  if (!loaded) {
    return <PageSkeleton />
  }

  const unit = settings.weightUnit
  const exerciseLibrary = settings.exerciseLibrary ?? DEFAULT_EXERCISE_LIBRARY
  const liftSubstitutions = settings.liftSubstitutions ?? []
  const additionalT3s = settings.additionalT3s ?? []

  // Get exercises available for substitution (not already substituted)
  const substitutedLiftIds = new Set(liftSubstitutions.map((s) => s.originalLiftId))

  // Get exercises available to assign as additional T3s for the selected workout
  const getAvailableT3sForWorkout = (workoutType: RotatingWorkoutType) => {
    const defaultT3 = WORKOUTS[workoutType].t3
    const assignment = additionalT3s.find((a) => a.workoutType === workoutType)
    const assignedIds = new Set(assignment?.exerciseIds ?? [])

    return exerciseLibrary.filter(
      (ex) => ex.id !== defaultT3 && !assignedIds.has(ex.id)
    )
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col pb-[calc(var(--nav-height)+1rem)]">
      <header className="px-5 pt-6 pb-4">
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
      </header>

      <main className="flex-1 space-y-6 px-4">
        <SettingsSection title="Equipment">
          <SettingsList>
            <li className={ROW}>
              <Label htmlFor="bar-weight" className="flex-1 text-base font-medium">
                Bar weight
              </Label>
              <NumberField
                id="bar-weight"
                suffix={unit}
                inputMode="decimal"
                value={settings.barWeight}
                onChange={(e) => handleBarWeightChange(e.target.value)}
                step={unit === 'kg' ? 2.5 : 5}
              />
            </li>
            <li className={ROW}>
              <Label htmlFor="dumbbell-handle-weight" className="flex-1 text-base font-medium">
                Dumbbell handle
              </Label>
              <NumberField
                id="dumbbell-handle-weight"
                suffix={unit}
                inputMode="decimal"
                value={settings.dumbbellHandleWeight}
                onChange={(e) => handleDumbbellHandleWeightChange(e.target.value)}
                step={unit === 'kg' ? 0.5 : 1}
              />
            </li>
          </SettingsList>
        </SettingsSection>

        <SettingsSection title="Available plates">
          <SettingsList>
            {UNIT_CONFIG[unit].plates.map((plate) => {
              const quantity = settings.plateInventory?.[plate.toString()] ?? 0
              const isEnabled = quantity > 0
              return (
                <li key={plate} className={cn(ROW, 'min-h-14')}>
                  <Switch
                    id={`plate-${plate}`}
                    checked={isEnabled}
                    onCheckedChange={(checked) => {
                      const newInventory = { ...settings.plateInventory }
                      newInventory[plate.toString()] = checked ? 2 : 0
                      update({ plateInventory: newInventory })
                    }}
                  />
                  <Label
                    htmlFor={`plate-${plate}`}
                    className={cn('flex-1 text-base tabular-nums', isEnabled ? 'font-semibold' : 'text-muted-foreground')}
                  >
                    {plate}
                    <span className="text-xs font-normal text-muted-foreground">{unit}</span>
                  </Label>
                  {isEnabled && (
                    <div className="flex items-center gap-1">
                      <Button
                        variant="secondary"
                        size="icon"
                        aria-label={`Fewer ${plate} ${unit} plates`}
                        onClick={() => {
                          if (quantity > 2) {
                            const newInventory = { ...settings.plateInventory }
                            newInventory[plate.toString()] = quantity - 2
                            update({ plateInventory: newInventory })
                          }
                        }}
                      >
                        <Minus />
                      </Button>
                      <span className="w-8 text-center text-sm font-semibold tabular-nums">{quantity}×</span>
                      <Button
                        variant="secondary"
                        size="icon"
                        aria-label={`More ${plate} ${unit} plates`}
                        onClick={() => {
                          const newInventory = { ...settings.plateInventory }
                          newInventory[plate.toString()] = quantity + 2
                          update({ plateInventory: newInventory })
                        }}
                      >
                        <Plus />
                      </Button>
                    </div>
                  )}
                </li>
              )
            })}
            <li className="px-2 py-1.5">
              <Button
                variant="ghost"
                className="w-full justify-start text-muted-foreground"
                onClick={() => update({ plateInventory: getDefaultPlateInventory(unit) })}
              >
                Reset to defaults
              </Button>
            </li>
          </SettingsList>
        </SettingsSection>

        <SettingsSection title="Exercise library">
          <SettingsList>
            {exerciseLibrary.length > 0 ? (
              exerciseLibrary.map((exercise) => (
                <li key={exercise.id} className={cn(ROW, 'py-2.5')}>
                  <span className="min-w-0 flex-1 truncate font-medium">{exercise.name}</span>
                  {exercise.isDumbbell && <DumbbellBadge />}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-muted-foreground hover:text-destructive"
                    aria-label={`Remove ${exercise.name}`}
                    onClick={() => handleRemoveExerciseFromLibrary(exercise.id)}
                  >
                    <X />
                  </Button>
                </li>
              ))
            ) : (
              <li className={cn(ROW, 'text-sm text-muted-foreground')}>No exercises in library.</li>
            )}
            <li className="px-2 py-1.5">
              <Button variant="ghost" className="w-full justify-start" onClick={() => setShowAddExerciseModal(true)}>
                <Plus />
                Add Exercise
              </Button>
            </li>
          </SettingsList>
        </SettingsSection>

        <SettingsSection title="Lift substitutions" description="Substitutes the lift everywhere it appears in the program.">
          <SettingsList>
            {liftSubstitutions.length > 0 ? (
              liftSubstitutions.map((sub) => {
                const substituteExercise = getExerciseDefinition(sub.substituteId)
                return (
                  <li key={sub.originalLiftId} className={cn(ROW, 'py-2.5')}>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="truncate font-medium">
                        {getExerciseDisplayName(sub.substituteId, settings.exerciseLibrary)}
                      </div>
                      <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                        Replaces {getOriginalLiftName(sub.originalLiftId)}
                        {sub.forceT3Progression && (
                          <Badge className="rounded-md bg-warning/10 text-warning">T3 progression</Badge>
                        )}
                        {substituteExercise?.isDumbbell && <DumbbellBadge />}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove substitution for ${getOriginalLiftName(sub.originalLiftId)}`}
                      onClick={() => handleRemoveSubstitution(sub.originalLiftId)}
                    >
                      <X />
                    </Button>
                  </li>
                )
              })
            ) : (
              <li className={cn(ROW, 'text-sm text-muted-foreground')}>
                No substitutions. Add one to replace a default exercise with one from your library.
              </li>
            )}
            <li className="px-2 py-1.5">
              <Button variant="ghost" className="w-full justify-start" onClick={() => setShowAddSubstitutionModal(true)}>
                <Plus />
                Add Substitution
              </Button>
            </li>
          </SettingsList>
        </SettingsSection>

        <SettingsSection title="Additional T3s" description="Default T3s always appear. To replace them, use Lift Substitutions.">
          <SettingsList>
            {WORKOUT_ORDER.map((workoutType) => {
              const defaultT3Id = WORKOUTS[workoutType].t3
              const defaultT3Name = T3_EXERCISES[defaultT3Id]?.name ?? defaultT3Id
              const assignment = additionalT3s.find((a) => a.workoutType === workoutType)
              const additionalIds = assignment?.exerciseIds ?? []

              return (
                <li key={workoutType} className="space-y-2 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{workoutType}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => {
                        setAssignT3RotatingWorkoutType(workoutType)
                        setShowAssignT3Modal(true)
                      }}
                    >
                      <Plus /> Add
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="outline" className="h-6 rounded-md text-muted-foreground">
                      {defaultT3Name}
                      <span className="opacity-60">(default)</span>
                    </Badge>
                    {additionalIds.map((exerciseId) => (
                      <Badge key={exerciseId} variant="secondary" className="h-6 rounded-md pr-0.5">
                        {getExerciseDisplayName(exerciseId, settings.exerciseLibrary)}
                        <button
                          onClick={() => handleUnassignAdditionalT3(workoutType, exerciseId)}
                          className="grid size-5 place-items-center rounded-sm text-muted-foreground hover:text-foreground"
                          aria-label={`Remove ${getExerciseDisplayName(exerciseId, settings.exerciseLibrary)} from ${workoutType}`}
                        >
                          <X />
                        </button>
                      </Badge>
                    ))}
                  </div>
                </li>
              )
            })}
          </SettingsList>
        </SettingsSection>

        <SettingsSection
          title="Maintenance Day"
          description={
            <>
              {MAINTENANCE_SETS}×{MAINTENANCE_REPS} per lift. Weight is computed from your last validated T1 weight —
              leave blank to use it, or enter your own.
            </>
          }
        >
          {programState && (
            <SettingsList>
              {MAINTENANCE_LIFTS.map((liftId) => {
                const prescription = getMaintenancePrescription(
                  programState.t1[liftId],
                  settings.weightUnit,
                  settings.maintenanceOverrides?.[liftId]
                )
                return (
                  <li key={liftId} className="space-y-1 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <Label htmlFor={`maintenance-${liftId}`} className="text-base font-medium">
                          {LIFTS[liftId].name}
                        </Label>
                        <div className="text-xs text-muted-foreground tabular-nums">
                          auto {prescription.autoWeight} {settings.weightUnit}
                        </div>
                      </div>
                      <NumberField
                        id={`maintenance-${liftId}`}
                        suffix={settings.weightUnit}
                        inputMode="decimal"
                        value={settings.maintenanceOverrides?.[liftId]?.weight ?? ''}
                        onChange={(e) => handleMaintenanceOverrideChange(liftId, e.target.value)}
                        placeholder={String(prescription.autoWeight)}
                        className="placeholder:font-normal"
                        step={settings.weightUnit === 'kg' ? 2.5 : 5}
                        min={0}
                      />
                    </div>
                    {prescription.hasDrifted && (
                      <Button
                        variant="ghost"
                        size="xs"
                        className="-ml-2 text-warning hover:text-warning"
                        onClick={() => handleMaintenanceOverrideChange(liftId, '')}
                      >
                        <TriangleAlert />
                        auto moved since you set this — use {prescription.autoWeight}
                      </Button>
                    )}
                  </li>
                )
              })}
            </SettingsList>
          )}
        </SettingsSection>

        <SettingsSection title="Return to Progression">
          <Card className="gap-3 px-4">
            <p className="text-sm text-muted-foreground">
              Back from a break? Test a fresh 5RM on each lift, then restart every lift at stage 1. Your current
              weights stay untouched until you confirm the restart.
            </p>
            {programState?.returnToProgression ? (
              <p className="text-sm text-primary">
                In progress — {getStageLadderLifts(settings).length - getLiftsToTest(programState, settings).length} of{' '}
                {getStageLadderLifts(settings).length} lifts tested. Continue from Home.
              </p>
            ) : (
              <Button
                variant="secondary"
                size="lg"
                className="w-full"
                onClick={async () => {
                  if (!programState) return
                  await saveProgram(startReturnToProgression(programState))
                  navigate('/')
                }}
                disabled={!programState}
              >
                Start Return to Progression
              </Button>
            )}
          </Card>
        </SettingsSection>

        <SettingsSection title="Rest timers">
          <SettingsList>
            {[
              { key: 't1Seconds' as const, label: 'T1', hint: 'Heavy' },
              { key: 't2Seconds' as const, label: 'T2', hint: 'Volume' },
              { key: 't3Seconds' as const, label: 'T3', hint: 'Accessory' },
            ].map(({ key, label, hint }) => (
              <li key={key} className={ROW}>
                <Label htmlFor={`rest-${key}`} className="flex-1 text-base font-medium">
                  {label}
                  <span className="text-sm font-normal text-muted-foreground">{hint}</span>
                </Label>
                <NumberField
                  id={`rest-${key}`}
                  suffix="sec"
                  inputMode="numeric"
                  value={settings.restTimers[key]}
                  onChange={(e) => handleRestTimerChange(key, e.target.value)}
                  step={30}
                  min={30}
                />
              </li>
            ))}
          </SettingsList>
        </SettingsSection>

        <SettingsSection title="Data">
          <SettingsList>
            <li>
              <button
                onClick={handleExport}
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent"
              >
                <Download className="size-5 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">Export Data</div>
                  <div className="text-sm text-muted-foreground">Download all workouts and settings</div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
              </button>
            </li>
            <li>
              <label className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-accent">
                <Upload className="size-5 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">Import Data</div>
                  <div className="text-sm text-muted-foreground">Restore from a backup file</div>
                </div>
                <ChevronRight className="size-5 text-muted-foreground" />
                <input type="file" accept=".json" onChange={handleImport} className="hidden" />
              </label>
            </li>
          </SettingsList>
        </SettingsSection>

        <SettingsSection title="Danger zone">
          <SettingsList>
            <li>
              <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
                <AlertDialogTrigger asChild>
                  <button className="flex w-full items-center gap-3 px-4 py-3 text-left text-destructive transition-colors hover:bg-destructive/10">
                    <Trash2 className="size-5 shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium">Reset Program</div>
                      <div className="text-sm text-destructive/70">Delete all data and start over</div>
                    </div>
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset program?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will delete all workouts, settings, and progress. This cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction variant="destructive" onClick={handleReset}>
                      Yes, Reset Everything
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </li>
          </SettingsList>
        </SettingsSection>
      </main>

      <BottomNav active="settings" />

      <Dialog open={showAddExerciseModal} onOpenChange={setShowAddExerciseModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add exercise to library</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="new-exercise-name">Exercise name</Label>
              <Input
                id="new-exercise-name"
                type="text"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                placeholder="e.g., Face Pulls"
                className="h-11"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-exercise-weight">
                Starting weight <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <div className="flex items-center gap-2">
                <Input
                  id="new-exercise-weight"
                  type="number"
                  inputMode="decimal"
                  value={newExerciseStartingWeight}
                  onChange={(e) => setNewExerciseStartingWeight(e.target.value)}
                  placeholder="50"
                  className="h-11 tabular-nums"
                  step={unit === 'kg' ? 2.5 : 5}
                  min={0}
                />
                <span className="w-7 text-xs text-muted-foreground">{unit}</span>
              </div>
            </div>

            <div className="flex items-start justify-between gap-4">
              <Label htmlFor="isDumbbell" className="flex-col items-start gap-1">
                <span className="font-medium">Dumbbell exercise</span>
                <span className="font-normal text-muted-foreground">
                  Show plate suggestions for building the dumbbell weight.
                </span>
              </Label>
              <Switch id="isDumbbell" checked={newExerciseIsDumbbell} onCheckedChange={setNewExerciseIsDumbbell} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" size="lg" onClick={() => setShowAddExerciseModal(false)}>
              Cancel
            </Button>
            <Button size="lg" onClick={handleAddExerciseToLibrary} disabled={!newExerciseName.trim()}>
              Add Exercise
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddSubstitutionModal} onOpenChange={(open) => !open && resetSubstitutionModal()}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add lift substitution</DialogTitle>
            {substitutionStep === 'select-original' && (
              <DialogDescription>Select the lift to replace.</DialogDescription>
            )}
          </DialogHeader>

          {substitutionStep === 'select-original' ? (
            <div className="space-y-1.5">
              {REPLACEABLE_LIFTS.filter((lift) => !substitutedLiftIds.has(lift.id)).map((lift) => (
                <Button
                  key={lift.id}
                  variant="secondary"
                  className={LIST_BUTTON}
                  onClick={() => {
                    setSelectedOriginalLift(lift.id)
                    setSubstitutionStep('select-substitute')
                  }}
                >
                  <span className="flex-1 font-medium">{lift.name}</span>
                  <span className="font-mono text-xs text-muted-foreground">{lift.tier}</span>
                </Button>
              ))}
              {REPLACEABLE_LIFTS.filter((lift) => !substitutedLiftIds.has(lift.id)).length === 0 && (
                <p className="text-sm text-muted-foreground">All lifts have been substituted.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <dl className="divide-y divide-border rounded-lg bg-secondary text-sm">
                <div className="flex justify-between gap-3 px-3 py-2.5">
                  <dt className="text-muted-foreground">Replacing</dt>
                  <dd className="font-medium">{REPLACEABLE_LIFTS.find((l) => l.id === selectedOriginalLift)?.name}</dd>
                </div>
                {selectedSubstituteId && (
                  <div className="flex justify-between gap-3 px-3 py-2.5">
                    <dt className="text-muted-foreground">Substitute</dt>
                    <dd className="font-medium">
                      {getExerciseDisplayName(selectedSubstituteId, settings.exerciseLibrary)}
                    </dd>
                  </div>
                )}
              </dl>

              {!selectedSubstituteId ? (
                <div className="space-y-1.5">
                  <p className="text-sm text-muted-foreground">Select substitute from library:</p>
                  {exerciseLibrary.map((exercise) => (
                    <Button
                      key={exercise.id}
                      variant="secondary"
                      className={LIST_BUTTON}
                      onClick={() => setSelectedSubstituteId(exercise.id)}
                    >
                      <span className="flex-1 font-medium">{exercise.name}</span>
                      {exercise.isDumbbell && <DumbbellBadge />}
                    </Button>
                  ))}
                  {exerciseLibrary.length === 0 && (
                    <p className="text-sm text-muted-foreground">No exercises in library. Add exercises first.</p>
                  )}
                  <Button
                    variant="ghost"
                    size="lg"
                    className="w-full"
                    onClick={() => {
                      setSelectedOriginalLift('')
                      setSubstitutionStep('select-original')
                    }}
                  >
                    Back
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="substitute-weight">
                      Starting weight <span className="font-normal text-muted-foreground">(optional)</span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="substitute-weight"
                        type="number"
                        inputMode="decimal"
                        value={substituteStartingWeight}
                        onChange={(e) => setSubstituteStartingWeight(e.target.value)}
                        placeholder="Leave empty to use current"
                        className="h-11 tabular-nums"
                        step={unit === 'kg' ? 2.5 : 5}
                        min={0}
                      />
                      <span className="w-7 text-xs text-muted-foreground">{unit}</span>
                    </div>
                  </div>

                  {selectedOriginalLift in LIFTS && (
                    <div className="flex items-start justify-between gap-4">
                      <Label htmlFor="forceT3" className="flex-col items-start gap-1">
                        <span className="font-medium">Force T3 progression</span>
                        <span className="font-normal text-muted-foreground">
                          Use 3×15+ with AMRAP progression instead of normal tier stages.
                        </span>
                      </Label>
                      <Switch id="forceT3" checked={substituteForceT3} onCheckedChange={setSubstituteForceT3} />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button variant="secondary" size="lg" onClick={() => setSelectedSubstituteId('')}>
                      Back
                    </Button>
                    <Button size="lg" onClick={handleAddSubstitution}>
                      Add Substitution
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={showAssignT3Modal && !!assignT3RotatingWorkoutType}
        onOpenChange={(open) => {
          if (!open) {
            setShowAssignT3Modal(false)
            setAssignT3RotatingWorkoutType(null)
          }
        }}
      >
        {assignT3RotatingWorkoutType && (
          <DialogContent className="max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add T3 to {assignT3RotatingWorkoutType}</DialogTitle>
            </DialogHeader>

            <div className="space-y-1.5">
              {getAvailableT3sForWorkout(assignT3RotatingWorkoutType).map((exercise) => (
                <Button
                  key={exercise.id}
                  variant="secondary"
                  className={LIST_BUTTON}
                  onClick={() => handleAssignAdditionalT3(exercise.id)}
                >
                  <span className="flex-1 font-medium">{exercise.name}</span>
                  {exercise.isDumbbell && <DumbbellBadge />}
                </Button>
              ))}
              {getAvailableT3sForWorkout(assignT3RotatingWorkoutType).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  All exercises from your library are already assigned to this workout.
                </p>
              )}
            </div>

            <Button
              variant="ghost"
              size="lg"
              className="w-full"
              onClick={() => {
                setShowAssignT3Modal(false)
                setAssignT3RotatingWorkoutType(null)
              }}
            >
              Cancel
            </Button>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
