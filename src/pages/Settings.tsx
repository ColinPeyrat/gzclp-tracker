import { useState, useEffect } from 'react'
import { Download, Upload, Trash2, Plus, X } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { useProgramStore } from '../stores/programStore'
import { db, DEFAULT_EXERCISE_LIBRARY } from '../lib/db'
import { UNIT_CONFIG, getDefaultPlateInventory } from '../lib/units'
import { BottomNav } from '../components/ui/BottomNav'
import { Modal } from '../components/ui/Modal'
import { LIFTS, T3_EXERCISES, WORKOUTS, WORKOUT_ORDER, type ExerciseDefinition, type LiftSubstitution, type WorkoutType } from '../lib/types'

const REPLACEABLE_LIFTS = [
  { id: 'squat', name: 'Squat', tier: 'T1/T2' },
  { id: 'bench', name: 'Bench Press', tier: 'T1/T2' },
  { id: 'deadlift', name: 'Deadlift', tier: 'T1/T2' },
  { id: 'ohp', name: 'Overhead Press', tier: 'T1/T2' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', tier: 'T3' },
  { id: 'dumbbell-row', name: 'Dumbbell Row', tier: 'T3' },
] as const

export function Settings() {
  const { settings, loaded, load, update } = useSettingsStore()
  const { state: programState, load: loadProgram, save: saveProgram } = useProgramStore()
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
  const [assignT3WorkoutType, setAssignT3WorkoutType] = useState<WorkoutType | null>(null)

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
    if (!assignT3WorkoutType) return

    const existingAssignments = settings.additionalT3s ?? []
    const assignment = existingAssignments.find((a) => a.workoutType === assignT3WorkoutType)

    if (assignment) {
      if (!assignment.exerciseIds.includes(exerciseId)) {
        update({
          additionalT3s: existingAssignments.map((a) =>
            a.workoutType === assignT3WorkoutType
              ? { ...a, exerciseIds: [...a.exerciseIds, exerciseId] }
              : a
          ),
        })
      }
    } else {
      update({
        additionalT3s: [...existingAssignments, { workoutType: assignT3WorkoutType, exerciseIds: [exerciseId] }],
      })
    }

    setShowAssignT3Modal(false)
    setAssignT3WorkoutType(null)
  }

  const handleUnassignAdditionalT3 = (workoutType: WorkoutType, exerciseId: string) => {
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
  const getExerciseName = (exerciseId: string) => {
    const exercise = settings.exerciseLibrary?.find((e) => e.id === exerciseId)
    if (exercise) return exercise.name
    const t3 = T3_EXERCISES[exerciseId]
    if (t3) return t3.name
    const lift = LIFTS[exerciseId as keyof typeof LIFTS]
    if (lift) return lift.name
    return exerciseId
  }

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
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  const unit = settings.weightUnit
  const exerciseLibrary = settings.exerciseLibrary ?? DEFAULT_EXERCISE_LIBRARY
  const liftSubstitutions = settings.liftSubstitutions ?? []
  const additionalT3s = settings.additionalT3s ?? []

  // Get exercises available for substitution (not already substituted)
  const substitutedLiftIds = new Set(liftSubstitutions.map((s) => s.originalLiftId))

  // Get exercises available to assign as additional T3s for the selected workout
  const getAvailableT3sForWorkout = (workoutType: WorkoutType) => {
    const defaultT3 = WORKOUTS[workoutType].t3
    const assignment = additionalT3s.find((a) => a.workoutType === workoutType)
    const assignedIds = new Set(assignment?.exerciseIds ?? [])

    return exerciseLibrary.filter(
      (ex) => ex.id !== defaultT3 && !assignedIds.has(ex.id)
    )
  }

  return (
    <div className="flex min-h-screen flex-col pb-(--nav-height)">
      <header className="border-b border-zinc-800 p-4">
        <h1 className="text-xl font-bold">Settings</h1>
      </header>

      <main className="flex-1 space-y-6 p-4">
        {/* Equipment */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Equipment</h2>
          <div className="space-y-3 rounded-lg bg-zinc-800 p-4">
            <div>
              <label className="mb-1 block text-sm">Bar Weight</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.barWeight}
                  onChange={(e) => handleBarWeightChange(e.target.value)}
                  className="w-24 rounded border border-zinc-600 bg-zinc-900 px-3 py-2 text-right focus:border-blue-500 focus:outline-none"
                  step={unit === 'kg' ? 2.5 : 5}
                />
                <span className="text-zinc-400">{unit}</span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm">Dumbbell Handle Weight</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={settings.dumbbellHandleWeight}
                  onChange={(e) => handleDumbbellHandleWeightChange(e.target.value)}
                  className="w-24 rounded border border-zinc-600 bg-zinc-900 px-3 py-2 text-right focus:border-blue-500 focus:outline-none"
                  step={unit === 'kg' ? 0.5 : 1}
                />
                <span className="text-zinc-400">{unit}</span>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm">Available Plates</label>
              <div className="space-y-2">
                {UNIT_CONFIG[unit].plates.map((plate) => {
                  const quantity = settings.plateInventory?.[plate.toString()] ?? 0
                  const isEnabled = quantity > 0
                  return (
                    <div key={plate} className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={(e) => {
                          const newInventory = { ...settings.plateInventory }
                          newInventory[plate.toString()] = e.target.checked ? 2 : 0
                          update({ plateInventory: newInventory })
                        }}
                        className="h-5 w-5 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`flex-1 ${isEnabled ? 'text-white' : 'text-zinc-500'}`}>
                        {plate} {unit}
                      </span>
                      {isEnabled && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              if (quantity > 2) {
                                const newInventory = { ...settings.plateInventory }
                                newInventory[plate.toString()] = quantity - 2
                                update({ plateInventory: newInventory })
                              }
                            }}
                            className="h-7 w-7 rounded bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                          >
                            −
                          </button>
                          <span className="w-8 text-center text-sm">{quantity}×</span>
                          <button
                            onClick={() => {
                              const newInventory = { ...settings.plateInventory }
                              newInventory[plate.toString()] = quantity + 2
                              update({ plateInventory: newInventory })
                            }}
                            className="h-7 w-7 rounded bg-zinc-700 text-zinc-400 hover:bg-zinc-600"
                          >
                            +
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <button
                onClick={() => update({ plateInventory: getDefaultPlateInventory(unit) })}
                className="mt-3 text-sm text-blue-400 hover:text-blue-300"
              >
                Reset to defaults
              </button>
            </div>
          </div>
        </section>

        {/* Exercise Library */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Exercise Library</h2>
          <div className="space-y-3 rounded-lg bg-zinc-800 p-4">
            {exerciseLibrary.length > 0 ? (
              <div className="space-y-2">
                {exerciseLibrary.map((exercise) => (
                  <div
                    key={exercise.id}
                    className="flex items-center justify-between rounded-lg bg-zinc-700 px-4 py-3"
                  >
                    <div>
                      <span className="font-medium">{exercise.name}</span>
                      {exercise.isDumbbell && (
                        <span className="ml-2 rounded bg-blue-900/50 px-1.5 py-0.5 text-xs text-blue-400">
                          Dumbbell
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveExerciseFromLibrary(exercise.id)}
                      className="p-1 text-zinc-400 hover:text-red-400"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">No exercises in library.</p>
            )}

            <button
              onClick={() => setShowAddExerciseModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-700 px-4 py-3 text-zinc-300 hover:bg-zinc-600"
            >
              <Plus className="h-5 w-5" />
              Add Exercise
            </button>
          </div>
        </section>

        {/* Lift Substitutions */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Lift Substitutions</h2>
          <div className="space-y-3 rounded-lg bg-zinc-800 p-4">
            {liftSubstitutions.length > 0 ? (
              <div className="space-y-2">
                {liftSubstitutions.map((sub) => {
                  const substituteExercise = getExerciseDefinition(sub.substituteId)
                  return (
                    <div
                      key={sub.originalLiftId}
                      className="flex items-center justify-between rounded-lg bg-zinc-700 px-4 py-3"
                    >
                      <div>
                        <div className="font-medium">{getExerciseName(sub.substituteId)}</div>
                        <div className="text-sm text-zinc-400">
                          Replaces {getOriginalLiftName(sub.originalLiftId)}
                          {sub.forceT3Progression && (
                            <span className="ml-2 rounded bg-yellow-900/50 px-1.5 py-0.5 text-xs text-yellow-400">
                              T3 progression
                            </span>
                          )}
                          {substituteExercise?.isDumbbell && (
                            <span className="ml-2 rounded bg-blue-900/50 px-1.5 py-0.5 text-xs text-blue-400">
                              Dumbbell
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemoveSubstitution(sub.originalLiftId)}
                        className="p-1 text-zinc-400 hover:text-red-400"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">
                No substitutions. Add one to replace a default exercise with one from your library.
              </p>
            )}

            <button
              onClick={() => setShowAddSubstitutionModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-700 px-4 py-3 text-zinc-300 hover:bg-zinc-600"
            >
              <Plus className="h-5 w-5" />
              Add Substitution
            </button>

            <p className="text-xs text-zinc-500">
              Substitutes the lift everywhere it appears in the program.
            </p>
          </div>
        </section>

        {/* Additional T3s */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Additional T3s</h2>
          <div className="space-y-3 rounded-lg bg-zinc-800 p-4">
            <div className="space-y-3">
              {WORKOUT_ORDER.map((workoutType) => {
                const defaultT3Id = WORKOUTS[workoutType].t3
                const defaultT3Name = T3_EXERCISES[defaultT3Id]?.name ?? defaultT3Id
                const assignment = additionalT3s.find((a) => a.workoutType === workoutType)
                const additionalIds = assignment?.exerciseIds ?? []

                return (
                  <div key={workoutType} className="rounded-lg bg-zinc-700 p-3">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-medium">{workoutType}</span>
                      <button
                        onClick={() => {
                          setAssignT3WorkoutType(workoutType)
                          setShowAssignT3Modal(true)
                        }}
                        className="rounded bg-zinc-600 px-2 py-1 text-xs text-zinc-300 hover:bg-zinc-500"
                      >
                        <Plus className="inline h-3 w-3" /> Add
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {/* Default T3 (grayed out) */}
                      <span className="rounded bg-zinc-600 px-2 py-1 text-xs text-zinc-400">
                        {defaultT3Name}
                        <span className="ml-1 text-zinc-500">(default)</span>
                      </span>
                      {/* Additional T3s */}
                      {additionalIds.map((exerciseId) => (
                        <span
                          key={exerciseId}
                          className="flex items-center gap-1 rounded bg-yellow-900/50 px-2 py-1 text-xs text-yellow-400"
                        >
                          {getExerciseName(exerciseId)}
                          <button
                            onClick={() => handleUnassignAdditionalT3(workoutType, exerciseId)}
                            className="hover:text-yellow-200"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <p className="text-xs text-zinc-500">
              Default T3s always appear. To replace them, use Lift Substitutions.
            </p>
          </div>
        </section>

        {/* Rest Timers */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Rest Timers</h2>
          <div className="space-y-3 rounded-lg bg-zinc-800 p-4">
            {[
              { key: 't1Seconds' as const, label: 'T1 (Heavy)' },
              { key: 't2Seconds' as const, label: 'T2 (Volume)' },
              { key: 't3Seconds' as const, label: 'T3 (Accessory)' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm">{label}</span>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={settings.restTimers[key]}
                    onChange={(e) => handleRestTimerChange(key, e.target.value)}
                    className="w-20 rounded border border-zinc-600 bg-zinc-900 px-3 py-2 text-right focus:border-blue-500 focus:outline-none"
                    step={30}
                    min={30}
                  />
                  <span className="text-sm text-zinc-400">sec</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Data */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Data</h2>
          <div className="space-y-3 rounded-lg bg-zinc-800 p-4">
            <button
              onClick={handleExport}
              className="flex w-full items-center gap-3 rounded-lg bg-zinc-700 px-4 py-3 text-left hover:bg-zinc-600"
            >
              <Download className="h-5 w-5 text-zinc-400" />
              <div>
                <div className="font-medium">Export Data</div>
                <div className="text-sm text-zinc-400">Download all workouts and settings</div>
              </div>
            </button>

            <label className="flex w-full cursor-pointer items-center gap-3 rounded-lg bg-zinc-700 px-4 py-3 text-left hover:bg-zinc-600">
              <Upload className="h-5 w-5 text-zinc-400" />
              <div>
                <div className="font-medium">Import Data</div>
                <div className="text-sm text-zinc-400">Restore from a backup file</div>
              </div>
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                className="hidden"
              />
            </label>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-red-400">Danger Zone</h2>
          <div className="rounded-lg bg-zinc-800 p-4">
            {!showResetConfirm ? (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex w-full items-center gap-3 rounded-lg bg-red-900/30 px-4 py-3 text-left text-red-400 hover:bg-red-900/50"
              >
                <Trash2 className="h-5 w-5" />
                <div>
                  <div className="font-medium">Reset Program</div>
                  <div className="text-sm text-red-400/70">Delete all data and start over</div>
                </div>
              </button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-red-400">
                  This will delete all workouts, settings, and progress. This cannot be undone.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    className="flex-1 rounded-lg bg-red-600 py-2 font-medium hover:bg-red-500"
                  >
                    Yes, Reset Everything
                  </button>
                  <button
                    onClick={() => setShowResetConfirm(false)}
                    className="flex-1 rounded-lg bg-zinc-700 py-2 font-medium hover:bg-zinc-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <BottomNav active="settings" />

      {/* Add Exercise Modal */}
      {showAddExerciseModal && (
        <Modal onClose={() => setShowAddExerciseModal(false)}>
          <h2 className="mb-4 text-lg font-bold">Add Exercise to Library</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Exercise Name</label>
              <input
                type="text"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                placeholder="e.g., Face Pulls"
                className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 focus:border-blue-500 focus:outline-none"
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-400">
                Starting Weight <span className="text-zinc-500">(optional)</span>
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={newExerciseStartingWeight}
                  onChange={(e) => setNewExerciseStartingWeight(e.target.value)}
                  placeholder="50"
                  className="flex-1 rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 focus:border-blue-500 focus:outline-none"
                  step={unit === 'kg' ? 2.5 : 5}
                  min={0}
                />
                <span className="text-zinc-400">{unit}</span>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="isDumbbell"
                checked={newExerciseIsDumbbell}
                onChange={(e) => setNewExerciseIsDumbbell(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="isDumbbell" className="text-sm">
                <span className="font-medium">Dumbbell exercise</span>
                <span className="block text-zinc-400">
                  Show plate suggestions for building the dumbbell weight.
                </span>
              </label>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={handleAddExerciseToLibrary}
              disabled={!newExerciseName.trim()}
              className="flex-1 rounded-lg bg-blue-600 py-2 font-medium hover:bg-blue-500 disabled:opacity-50"
            >
              Add Exercise
            </button>
            <button
              onClick={() => setShowAddExerciseModal(false)}
              className="flex-1 rounded-lg bg-zinc-700 py-2 font-medium hover:bg-zinc-600"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}

      {/* Add Substitution Modal */}
      {showAddSubstitutionModal && (
        <Modal onClose={resetSubstitutionModal}>
          <h2 className="mb-4 text-lg font-bold">Add Lift Substitution</h2>

          {substitutionStep === 'select-original' ? (
            <div className="space-y-2">
              <p className="mb-3 text-sm text-zinc-400">Select the lift to replace:</p>
              {REPLACEABLE_LIFTS.filter((lift) => !substitutedLiftIds.has(lift.id)).map((lift) => (
                <button
                  key={lift.id}
                  onClick={() => {
                    setSelectedOriginalLift(lift.id)
                    setSubstitutionStep('select-substitute')
                  }}
                  className="w-full rounded-lg bg-zinc-700 px-4 py-3 text-left hover:bg-zinc-600"
                >
                  <span className="font-medium">{lift.name}</span>
                  <span className="ml-2 text-sm text-zinc-400">{lift.tier}</span>
                </button>
              ))}
              {REPLACEABLE_LIFTS.filter((lift) => !substitutedLiftIds.has(lift.id)).length === 0 && (
                <p className="text-sm text-zinc-400">All lifts have been substituted.</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-zinc-700 px-4 py-3">
                <span className="text-sm text-zinc-400">Replacing: </span>
                <span className="font-medium">
                  {REPLACEABLE_LIFTS.find((l) => l.id === selectedOriginalLift)?.name}
                </span>
              </div>

              {!selectedSubstituteId ? (
                <div className="space-y-2">
                  <p className="text-sm text-zinc-400">Select substitute from library:</p>
                  {exerciseLibrary.map((exercise) => (
                    <button
                      key={exercise.id}
                      onClick={() => setSelectedSubstituteId(exercise.id)}
                      className="w-full rounded-lg bg-zinc-700 px-4 py-3 text-left hover:bg-zinc-600"
                    >
                      <span className="font-medium">{exercise.name}</span>
                      {exercise.isDumbbell && (
                        <span className="ml-2 rounded bg-blue-900/50 px-1.5 py-0.5 text-xs text-blue-400">
                          Dumbbell
                        </span>
                      )}
                    </button>
                  ))}
                  {exerciseLibrary.length === 0 && (
                    <p className="text-sm text-zinc-400">
                      No exercises in library. Add exercises first.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-lg bg-zinc-700 px-4 py-3">
                    <span className="text-sm text-zinc-400">Substitute: </span>
                    <span className="font-medium">{getExerciseName(selectedSubstituteId)}</span>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-zinc-400">
                      Starting Weight <span className="text-zinc-500">(optional)</span>
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={substituteStartingWeight}
                        onChange={(e) => setSubstituteStartingWeight(e.target.value)}
                        placeholder="Leave empty to use current"
                        className="flex-1 rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 focus:border-blue-500 focus:outline-none"
                        step={unit === 'kg' ? 2.5 : 5}
                        min={0}
                      />
                      <span className="text-zinc-400">{unit}</span>
                    </div>
                  </div>

                  {selectedOriginalLift in LIFTS && (
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        id="forceT3"
                        checked={substituteForceT3}
                        onChange={(e) => setSubstituteForceT3(e.target.checked)}
                        className="mt-1 h-5 w-5 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500"
                      />
                      <label htmlFor="forceT3" className="text-sm">
                        <span className="font-medium">Force T3 progression</span>
                        <span className="block text-zinc-400">
                          Use 3×15+ with AMRAP progression instead of normal tier stages.
                        </span>
                      </label>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <button
                      onClick={handleAddSubstitution}
                      className="flex-1 rounded-lg bg-blue-600 py-2 font-medium hover:bg-blue-500"
                    >
                      Add Substitution
                    </button>
                    <button
                      onClick={() => setSelectedSubstituteId('')}
                      className="flex-1 rounded-lg bg-zinc-700 py-2 font-medium hover:bg-zinc-600"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

              {!selectedSubstituteId && (
                <button
                  onClick={() => {
                    setSelectedOriginalLift('')
                    setSubstitutionStep('select-original')
                  }}
                  className="w-full rounded-lg bg-zinc-700 py-2 font-medium hover:bg-zinc-600"
                >
                  Back
                </button>
              )}
            </div>
          )}
        </Modal>
      )}

      {/* Assign Additional T3 Modal */}
      {showAssignT3Modal && assignT3WorkoutType && (
        <Modal onClose={() => { setShowAssignT3Modal(false); setAssignT3WorkoutType(null) }}>
          <h2 className="mb-4 text-lg font-bold">Add T3 to {assignT3WorkoutType}</h2>

          <div className="space-y-2">
            {getAvailableT3sForWorkout(assignT3WorkoutType).map((exercise) => (
              <button
                key={exercise.id}
                onClick={() => handleAssignAdditionalT3(exercise.id)}
                className="w-full rounded-lg bg-zinc-700 px-4 py-3 text-left hover:bg-zinc-600"
              >
                {exercise.name}
                {exercise.isDumbbell && (
                  <span className="ml-2 rounded bg-blue-900/50 px-1.5 py-0.5 text-xs text-blue-400">
                    Dumbbell
                  </span>
                )}
              </button>
            ))}
            {getAvailableT3sForWorkout(assignT3WorkoutType).length === 0 && (
              <p className="text-sm text-zinc-400">
                All exercises from your library are already assigned to this workout.
              </p>
            )}
          </div>

          <button
            onClick={() => { setShowAssignT3Modal(false); setAssignT3WorkoutType(null) }}
            className="mt-4 w-full rounded-lg bg-zinc-700 py-2 font-medium hover:bg-zinc-600"
          >
            Cancel
          </button>
        </Modal>
      )}
    </div>
  )
}
