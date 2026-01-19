import { createBrowserRouter, RouterProvider, Outlet } from 'react-router-dom'
import { Home } from './pages/Home'
import { Setup } from './pages/Setup'
import { Workout } from './pages/Workout'
import { History } from './pages/History'
import { Settings } from './pages/Settings'
import { OfflineBanner } from './components/ui/OfflineBanner'

function Layout() {
  return (
    <>
      <OfflineBanner />
      <Outlet />
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
      { path: '/settings', element: <Settings /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
