import { useEffect } from 'react'
import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { Home } from './pages/Home'
import { Setup } from './pages/Setup'
import { Workout } from './pages/Workout'
import { History } from './pages/History'
import { Progress } from './pages/Progress'
import { Settings } from './pages/Settings'
import { OfflineBanner } from './components/ui/OfflineBanner'
import { ActiveWorkoutToaster } from './components/ui/ActiveWorkoutToaster'
import { migrateWorkouts } from './lib/db'

function Layout() {
  useEffect(() => {
    // Request persistent storage to prevent browser from evicting IndexedDB data
    navigator.storage?.persist?.()
    // Migrate legacy workout data (weightLbs -> weight)
    migrateWorkouts()
  }, [])

  return (
    <>
      <OfflineBanner />
      <Outlet />
      <ActiveWorkoutToaster />
    </>
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Home /> },
      { path: '/setup', element: <Setup /> },
      { path: '/workout', element: <Workout /> },
      { path: '/history', element: <History /> },
      { path: '/progress', element: <Progress /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
