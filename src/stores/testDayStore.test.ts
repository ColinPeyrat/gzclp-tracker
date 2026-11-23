import { describe, it, expect } from 'vitest'
import { useTestDayStore } from './testDayStore'
import { useRestTimerStore } from './restTimerStore'

describe('testDayStore', () => {
  it('resetting the test day clears its rest timer', () => {
    useTestDayStore.getState().begin()
    useRestTimerStore.getState().start(180)

    useTestDayStore.getState().reset()

    expect(useRestTimerStore.getState().timer).toBeNull()
  })
})
