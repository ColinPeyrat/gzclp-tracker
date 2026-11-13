import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="fixed inset-x-0 top-0 z-50 flex items-center justify-center gap-2 border-b border-border bg-card px-4 py-2 text-xs text-muted-foreground">
      <WifiOff className="size-3.5 text-warning" />
      <span>You're offline — data is saved locally</span>
    </div>
  )
}
