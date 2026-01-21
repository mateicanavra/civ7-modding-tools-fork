---
id: M10-U04
title: "[M10/U04] Re-home TerrainBuilder elevation + remaining Morphology stamping"
state: planned
priority: 3
estimate: 0
project: engine-refactor-v1
milestone: M10
assignees: []
labels: [morphology, hydrology, ecology, gameplay, refactor]
parent: null
children: []
blocked_by: [M10-U03]
blocked: [M10-U06]
related_to: [M10-U06]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Move remaining engine stamping out of Physics and complete the Gameplay stamping cutover, including TerrainBuilder elevation.

## Deliverables
- `map-morphology` adds `build-elevation`, `plot-mountains`, `plot-volcanoes` Gameplay steps.
- Hydrology/Ecology adapter stamping moves into Gameplay (`map-hydrology`, `map-ecology`).
- Physics steps become truth-only: no adapter writes, no `syncHeightfield`, no adapter latitude reads.
- Recipe ordering updated to the final Phase 2 topology.

## Acceptance Criteria
- `TerrainBuilder.buildElevation()` is called only from Gameplay (`map-morphology/build-elevation`) and provides `effect:map.elevationBuilt`.
- No Hydrology/Ecology Physics step reads `artifact:heightfield` or calls `syncHeightfield`.
- No Hydrology/Ecology Physics step calls `context.adapter.getLatitude(...)` (use `context.env.latitudeBounds`).
- No Morphology Physics step performs adapter writes (`writeHeightfield`, `setFeatureType`, `createFractal`, `getFractalHeight`).
- `map-hydrology` and `map-ecology` stages exist (or equivalent Gameplay steps) and own adapter stamping.

## Testing / Verification
- `REFRACTOR_DOMAINS="morphology,hydrology,ecology" ./scripts/lint/lint-domain-refactor-guardrails.sh`
- `rg -n "artifact:heightfield|hydrologyClimateBaselineArtifacts\\.heightfield|deps\\.artifacts\\.heightfield\\.read" mods/mod-swooper-maps/src`
- `rg -n "adapter\\.getLatitude\\(" mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-* mods/mod-swooper-maps/src/recipes/standard/stages/ecology`
- `rg -n "syncHeightfield\\(" mods/mod-swooper-maps/src packages/mapgen-core/src`
- `rg -n "adapter\\.(createFractal|getFractalHeight)\\(" mods/mod-swooper-maps/src`

## Dependencies / Notes
- Blocked by [M10-U03](./M10-U03-map-morphology-stamping.md).
- Blocks [M10-U06](./M10-U06-tracing-observability-hardening.md).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Final topology cutover (Phase 2 ordering)
- Update recipe order to:
  - `foundation → morphology-pre → morphology-mid → morphology-post → hydrology-* (truth-only) → ecology (truth-only) → map-morphology → map-hydrology → map-ecology → placement`

### Gameplay-owned `build-elevation`
- New `map-morphology` step `build-elevation`:
  - Calls `recalculateAreas()` → `buildElevation()` → `recalculateAreas()` → `stampContinents()`.
  - Asserts **no land/water drift** vs Morphology truth landMask.
  - Provides `effect:map.elevationBuilt`.

### Re-home adapter stamping out of Physics
- Hydrology:
  - Move lake/river adapter modeling out of Physics stages into Gameplay stamping steps.
  - Delete `syncHeightfield` backfeed.
  - Remove legacy `artifact:heightfield` reads in Physics; consume `artifact:morphology.topography` instead.
- Ecology:
  - Move `features` stamping out of Physics into Gameplay.

### Remove adapter reads in Physics
- Replace `context.adapter.getLatitude(...)` with derived latitude from `context.env.latitudeBounds` in Hydrology/Ecology truth steps.

### Remove Morphology adapter writes
- Remove adapter writes and fractal calls from:
  - `morphology-mid/ruggedCoasts.ts`
  - `morphology-post/islands.ts`
  - `morphology-post/mountains.ts`
  - `morphology-post/volcanoes.ts`

### Guardrails (slice-local)
- TerrainBuilder allowlist:
  - `.buildElevation(` callsites only in Gameplay `build-elevation`.
  - `.getElevation(` / `.isCliffCrossing(` only in Gameplay steps requiring `effect:map.elevationBuilt`.
- Ban `writeHeightfield` usage.
- Ban adapter fractal calls (`createFractal`, `getFractalHeight`).
- Enable full-profile guardrail script once Morphology is truth-only:
  - `REFRACTOR_DOMAINS="<slice-domains>" DOMAIN_REFACTOR_GUARDRAILS_PROFILE=full ./scripts/lint/lint-domain-refactor-guardrails.sh`

### Downstream migrations
- `hydrology-climate-baseline/climate-baseline`: remove `buildElevation()` + `stampContinents()` + engine sync/read usage.
- `hydrology-hydrography/rivers`: migrate off `artifact:morphology.routing`.
- `hydrology-climate-baseline/lakes`: move to Gameplay stamping.
- `ecology/features`: move to Gameplay stamping.
- Morphology mid/post steps remove stamping side-effects.

### Exit criteria (pipeline-green)
- No Morphology step performs adapter writes; all stamping occurs in Gameplay steps with map effects.
- No Physics step calls `buildElevation()`; engine reads are gated by `effect:map.elevationBuilt` in Gameplay only.
- Ruthlessness mini-pass in-slice: delete unused legacy helpers and compat exports; run fast gates.

### Files
```yaml
files:
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/buildElevation.ts
    notes: New Gameplay build step; owns `buildElevation()` ordering + effect
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts
    notes: Remove `buildElevation()` + engine sync/read; consume Morphology topography
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-refine/steps/climateRefine.ts
    notes: Remove `adapter.getLatitude`; compute from `context.env.latitudeBounds`
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/helpers/inputs.ts
    notes: Remove `adapter.getLatitude`; compute from `context.env.latitudeBounds`
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts
    notes: Remove adapter writes + fractal access; truth-only
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts
    notes: Remove adapter writes + fractal access; truth-only
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.ts
    notes: Remove adapter writes + fractal access; truth-only
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts
    notes: Remove adapter writes; publish intent truth only
  - path: mods/mod-swooper-maps/src/recipes/standard/recipe.ts
    notes: Final topology order; insert `map-hydrology` + `map-ecology` after `map-morphology`
```

### Prework Prompt (Agent Brief)
Delete this prompt section once the prework is completed.

### buildElevation() ordering parity (stampContinents after build)
- Purpose: Confirm whether `stampContinents()` after `buildElevation()` is required by Civ7 materialization.
- Expected output:
  - Compare current TS ordering (`mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts`) vs legacy JS orchestrator (`docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/map_orchestrator.js`) and extracted Civ7 scripts if available.
  - Identify downstream consumers that require post-`buildElevation()` `stampContinents()` evidence.
  - Recommendation: keep Phase 2 ordering or open a Phase 2 canon correction follow-up (out of scope for M10 implementation).

### Hydrology rivers without `artifact:morphology.routing`
- Purpose: Phase 2 locks `artifact:morphology.routing` as Morphology-internal; Hydrology must consume public truth artifacts instead.
- Expected output:
  - Inventory call paths that read `artifact:morphology.routing` and what they use it for.
  - Propose minimal replacement inputs for Hydrology rivers (prefer `artifact:morphology.topography` + `artifact:morphology.substrate`).
  - Provide concrete contract patch list:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.contract.ts`
    - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts`
    - Any Morphology internal exports that can be deleted once migration lands.
  - Define slice-local verification for “no routing backfeed” (contract guard + `rg`).
- Sources to check:
  - Phase 2 authority: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`
  - Current code: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts`

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
