import { Link } from 'react-router-dom'
import { Check, ClipboardCheck, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { getExerciseName } from '@/lib/exercises'
import { getLiftsToTest, getOpeningWeight, getStageLadderLifts } from '@/lib/returnToProgression'
import { useTestDayStore } from '@/stores/testDayStore'
import type { ProgramState, UserSettings } from '@/lib/types'

interface Props {
  state: ProgramState
  settings: UserSettings
  onCancel: () => void
}

export function ReturnToProgressionCard({ state, settings, onCancel }: Props) {
  const testDayInProgress = useTestDayStore((s) => Object.values(s.attempts).some((a) => a && a.length > 0))
  const results = state.returnToProgression?.results ?? {}
  const toTest = getLiftsToTest(state, settings)
  const lifts = getStageLadderLifts(settings)
  const unit = settings.weightUnit
  const name = (id: string) => getExerciseName(id, 'T1', settings.liftSubstitutions, settings.exerciseLibrary)
  const testedCount = lifts.length - toTest.length

  return (
    <Card>
      <CardContent className="space-y-5">
        <div>
          <p className="text-sm text-muted-foreground">Return to Progression</p>
          <div className="flex items-end justify-between">
            <h1 className="text-3xl font-semibold tracking-tight">{toTest.length > 0 ? 'Test Day' : 'Ready'}</h1>
            <span className="font-mono text-sm text-muted-foreground tabular-nums">
              {testedCount}/{lifts.length} tested
            </span>
          </div>
          <div className="mt-3 flex gap-1">
            {lifts.map((id) => (
              <div
                key={id}
                className={`h-1 flex-1 rounded-full ${results[id] !== undefined ? 'bg-primary' : 'bg-secondary'}`}
              />
            ))}
          </div>
        </div>

        <ul className="divide-y divide-border">
          {lifts.map((id) => {
            const result = results[id]
            return (
              <li key={id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <span className="font-medium">{name(id)}</span>
                {result !== undefined ? (
                  <span className="flex items-center gap-1.5 text-primary tabular-nums">
                    <Check className="size-4" />
                    <span className="font-semibold">{result}</span>
                    <span className="text-xs opacity-70">{unit} 5RM</span>
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground tabular-nums">
                    opens at <span className="font-semibold text-foreground">{getOpeningWeight(state, id, settings)}</span> {unit}
                  </span>
                )}
              </li>
            )
          })}
        </ul>

        {toTest.length > 0 ? (
          <Button asChild size="xl" className="w-full">
            <Link to="/test-day">
              <ClipboardCheck />
              {testDayInProgress ? 'Resume Test Day' : 'Start Test Day'}
            </Link>
          </Button>
        ) : (
          <Button asChild size="xl" className="w-full">
            <Link to="/return">
              <Check />
              Review restart weights
            </Link>
          </Button>
        )}

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="w-full text-muted-foreground">
              <RotateCcw />
              Cancel return
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Cancel Return to Progression?</AlertDialogTitle>
              <AlertDialogDescription>
                Your program goes back to the weights you left off at. Test results so far are discarded; Test Days
                stay in History.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Keep going</AlertDialogCancel>
              <AlertDialogAction variant="destructive" onClick={onCancel}>
                Cancel return
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  )
}
