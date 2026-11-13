import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Dumbbell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { TierBadge } from '@/components/ui/tier-badge'
import { useProgramStore } from '../stores/programStore'
import { useSettingsStore } from '../stores/settingsStore'
import type { WeightUnit } from '../lib/types'
import { UNIT_CONFIG, getDefaultStartingWeights, getDefaultPlateInventory } from '../lib/units'

type WeightKey = keyof ReturnType<typeof getDefaultStartingWeights>

const T1_LIFTS: { key: WeightKey; label: string }[] = [
  { key: 'squat', label: 'Squat' },
  { key: 'bench', label: 'Bench Press' },
  { key: 'deadlift', label: 'Deadlift' },
  { key: 'ohp', label: 'Overhead Press' },
]

const T3_LIFTS: { key: WeightKey; label: string }[] = [
  { key: 'latPulldown', label: 'Lat Pulldown' },
  { key: 'dbRow', label: 'Dumbbell Row' },
]

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

    const config = UNIT_CONFIG[unit]
    await updateSettings({
      weightUnit: unit,
      barWeight: config.barWeight,
      dumbbellHandleWeight: config.dumbbellHandleWeight,
      plateInventory: getDefaultPlateInventory(unit),
    })

    await initialize(weights)
    navigate('/')
  }

  const updateWeight = (lift: WeightKey, value: string) => {
    const num = parseFloat(value)
    if (!isNaN(num) && num >= 0) {
      setWeights((prev) => ({ ...prev, [lift]: num }))
    }
  }

  const renderRows = (lifts: { key: WeightKey; label: string }[], tier: 'T1' | 'T3') => (
    <Card className="py-0">
      <ul className="divide-y divide-border">
        {lifts.map(({ key, label }) => (
          <li key={key} className="flex items-center gap-3 px-4 py-3">
            <TierBadge tier={tier} />
            <label htmlFor={`setup-${key}`} className="flex-1 font-medium">
              {label}
            </label>
            <Input
              id={`setup-${key}`}
              type="number"
              inputMode="decimal"
              value={weights[key]}
              onChange={(e) => updateWeight(key, e.target.value)}
              className="h-10 w-24 text-right font-semibold tabular-nums"
              min={0}
              step={unit === 'kg' ? 2.5 : 5}
            />
            <span className="w-6 text-xs text-muted-foreground">{unit}</span>
          </li>
        ))}
      </ul>
    </Card>
  )

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col">
      <header className="flex flex-col items-start gap-3 px-5 pt-10 pb-6">
        <Dumbbell className="size-8 text-muted-foreground" />
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Set up your program</h1>
          <p className="text-sm text-muted-foreground">Choose your unit and enter starting weights.</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex flex-1 flex-col gap-5 px-4 pb-6">
        <section className="space-y-2">
          <h2 className="px-1 text-sm text-muted-foreground">Weight unit</h2>
          <ToggleGroup
            type="single"
            value={unit}
            onValueChange={(value) => value && handleUnitChange(value as WeightUnit)}
            spacing={1}
            className="w-full rounded-lg bg-card p-1"
          >
            {(
              [
                { value: 'lbs', label: 'Pounds (lbs)' },
                { value: 'kg', label: 'Kilograms (kg)' },
              ] as const
            ).map(({ value, label }) => (
              <ToggleGroupItem
                key={value}
                value={value}
                className="h-10 flex-1 text-muted-foreground data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
              >
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </section>

        <section className="space-y-2">
          <h2 className="px-1 text-sm text-muted-foreground">T1 · we suggest 85% of your 5RM</h2>
          {renderRows(T1_LIFTS, 'T1')}
          <p className="px-1 text-xs text-muted-foreground">T2 weights will be set to ~60% of T1.</p>
        </section>

        <section className="space-y-2">
          <h2 className="px-1 text-sm text-muted-foreground">T3 starting weights</h2>
          {renderRows(T3_LIFTS, 'T3')}
          <p className="px-1 text-xs text-muted-foreground">You can adjust everything later in settings.</p>
        </section>

        <div className="mt-auto pt-2">
          <Button type="submit" size="xl" className="w-full">
            Start program
          </Button>
        </div>
      </form>
    </div>
  )
}
