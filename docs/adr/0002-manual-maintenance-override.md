# 2. Manual maintenance weight override with drift detection

- Status: **proposed**
- Date: 2026-09-01

## Context

ADR 0001 made maintenance weight fully computed. Computed weight cannot know that a lift
feels wrong on the day, so users want to pin their own number.

The weight was already adjustable *during* a session — the maintenance screen is the normal
workout screen, and `ExerciseCard` wires `onWeightChange` to
`updateCurrentExerciseWeight`. What was missing is **durability**: the adjustment did not
survive the session.

Durability is exactly where the risk is. A stored absolute weight is frozen while
`lastSuccessWeight` keeps moving, so an override drifts out of date silently. Set squat
maintenance to 90 kg when the computed value is 85, and several cycles later the computed
value is 115 while the session still prescribes 90 — a deliberate small bump has quietly
become a large deficit. This is the failure mode of commit `1a44d68` (*"maintenance uses
last validated weight, not next target"*): a stored weight detaching from reality.

Percentage and offset overrides avoid staleness by construction, since they re-derive from
`lastSuccessWeight` on every read. Both were rejected as less direct than the absolute
weight users actually want to type.

## Decision

Store an absolute override per maintenance lift in `UserSettings`:

```typescript
interface MaintenanceOverride {
  weight: number     // what to lift
  autoAtSet: number  // the computed weight when this override was set
}

maintenanceOverrides?: Partial<Record<LiftName, MaintenanceOverride>>
```

`getMaintenancePrescription` resolves a lift to `{ weight, autoWeight, isOverridden,
hasDrifted }`. Every surface that shows an overridden weight also shows `autoWeight`, so
divergence is visible by construction rather than discoverable only in Settings.

Staleness is measured as **drift of the computed weight from `autoAtSet`**, not as distance
between the override and the current computed weight. Past a 10% threshold the override is
flagged with a one-tap revert.

## Consequences

- A deliberate offset never nags, however large — only a *changed lifter* raises the flag.
  Measuring override-vs-current-auto instead would warn permanently on an intentional
  offset, and a permanent warning is one users learn to ignore.
- The threshold is 10% rather than one increment. The computed weight moves on every
  successful T1 session, so a tighter threshold would fire near-weekly and train the user
  to dismiss it.
- The sharpest staleness case is handled with no special-casing: a stage 3 failure runs
  `applyT1Reset`, which clears `lastSuccessWeight`, collapsing the computed weight and
  tripping the flag on its own.
- `maintenanceOverrides` is optional and settings are spread from storage, so existing
  users need no migration.
- An override is not clamped. A user can pin any weight, including one well above their
  working weight — consistent with the in-workout weight editor, which does not clamp
  either.
- `autoAtSet` is re-snapshotted on every edit, so the baseline always reflects the moment
  of the most recent decision.

## Alternatives considered

- **Percentage override per lift.** Re-derives from `lastSuccessWeight`, so it can never go
  stale and needs no `autoAtSet`. Rejected: users think in kilos, not multipliers, and the
  request was explicitly to type a weight.
- **Offset from computed (+5 kg).** Also immune to staleness and reads naturally. Rejected
  for the same directness reason, plus a fixed delta shrinks in relative terms as the base
  grows.
- **No flag, rely on showing the computed value.** Zero extra state. Rejected: a value
  rendered beside a number on every screen becomes invisible with familiarity, which is
  precisely when a months-old override does its damage.
