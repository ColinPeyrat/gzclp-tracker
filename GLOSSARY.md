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
The weight a lift is prescribed on Maintenance Day: the lifter's pinned override if one is set, otherwise roughly 80% of the stage-1-equivalent T1 weight of the exercise currently filling that lift (its substitute, if any). Changing the lift's substitution clears the pinned override. Defined for every T1 lift, including OHP, which is not on Maintenance Day.

**Test Day**:
A standalone, non-rotating session in which the lifter performs 5RM Tests on T1 lifts (as substituted) as part of Return to Progression. Return to Progression may span several Test Days; each offers only the lifts still untested, and Rotating Workouts resume once every stage-ladder lift has a tested 5RM. Substitutes that progress like a T3 are never tested.
_Avoid_: Max day, testing week

**Lift Substitution**:
A user-chosen exercise that stands in for a main lift (in both its T1 and T2 slots) or for a T3 wherever it appears. The substitute brings its own Exercise Progression; the replaced lift's progression lies dormant until the substitution is removed. A main-lift substitute may opt out of the stage ladder and progress like a T3 instead. One exercise substitutes for at most one lift at a time.
_Avoid_: Swap, alternative

**Performed Exercise**:
The exercise actually done in a logged session: the substitute when one was active, otherwise the program's lift. History, records and medals are credited to it, never to the slot it filled.

### Progression

**Exercise Progression**:
Where an exercise stands in the program: its working weight, plus its stage and last stage-1 weight for each tier when it climbs the stage ladder. It belongs to the exercise, not to the lift slot it fills, so it survives a substitution being removed and re-added.
_Avoid_: Lift state, slot weight

**5RM Test**:
Finding the heaviest weight the lifter can complete for five reps on a T1 lift, by ramping sets of five from the lift's maintenance weight in fixed T1-increment steps until a set falls short (or, if the opening set falls short, stepping down until one succeeds). The 5RM is the heaviest weight completed for five; it is never estimated. A T1 lift restarts at stage 1, 5×3, at 85% of it, and its T2 at stage 1, 3×10, at 65% of it.
_Avoid_: Max test, retest

**5RM PR**:
A tested 5RM heavier than every previous tested 5RM for the same lift. It is the only record a Test Day can set; Test Day sets never count toward the records Rotating Workouts compete against.
_Avoid_: Weight PR (which is rep-agnostic and spans all Rotating Workout sets)

**Return to Progression**:
A one-time, user-triggered restart after an extended gap in Rotating Workouts, in which every T1 lift goes through a fresh 5RM Test rather than resuming at the weights left behind. There is no stored "maintenance phase"; the gap itself is the trigger.
_Avoid_: Comeback mode, exiting maintenance, deload
