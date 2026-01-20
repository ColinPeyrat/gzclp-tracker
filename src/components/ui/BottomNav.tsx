import { Link } from 'react-router-dom'
import { Dumbbell, History, Settings } from 'lucide-react'

type Route = 'home' | 'history' | 'settings'

interface BottomNavProps {
  active: Route
}

const navItems: { route: Route; path: string; icon: typeof Dumbbell; label: string }[] = [
  { route: 'home', path: '/', icon: Dumbbell, label: 'Home' },
  { route: 'history', path: '/history', icon: History, label: 'History' },
  { route: 'settings', path: '/settings', icon: Settings, label: 'Settings' },
]

export function BottomNav({ active }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex h-(--nav-height) items-center border-t border-zinc-800 bg-zinc-900 px-4">
      <div className="flex w-full justify-around">
        {navItems.map(({ route, path, icon: Icon, label }) => (
          <Link
            key={route}
            to={path}
            className={`flex flex-col items-center gap-1 ${
              active === route ? 'text-blue-400' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Icon className="h-6 w-6" />
            <span className="text-xs">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
