import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Dumbbell, History, Settings as SettingsIcon, Download, Upload, Trash2 } from 'lucide-react'
import { useSettingsStore } from '../stores/settingsStore'
import { useProgramStore } from '../stores/programStore'
import { db } from '../lib/db'
import { UNIT_CONFIG } from '../lib/units'

export function Settings() {
  const { settings, loaded, load, update } = useSettingsStore()
  const { state: programState, load: loadProgram } = useProgramStore()
  const [showResetConfirm, setShowResetConfirm] = useState(false)

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

  if (!loaded) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-zinc-400">Loading...</div>
      </div>
    )
  }

  const unit = settings.weightUnit

  return (
    <div className="flex min-h-screen flex-col">
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
              <label className="mb-1 block text-sm">Available Plates</label>
              <p className="text-sm text-zinc-400">
                {settings.availablePlates.join(', ')} {unit}
              </p>
              <button
                onClick={() => {
                  const defaults = UNIT_CONFIG[unit].plates
                  update({ availablePlates: [...defaults] })
                }}
                className="mt-2 text-sm text-blue-400 hover:text-blue-300"
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

      <nav className="border-t border-zinc-800 p-4">
        <div className="flex justify-around">
          <Link
            to="/"
            className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white"
          >
            <Dumbbell className="h-6 w-6" />
            <span className="text-xs">Home</span>
          </Link>
          <Link
            to="/history"
            className="flex flex-col items-center gap-1 text-zinc-400 hover:text-white"
          >
            <History className="h-6 w-6" />
            <span className="text-xs">History</span>
          </Link>
          <Link
            to="/settings"
            className="flex flex-col items-center gap-1 text-blue-400"
          >
            <SettingsIcon className="h-6 w-6" />
            <span className="text-xs">Settings</span>
          </Link>
        </div>
      </nav>
    </div>
  )
}
