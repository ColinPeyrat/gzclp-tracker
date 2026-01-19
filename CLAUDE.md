# GZCLP Tracker

A PWA for tracking the GZCLP weightlifting program.

## Quick Reference

### GZCLP Program Structure

**Tiers per workout:**
- T1: Heavy compound (5×3+ → 6×2+ → 10×1+)
- T2: Volume compound (3×10 → 3×8 → 3×6)
- T3: Accessories (3×15+)

**Four workout rotation:**
| Workout | T1 | T2 | T3 |
|---------|-----|-----|-----|
| A1 | Squat | Bench | Lat Pulldown |
| A2 | OHP | Deadlift | DB Row |
| B1 | Bench | Squat | Lat Pulldown |
| B2 | Deadlift | OHP | DB Row |

**Progression (based on TOTAL reps, not individual sets):**
- Success = total reps ≥ target (e.g., 5×3 = 15 reps minimum)
- T1 Success: +5 lbs upper / +10 lbs lower (or +2.5/+5 kg)
- T2 Success: +2.5 lbs upper / +5 lbs lower (or +1.25/+2.5 kg) — half of T1
- Failure: Keep weight, move to next stage (e.g., 5×3 → 6×2)
- T1 Stage 3 fail: Test new 5RM, reset to 85% at 5×3
- T2 Stage 3 fail: Reset to 3×10 at last stage 1 weight + 15 lbs
- T3: Increase weight when AMRAP hits 25 reps

**AMRAP purpose:** The last set being AMRAP allows you to make up for missed reps in earlier sets. What matters is hitting the total rep target.

**Rest times:** T1: 3-5 min, T2: 2-3 min, T3: 60-90 sec

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build:** Vite + vite-plugin-pwa
- **Styling:** Tailwind CSS v4 (using @import 'tailwindcss')
- **Storage:** Dexie.js (IndexedDB)
- **State:** Zustand
- **Icons:** Lucide React
- **Package Manager:** Bun

## Project Structure

```
src/
├── lib/
│   ├── types.ts        # Interfaces, constants (WORKOUTS, LIFTS, etc.)
│   ├── db.ts           # Dexie setup, getSettings, getProgramState, etc.
│   ├── progression.ts  # Pure functions: calculateT1Progression, calculateT2Progression
│   └── plates.ts       # calculatePlates, formatPlates
├── stores/
│   ├── programStore.ts # Program state, initialize, advanceWorkout
│   └── settingsStore.ts
├── pages/
│   ├── Home.tsx        # Dashboard, next workout preview
│   ├── Setup.tsx       # Initial weight setup (with unit selection)
│   ├── Workout.tsx     # Active workout screen
│   ├── History.tsx     # Past workouts list and detail
│   └── Settings.tsx    # User settings (TODO)
├── components/
│   ├── ui/             # Reusable UI components
│   ├── workout/        # Workout-specific components
│   └── plates/         # Plate calculator components
└── hooks/              # Custom hooks
```

## Key Data Models

```typescript
// Lift state tracks current weight and stage for each lift/tier
interface LiftState {
  liftId: LiftName
  tier: Tier
  weightLbs: number
  stage: 1 | 2 | 3
  lastStage1WeightLbs?: number // For T2 reset calculation
}

// Program state is the main persisted state
interface ProgramState {
  t1: Record<LiftName, LiftState>
  t2: Record<LiftName, LiftState>
  t3: Record<string, { weightLbs: number }>
  nextWorkoutType: WorkoutType
  workoutCount: number
}

// Workout is a completed session
interface Workout {
  id: string
  date: string
  type: WorkoutType
  exercises: ExerciseLog[]
  completed: boolean
}
```

## Commands

```bash
bun dev      # Start dev server
bun build    # Production build
bun preview  # Preview production build
```

## Current State

See `TODO.md` for detailed progress tracking.

## Design Decisions

- **Local-first:** Works 100% offline, no account required
- **Progression as pure functions:** Easy to test, no side effects
- **Mobile-first:** Designed for phone use at the gym
- **Dark theme:** Easier on eyes, standard for fitness apps
