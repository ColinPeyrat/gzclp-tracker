import { CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts'
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart'
import type { LiftProgression } from '../../hooks/useProgressionData'

interface LiftDetailChartProps {
  lift: LiftProgression
}

interface ChartPoint {
  index: number
  date: string
  actual?: number
  projection?: number
  success?: boolean
}

const chartConfig = {
  actual: { label: 'Weight', color: 'var(--chart-1)' },
  projection: { label: 'Projected', color: 'var(--chart-1)' },
} satisfies ChartConfig

function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function OutcomeDot({ cx, cy, payload }: { cx?: number; cy?: number; payload?: ChartPoint }) {
  if (cx === undefined || cy === undefined || payload?.actual === undefined) return null
  return (
    <circle
      cx={cx}
      cy={cy}
      r={3}
      fill={payload.success ? 'var(--success)' : 'var(--destructive)'}
      stroke="var(--card)"
      strokeWidth={1.5}
    />
  )
}

export function LiftDetailChart({ lift }: LiftDetailChartProps) {
  const hasData = lift.dataPoints.length > 0

  if (!hasData) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg bg-card px-6 text-center">
        <p className="text-sm text-muted-foreground">Complete workouts to see your progress</p>
      </div>
    )
  }

  const chartData: ChartPoint[] = lift.dataPoints.map((point, index) => ({
    index,
    date: formatDate(point.date),
    actual: point.weight,
    success: point.success,
  }))

  const hasProjection = lift.dataPoints.length >= 2 && lift.projectedWeight > 0
  if (hasProjection) {
    const last = lift.dataPoints[lift.dataPoints.length - 1]
    const projectionDate = new Date(last.date)
    projectionDate.setDate(projectionDate.getDate() + 56)

    chartData[chartData.length - 1].projection = last.weight
    chartData.push({
      index: chartData.length,
      date: formatDate(projectionDate.toISOString()),
      projection: lift.projectedWeight,
    })
  }

  const weights = chartData.flatMap((d) => [d.actual, d.projection]).filter((w): w is number => w !== undefined)
  const minWeight = Math.min(...weights)
  const maxWeight = Math.max(...weights)
  const padding = (maxWeight - minWeight) * 0.1 || 10
  const yMin = Math.floor((minWeight - padding) / 5) * 5
  const yStep = Math.max(5, Math.ceil((maxWeight + padding - yMin) / 4 / 5) * 5)
  const yTicks = Array.from({ length: 5 }, (_, i) => yMin + i * yStep)

  return (
    <div className="rounded-lg bg-card px-2 pt-4 pb-2">
      <ChartContainer config={chartConfig} className="aspect-auto h-60 w-full">
        <LineChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} />
          <XAxis
            dataKey="index"
            type="number"
            domain={[0, chartData.length - 1]}
            ticks={chartData.map((d) => d.index)}
            tickFormatter={(i: number) => chartData[i]?.date ?? ''}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            minTickGap={24}
          />
          <YAxis
            domain={[yMin, yTicks[yTicks.length - 1]]}
            ticks={yTicks}
            tickLine={false}
            axisLine={false}
            tickMargin={4}
            width={40}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                indicator="line"
                labelFormatter={(_, payload) => payload?.[0]?.payload?.date}
              />
            }
          />
          <Line
            dataKey="actual"
            type="linear"
            stroke="var(--color-actual)"
            strokeWidth={1.5}
            dot={<OutcomeDot />}
            activeDot={false}
            isAnimationActive={false}
          />
          {hasProjection && (
            <Line
              dataKey="projection"
              type="linear"
              stroke="var(--color-projection)"
              strokeWidth={1.5}
              strokeDasharray="4 4"
              strokeOpacity={0.5}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ChartContainer>
    </div>
  )
}
