import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '../../hooks/useOnlineStatus'

export function OfflineBanner() {
  const isOnline = useOnlineStatus()

  if (isOnline) return null

  return (
    <div className="fixed left-0 right-0 top-0 z-50 flex items-center justify-center gap-2 bg-amber-600 px-4 py-2 text-sm font-medium text-white">
      <WifiOff className="h-4 w-4" />
      <span>You're offline — data is saved locally</span>
    </div>
  )
}
