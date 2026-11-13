import { Link } from 'react-router-dom'
import { Dumbbell, History, TrendingUp, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'

type Route = 'home' | 'history' | 'progress' | 'settings'

interface BottomNavProps {
  active: Route
}

const navItems: { route: Route; path: string; icon: typeof Dumbbell; label: string }[] = [
  { route: 'home', path: '/', icon: Dumbbell, label: 'Train' },
  { route: 'history', path: '/history', icon: History, label: 'History' },
  { route: 'progress', path: '/progress', icon: TrendingUp, label: 'Progress' },
  { route: 'settings', path: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav({ active }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 h-(--nav-height) border-t border-border bg-background">
      <div className="mx-auto flex h-full max-w-md items-start pt-3">
        {navItems.map(({ route, path, icon: Icon, label }) => {
          const isActive = active === route
          return (
            <Link
              key={route}
              to={path}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-1 flex-col items-center gap-1 text-[0.7rem] transition-colors',
                isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
