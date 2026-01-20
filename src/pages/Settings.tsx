import { useState, useEffect } from 'react'
import { Download, Upload, Trash2, Plus, X } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { useProgramStore } from '../stores/programStore'
import { db } from '../lib/db'
import { UNIT_CONFIG, getDefaultPlateInventory } from '../lib/units'
import { BottomNav } from '../components/ui/BottomNav'
import { Modal } from '../components/ui/Modal'
import { LIFTS, T3_EXERCISES, type CustomExercise } from '../lib/types'

const REPLACEABLE_EXERCISES = [
  { id: 'squat', name: 'Squat', tier: 'T1/T2' },
  { id: 'bench', name: 'Bench Press', tier: 'T1/T2' },
  { id: 'deadlift', name: 'Deadlift', tier: 'T1/T2' },
  { id: 'ohp', name: 'Overhead Press', tier: 'T1/T2' },
  { id: 'lat-pulldown', name: 'Lat Pulldown', tier: 'T3' },
  { id: 'dumbbell-row', name: 'Dumbbell Row', tier: 'T3' },
] as const

export function Settings() {
  const { settings, loaded, load, update } = useSettingsStore()
  const { state: programState, load: loadProgram } = useProgramStore()
  const [showResetConfirm, setShowResetConfirm] = useState(false)
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false)
  const [newExerciseName, setNewExerciseName] = useState('')
  const [newExerciseReplaces, setNewExerciseReplaces] = useState('')
  const [newExerciseForceT3, setNewExerciseForceT3] = useState(false)
  const [newExerciseIsDumbbell, setNewExerciseIsDumbbell] = useState(false)

  useEffect(() => {
    if (!loaded) load()
    loadProgram()
  }, [loaded, load, loadProgram])

  const handleBarWeightChange = (value: string) => {
    const num = parseFloat(value)
    if (!isNaN(num) && num > 0) {
      update({ barWeightLbs: num })
    }
  }

  const handleDumbbellHandleWeightChange = (value: string) => {
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0) {
      update({ dumbbellHandleWeightLbs: num })
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
    } catch (err) {
      alert('Failed to import data. Invalid file format.')
    }
  }

  const handleReset = async () => {
    await db.workouts.clear()
    await db.programState.clear()
    await db.settings.clear()
    window.location.href = '/setup'
  }

  const handleAddCustomExercise = () => {
    if (!newExerciseName.trim() || !newExerciseReplaces) return

    const id = newExerciseName.toLowerCase().replace(/\s+/g, '-')
    const newExercise: CustomExercise = {
      id,
      name: newExerciseName.trim(),
      replacesId: newExerciseReplaces,
      forceT3Progression: newExerciseForceT3 || undefined,
      isDumbbell: newExerciseIsDumbbell || undefined,
    }

    const existing = settings.customExercises ?? []
    const filtered = existing.filter((e) => e.replacesId !== newExerciseReplaces)
    update({ customExercises: [...filtered, newExercise] })

    setNewExerciseName('')
    setNewExerciseReplaces('')
    setNewExerciseForceT3(false)
    setNewExerciseIsDumbbell(false)
    setShowAddExerciseModal(false)
  }

  const handleRemoveCustomExercise = (replacesId: string) => {
    const existing = settings.customExercises ?? []
    update({ customExercises: existing.filter((e) => e.replacesId !== replacesId) })
  }

  const getReplacedExerciseName = (replacesId: string) => {
    const lift = LIFTS[replacesId as keyof typeof LIFTS]
    if (lift) return lift.name
    const t3 = T3_EXERCISES[replacesId]
    if (t3) return t3.name
    return replacesId
  }

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  const unit = settings.weightUnit

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
                  value={settings.barWeightLbs}
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
                  value={settings.dumbbellHandleWeightLbs}
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

        {/* Rest Timers */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Rest Timers</h2>
          <div className="space-y-3 rounded-lg bg-zinc-800 p-4">
            {[
              { key: 't1Seconds' as const, label: 'T1 (Heavy)', default: 180 },
              { key: 't2Seconds' as const, label: 'T2 (Volume)', default: 120 },
              { key: 't3Seconds' as const, label: 'T3 (Accessory)', default: 90 },
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

        {/* Custom Exercises */}
        <section>
          <h2 className="mb-3 text-sm font-medium text-zinc-400">Custom Exercises</h2>
          <div className="space-y-3 rounded-lg bg-zinc-800 p-4">
            {settings.customExercises && settings.customExercises.length > 0 ? (
              <div className="space-y-2">
                {settings.customExercises.map((exercise) => (
                  <div
                    key={exercise.replacesId}
                    className="flex items-center justify-between rounded-lg bg-zinc-700 px-4 py-3"
                  >
                    <div>
                      <div className="font-medium">{exercise.name}</div>
                      <div className="text-sm text-zinc-400">
                        Replaces {getReplacedExerciseName(exercise.replacesId)}
                        {exercise.forceT3Progression && (
                          <span className="ml-2 rounded bg-yellow-900/50 px-1.5 py-0.5 text-xs text-yellow-400">
                            T3 progression
                          </span>
                        )}
                        {exercise.isDumbbell && (
                          <span className="ml-2 rounded bg-blue-900/50 px-1.5 py-0.5 text-xs text-blue-400">
                            Dumbbell
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveCustomExercise(exercise.replacesId)}
                      className="p-1 text-zinc-400 hover:text-red-400"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">
                No custom exercises yet. Add one to replace a default exercise.
              </p>
            )}

            <button
              onClick={() => setShowAddExerciseModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-700 px-4 py-3 text-zinc-300 hover:bg-zinc-600"
            >
              <Plus className="h-5 w-5" />
              Add Custom Exercise
            </button>
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

      {showAddExerciseModal && (
        <Modal onClose={() => setShowAddExerciseModal(false)}>
          <h2 className="mb-4 text-lg font-bold">Add Custom Exercise</h2>

          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-zinc-400">Exercise Name</label>
              <input
                type="text"
                value={newExerciseName}
                onChange={(e) => setNewExerciseName(e.target.value)}
                placeholder="e.g., Pullups"
                className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm text-zinc-400">Replaces</label>
              <select
                value={newExerciseReplaces}
                onChange={(e) => setNewExerciseReplaces(e.target.value)}
                className="w-full rounded-lg border border-zinc-600 bg-zinc-900 px-4 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select an exercise...</option>
                {REPLACEABLE_EXERCISES.map((ex) => {
                  const isReplaced = settings.customExercises?.some(
                    (ce) => ce.replacesId === ex.id
                  )
                  return (
                    <option key={ex.id} value={ex.id} disabled={isReplaced}>
                      {ex.name} ({ex.tier}){isReplaced ? ' - already replaced' : ''}
                    </option>
                  )
                })}
              </select>
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="forceT3"
                checked={newExerciseForceT3}
                onChange={(e) => setNewExerciseForceT3(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500"
              />
              <label htmlFor="forceT3" className="text-sm">
                <span className="font-medium">Force T3 progression</span>
                <span className="block text-zinc-400">
                  Use 3×15+ with AMRAP progression instead of normal tier stages. Useful for
                  injury rehab or bodyweight exercises.
                </span>
              </label>
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
              onClick={handleAddCustomExercise}
              disabled={!newExerciseName.trim() || !newExerciseReplaces}
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
    </div>
  )
}
