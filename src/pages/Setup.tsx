import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell } from 'lucide-react'
import { useProgramStore } from '../stores/programStore'
import { useSettingsStore } from '../stores/settingsStore'
import type { WeightUnit } from '../lib/types'
import { UNIT_CONFIG, getDefaultStartingWeights } from '../lib/units'

export function Setup() {
  const navigate = useNavigate()
  const { initialize } = useProgramStore()
  const { update: updateSettings } = useSettingsStore()
  const [unit, setUnit] = useState<WeightUnit>('lbs')
  const [weights, setWeights] = useState(getDefaultStartingWeights('lbs'))

  const handleUnitChange = (newUnit: WeightUnit) => {
    setUnit(newUnit)
    setWeights(getDefaultStartingWeights(newUnit))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Update settings with unit-specific defaults
    const config = UNIT_CONFIG[unit]
    await updateSettings({
      weightUnit: unit,
      barWeightLbs: config.barWeight,
      availablePlates: [...config.plates],
    })

    await initialize(weights)
    navigate('/')
  }

  const updateWeight = (lift: keyof typeof weights, value: string) => {
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0) {
      setWeights((prev) => ({ ...prev, [lift]: num }))
    }
  }

  return (
    <div className="flex min-h-screen flex-col p-4">
      <div className="mb-8 flex flex-col items-center gap-4 pt-8">
        <Dumbbell className="h-12 w-12 text-blue-400" />
        <h1 className="text-2xl font-bold">Set Up Your Program</h1>
        <p className="text-center text-zinc-400">
          Choose your unit and enter starting weights
        </p>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-6">
        <div>
          <label className="mb-2 block text-sm font-medium">Weight Unit</label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handleUnitChange('lbs')}
              className={`flex-1 rounded-lg py-3 font-medium transition-colors ${
                unit === 'lbs'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Pounds (lbs)
            </button>
            <button
              type="button"
              onClick={() => handleUnitChange('kg')}
              className={`flex-1 rounded-lg py-3 font-medium transition-colors ${
                unit === 'kg'
                  ? 'bg-blue-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
              }`}
            >
              Kilograms (kg)
            </button>
          </div>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-zinc-400">T1 Starting Weights</p>
          {[
            { key: 'squat', label: 'Squat' },
            { key: 'bench', label: 'Bench Press' },
            { key: 'deadlift', label: 'Deadlift' },
            { key: 'ohp', label: 'Overhead Press' },
          ].map(({ key, label }) => (
            <div key={key}>
              <label className="mb-2 block text-sm font-medium">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={weights[key as keyof typeof weights]}
                  onChange={(e) =>
                    updateWeight(key as keyof typeof weights, e.target.value)
                  }
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-3 text-lg focus:border-blue-500 focus:outline-none"
                  min={0}
                  step={unit === 'kg' ? 2.5 : 5}
                />
                <span className="w-10 text-zinc-400">{unit}</span>
              </div>
            </div>
          ))}
        </div>

        <p className="text-sm text-zinc-500">
          T2 weights will be set to ~60% of these values. You can adjust
          everything later in settings.
        </p>

        <div className="mt-auto">
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 py-4 font-medium text-white hover:bg-blue-500"
          >
            Start Program
          </button>
        </div>
      </form>
    </div>
  )
}
