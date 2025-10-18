# Swooper Maps Plate Refactor – Unified Plan

Unified tracker for the plate-driven landmass refactor. This document replaces both
`PLATE_REFACTOR_PLAN.md` and `REFACTORING_PROGRESS.md`.

## Status Snapshot

- ✅ Phase 1 – MapContext/adapter seam completed (`core/types.js`, `core/adapters.js`, orchestrator threading).
- ✅ Phase 1.5 – Civ VII Voronoi plates wired in (`world/plates.js`, `world/model.js`, `landmass_voronoi.js`).
- ⏳ Phase 2 – Plate-driven terrain & climate tuning in progress (mountains/hills/config work outstanding).
- ⏳ Phase 3 – Corridor policy enforcement queued.
- ⏳ Phase 4 – Optional plate-grown landmass experiments (defer until Phase 2+3 ship).

## Active Focus — Phase 2 (Terrain & Climate)

- [x] Landmass pipeline consumes Voronoi plates (new preset + orchestrator windows).
- [ ] Validate Voronoi output in-game (seed parity, shoreline sanity, start placement checks).
- [x] Re-tune mountains & hills to honor uplift/rift/boundary data (`layers/mountains.js`, hill helpers, fallback knobs).
  - New WorldModel-driven weighting blends uplift, boundary closeness, and rift penalties; follow up with in-game validation and tweak presets if needed.
- [ ] Expand plate-aware configuration surface (tunables, presets, docs) so post-processing ranges are exposed.
  - [x] Thread new `mountains` config block through bootstrap → orchestrator → `layerAddMountainsPhysics`.
  - [x] Surface plate-aware volcano toggles/weights (convergent arcs vs. interior hot spots).
  - [x] Expose coastline boundary bias knobs (`coastlines.js`) so convergent/transform margins can be tuned per preset.
  - [x] Add plate-aware ocean separation/water knobs (worldModel policy → landmass/coast shaping).
  - [x] Refresh presets/README snippets to document the exposed knobs and defaults.
- [ ] Observability: improve plate debugging overlays.
  - [x] Add DEV ASCII snapshot that annotates plate boundaries alongside terrain.
  - [x] Surface lightweight boundary metrics (counts, hotspots) in logs.
- [ ] Cross-layer consumers audit: ensure climate/coastline passes actually read `WorldModel` fields or document gaps.
  - [ ] Future climate/story config: plan plate-aware toggles for climate refinements (rainbelts, rainforests) and paleo/canyon passes.

## Upcoming Phases

### Phase 3 – Corridor Enforcement
- Guard island placement in `layers/islands.js` using corridor width rules.
- Tame rugged coasts within corridor sea lanes (`layers/coastlines.js`).
- Add validation/metrics pass for corridor widths (new helper or orchestrator hook).

### Phase 4 (Optional) – Plate-Grown Landmass
- Experiment with using base-game plate growth as primary landmass stage, keeping Swooper refiners on top.
- Alternatively, prototype a custom plate growth algorithm fed by `WorldModel` data.

## Legacy Safety Nets (Keep Until Phase 2 Sign-off)

- `layers/landmass.js` – legacy three-band landmass generator.
- `layers/landmass_plate.js` – shield-stability fallback mask.
- Both remain callable until plate pipeline is fully verified in live games.

## Validation & Testing Checklist

- Smoke-test Huge and Standard presets (`swooper-desert-mountains.js`, Voronoi preset) with multiple seeds.
- Inspect `Scripting.log` for timing/WorldModel summaries and new ASCII overlays.
- Run `pnpm lint` + `pnpm test` after feature work; add Vitest coverage for exposed config surfaces when feasible.
- Verify XML/doc examples mirror `civ7-official-resources` schemas when updating documentation.

## Notes & Constraints

- Keep Civ VII’s official `WorldModel` data authoritative—our tweaks layer on top only.
- Do not modify files under `mods/mod-swooper-maps/mod/maps/base-standard/`; they mirror Firaxis assets.
- Continue using the adapter pattern for engine calls so headless tests remain possible.
