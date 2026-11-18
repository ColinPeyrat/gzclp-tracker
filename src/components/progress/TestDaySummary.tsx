import { ArrowUp, Diamond } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LiftProgression } from '../../lib/liftProgressions'
import { LIFT_CODES, type LiftName, type WeightUnit } from '../../lib/types'

interface TestDaySummaryProps {
  lifts: Record<LiftName, LiftProgression>
  order: LiftName[]
  unit: WeightUnit
}

const GRID_COLS = ['grid-cols-1', 'grid-cols-1', 'grid-cols-2', 'grid-cols-3', 'grid-cols-4']

function round(value: number) {
  return Math.round(value * 100) / 100
}

function signed(value: number) {
  const v = round(value)
  return v > 0 ? `+${v}` : v < 0 ? `${v}` : '±0'
}

function formatDay(isoDate: string) {
  return new Date(isoDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function formatSince(isoDate: string, reference: string) {
  const sameYear = new Date(isoDate).getFullYear() === new Date(reference).getFullYear()
  return new Date(isoDate).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(!sameYear && { year: 'numeric' }),
  })
}

function deltaClass(value: number) {
  return value > 0 ? 'text-success' : value < 0 ? 'text-destructive' : 'text-muted-foreground'
}

export function TestDaySummary({ lifts, order, unit }: TestDaySummaryProps) {
  const tested = order.filter((id) => lifts[id].lastTest)
  if (tested.length === 0) return null

  const lastDate = tested.map((id) => lifts[id].lastTest!.date).sort().at(-1)!
  const total = tested.reduce((sum, id) => sum + lifts[id].lastTest!.weight, 0)
  // Lifts tested only once count at their current value, so the delta reflects actual improvements
  const previousTotal = tested.reduce((sum, id) => sum + (lifts[id].previousTest ?? lifts[id].lastTest!).weight, 0)
  const totalDelta = total - previousTotal

  const previousDates = tested.flatMap((id) => lifts[id].previousTest?.date ?? [])
  const sameDay = new Set(previousDates.map((d) => d.slice(0, 10))).size === 1
  const comparedTo = sameDay
    ? `since ${formatSince(previousDates[0], lastDate)}`
    : 'since previous tests'

  return (
    <section className="rounded-lg bg-card p-4">
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Diamond className="size-3.5 fill-warning text-warning" />
        Last Test Day · {formatDay(lastDate)}
      </p>
      <p className="mt-1 tabular-nums">
        <span className="text-3xl font-semibold tracking-tight">{round(total)}</span>
        <span className="ml-1 text-sm text-muted-foreground">{unit} total</span>
      </p>
      {totalDelta !== 0 && (
        <span
          className={cn(
            'mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs tabular-nums',
            totalDelta > 0 ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive'
          )}
        >
          {totalDelta > 0 && <ArrowUp className="size-3" />}
          <span className="font-medium">{signed(totalDelta)}</span>
          <span className="opacity-70">{comparedTo}</span>
        </span>
      )}
      <div className={cn('mt-4 grid gap-2', GRID_COLS[tested.length])}>
        {tested.map((id) => {
          const { lastTest, previousTest } = lifts[id]
          const delta = previousTest ? lastTest!.weight - previousTest.weight : undefined
          return (
            <div key={id} className="rounded-md bg-muted/50 px-2 py-2 text-center">
              <p className="text-[0.7rem] text-muted-foreground">{LIFT_CODES[id]}</p>
              <p className="font-semibold tabular-nums">{lastTest!.weight}</p>
              {delta !== undefined && (
                <p className={cn('text-[0.7rem] font-medium tabular-nums', deltaClass(delta))}>{signed(delta)}</p>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
