# Agent scratch — Phase 3 work seeds (implicit tasks)

## Scope
- Scan canonical Phase 2 docs for implicit Phase 3 work that must be pre-seeded into the Phase 3 plan.
- Focus on cross-domain migration tasks (artifact:map.* / effect:map.* conventions, removal of legacy artifacts/steps).

---

## Phase 3 seed list (implicit, easy-to-forget)

1) Introduce canonical `effect:map.*Plotted` IDs + registry support (replace/retire `effect:engine.*` for mapgen ordering)
- What: define + register `effect:map.{landmassRegions,coasts,continents,elevation,mountains,volcanoes,rivers,waterData,biomes,features}Plotted` and migrate recipe dependencies off `ENGINE_EFFECT_TAGS` / `M4_EFFECT_TAGS.engine.*`.
- Why: Phase 2 posture makes stamping guarantees *Gameplay-owned* and *step-owned* (no adapter-recorded “engine effects” as the contract surface).
- Where: `mods/mod-swooper-maps/src/recipes/standard/tags.ts`, `packages/civ7-adapter/src/effects.ts` (legacy ids), plus any step contracts that currently `provides/requires` engine effects.

2) Add `artifact:map.projectionMeta` as a first-class Gameplay artifact (publish once, frozen)
- What: publish `{ width, height, wrapX:true, wrapY:false }` as `artifact:map.projectionMeta` and make all `artifact:map.*` consumers depend on it instead of re-reading runtime dims.
- Why: Phase 2 treats `artifact:map.*` as stable projection interfaces with explicit topology metadata (not a knob).
- Where: new “Gameplay projection” stage/step location TBD; downstream consumers should read from artifacts, not `context.dimensions`.

3) Split placement’s inlined landmass-region stamping into `plot-landmass-regions` (intent + effect boundary)
- What: extract landmass region projection into a dedicated step that (a) publishes `artifact:map.landmassRegionSlotByTile` (and optionally derived `artifact:map.landmassRegionIdByTile`), (b) stamps `adapter.setLandmassRegionId`, then (c) asserts `effect:map.landmassRegionsPlotted`.
- Why: Phase 2 requires `artifact:map.*` intent freeze before stamping; current `projectLandmassRegions(...)` is embedded inside placement apply with no explicit effect boundary.
- Where: `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts` (extract `projectLandmassRegions`), and new step under Gameplay staging.

4) Turn `adapter.storeWaterData()` into `plot-water-data` with `effect:map.waterDataPlotted`
- What: isolate `adapter.storeWaterData()` into a dedicated step that asserts `effect:map.waterDataPlotted`; migrate any consumers to `requires: [effect:map.waterDataPlotted]` instead of relying on “placement ran”.
- Why: Phase 2 models this as a stamping/materialization boundary because downstream steps may implicitly assume stored water data exists.
- Where: `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts` (currently calls `storeWaterData()` inline).

5) Move coastline expansion engine call out of Morphology stage (no “engine calls in physics”)
- What: relocate `adapter.expandCoasts(width,height)` out of `morphology-pre` into Gameplay `plot-coasts`, and assert `effect:map.coastsPlotted` only after required “sync back into runtime buffers” work.
- Why: Phase 2 marks any adapter write as Gameplay-owned; `artifact:morphology.coastlinesExpanded` is a legacy marker artifact that should be replaced by an effect guarantee.
- Where: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts`, `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts` (remove `artifact:morphology.coastlinesExpanded`), plus any consumers requiring it (e.g. `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storySeed.contract.ts`).

6) Move continent stamping out of Morphology stage into Gameplay `plot-continents`
- What: relocate `validateAndFixTerrain()` / `recalculateAreas()` / `stampContinents()` to a Gameplay stamping step that asserts `effect:map.continentsPlotted`.
- Why: Phase 2 locks “adapter writes are Gameplay-owned” and requires explicit effect boundaries for ordering.
- Where: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts` (currently stamps continents).

7) Move elevation build out of Hydrology stage into Gameplay `plot-elevation`
- What: relocate `recalculateAreas()` → `buildElevation()` → `recalculateAreas()` → `stampContinents()` into a Gameplay stamping step providing `effect:map.elevationPlotted`.
- Why: Hydrology is Physics truth-only; current `hydrology-climate-baseline` calls engine elevation materialization directly.
- Where: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts`.

8) Move river materialization out of Hydrology stage into Gameplay `plot-rivers`
- What: extract `adapter.modelRivers(...)` → `adapter.validateAndFixTerrain()` → `syncHeightfield(...)` → `adapter.defineNamedRivers()` into `plot-rivers` providing `effect:map.riversPlotted`.
- Why: Phase 2 requires river stamping to be modeled as Gameplay effect boundary; Hydrology should only publish truth hydrography (`artifact:hydrology.hydrography`) and never depend on engine river state.
- Where: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts`.

9) Remove engine-query river adjacency from non-Gameplay logic (replace with pure `riverClass` projection; wrapX-aware)
- What: stop using `ctx.adapter.isAdjacentToRivers(...)` and compute adjacency from `artifact:hydrology.hydrography.riverClass` via a pure helper that respects `wrapX=true` / `wrapY=false` topology.
- Why: engine reads in Physics/Gameplay-projection stages violate the “physics truth-only” posture; also the topology lock applies to any adjacency semantics.
- Where: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/river-adjacency.ts` (engine query path), and consumers: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-plan/index.ts`, `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/inputs.ts`.

10) Purge `terrain` (engine ids) from Physics artifacts; redirect to Gameplay `artifact:map.*` surfaces
- What: remove engine-coupled `terrain` from Morphology truth surfaces and stop treating it as a cross-domain “heightfield” contract; replace with Gameplay projection/stamping surfaces.
- Why: Phase 2 explicitly bans engine coupling in Physics truth artifacts; `artifact:morphology.topography.terrain` violates this.
- Where: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts` (topography schema includes `terrain`), and `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/artifacts.ts` (`artifact:heightfield` describes terrain as “projection-only” but still wires it as a dependency surface).

11) Convert Morphology “mountains” terrain stamping into `plot-mountains` (intent freeze + effect)
- What: split mountain planning (Physics truth) from terrain stamping (Gameplay): publish a stable intent surface (mask or per-tile terrain intent) under `artifact:map.*`, stamp via adapter, assert `effect:map.mountainsPlotted`.
- Why: currently `mods/.../morphology-post/steps/mountains.ts` calls `writeHeightfield(...)` which stamps engine terrain from a Morphology stage.
- Where: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.ts`.

12) Convert Morphology “volcanoes” to Physics volcanism intent + Gameplay `plot-volcanoes` stamping (no overlay inputs)
- What: remove overlay-derived hotspot masks from volcano planning; derive volcanism intent from Foundation drivers (e.g. `artifact:foundation.tectonics.volcanism` / plate boundary regime signals) and publish `artifact:morphology.volcanoes` (truth intent). Then stamp in Gameplay with `effect:map.volcanoesPlotted`.
- Why: Phase 2 bans overlays as Physics inputs and bans engine writes from Physics steps.
- Where: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts` (reads `deps.artifacts.overlays`, stamps `setFeatureType`).

13) Convert Morphology “islands” and “rugged coasts” away from overlay masks + adapter fractals + engine stamping
- What: remove `readOverlayCorridors/readOverlayMotifsMargins/readOverlayMotifsHotspots` and remove `adapter.createFractal/getFractalHeight` usage from Morphology; ensure these steps only mutate truth buffers (elevation/landMask/etc) and publish truth artifacts. Any engine stamping must happen downstream via `plot-*` steps.
- Why: Phase 2 bans overlays as Physics inputs and bans engine calls in Physics stages; adapter fractals are engine calls and create implicit coupling/ordering hazards.
- Where: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts`, `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts`.

14) Split Ecology “biomes” into truth classification vs stamping (align with `effect:map.biomesPlotted`)
- What: keep `artifact:ecology.biomeClassification` as the truth artifact; move `adapter.setBiomeType(...)` into a Gameplay `plot-biomes` step and assert `effect:map.biomesPlotted`.
- Why: Phase 2 declares Ecology as Physics truth-only; current Ecology step stamps engine biomes directly.
- Where: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/index.ts`.

15) Split Ecology “features” into truth intent vs stamping (align with `effect:map.featuresPlotted`)
- What: keep `artifact:ecology.featureIntents` (or similar truth plan) as Physics output; move `adapter.setFeatureType(...)` + `validateAndFixTerrain()` + `recalculateAreas()` into a Gameplay `plot-features` step asserting `effect:map.featuresPlotted`.
- Why: Phase 2 requires effects to represent stamping completion; current Ecology features step performs engine writes and engine postprocess inline.
- Where: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts`, `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/artifacts.ts`.

16) Replace legacy marker artifacts with effect guarantees (delete/redirect)
- What: delete marker-only artifacts whose *only* purpose is “engine thing happened” and replace consumers with `effect:map.*Plotted` dependencies.
- Why: Phase 2 posture: execution guarantees are boolean effects, not artifacts.
- Where: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts` (`artifact:morphology.coastlinesExpanded`) and any similar marker artifacts discovered during Phase 3 implementation.

17) Re-home “engine-backed fields” to be strictly downstream of `effect:map.*Plotted`
- What: any step that reads `context.fields.*` that are effectively engine-realized (terrain/biome/feature) should explicitly require the corresponding `effect:map.*Plotted` (or be refactored to consume truth artifacts + `artifact:map.*` intent instead).
- Why: mixed read paths (truth artifacts vs engine-backed fields) are how “dual path” bugs reappear.
- Where: `mods/mod-swooper-maps/src/recipes/standard/tags.ts` (field tags), `mods/mod-swooper-maps/src/recipes/standard/stages/**` (all consumers of `context.fields.terrainType|biomeId|featureType`).

18) Guardrail updates: enforce “no engine calls in physics stages” + “no overlay reads in physics” + “no `effect:engine.*` in ordering”
- What: extend/replace existing contract guard checks to enforce the Phase 2 bans as Phase 3 migrates code (search-based tests are acceptable).
- Why: Phase 2 is explicit “no shims/dual paths”; guardrails prevent accidental reintroduction during slice-by-slice migration.
- Where: `mods/mod-swooper-maps/test/morphology/contract-guard.test.ts` (already has effect gating checks); add cross-domain checks as needed.

---

## Migration risks (where mixed conventions will happen)

- `artifact:morphology.topography.terrain` and `artifact:heightfield.terrain` make it easy for downstream to keep treating engine terrain ids as “truth”; Phase 3 must remove/redirect these surfaces quickly to avoid consumers silently persisting.
- Engine materialization currently occurs inside Physics-labeled stages (`morphology-pre`, `morphology-post`, `hydrology-climate-baseline`, `hydrology-hydrography`, `ecology`); moving calls without also moving dependent consumers risks “hidden ordering” regressions.
- River adjacency currently has two code paths: engine query (`isAdjacentToRivers`) vs pure projection (`computeRiverAdjacencyMaskFromRiverClass`). Leaving both encourages dual-path drift; pick one and delete the other (with wrapX-correctness).
- Overlay reads are currently embedded in Morphology and Ecology; partial migration risks “physics depends on narrative” continuing via accidental imports even if the artifact dependency is removed.

---

## Dependencies / ordering suggestions (slice safety)

- First: introduce `effect:map.*Plotted` IDs + tag registry wiring and migrate *requires/provides* edges (so later refactors have a stable dependency vocabulary).
- Next: create Gameplay `plot-*` step shells (even as thin wrappers) and migrate engine calls out of Physics stages (no dual path: remove old call sites as each plot step lands).
- Then: remove/redirect legacy marker artifacts (`artifact:morphology.coastlinesExpanded`, `artifact:*heightfield*` terrain coupling) and update all consumers.
- Only after the above: tackle “physics logic currently calling adapter” (fractal/noise, engine river adjacency) so the pipeline is already cleanly separated into Physics truth vs Gameplay stamping.

---

## Questions / unknowns (need decisions, not model changes)

- Effect taxonomy coverage: Phase 2 lists `effect:map.*Plotted` for terrain/biomes/features/rivers/etc, but placement currently uses `ENGINE_EFFECT_TAGS.placementApplied`. Decide whether placement/resources/wonders/floodplains get their own `effect:map.*` ids or remain outside the Phase 2 effect taxonomy.
- `artifact:map.*` surface minimal set: beyond `projectionMeta` + landmass regions, decide which additional projection intent artifacts are required (terrain intents for mountains/coasts/islands/volcano terrain edits; biome/feature intents) vs staying implicit at stamping time.
- Replacement for adapter fractals/noise: pick the canonical deterministic noise source for Physics (pure implementation vs upstream Foundation-provided noise fields) so Morphology doesn’t keep calling adapter helpers.
