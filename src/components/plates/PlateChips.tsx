import { plateColors } from '../../lib/plates'

interface PlateChipsProps {
  plates: number[]
  size?: 'sm' | 'md'
}

export function PlateChips({ plates, size = 'md' }: PlateChipsProps) {
  const sizeClass =
    size === 'sm'
      ? 'h-6 min-w-6 px-1.5 text-xs'
      : 'h-8 min-w-8 px-2 text-sm'

  return (
    <div className="flex items-center gap-1">
      {plates.map((plate, i) => (
        <span
          key={i}
          className={`flex items-center justify-center rounded font-medium ${sizeClass} ${
            plateColors[plate] ?? 'bg-zinc-600'
          }`}
        >
          {plate}
        </span>
      ))}
    </div>
  )
}
