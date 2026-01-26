import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceDot,
} from 'recharts'
import type { LiftProgression } from '../../hooks/useProgressionData'

interface LiftDetailChartProps {
  lift: LiftProgression
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function LiftDetailChart({ lift }: LiftDetailChartProps) {
  const hasData = lift.dataPoints.length > 0

  if (!hasData) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900">
        <p className="text-zinc-500">Complete workouts to see your progress</p>
      </div>
    )
  }

  // Build chart data with historical points
  const chartData = lift.dataPoints.map((point) => ({
    date: formatDate(point.date),
    weight: point.weight,
    success: point.success,
    isProjection: false,
  }))

  // Add projection point
  if (lift.dataPoints.length >= 2 && lift.projectedWeight > 0) {
    const lastDate = new Date(lift.dataPoints[lift.dataPoints.length - 1].date)
    const projectionDate = new Date(lastDate)
    projectionDate.setDate(projectionDate.getDate() + 56) // 8 weeks

    chartData.push({
      date: formatDate(projectionDate.toISOString()),
      weight: lift.projectedWeight,
      success: true,
      isProjection: true,
    })
  }

  // Calculate Y-axis domain with padding
  const weights = chartData.map((d) => d.weight)
  const minWeight = Math.min(...weights)
  const maxWeight = Math.max(...weights)
  const padding = (maxWeight - minWeight) * 0.1 || 10
  const yMin = Math.floor((minWeight - padding) / 5) * 5
  const yMax = Math.ceil((maxWeight + padding) / 5) * 5

  // Find success and failure points for dots
  const successPoints = lift.dataPoints
    .filter((p) => p.success)
    .map((p) => ({ date: formatDate(p.date), weight: p.weight }))
  const failPoints = lift.dataPoints
    .filter((p) => !p.success)
    .map((p) => ({ date: formatDate(p.date), weight: p.weight }))

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <XAxis
            dataKey="date"
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            domain={[yMin, yMax]}
            stroke="#71717a"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
            width={40}
          />
          {/* Solid line for historical data */}
          <Line
            type="monotone"
            dataKey="weight"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={false}
            strokeDasharray={`${(lift.dataPoints.length - 1) * 100} 1000`}
          />
          {/* Dashed line for projection */}
          {lift.dataPoints.length >= 2 && (
            <Line
              type="monotone"
              dataKey="weight"
              stroke="#3b82f6"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              opacity={0.5}
            />
          )}
          {/* Success dots */}
          {successPoints.map((point, i) => (
            <ReferenceDot
              key={`success-${i}`}
              x={point.date}
              y={point.weight}
              r={4}
              fill="#22c55e"
              stroke="none"
            />
          ))}
          {/* Failure dots */}
          {failPoints.map((point, i) => (
            <ReferenceDot
              key={`fail-${i}`}
              x={point.date}
              y={point.weight}
              r={4}
              fill="#ef4444"
              stroke="none"
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
