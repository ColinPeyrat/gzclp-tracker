import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { useRestTimerStore, restRemaining } from './restTimerStore'

const T0 = new Date('2026-01-01T10:00:00Z').getTime()

describe('restTimerStore', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(T0)
    useRestTimerStore.getState().skip()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('a started rest counts down from the wall clock', () => {
    useRestTimerStore.getState().start(180)

    expect(restRemaining(useRestTimerStore.getState().timer, T0)).toBe(180)
    expect(restRemaining(useRestTimerStore.getState().timer, T0 + 61_000)).toBe(119)
    expect(useRestTimerStore.getState().timer?.totalSeconds).toBe(180)
  })

  it('+30s and -30s shift the end time of the running rest', () => {
    useRestTimerStore.getState().start(120)
    vi.setSystemTime(T0 + 20_000)

    useRestTimerStore.getState().addTime(30)
    expect(restRemaining(useRestTimerStore.getState().timer, Date.now())).toBe(130)

    useRestTimerStore.getState().addTime(-30)
    useRestTimerStore.getState().addTime(-30)
    expect(restRemaining(useRestTimerStore.getState().timer, Date.now())).toBe(70)
  })

  it('-30s past the end leaves no time remaining', () => {
    useRestTimerStore.getState().start(60)
    vi.setSystemTime(T0 + 45_000)

    useRestTimerStore.getState().addTime(-30)

    expect(restRemaining(useRestTimerStore.getState().timer, Date.now())).toBe(0)
  })

  it('skip ends the rest', () => {
    useRestTimerStore.getState().start(60)

    useRestTimerStore.getState().skip()

    expect(useRestTimerStore.getState().timer).toBeNull()
  })
})
