# GZCLP Tracker - TODO

## Done

### Setup & Scaffolding
- [x] Initialize Vite + React + TypeScript project
- [x] Install dependencies (Dexie, Zustand, Tailwind, PWA plugin, Lucide)
- [x] Configure Tailwind CSS v4
- [x] Configure PWA (manifest, service worker)
- [x] Set up project structure

### Core Logic
- [x] Define TypeScript types and interfaces
- [x] Define workout structure (A1, A2, B1, B2)
- [x] Implement T1 progression logic
- [x] Implement T2 progression logic
- [x] Implement T3 progression logic
- [x] Implement plate calculator

### Data Layer
- [x] Set up Dexie database
- [x] Create program state store (Zustand)
- [x] Create settings store (Zustand)

### Pages
- [x] Home page (next workout preview)
- [x] Setup page (initial weight entry)
- [x] Routing setup

### Active Workout Screen
- [x] Workout session hook (useWorkoutSession)
- [x] Exercise display (name, weight, sets×reps)
- [x] Set logging UI (tap to complete)
- [x] AMRAP input for last set
- [x] Rest timer with add/skip controls
- [x] Plate calculator display
- [x] Exercise navigation (T1 → T2 → T3)
- [x] Finish workout flow
- [x] Save workout to IndexedDB
- [x] Calculate and apply progression after workout

### Units Support
- [x] Unit selection on setup (lbs/kg)
- [x] Unit-specific defaults (bar weight, plates, increments)
- [x] Display correct unit throughout app
- [x] Correct progression increments per unit

---

### History Page
- [x] List past workouts (with date, workout type, weight)
- [x] Workout detail view (all exercises, sets, reps)
- [x] Workout statistics modal (total volume, reps, sets, heaviest lift)
- [ ] Filter/search (future)

---

## TODO

### Settings Page
- [x] Bar weight configuration
- [x] Available plates configuration
- [x] Rest timer durations
- [x] Data export/import
- [x] Reset program
- [x] Custom exercises (replace any lift with custom name, optional T3 progression)

### Polish
- [x] Loading states
- [x] Error handling
- [x] Empty states
- [x] Haptic feedback on mobile
- [x] Sound for timer
- [x] Confirmation before leaving active workout

### Workout
- [x] Warmup sets modal (simplified big plates, additive loading)
- [x] Long press to edit set reps

### PWA
- [x] App icons (SVG-based)
- [x] Splash screen (theme color configured)
- [x] Offline indicator

---

## Future (v2)

### Features
- [ ] Progression tab (main lifts chart over time + optimistic projections)
- [ ] 1RM tracking
- [x] Add T3 exercises to the routine (T3 library management in Settings)
- [x] Add T3 exercises on the fly during a workout

---

## Future (v3)

### Cloud Sync
- [ ] SSO login (Google)
- [ ] Sync data to cloud database
