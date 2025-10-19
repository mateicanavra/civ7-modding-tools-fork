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

### Phase 2 Cleanup — Remove Legacy Three-Band Landmass Fallback

- [x] Stabilize the plate-first path before ripping anything out.
  - [x] Lift the ocean-separation math out of `layers/landmass.js` into a shared helper (now `applyPlateAwareOceanSeparation` in `landmass_utils.js`) so both Voronoi and plate-driven generators can reuse it.
  - [x] Call that helper inside `map_orchestrator.js` immediately after Voronoi or plate windows are produced, keeping `applyLandmassPostAdjustments` for the post tweaks.
  - [x] Verify WorldModel-off runs still succeed by leaning on the Civ VII Voronoi builder; document/emit a hard failure if both generators bail.
- [x] Remove the legacy generator and tighten orchestration.
  - [x] Delete `layers/landmass.js`.
  - [x] Drop the fallback branch in `map_orchestrator.js` (`layerCreateDiverseLandmasses`, `"bands"` logging) and replace it with an explicit error path when no windows are returned.
- [x] Trim configuration surfaces that only existed for the three-band preset.
  - [x] Strip `geometry.presets`/`bands` from `bootstrap/defaults/base.js` and the TypeScript typedefs in `map_config.types.js`, keeping only the post-adjustment knobs.
  - [x] Update every preset (`classic`, `temperate`, `voronoi`, custom variants) to remove the legacy geometry fields and rely on plate-first defaults.
- [x] Update documentation and trackers.
  - [x] Refresh `SWOOPER_MAPS_ARCHITECTURE_AUDIT.md` to describe the new landmass flow and delete the “legacy three-band” wording.
  - [x] Note in this plan that Voronoi → plate-mask is now the only fallback chain.
- [ ] Validation & rollout.
  - [ ] Smoke-test Voronoi, Desert Mountains, and other plate-heavy presets with the unified plate pipeline.
  - [ ] Force a WorldModel init failure to confirm the abort message.
  - [x] Run `pnpm lint` and `pnpm test`; schedule the in-game seed sweep before final sign-off.

## Upcoming Phases

### Phase 3 – Corridor Enforcement
- Guard island placement in `layers/islands.js` using corridor width rules.
- Tame rugged coasts within corridor sea lanes (`layers/coastlines.js`).
- Add validation/metrics pass for corridor widths (new helper or orchestrator hook).

### Phase 4 (Optional) – Plate-Grown Landmass
- Experiment with using base-game plate growth as primary landmass stage, keeping Swooper refiners on top.
- Alternatively, prototype a custom plate growth algorithm fed by `WorldModel` data.

## Legacy Safety Nets (Keep Until Phase 2 Sign-off)

- `layers/landmass_plate.js` – shield-stability fallback mask.
- Plate-driven landmass generation is the primary path; the legacy Voronoi helper has been removed.

## Validation & Testing Checklist

- Smoke-test Huge and Standard presets (`swooper-desert-mountains.js`, Voronoi preset) with multiple seeds.
- Inspect `Scripting.log` for timing/WorldModel summaries and new ASCII overlays.
- Run `pnpm lint` + `pnpm test` after feature work; add Vitest coverage for exposed config surfaces when feasible.
- Verify XML/doc examples mirror `civ7-official-resources` schemas when updating documentation.

## Notes & Constraints

- Keep Civ VII’s official `WorldModel` data authoritative—our tweaks layer on top only.
- Do not modify files under `mods/mod-swooper-maps/mod/maps/base-standard/`; they mirror Firaxis assets.
- Continue using the adapter pattern for engine calls so headless tests remain possible.
