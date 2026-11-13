import { useEffect, useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { Trophy, Flame, Zap, Target, TrendingUp } from 'lucide-react'
import { useMedalToastStore } from '../../stores/medalToastStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { getExerciseName } from '../../lib/exercises'
import { vibrateSuccess } from '../../lib/haptics'
import type { Medal, MedalType, LiftSubstitution, ExerciseDefinition } from '../../lib/types'

const MEDAL_CONFIG: Record<MedalType, { icon: typeof Trophy; label: string }> = {
  'weight-pr': { icon: Trophy, label: 'Weight PR' },
  'volume-pr': { icon: Flame, label: 'Volume PR' },
  'streak': { icon: Zap, label: '' }, // dynamic label
  'amrap-record': { icon: Target, label: 'T3 level up' },
  'stage-clear': { icon: TrendingUp, label: 'Weight up' },
  '5rm-pr': { icon: Trophy, label: '5RM PR' },
}

function getMedalLabel(medal: Medal): string {
  if (medal.type === 'streak') return `${medal.value} workout streak`
  return MEDAL_CONFIG[medal.type].label
}

function getMedalDetail(
  medal: Medal,
  unit: string,
  liftSubstitutions?: LiftSubstitution[],
  exerciseLibrary?: ExerciseDefinition[]
): string | null {
  if (!medal.liftId) return null
  const name = getExerciseName(medal.liftId, medal.tier ?? 'T1', liftSubstitutions, exerciseLibrary)
  const tierLabel = medal.tier ? ` (${medal.tier})` : ''
  if (medal.type === 'weight-pr' || medal.type === 'stage-clear') {
    return `${name}${tierLabel}: ${medal.value} ${unit}`
  }
  if (medal.type === '5rm-pr') {
    return `${name}: ${medal.value} ${unit}${medal.previousValue ? ` (was ${medal.previousValue})` : ''}`
  }
  if (medal.type === 'volume-pr') {
    return `${name}${tierLabel}: ${medal.value} ${unit}`
  }
  if (medal.type === 'amrap-record') {
    return `${name}: ${medal.value} reps`
  }
  return null
}

interface VisibleMedal {
  id: number
  medal: Medal
}

let nextMedalId = 0

function MedalCard({ medal, onDismiss }: { medal: VisibleMedal; onDismiss: (id: number) => void }) {
  const { settings } = useSettingsStore()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 50)
    const hideTimer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(medal.id), 300)
    }, 4000)
    return () => {
      clearTimeout(showTimer)
      clearTimeout(hideTimer)
    }
  }, [medal.id, onDismiss])

  const config = MEDAL_CONFIG[medal.medal.type]
  const Icon = config.icon
  const label = getMedalLabel(medal.medal)
  const detail = getMedalDetail(medal.medal, settings.weightUnit, settings.liftSubstitutions, settings.exerciseLibrary)

  return (
    <div
      role="status"
      className={cn(
        'flex items-center gap-3 rounded-lg bg-popover px-4 py-3 text-popover-foreground ring-1 ring-border transition-[opacity,translate] duration-200',
        visible ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
      )}
    >
      <Icon className="size-4 shrink-0 text-warning" />
      <div className="min-w-0 text-sm">
        <div className="font-medium">{label}</div>
        {detail && <div className="truncate text-xs text-muted-foreground tabular-nums">{detail}</div>}
      </div>
    </div>
  )
}

export function MedalToast() {
  const pendingMedals = useMedalToastStore((s) => s.pendingMedals)
  const clearMedals = useMedalToastStore((s) => s.clearMedals)
  const [visibleMedals, setVisibleMedals] = useState<VisibleMedal[]>([])
  const processedRef = useRef(0)

  useEffect(() => {
    if (pendingMedals.length > processedRef.current) {
      const newMedals = pendingMedals.slice(processedRef.current)
      const wrapped = newMedals.map((m) => ({ id: nextMedalId++, medal: m }))
      setVisibleMedals((prev) => [...prev, ...wrapped])
      processedRef.current = pendingMedals.length
      vibrateSuccess()
    }
    // Reset when medals are cleared (new workout)
    if (pendingMedals.length === 0 && processedRef.current > 0) {
      processedRef.current = 0
    }
  }, [pendingMedals])

  const handleDismiss = useCallback((id: number) => {
    setVisibleMedals((prev) => {
      const next = prev.filter((m) => m.id !== id)
      if (next.length === 0) clearMedals()
      return next
    })
  }, [clearMedals])

  if (visibleMedals.length === 0) return null

  return (
    <div
      className="fixed inset-x-4 z-50 mx-auto flex max-w-md flex-col gap-2"
      style={{ bottom: 'calc(var(--nav-height) + 0.5rem)' }}
    >
      {visibleMedals.map((vm) => (
        <MedalCard key={vm.id} medal={vm} onDismiss={handleDismiss} />
      ))}
    </div>
  )
}
