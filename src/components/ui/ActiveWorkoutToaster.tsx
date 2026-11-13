import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useWorkoutSessionStore } from '../../stores/workoutSessionStore'

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
      <div className="fixed inset-x-0 bottom-[calc(var(--nav-height)+0.5rem)] z-40 px-4">
        <div
          className="mx-auto flex max-w-md cursor-pointer items-center gap-2 rounded-lg bg-secondary py-2.5 pr-2 pl-4 transition-colors hover:bg-accent"
          onClick={handleResume}
        >
          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium">{workout.type === 'MN' ? 'Maintenance' : workout.type} in progress</span>
              <span className="text-muted-foreground tabular-nums">
                {completedExercises}/{totalExercises} done
              </span>
              <ChevronRight className="ml-auto size-4 text-muted-foreground" />
            </div>
            <Progress value={progress} className="bg-background" />
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation()
              setShowAbandonModal(true)
            }}
            aria-label="Abandon workout"
          >
            <X />
          </Button>
        </div>
      </div>

      <AlertDialog open={showAbandonModal} onOpenChange={setShowAbandonModal}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandon workout?</AlertDialogTitle>
            <AlertDialogDescription>
              Your progress will be lost. Are you sure you want to abandon this workout?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={handleAbandon}>
              Abandon
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
