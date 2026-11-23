# GZCLP Tracker

Tracks a lifter through the GZCLP program: what to lift next, how each lift progresses, and what was done.

## Language

### Sessions

**Rotating Workout**:
One of the four program sessions (A1, A2, B1, B2) that advance the rotation and drive progression.
_Avoid_: Normal workout, regular day

**Maintenance Day**:
A standalone, non-rotating session that keeps deadlift, squat and bench trained at moderate load without affecting progression.
_Avoid_: Maintenance mode, maintenance phase

**Maintenance Weight**:
The weight a lift is prescribed on Maintenance Day: the lifter's pinned override if one is set, otherwise roughly 80% of the lift's stage-1-equivalent T1 weight. Defined for every T1 lift, including OHP, which is not on Maintenance Day.

**Test Day**:
A standalone, non-rotating session in which the lifter performs 5RM Tests on T1 lifts (as substituted) as part of Return to Progression. Return to Progression may span several Test Days; each offers only the lifts still untested, and Rotating Workouts resume once every stage-ladder lift has a tested 5RM. Substitutes that progress like a T3 are never tested.
_Avoid_: Max day, testing week

**Lift Substitution**:
A user-chosen exercise that stands in for one of the four main lifts wherever that lift appears, in both its T1 and T2 slots. A substitute may opt out of the stage ladder and progress like a T3 instead.
_Avoid_: Swap, alternative

### Progression

**5RM Test**:
Finding the heaviest weight the lifter can complete for five reps on a T1 lift, by ramping sets of five from the lift's maintenance weight in fixed T1-increment steps until a set falls short (or, if the opening set falls short, stepping down until one succeeds). The 5RM is the heaviest weight completed for five; it is never estimated. A T1 lift restarts at stage 1, 5×3, at 85% of it, and its T2 at stage 1, 3×10, at 65% of it.
_Avoid_: Max test, retest

**5RM PR**:
A tested 5RM heavier than every previous tested 5RM for the same lift. It is the only record a Test Day can set; Test Day sets never count toward the records Rotating Workouts compete against.
_Avoid_: Weight PR (which is rep-agnostic and spans all Rotating Workout sets)

**Return to Progression**:
A one-time, user-triggered restart after an extended gap in Rotating Workouts, in which every T1 lift goes through a fresh 5RM Test rather than resuming at the weights left behind. There is no stored "maintenance phase"; the gap itself is the trigger.
_Avoid_: Comeback mode, exiting maintenance, deload
