# 4. Substitutes own their progression; history is credited to the performed exercise

- Status: **accepted**
- Date: 2026-11-23

Exercise Progression (weight, stage, last stage-1 weight) is keyed by exercise, not by the main-lift or T3 slot it fills. A Lift Substitution activates the substitute's progression and leaves the replaced lift's dormant, so removing or re-adding a substitute never leaks one exercise's weights into another. Previously the substitute wrote into the main lift's state, and removing it left the main lift at the substitute's weights.

Each logged exercise records the Performed Exercise. Logs written before this existed carry no such record, so the one-time migration credits every past log of a currently-substituted lift to the active substitute and hands that substitute the progression stored on the lift. This is a deliberate guess: we have no record of earlier substitutions, and in practice substitutions are long-lived. A lifter who switched substitutes in the past will see that older history attributed to the current one. The replaced lift is left with no progression of its own, so removing the substitute asks the lifter what weight to resume at rather than inventing one.

## Considered Options

- Snapshot the main lift's state when substituting and restore it on removal: smaller change, but the substitute loses its progression on every removal, and history stays mislabelled.
- Credit legacy logs to the main lift: avoids guessing, but sessions done on the substitute would display as the main lift once the substitution is removed.
- Credit legacy logs only when the set scheme matches the substitute (3×15 in a T1/T2 slot ⇒ T3-style substitute): only helps T3-style substitutes and adds heuristics.
