# Plate pipeline follow-ups

## Why
- Avoid stale tunable snapshots in the WorldModel and surface plate diagnostics reliably.
- Keep landmass/ocean shaping localized to plate geometry instead of global bands.
- Reduce hidden side-effects between plate generation, ocean separation, and relief.

## Actions to schedule
1) **Config flow:** Make `WorldModel.init()` fetch tunables at call time (or expose getters) instead of reading module-scope values. Remove any lingering snapshots that can drift after `rebind()`.
2) **Landmass shaping:** Centralize plate window derivation + vertical/horizontal padding in one helper. Share that with ocean separation and coast shaping so no stage assumes full-height windows.
3) **Ocean separation policy:** Move the policy into a dedicated stage config consumed directly by `applyPlateAwareOceanSeparation`; disable or scope it by default. Add per-band clamps and boundary thresholds to prevent map-wide trenches.
4) **Diagnostics harness:** Add a replayable CLI/Vitest check for WorldModel outputs (given width/height/seed/config) that asserts boundary/uplift distributions. Include a “plate preset” option (seed + axis + convergence) for deterministic debugging.
5) **Logging ergonomics:** Provide a single “plate debug” toggle that enables foundation seed/summary/ASCII/boundary metrics for one run, and ensure it auto-disables in release presets.

## Risks if deferred
- Plate overrides may silently regress again, reintroducing biased relief or ocean cuts.
- Ocean separation can carve full-height channels when configs change.
- Refactors to plate or coast logic may ship without visibility into boundary distribution.

## Suggested ordering
1) Config flow + logging toggle (fast, low risk).
2) Landmass/ocean policy consolidation.
3) Diagnostic harness + plate preset support.
