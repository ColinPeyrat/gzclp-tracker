# 1. Maintenance day prescribes ~80% of a triples-equivalent weight

- Status: **proposed**
- Date: 2026-09-01

## Context

Maintenance day (`WorkoutType` `'MN'`) is a non-rotating session covering deadlift, squat
and bench. It was introduced as a single rep at 100% of the last validated T1 weight — a
heavy touch to keep the pattern grooved. We want it to become a moderate set of five
instead, described as "1×5 at 80% of 3RM".

The app tracks no 3RM. Per T1 lift it stores `weight` (the *next* attempt), `stage`, and
`lastSuccessWeight` (the last weight actually completed). The only rep-max maths is
`estimate5RM` (Epley × 0.87), which is transient and used solely by the stage-3 reset flow.

So "3RM" had to be mapped onto something the app already knows. Two readings differ by
about 20%:

- Treat `lastSuccessWeight` as the 3RM → 80% of it is roughly 60% of 1RM.
- Use a true tested 3RM (~93% of 1RM) → 80% of it lands near the existing T1 working
  weight, since a GZCLP T1 start is 85% of 5RM ≈ 74% of 1RM. The weight would barely move.

A complication: `lastSuccessWeight` does not mean the same thing at every stage. Stage
transitions keep the weight (`progression.ts:82-92`) while every success adds the
increment, so the value climbs monotonically through stages 1→3. At stage 1 it is a weight
completed for triples; at stage 3 it is a weight completed for singles. A flat multiplier
therefore prescribes more maintenance load to a lift that is grinding through stage 3 than
to a fresh one at stage 1, despite no gain in strength.

## Decision

Maintenance prescribes, per lift:

```
pct        = { stage 1: 0.80, stage 2: 0.75, stage 3: 0.70 }
weight     = round(pct[t1.stage] × (t1.lastSuccessWeight ?? t1.weight))  // 2.5 kg / 5 lb
targetSets = 1
targetReps = 5            // straight set, isAmrap: false
```

`lastSuccessWeight` is always the base, but the multiplier **drops 5 points per stage** so
the prescribed load stays flat in absolute terms. Each stage validates the weight over a
shorter rep scheme, so the same multiplier would otherwise creep upward; stepping it down
cancels that.

The step is calibrated empirically from the progression ladder — stage-3 weights run
roughly 15-20% above stage-1 weights for the same lifter — rather than from rep-max ratios
(3RM:2RM:1RM ≈ 93:95:100), which give 0.80/0.78/0.74 and understate the drift because they
ignore the weight banked *within* each stage.

Roster stays deadlift / squat / bench — OHP remains excluded. Maintenance continues to
skip progression and medal detection entirely.

## Consequences

- No schema change, no migration. Maintenance stays a pure function of `ProgramState`
  plus the weight unit.
- The rule lives in one place, `getMaintenanceWeight` in `progression.ts`. The home-screen
  preview and `startMaintenanceWorkout` both call it, so they cannot drift apart — the
  failure mode that commit `1a44d68` had to fix once already.
- Rounding follows the existing percentage-derivation sites (`estimate5RM`,
  `applyT1Reset`). Any residual unloadable target is absorbed by `calculatePlates`, which
  already returns a `suggestedWeight` via GCD search.
- Worked example (kg, squat): `lastSuccessWeight` 105/115/125 at stages 1/2/3 yields
  85/87.5/87.5 rather than 84/92/100 under a flat 0.8. In lbs from a 225 start:
  190/190/185.
- Logging well below 100% means maintenance entries can no longer tie a lift's max in
  `detectWeightPR`'s history baseline, which the old 1×1 version could.
- Historical `'MN'` workouts keep `targetReps: 1`. History renders from the stored
  `ExerciseLog`, so past sessions still display correctly with no backfill.
- The three factors are a judgement call, not a derived constant. They are a single
  literal in `progression.ts` and are meant to be tuned against real sessions.

## Alternatives considered

- **Flat 0.8 across all stages.** One line, and the number is verifiable in the user's
  head from the home screen. Chosen first, then reversed: it drifts the maintenance load
  84 → 100 kg across a single cycle (≈59% → ≈69% of 1RM) purely from the rep scheme
  shortening, so maintenance gets hardest exactly when a lift is stalling and most needs
  to be easy.
- **Track a real 3RM per lift.** Most faithful to the original wording. Rejected: new
  `LiftState` field, new input UI, and a backfill or estimate for existing users.
- **Epley e1RM off the last successful session.** Self-normalising across stages without
  hand-set factors. Rejected: `startMaintenanceWorkout` would need an async history read
  rather than `ProgramState` alone. Worth revisiting if the three factors prove hard to
  tune.
