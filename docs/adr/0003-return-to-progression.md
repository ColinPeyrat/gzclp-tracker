# 3. Return to Progression restarts every lift from a tested 5RM

- Status: **proposed**
- Date: 2026-11-13

## Context

During race season the lifter trains only Maintenance Days (ADR 0001). Program state is
frozen at whatever the last Rotating Workout left: T1 lifts may be mid-stage-3 with weights
validated for singles, T2s mid-ladder, and OHP has had no work at all. Resuming at those
weights after months away is unrealistic.

The app has no notion of a maintenance phase — Maintenance Day is a standalone session and
`applyWorkoutProgression` ignores it — so nothing knows a return is happening.

GZCLP's own rule for a starting weight is "work up to a 5RM, start at 85% of it", and the
app already implements that as the stage-3-fail reset (`applyT1Reset`).

## Decision

**Return to Progression** is a one-time, user-triggered restart (Settings, plus a Home nudge
once the last Rotating Workout or Test Day is over 21 days old). No phase is stored before it starts.

1. Rotating Workouts are replaced on Home by **Test Day**, a standalone session that can be
   repeated; each one offers only the stage-ladder lifts still untested, under their
   substituted names. Substitutes with `forceT3Progression` are not tested.
2. A **5RM Test** opens at the lift's Maintenance Weight (override if pinned; OHP uses the
   computed formula) and ramps in fixed T1 increments (5/2.5 kg, 10/5 lb), one set of five
   per step, until a set falls short. If the opening set falls short, it steps down until one
   succeeds. The 5RM is the heaviest weight completed for five — never estimated.
3. Once every lift is tested, an editable summary proposes T1 at stage 1, 5×3, at 85% of the
   5RM and T2 at stage 1, 3×10, at 65%. T3 weights are unchanged. On confirm the rotation
   restarts at A1. Cancelling restores program state untouched.
4. Test Day awards only a **5RM PR** — a tested 5RM heavier than any previous tested 5RM for
   that lift. Test Day sets are excluded from the history Rotating Workouts compete against
   and do not advance the workout count.

## Consequences

- Return to Progression is in-progress state that outlives a session, so it is persisted on
  `ProgramState` (untested lifts, results so far), and cleared on confirm or cancel.
- The ramp is long: from ~68% of 5RM in fixed steps is 7–9 sets of five before the top set.
  The result will read low from fatigue. Accepted — GZCLP restarts are meant to be easy, and a
  fixed protocol is comparable from one return to the next.
- The 5RM is the last *successful* step, so it is off by at most one increment.
- The existing `weight-pr` is rep-agnostic and keyed on all T1 history, which contains
  stage-3 singles; a 5RM would almost never beat it. Hence a separate record, and hence
  keeping test sets out of that baseline so an all-out set does not become the bar later
  5×3 sessions must clear.
- Weight-PR medals stay quiet for much of the first cycle back, because the restart sits below
  pre-break history. That is what "all-time best" already means; no "since return" baseline.

## Alternatives considered

- **Percentage reduction off a stage-normalised base**, scaled by gap length. No test needed,
  and numerically equivalent to "85% of a 5RM that dropped X%". Rejected: the X is a guess;
  the test measures it.
- **Epley from the best attempt** (`estimate5RM` already exists). Fewer sets. Rejected in
  favour of a result that is a weight actually lifted for five.
- **Estimate from Maintenance Day sets.** Rejected: they are fixed, submaximal sets, not to
  failure — Epley on 1×5 at maintenance weight yields a 5RM ≈ the maintenance weight itself,
  and a restart lighter than maintenance.
- **Test inside each lift's T1 slot.** No extra sessions, but in any rotation order two T2
  lifts come up before their lift is tested.
- **One all-or-nothing test session.** Untested lifts would need a fallback percentage,
  reintroducing the guess.
