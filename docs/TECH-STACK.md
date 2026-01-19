# GZCLP Tracker - Tech Stack

## Core Stack

| Layer | Technology | Why |
|-------|------------|-----|
| **Framework** | React 18 | Ecosystem, hooks, concurrent features |
| **Language** | TypeScript | Type safety for data models and progression logic |
| **Build Tool** | Vite | Fast HMR, native ESM, excellent PWA plugin |
| **Styling** | Tailwind CSS | Rapid UI development, small production bundle |

## Data & State

| Purpose | Technology | Why |
|---------|------------|-----|
| **Local Storage** | Dexie.js (IndexedDB wrapper) | Clean API, TypeScript support, reactive queries |
| **State Management** | Zustand | Minimal, no boilerplate, works great with React |
| **Data Sync (v2)** | TBD (Supabase, Firebase, or custom) | Future consideration |

## PWA

| Feature | Technology |
|---------|------------|
| **Service Worker** | vite-plugin-pwa (Workbox) |
| **Manifest** | Auto-generated via vite-plugin-pwa |
| **Icons** | PWA asset generator |

## UI Components

| Purpose | Approach |
|---------|----------|
| **Component Library** | Custom components with Tailwind |
| **Icons** | Lucide React (lightweight, tree-shakeable) |
| **Notifications** | Web Notifications API + Vibration API |
| **Timer** | Web Audio API for alerts |

## Development

| Tool | Purpose |
|------|---------|
| **Package Manager** | pnpm (fast, disk efficient) |
| **Linting** | ESLint + Prettier |
| **Testing** | Vitest (unit), Playwright (e2e) |
| **Git Hooks** | None (keep it simple) |

---

## Project Structure

```
gzclp-tracker/
├── docs/
│   ├── GZCLP-ROUTINE.md
│   ├── SPECS.md
│   └── TECH-STACK.md
├── public/
│   ├── icons/
│   └── manifest.webmanifest
├── src/
│   ├── components/
│   │   ├── ui/              # Button, Card, Timer, etc.
│   │   ├── workout/         # SetLogger, ExerciseCard, etc.
│   │   └── plates/          # PlateCalculator, BarDiagram
│   ├── hooks/
│   │   ├── useWorkout.ts
│   │   ├── useTimer.ts
│   │   └── useProgression.ts
│   ├── lib/
│   │   ├── db.ts            # Dexie database setup
│   │   ├── progression.ts   # GZCLP logic (pure functions)
│   │   ├── plates.ts        # Plate calculator logic
│   │   └── types.ts         # TypeScript interfaces
│   ├── stores/
│   │   ├── workoutStore.ts
│   │   └── settingsStore.ts
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Workout.tsx
│   │   ├── History.tsx
│   │   └── Settings.tsx
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css            # Tailwind imports
├── index.html
├── vite.config.ts
├── tailwind.config.js
├── tsconfig.json
├── package.json
└── README.md
```

---

## Key Dependencies

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x",
    "react-router-dom": "^6.x",
    "dexie": "^4.x",
    "dexie-react-hooks": "^1.x",
    "zustand": "^4.x",
    "lucide-react": "^0.x"
  },
  "devDependencies": {
    "typescript": "^5.x",
    "vite": "^5.x",
    "vite-plugin-pwa": "^0.x",
    "@vitejs/plugin-react": "^4.x",
    "tailwindcss": "^3.x",
    "autoprefixer": "^10.x",
    "postcss": "^8.x",
    "eslint": "^8.x",
    "prettier": "^3.x",
    "vitest": "^1.x"
  }
}
```

---

## Architecture Decisions

### Why Dexie over raw IndexedDB?
- Cleaner promise-based API
- Built-in TypeScript support
- `useLiveQuery` hook for reactive data
- Easier migrations/versioning

### Why Zustand over Context/Redux?
- Minimal boilerplate
- No providers needed
- Works outside React (useful for progression logic)
- Tiny bundle size (~1kb)

### Why custom components over a UI library?
- Full control over mobile UX
- Smaller bundle
- Tailwind makes it fast anyway
- No fighting library opinions

### Progression logic as pure functions
- Easy to test
- No side effects
- Can run on any platform (future native apps)
- Located in `lib/progression.ts`

---

## PWA Configuration

```typescript
// vite.config.ts (simplified)
import { VitePWA } from 'vite-plugin-pwa'

export default {
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'GZCLP Tracker',
        short_name: 'GZCLP',
        theme_color: '#000000',
        display: 'standalone',
        start_url: '/',
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}']
      }
    })
  ]
}
```

---

## Performance Targets

| Metric | Target |
|--------|--------|
| First Contentful Paint | < 1.5s |
| Time to Interactive | < 3s |
| Lighthouse PWA Score | 100 |
| Bundle Size (gzipped) | < 100kb |
| Offline-capable | 100% |
