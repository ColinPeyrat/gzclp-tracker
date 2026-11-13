import { cn } from '@/lib/utils'
import { plateColors } from '../../lib/plates'

interface PlateChipsProps {
  plates: number[]
  size?: 'sm' | 'md'
}

// Real-world calibrated plate colours are functional here, so raw palette classes are intentional
function plateClass(plate: number) {
  const colour = plateColors[plate]
  if (!colour) return 'bg-secondary text-foreground'
  if (colour.includes('yellow')) return `${colour} text-zinc-900`
  return colour.includes('text-') ? colour : `${colour} text-white`
}

export function PlateChips({ plates, size = 'md' }: PlateChipsProps) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {plates.map((plate, i) => (
        <span
          key={i}
          className={cn(
            'inline-flex items-center justify-center rounded-sm font-mono font-semibold tabular-nums',
            size === 'sm' ? 'h-5 min-w-6 px-1 text-[0.7rem]' : 'h-8 min-w-9 px-1.5 text-sm',
            plateClass(plate)
          )}
        >
          {plate}
        </span>
      ))}
    </div>
  )
}
