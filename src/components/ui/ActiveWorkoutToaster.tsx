import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { X } from 'lucide-react'
import { useWorkoutSessionStore } from '../../stores/workoutSessionStore'
import { Modal } from './Modal'

export function ActiveWorkoutToaster() {
  const navigate = useNavigate()
  const location = useLocation()
  const [showAbandonModal, setShowAbandonModal] = useState(false)

  const workout = useWorkoutSessionStore((s) => s.workout)
  const abandonWorkout = useWorkoutSessionStore((s) => s.abandonWorkout)

  // Don't show on workout page or if no active session
  if (!workout || location.pathname === '/workout') {
    return null
  }

  const completedExercises = workout.exercises.filter((ex) =>
    ex.sets.every((s) => s.completed)
  ).length
  const totalExercises = workout.exercises.length
  const progress = (completedExercises / totalExercises) * 100

  const handleResume = () => {
    navigate('/workout')
  }

  const handleAbandon = () => {
    abandonWorkout()
    setShowAbandonModal(false)
  }

  return (
    <>
      <div
        className="fixed left-4 right-4 z-40 cursor-pointer rounded-lg bg-zinc-800 p-3 shadow-lg"
        style={{ bottom: 'calc(var(--nav-height) + 0.5rem)' }}
        onClick={handleResume}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <span className="font-medium">{workout.type} in progress</span>
            <span className="mx-2 text-zinc-400">•</span>
            <span className="text-zinc-400">{completedExercises}/{totalExercises} done</span>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setShowAbandonModal(true)
            }}
            className="p-1 text-zinc-400 hover:text-white"
            aria-label="Abandon workout"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-zinc-700">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {showAbandonModal && (
        <Modal onClose={() => setShowAbandonModal(false)}>
          <h2 className="mb-2 text-lg font-bold">Abandon Workout?</h2>
          <p className="mb-6 text-sm text-zinc-400">
            Your progress will be lost. Are you sure you want to abandon this workout?
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleAbandon}
              className="flex-1 rounded-lg bg-red-600 py-2 font-medium hover:bg-red-500"
            >
              Abandon
            </button>
            <button
              onClick={() => setShowAbandonModal(false)}
              className="flex-1 rounded-lg bg-zinc-700 py-2 font-medium hover:bg-zinc-600"
            >
              Cancel
            </button>
          </div>
        </Modal>
      )}
    </>
  )
}
