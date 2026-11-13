import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ClipboardCheck, RotateCcw } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { getExerciseName } from '../../lib/exercises'
import { getLiftsToTest, getOpeningWeight, getStageLadderLifts } from '../../lib/returnToProgression'
import { useTestDayStore } from '../../stores/testDayStore'
import type { ProgramState, UserSettings } from '../../lib/types'

interface Props {
  state: ProgramState
  settings: UserSettings
  onCancel: () => void
}

export function ReturnToProgressionCard({ state, settings, onCancel }: Props) {
  const [confirmCancel, setConfirmCancel] = useState(false)
  const testDayInProgress = useTestDayStore((s) => Object.values(s.attempts).some((a) => a && a.length > 0))
  const results = state.returnToProgression?.results ?? {}
  const toTest = getLiftsToTest(state, settings)
  const unit = settings.weightUnit
  const name = (id: string) => getExerciseName(id, 'T1', settings.liftSubstitutions, settings.exerciseLibrary)

  return (
    <div className="mb-3 rounded-lg border border-blue-500/30 bg-blue-950/20 p-4">
      <p className="text-sm text-zinc-400">Return to Progression</p>
      <h2 className="mb-3 text-2xl font-bold">{toTest.length > 0 ? 'Test Day' : 'Ready to restart'}</h2>

      <ul className="mb-4 space-y-1.5 text-sm">
        {getStageLadderLifts(settings).map((id) => {
          const result = results[id]
          return (
            <li key={id} className="flex justify-between">
              <span>{name(id)}</span>
              {result !== undefined ? (
                <span className="flex items-center gap-1 text-green-400">
                  <Check className="h-3.5 w-3.5" /> 5RM {result} {unit}
                </span>
              ) : (
                <span className="text-zinc-400">from {getOpeningWeight(state, id, settings)} {unit}</span>
              )}
            </li>
          )
        })}
      </ul>

      {toTest.length > 0 ? (
        <Link
          to="/test-day"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 py-4 font-medium text-white hover:bg-blue-500"
        >
          <ClipboardCheck className="h-5 w-5" />
          {testDayInProgress ? 'Resume Test Day' : 'Start Test Day'}
        </Link>
      ) : (
        <Link
          to="/return"
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-4 font-medium text-white hover:bg-green-500"
        >
          <Check className="h-5 w-5" />
          Review restart weights
        </Link>
      )}

      <button
        onClick={() => setConfirmCancel(true)}
        className="mt-3 flex w-full items-center justify-center gap-1 text-xs text-zinc-500 hover:text-zinc-300"
      >
        <RotateCcw className="h-3 w-3" /> Cancel return
      </button>

      {confirmCancel && (
        <Modal onClose={() => setConfirmCancel(false)}>
          <h2 className="mb-2 text-lg font-bold">Cancel Return to Progression?</h2>
          <p className="mb-6 text-sm text-zinc-400">
            Your program goes back to the weights you left off at. Test results so far are discarded;
            Test Days stay in History.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                setConfirmCancel(false)
                onCancel()
              }}
              className="flex-1 rounded-lg bg-red-600 py-2 font-medium hover:bg-red-500"
            >
              Cancel return
            </button>
            <button
              onClick={() => setConfirmCancel(false)}
              className="flex-1 rounded-lg bg-zinc-700 py-2 font-medium hover:bg-zinc-600"
            >
              Keep going
            </button>
          </div>
        </Modal>
      )}
    </div>
  )
}
