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
- No cross-stage helper imports; no step imports from `domain/**/ops/**/rules/**`.

## Testing / Verification
- `REFRACTOR_DOMAINS="morphology,hydrology,ecology" ./scripts/lint/lint-domain-refactor-guardrails.sh`
- `rg -n "artifact:heightfield|hydrologyClimateBaselineArtifacts\\.heightfield|deps\\.artifacts\\.heightfield\\.read" mods/mod-swooper-maps/src`
- `rg -n "adapter\\.getLatitude\\(" mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-* mods/mod-swooper-maps/src/recipes/standard/stages/ecology`
- `rg -n "syncHeightfield\\(" mods/mod-swooper-maps/src packages/mapgen-core/src`
- `rg -n "adapter\\.(createFractal|getFractalHeight)\\(" mods/mod-swooper-maps/src`
- `rg -n "src/recipes/standard/stages/.*/steps/helpers/" mods/mod-swooper-maps/src/recipes/standard/stages/morphology-*`
- `rg -n "src/domain/.*/ops/.*/rules" mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-*`

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

### Prework Findings (Complete)

#### 1) `buildElevation()` ordering parity (`stampContinents()` after build?)

**Current TS ordering (legacy wiring):**
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts` calls:
  - `recalculateAreas()` → `buildElevation()` → `recalculateAreas()` → `stampContinents()` → `syncHeightfield()`.

**Other TS callsites:**
- `adapter.buildElevation()` appears only in `hydrology-climate-baseline/steps/climateBaseline.ts`.
- `adapter.stampContinents()` appears in:
  - `morphology-pre/steps/landmassPlates.ts` (early) and
  - `hydrology-climate-baseline/steps/climateBaseline.ts` (late).

**Legacy JS orchestrator behavior (repo archive):**
- Stamps continents **before** building elevation:
  - Post-landmass: `validateAndFixTerrain()` → `recalculateAreas()` → `stampContinents()`. (`docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/map_orchestrator.js`)
- Builds elevation later without restamping continents afterward (no `stampContinents()` after `buildElevation()` in the archive).

**Extracted Civ7 base-standard scripts (if `.civ7/outputs/resources` exists locally):**
- Base-standard maps consistently call:
  - `AreaBuilder.recalculateAreas()` → `TerrainBuilder.stampContinents()`
  - later `AreaBuilder.recalculateAreas()` → `TerrainBuilder.buildElevation()`
  - and do not restamp continents after building elevation.

**Determination + recommendation:**
- There is no repo evidence that Civ7 requires `stampContinents()` *after* `buildElevation()`; the “stamp after build” ordering appears to be a TS legacy artifact rather than base-standard practice.
- M10 implementation posture:
  - Keep the Phase 2 ordering as written for now (do not change Phase 2 in M10).
  - Track a Phase 2 canon correction follow-up (out of scope for M10 implementation) to revisit whether `stampContinents()` belongs inside the `build-elevation` Gameplay boundary at all.

#### 2) Hydrology rivers without `artifact:morphology.routing`

**Phase 2 lock (why this must change):**
- Phase 2 explicitly marks `artifact:morphology.routing` as a disallowed/non-contract cross-domain surface; Hydrology must not consume it. (`docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`)

**Current inventory (what reads it and why):**
- Definition (`artifact:morphology.routing`):
  - `flowDir: Int32Array`, `flowAccum: Float32Array`, optional `basinId: Int32Array`. (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts`)
- Producers/consumers:
  - Producer: `morphology-mid/routing` publishes routing. (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/routing.ts`)
  - Internal Morphology consumer: `morphology-mid/geomorphology` uses `routing.flowAccum` only. (`mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/geomorphology.ts`)
  - Cross-domain consumer (must migrate): Hydrology `hydrology-hydrography/rivers` reads routing and uses `flowDir` only (and passes through `basinId` optionally). (`mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts`)

**Minimal Phase 2-compliant replacement (recommended): Hydrology derives flow direction from Morphology topography**
- Hydrology `rivers` should stop requiring `morphologyArtifacts.routing` and instead consume Morphology public truth:
  - `morphologyArtifacts.topography` (`elevation`, `landMask`) as the physical surface.
- Compute `flowDir` within Hydrology using the same steepest-descent neighbor rule the Morphology routing op uses today (Odd-Q hex neighbors), but treat the result as Hydrology-owned intermediate state used to derive Hydrology truth (`artifact:hydrology.hydrography`).
  - This satisfies the Phase 2 lock (Hydrology does not consume Morphology routing as a cross-domain artifact) while remaining deterministic and compatible with current algorithmic assumptions.
  - To avoid algorithm drift between domains, prefer extracting the “steepest descent flowDir” routine into a shared helper and reusing it, rather than copying logic into Hydrology.

```yaml
files:
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.contract.ts
    notes: Replace `morphologyArtifacts.routing` require with `morphologyArtifacts.topography` (and drop `heightfield` if also removed in Slice 4).
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts
    notes: Stop reading `deps.artifacts.routing`; read `topography` and compute `flowDir` deterministically; drop `basinId` pass-through.
  - path: mods/mod-swooper-maps/src/domain/morphology/ops/compute-flow-routing/rules/index.ts
    notes: Evidence for the steepest-descent receiver selection (Odd-Q neighbors).
  - path: mods/mod-swooper-maps/src/domain/hydrology/ops/accumulate-discharge/contract.ts
    notes: Update docstring that currently claims `flowDir` is Morphology-owned.
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/artifacts.ts
    notes: Update wording that claims Hydrography is derived from Morphology routing.
```

**Optional hardening (recommended in M10 to prevent regressions by construction):**
- Remove `routing` from the exported `morphologyArtifacts` public surface so other domains cannot “accidentally” depend on it.
  - Keep routing as an internal Morphology artifact handle (imported only by Morphology mid steps).

**Verification (slice-local):**
- `rg -n "morphologyArtifacts\\.routing|deps\\.artifacts\\.routing\\.read" mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-*`
- `rg -n "artifact:morphology\\.routing" mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-*`

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
