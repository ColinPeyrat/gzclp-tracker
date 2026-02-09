import { useEffect, useState, useCallback, useRef } from 'react'
import { Trophy, Flame, Zap, Target, TrendingUp } from 'lucide-react'
import { useMedalToastStore } from '../../stores/medalToastStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { getExerciseName } from '../../lib/exercises'
import { vibrateSuccess } from '../../lib/haptics'
import type { Medal, MedalType } from '../../lib/types'

const MEDAL_CONFIG: Record<MedalType, { icon: typeof Trophy; label: string }> = {
  'weight-pr': { icon: Trophy, label: 'Weight PR!' },
  'volume-pr': { icon: Flame, label: 'Volume PR!' },
  'streak': { icon: Zap, label: '' }, // dynamic label
  'amrap-record': { icon: Target, label: 'T3 Level Up!' },
  'stage-clear': { icon: TrendingUp, label: 'Weight Up!' },
}

function getMedalLabel(medal: Medal): string {
  if (medal.type === 'streak') return `${medal.value} Workouts!`
  return MEDAL_CONFIG[medal.type].label
}

function getMedalDetail(
  medal: Medal,
  unit: string,
  liftSubstitutions?: any[],
  exerciseLibrary?: any[]
): string | null {
  if (!medal.liftId) return null
  const name = getExerciseName(medal.liftId, medal.tier ?? 'T1', liftSubstitutions, exerciseLibrary)
  const tierLabel = medal.tier ? ` (${medal.tier})` : ''
  if (medal.type === 'weight-pr' || medal.type === 'stage-clear') {
    return `${name}${tierLabel}: ${medal.value} ${unit}`
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
      className={`rounded-lg border border-amber-500/30 bg-zinc-800 px-4 py-3 shadow-lg transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
      }`}
    >
      <div className="flex items-center gap-3">
        <Icon className="h-5 w-5 shrink-0 text-amber-400" />
        <div className="min-w-0">
          <div className="font-bold text-amber-400">{label}</div>
          {detail && <div className="truncate text-sm text-zinc-300">{detail}</div>}
        </div>
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
      className="fixed left-4 right-4 z-50 flex flex-col gap-2"
      style={{ bottom: 'calc(var(--nav-height) + 0.5rem)' }}
    >
      {visibleMedals.map((vm) => (
        <MedalCard key={vm.id} medal={vm} onDismiss={handleDismiss} />
      ))}
    </div>
  )
}
