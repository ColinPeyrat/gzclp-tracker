# GZCLP Tracker - App Specifications

## Overview

A Progressive Web App for tracking the GZCLP weightlifting program. The app handles all progression logic automatically, letting users focus on lifting.

---

## Platform & Architecture

### Platform
- **Progressive Web App (PWA)**
- Installable on mobile and desktop
- Works fully offline
- Responsive design (mobile-first)

### Data Storage
- **Local-first**: IndexedDB for primary storage
- **Optional cloud sync**: User accounts for backup/cross-device sync (v2)
- App must work 100% offline with no account

### Tech Stack
- Frontend: TBD (React, Vue, Svelte, etc.)
- Storage: IndexedDB (via Dexie.js or similar)
- PWA: Service Worker + Web App Manifest

---

## Core Features (v1)

### 1. Workout Tracking

#### Starting the Program
- User inputs starting weights for each lift (Squat, Bench, Deadlift, OHP)
- App validates weights are reasonable (positive numbers, divisible by 5)
- Option to start with empty bar / suggested beginner weights

#### Active Workout Flow
1. App shows today's workout (e.g., "A1: Squat / Bench / Lat Pulldown")
2. For each exercise, display:
   - Exercise name
   - Current weight
   - Target sets × reps (e.g., "5×3+")
   - Checkboxes/buttons for each set
3. User logs each set as complete or failed
4. Final set (AMRAP): user enters actual rep count
5. After all exercises complete, workout is saved

#### Set Logging UI
```
Squat - 185 lbs
Set 1: [3] ✓
Set 2: [3] ✓
Set 3: [3] ✓
Set 4: [3] ✓
Set 5: [8] ✓  ← AMRAP (user entered 8)
```

### 2. Auto-Progression Logic

The app automatically calculates the next workout based on performance.

#### T1 Progression Rules
| Current Stage | Success | Failure |
|---------------|---------|---------|
| 5×3+ | Add 5/10 lbs, stay at 5×3 | Keep weight, move to 6×2+ |
| 6×2+ | Add 5/10 lbs, stay at 6×2 | Keep weight, move to 10×1+ |
| 10×1+ | Test new 5RM → reset to 85% at 5×3 | Test new 5RM → reset to 85% at 5×3 |

#### T2 Progression Rules
| Current Stage | Success | Failure |
|---------------|---------|---------|
| 3×10 | Add 5/10 lbs, stay at 3×10 | Keep weight, move to 3×8 |
| 3×8 | Add 5/10 lbs, stay at 3×8 | Keep weight, move to 3×6 |
| 3×6 | Add 5/10 lbs, stay at 3×6 | Reset to 3×10 at (last 3×10 weight + 15 lbs) |

#### T3 Progression Rules
- Track AMRAP reps on final set
- When AMRAP ≥ 25 reps: prompt to increase weight next session
- Weight increase: smallest available increment (typically 5 lbs or 2.5 lbs)

#### Weight Increments
- Upper body (Bench, OHP): +5 lbs
- Lower body (Squat, Deadlift): +10 lbs
- T3 exercises: +5 lbs (or smallest increment)

### 3. Workout History

#### History View
- List of past workouts (newest first)
- Each entry shows: date, workout type (A1/A2/B1/B2), summary
- Tap to expand full workout details

#### Workout Detail View
- All exercises with weights, sets, reps
- AMRAP results
- Notes (if any)
- Visual indicator for failed sets

#### Progress Charts (stretch goal for v1)
- Weight over time per lift
- Estimated 1RM trend

### 4. Rest Timer

#### Behavior
- Auto-starts after logging a set
- Duration based on tier:
  - T1: 3 minutes (configurable 3-5 min)
  - T2: 2 minutes (configurable 2-3 min)
  - T3: 90 seconds (configurable 60-90 sec)
- Audio/vibration alert when timer ends
- Option to skip or add time

#### UI
- Countdown display (prominent)
- +30s / -30s buttons
- Skip button
- Runs in background (notification on mobile)

### 5. Plate Calculator

#### Functionality
- Given a target weight, show which plates to load on each side
- Account for bar weight (default 45 lbs, configurable)
- Support common plate inventory: 45, 35, 25, 10, 5, 2.5 lbs

#### UI
- Visual barbell diagram showing plates
- List view: "Each side: 45 + 25 + 10 + 2.5"
- Shown on workout screen next to current weight

#### Customization
- Configurable bar weight (45 lbs standard, 35 lbs, 15 lbs for some bars)
- Configurable available plates (user's gym might lack 35s or 2.5s)

---

## Data Model

### Lift
```typescript
interface Lift {
  id: string;
  name: string;                    // "Squat", "Bench Press", etc.
  type: "barbell" | "dumbbell" | "cable" | "machine";
  incrementLbs: number;            // 5 or 10
}
```

### LiftState (current progression state per lift)
```typescript
interface LiftState {
  liftId: string;
  tier: "T1" | "T2" | "T3";
  currentWeightLbs: number;
  currentStage: number;            // 1, 2, or 3
  lastSuccessWeightLbs?: number;   // For T2 reset calculation
}
```

### Workout
```typescript
interface Workout {
  id: string;
  date: string;                    // ISO date
  type: "A1" | "A2" | "B1" | "B2";
  exercises: ExerciseLog[];
  completed: boolean;
  notes?: string;
}
```

### ExerciseLog
```typescript
interface ExerciseLog {
  liftId: string;
  tier: "T1" | "T2" | "T3";
  targetWeightLbs: number;
  targetSets: number;
  targetReps: number;
  sets: SetLog[];
}
```

### SetLog
```typescript
interface SetLog {
  setNumber: number;
  reps: number;                    // Actual reps completed
  completed: boolean;
  isAmrap: boolean;
}
```

### UserSettings
```typescript
interface UserSettings {
  barWeightLbs: number;            // Default 45
  availablePlates: number[];       // [45, 35, 25, 10, 5, 2.5]
  restTimers: {
    t1Seconds: number;             // Default 180
    t2Seconds: number;             // Default 120
    t3Seconds: number;             // Default 90
  };
  weightUnit: "lbs" | "kg";
}
```

---

## Screens

### 1. Home / Dashboard
- Next workout preview (type, exercises, weights)
- "Start Workout" button
- Quick stats (current week, streak, etc.)

### 2. Active Workout
- Current exercise with weight and set/rep scheme
- Set logging buttons
- Rest timer (appears after set completion)
- Plate calculator (collapsible)
- Next/previous exercise navigation
- "Finish Workout" button

### 3. History
- Scrollable list of past workouts
- Filter by lift or date range
- Tap to view details

### 4. Progress (stretch for v1)
- Charts showing weight progression per lift
- PR tracking

### 5. Settings
- Starting weights / current weights adjustment
- Bar weight
- Available plates
- Rest timer durations
- Weight unit (lbs/kg)
- Data export/import
- (v2) Account/sync settings

---

## User Flows

### First Launch
1. Welcome screen explaining the app
2. "Set up your program" → enter starting weights for 4 main lifts
3. Optional: configure bar weight and plates
4. Ready to start first workout

### Daily Workout
1. Open app → see today's workout
2. Tap "Start Workout"
3. For each exercise:
   a. View target weight and sets
   b. Complete sets, logging each one
   c. Rest timer runs between sets
4. Tap "Finish Workout"
5. App calculates next session's weights

### Viewing History
1. Tap History tab
2. Scroll through past workouts
3. Tap any workout to see full details

### Failed Lift Handling
1. User fails to complete required sets
2. App shows message: "Couldn't complete 5×3? No problem. Next session will be 6×2 at the same weight."
3. Progression state updates automatically

---

## Edge Cases

### Missed Workouts
- No penalty; user picks up where they left off
- App doesn't assume specific days—just tracks workout sequence

### Skipped Exercises
- User can skip an exercise (injury, equipment unavailable)
- That exercise keeps its current state for next time

### Manual Weight Override
- User can manually adjust any weight before or during workout
- Useful for deloads or when plates aren't available

### Mid-Workout Quit
- Auto-save progress as user logs sets
- "Resume Workout" option if app closed mid-session

---

## Future Features (v2+)

- Cloud sync with user accounts
- Custom T3 exercise library
- Body weight tracking
- Workout reminders/notifications
- Apple Watch / Wear OS companion
- Share workouts with friends
- 1RM calculator and PR tracking
- Dark mode
- Multiple program variations (standard GZCLP, custom templates)

---

## Success Metrics

- User completes workout without confusion
- Progression logic matches GZCLP rules exactly
- App works fully offline
- Workout logging takes <30 seconds per set
