# Morphology Vertical Domain Refactor — Phase 3 Implementation Plan

This issue is the Phase 3 output for the Morphology vertical refactor workflow.

References:
- Plan: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/MORPHOLOGY.md`
- Phase 1 spike: `docs/projects/engine-refactor-v1/resources/spike/spike-morphology-current-state.md`
- Phase 2 spike: `docs/projects/engine-refactor-v1/resources/spike/spike-morphology-modeling.md` (authoritative model; locked)
- Workflow: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
- Guardrails reference: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md`
- Traps/locked decisions reference: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md`

Scope guardrails:
- Slice planning only. No model changes here.
- Every slice ends pipeline-green (no dual paths).
- The refactored Morphology domain must not retain compat surfaces; downstream adjustments are part of the plan.

---

## Authority stack (reminder)

Canonical:
- Phase 2 model: `docs/projects/engine-refactor-v1/resources/spike/spike-morphology-modeling.md`
- Workflow rules: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`

Supporting (non-authoritative; constraints only):
- Earth-physics synthesis: `docs/system/libs/mapgen/research/SPIKE-synthesis-earth-physics-systems-swooper-engine.md`
- Civ7 mapgen features/touchpoints: `docs/system/libs/mapgen/research/SPIKE-civ7-map-generation-features.md`, `docs/system/libs/mapgen/research/SPIKE-gameplay-mapgen-touchpoints.md`
- Civ7 official resources (interop constraints only): `.civ7/outputs/resources/Base/modules/base-standard/**` (evidence cited in Phase 2)

---

## Locked decisions + bans (must become guardrails)

These are locked by Phase 2 (see “Lookback 2”) and must be enforced by tests/lints/greps in the slices that introduce them.

### A) Model / contract posture

- Model is canonical; projections never define internal representation.
- No compat inside Morphology domain:
  - no `StandardRuntime.westContinent/eastContinent` surfaces
  - no Morphology-owned “continent windows” as canonical products
  - no Morphology-owned HOTSPOTS production
- Ops are atomic/data-only; steps own runtime binding (engine writes, artifact publish, overlays mutation).
- No RNG callbacks cross an op boundary; pass seeds.

**Guardrail patterns (planned):**
- `mods/mod-swooper-maps/test/morphology/contract-guard.test.ts` string/surface checks for forbidden imports/symbols.
- `REFRACTOR_DOMAINS="morphology" ./scripts/lint/lint-domain-refactor-guardrails.sh`
- At least one Morphology op contract test (`runOpValidated`) + one thin integration edge test if artifact wiring changes.

### B) Civ7 interop constraints (downstream-owned projections)

Locked by Phase 2 (Civ7 official resources audit):
- Landmasses are authoritative; Civ7 LandmassRegionId (“homelands vs distant lands”) is a downstream gameplay projection derived from landmasses.
- LandmassRegionId behaves like a factor-coded membership key in shipped scripts; do not invent numeric ids.
  - Projection step must use `adapter.getLandmassId("WEST"|"EAST"|...)` (or equivalent stable engine constants), never hardcoded numeric ids.

**Guardrail patterns (planned):**
- Projection step tests use MockAdapter call evidence / call tracking for `setLandmassRegionId`.
- Contract-guard grep that fails if numeric LandmassRegionId literals appear in projection logic.

---

## Explicit upstream authoritative intake scan (producer inventory)

This is the “inputs Morphology consumes” scan (source: Phase 1 + spot checks).

### Foundation (authoritative upstream facts)

Current upstream artifacts used by Morphology steps:
- `artifact:foundation.plates` (`foundationArtifacts.plates`) is required by:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.contract.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.contract.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.contract.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.contract.ts`

Phase 2 adopted inputs for the target model:
- `artifact:foundation.tectonics`, `artifact:foundation.crust` are preferred long-term, but early slices may continue consuming `foundation.plates` as a projection until mesh-first drivers are practical in Morphology.

### Narrative overlays (optional constraints; data-only intake)

`artifact:storyOverlays` (`narrativePreArtifacts.overlays`) is required by:
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.contract.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.contract.ts`

Phase 2 locked posture:
- Morphology ops must not depend on Narrative module layout/types. Steps derive data-only masks from overlays and pass them into ops.

---

## Explicit downstream impact scan (consumer inventory)

This is the “who consumes Morphology outputs” scan (Phase 1 + spot checks).

### Effect-tag gating (to migrate away from)

Producers today:
- `morphology-pre/landmass-plates` provides `effect:engine.landmassApplied`
- `morphology-pre/coastlines` provides `effect:engine.coastlinesApplied`
- `morphology-mid/rugged-coasts` re-provides `effect:engine.coastlinesApplied`
- `morphology-post/islands` provides `effect:engine.landmassApplied`

Consumers today include Narrative and Placement contracts, e.g.:
- `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derive-placement-inputs/contract.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/**.contract.ts`

### Hidden runtime coupling (to delete)

`StandardRuntime.westContinent/eastContinent` is mutated by:
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`

It is read by:
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-pre/steps/climateBaseline.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derive-placement-inputs/inputs.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts`

### Misowned publication (to move)

HOTSPOTS overlay is published by Morphology today:
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts`

But HOTSPOTS is consumed by Narrative/Hydrology/Ecology steps:
- `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyCorridorsPre.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts`

---

## Step decomposition plan (causality spine → steps → contracts)

Phase 2 causality spine is authoritative (Phase 2 “3.4 Causality spine”). This section assigns that spine to concrete steps and contract boundaries without changing the model.

### Target steps (by existing stage)

This plan keeps the current stage braid order (no stage reorder). New steps may be introduced to avoid monolithic “do everything” steps.

**Morphology (pre)**
- `landmass-plates` → canonical “topography seed” step
  - Owns: calling Morphology compute ops to produce canonical buffers + publishing Morphology buffer-handle artifacts.
  - Must stop owning: runtime continent windows, LandmassRegionId stamping, and any other gameplay projections.
- `coastlines` → explicit engine coast-expansion projection step
  - Owns: `adapter.expandCoasts(...)` only; does not define canonical state.

**Morphology (mid)**
- `rugged-coasts` → “coastline metrics + coastal shaping” step
  - Owns: computing/publishing `artifact:morphology.coastlineMetrics` and any topography edits consistent with the model.
  - Must consume overlay constraints via data-only derived masks (no Narrative type coupling).
- (add) `routing` (new) → compute/publish `artifact:morphology.routing`.
- (add) `geomorphology` (new) → compute geomorphic cycle deltas (erosion/diffusion/deposition) and mutate canonical topography/substrate buffers.

**Morphology (post)**
- `islands` → “island chain planning + apply”
  - Must stop publishing HOTSPOTS; consumes HOTSPOTS as an input signal if needed (Narrative-owned).
- `mountains` → “ridge/foothill planning + apply”
- `volcanoes` → “volcano planning + apply”
- (add) `landmasses` (new) → compute/publish `artifact:morphology.landmasses` from final `landMask`.

### Target contract surfaces (no new model content)

Locked by Phase 2 “6) Target contract matrix”:
- `artifact:morphology.topography` (buffer handle; publish once)
- `artifact:morphology.routing` (buffer handle; publish once)
- `artifact:morphology.substrate` (buffer handle; publish once)
- `artifact:morphology.coastlineMetrics` (snapshot)
- `artifact:morphology.landmasses` (snapshot)

Explicitly not Morphology-owned:
- Civ7 LandmassRegionId assignment step(s)
- Any “continent bounds” / “start region windows” needed by `adapter.assignStartPositions(...)`

---

## Consumer migration matrix (break/fix per slice)

Legend:
- **Breaks** = would fail compile/runtime/tests if slice lands without the consumer fix
- **Fix** = consumer change required in that slice
- **Shim** = explicitly deprecated downstream-only compatibility layer (never inside Morphology domain)

| Consumer | Current dependency | Target dependency | Breaks when | Fix / shim |
| --- | --- | --- | --- | --- |
| Narrative pre/mid/post contracts | `requires: effect:engine.coastlinesApplied` | `artifacts.requires: morphologyArtifacts.(topography/coastlineMetrics)` | Slice 2 | Update step contracts; remove effect-tag requires. |
| Placement derive inputs | `requires: effect:engine.coastlinesApplied` + runtime continents | `artifacts.requires: morphologyArtifacts.landmasses` + Gameplay-owned projections (may be physically located at the placement apply boundary pre-absorption) | Slice 2/3 | Remove effect-tag requires; remove runtime reads; consume `morphology.landmasses`. |
| Hydrology climateBaseline | reads `runtime.westContinent/eastContinent` and restamps ids | no runtime reads; relies on explicit projection step for LandmassRegionId if needed | Slice 3 | Delete runtime reads/restamping; keep climate work. |
| Islands step | publishes HOTSPOTS overlay | HOTSPOTS published by Narrative step | Slice 4 | Remove HOTSPOTS publish; Narrative adds/owns HOTSPOTS production. |
| Civ7 resources/starts | implicit reliance on LandmassRegionId labels before `generateResources` / `assignStartPositions` | explicit Gameplay-owned projection sets ids + bounds before engine calls | Slice 3 | Add projection/finalization step and tests. |

---

## Slice list with deliverables (executable plan)

### Sequencing refinement note (required)

Drafted slices from Phase 2 pipeline deltas (new contracts → consumer migration → domain cutover → deletions).

Re-ordered for pipeline safety:
1) introduce new Morphology artifacts (additive),
2) migrate consumers to artifact requires (prevents contract mismatches),
3) eliminate hidden runtime coupling + add explicit downstream projections (removes black-ice contracts early),
4) move misowned overlay publication (HOTSPOTS),
5) refactor Morphology internals behind ops contracts,
6) scorched-earth deletion + documentation.

Re-checked that each slice can land pipeline-green without “later” buckets; remaining cleanup is explicitly assigned.

### Slice 1 — Morphology artifact contracts (additive) + minimal publishers

Goal: introduce Morphology stage-owned artifact contracts and publish minimal, non-breaking artifacts from the existing pipeline so consumers can migrate off effect tags.

Contracts:
- Add `morphologyArtifacts` at `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts`:
  - `topography`, `routing`, `substrate`, `coastlineMetrics`, `landmasses`.

Implementation (expected):
- Publish `artifact:morphology.topography` from `morphology-pre/landmass-plates` (publish-once posture).
- Publish `artifact:morphology.coastlineMetrics` from `morphology-mid/rugged-coasts` (derived metrics only; do not claim canonical engine terrain IDs).
- Publish `artifact:morphology.landmasses` from a new `morphology-post/landmasses` step.
  - If Slice 1 derives landmasses from `adapter.isWater(...)` (temporary wiring), it must be replaced by a pure `topography.landMask`-based implementation by Slice 6 (no transitional allowed past this slice plan).

Guardrails:
- Add `mods/mod-swooper-maps/test/morphology/contract-guard.test.ts`:
  - Assert `morphologyArtifacts.*` ids exist and are stable strings.
  - Assert forbidden projection keys are absent from Morphology artifact payload schemas: `westContinent`, `eastContinent`, `LandmassRegionId`.

Verification gates (minimum):
- `REFRACTOR_DOMAINS="morphology" ./scripts/lint/lint-domain-refactor-guardrails.sh`
- `pnpm -C mods/mod-swooper-maps test`

### Slice 2 — Consumer cutover: effect-tag gating → artifact requires

Goal: remove Morphology’s effect-tag gating from downstream steps and replace it with explicit artifact dependencies.

Consumer updates:
- Narrative contracts: replace `requires: [M4_EFFECT_TAGS.engine.coastlinesApplied]` with `artifacts.requires: [morphologyArtifacts.topography]` and/or `[morphologyArtifacts.coastlineMetrics]` as appropriate.
- Placement `derive-placement-inputs`: remove `requires: effect:engine.coastlinesApplied`; add `artifacts.requires: [morphologyArtifacts.landmasses]` (and any other required Morphology artifacts).
- Hydrology `lakes`: remove `requires: effect:engine.landmassApplied`; add a single authoritative artifact prerequisite (either Morphology topography, or an existing heightfield artifact if that remains the true prerequisite). No dual prerequisites.

Guardrails:
- Extend `contract-guard.test.ts` to fail if step contracts in scope still *require* `effect:engine.landmassApplied` or `effect:engine.coastlinesApplied` (they may still be *provided* temporarily for adapter verification until explicitly deleted).

Verification gates:
- `REFRACTOR_DOMAINS="morphology" ./scripts/lint/lint-domain-refactor-guardrails.sh`
- `pnpm -C mods/mod-swooper-maps check && pnpm -C mods/mod-swooper-maps test`

### Slice 3 — Remove hidden runtime continents; add explicit downstream projections (Civ7 interop)

Goal: delete `StandardRuntime.westContinent/eastContinent` hidden coupling and replace it with explicit downstream projection steps that derive:
- (a) Civ7 LandmassRegionId tile labels, and
- (b) any required continent bounds for `adapter.assignStartPositions(...)`.

Downstream projection step(s) (Gameplay-owned):
- Treat this projection as a Gameplay-owned concern (see `docs/projects/engine-refactor-v1/resources/domains/gameplay/ISSUE-LANDMASS-REGION-ID-PROJECTION.md`).
- In the current wiring it may physically live adjacent to the `placement` apply boundary (or be integrated into `placement/apply`) until the Gameplay absorption/refactor lands, but ownership and contracts are Gameplay.
- Add a step (or integrate into `placement/apply` if keeping minimal steps) that:
  - reads `artifact:morphology.landmasses`,
  - selects a two-slot partition (primary/secondary) using explicit policy inputs,
  - writes LandmassRegionId via `adapter.setLandmassRegionId(...)` using ids obtained from `adapter.getLandmassId("WEST"|"EAST"|...)`,
  - derives `ContinentBounds` projections (only if still required by `adapter.assignStartPositions(...)`),
  - runs before `adapter.generateResources(...)` and `adapter.assignStartPositions(...)`.

Consumer changes:
- Delete all reads/writes of `runtime.westContinent/eastContinent`:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts` (stop writing runtime bounds; stop calling `markLandmassId` here)
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-pre/steps/climateBaseline.ts` (stop restamping ids from runtime bounds)
  - Placement inputs derivation + apply (stop requiring runtime bounds; consume projection results)
- Update `mods/mod-swooper-maps/src/recipes/standard/runtime.ts` to remove the continent-bounds fields if no longer needed anywhere.

Guardrails:
- Contract-guard greps with allowlist (only dedicated projection step may mention these):
  - `westContinent`, `eastContinent`, `markLandmassId(`
- Add MockAdapter call tracking (if needed) for `setLandmassRegionId` so tests can assert the projection step executed.

Verification gates:
- `pnpm -C mods/mod-swooper-maps test` including a targeted test that:
  - asserts some `setLandmassRegionId` activity occurred, and
  - asserts region ids came from `getLandmassId("WEST"/"EAST")` (no numeric literals).

### Slice 4 — HOTSPOTS ownership cutover (Narrative-owned)

Goal: remove HOTSPOTS publication from Morphology and make Narrative the sole producer.

Changes:
- Remove `publishStoryOverlay(...HOTSPOTS...)` from `morphology-post/islands`.
- Ensure HOTSPOTS is published by a Narrative step (target: `narrative-pre/storyHotspots`) with explicit prerequisites (Foundation + Morphology artifacts as needed).

Guardrails:
- Contract-guard test fails if HOTSPOTS is published outside Narrative-owned producer module(s).

Verification gates:
- `pnpm -C mods/mod-swooper-maps test`

### Slice 5 — Morphology domain ops refactor (contract-first ops + step orchestration)

Goal: migrate Morphology domain logic behind op contracts; steps become orchestration-only and no longer import Morphology implementations directly.

Config overhaul (explicitly in-scope; no legacy shape retained):
- Replace the legacy “bag” schemas (`src/domain/morphology/config.ts`, `src/domain/morphology/landmass/config.ts`) with a canonical Morphology config shape aligned to the Phase 2 op catalog.
- “migrate” in the legacy ledger means “keep semantics but rename/restructure”; do not preserve legacy property paths or grouping.
- Update presets / map configs that author Morphology settings to use the new shape in the same slice (no dual config paths).
- Add guardrails:
  - contract-guard grep/lint for legacy config keys once the new config lands,
  - tests/compilation failures if legacy config modules are imported from Morphology steps/ops.

Ops:
- Implement the Phase 2 target op catalog under `mods/mod-swooper-maps/src/domain/morphology/ops/**`:
  - Compute ops: `compute-substrate`, `compute-base-topography`, `compute-sea-level`, `compute-landmask`, `compute-coastline-metrics`, `compute-flow-routing`, `compute-geomorphic-cycle`, `compute-landmasses`
  - Plan ops: `plan-island-chains`, `plan-ridges-and-foothills`, `plan-volcanoes`

Recipe wiring:
- Register Morphology ops in standard recipe:
  - add `morphologyDomain` to `compileOpsById` in `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`.

Steps:
- Update Morphology stage steps to call injected ops and publish artifacts via `deps.artifacts.*`.
- Steps derive data-only overlay masks from `artifact:storyOverlays` and pass those into ops (no Narrative type coupling).

Deletions:
- Delete legacy exported entrypoints replaced by ops (no dual surfaces), aligned with the legacy disposition ledger.
- Remove any Morphology-internal imports that violate the boundary (e.g., Narrative type imports inside domain code).

Guardrails:
- Contract-guard test fails if any file under `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-*` imports Morphology implementation entrypoints (allow only `@mapgen/domain/morphology` contract entrypoint).

Verification gates (full, per guardrails reference):
- `REFRACTOR_DOMAINS="morphology" ./scripts/lint/lint-domain-refactor-guardrails.sh`
- `pnpm -C packages/mapgen-core check && pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps check && pnpm -C mods/mod-swooper-maps test && pnpm -C mods/mod-swooper-maps build`
- `pnpm deploy:mods`
- `pnpm check && pnpm test && pnpm build`

### Slice 6 — Ruthless cleanup + documentation pass

Goal: scorched-earth deletion + docs inventory so no legacy surfaces remain.

Cleanup:
- Remove any remaining effect-tag gating within Morphology refactor scope (if still present).
- Remove dead helpers and obsolete exports in Morphology domain folders.
- Remove unused config schema properties that have been killed, and delete stale docs references.

Documentation:
- Inventory every touched/created schema/function/op/step/stage/contract in this refactor.
- Add definition-site docs (JSDoc + TypeBox `description`) for all new/changed surfaces.
- Update canonical docs if needed:
  - `docs/system/libs/mapgen/morphology.md`

Verification gates:
- Full verification list in `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md`

---

## Contract deltas per slice (summary)

- Slice 1: introduce `morphologyArtifacts.*` (additive); publish initial artifacts.
- Slice 2: update downstream step contracts to require artifacts; remove effect-tag gating.
- Slice 3: remove hidden runtime continent bounds; add Gameplay-owned projection for LandmassRegionId + continent bounds.
- Slice 4: HOTSPOTS production moves to Narrative.
- Slice 5: Morphology ops catalog lands + recipe compiles Morphology ops; steps become orchestration-only + config overhaul.
- Slice 6: deletions + docs.

---

## Acceptance + verification gates per slice (minimum)

Per-slice gates are embedded above; non-negotiables:
- No “later” buckets: each slice deletes what it replaces (or records a deferral trigger and adds a guardrail in the same slice).
- No transitional wiring past the end of this slice plan: if any slice introduces temporary derivations (e.g. landmasses from `adapter.isWater`), a later slice must delete and replace them, ending with zero transitional paths after Slice 6.
- `REFRACTOR_DOMAINS="morphology" ./scripts/lint/lint-domain-refactor-guardrails.sh` green for any slice touching Morphology ops/steps.
- `pnpm -C mods/mod-swooper-maps check/test` green for all slices.
- Pipeline remains runnable end-to-end (at minimum via MockAdapter tests) after each slice.

---

## Migration checklist per slice (per implementer)

For each slice:
- [ ] Update step contract(s) first (requires/provides + artifacts.requires/provides).
- [ ] Update step impl(s) to match contract changes.
- [ ] Update op contract(s) and implementations (if slice touches ops).
- [ ] Delete legacy entrypoints replaced in this slice (no dual surfaces).
- [ ] Add/extend contract-guard tests (forbidden strings/surfaces).
- [ ] Run the slice’s verification gates.
- [ ] Update docs inventory for touched surfaces.

---

## Cleanup ownership + triage links

Downstream shims that are explicitly allowed (and must be deprecated if introduced):
- `ContinentBounds` projections required by `adapter.assignStartPositions(...)` remain downstream-owned (Gameplay/Placement boundary) until starts are LandmassRegionId-first.

If `ContinentBounds` remains after this refactor, add a triage/backlog item for its removal (see Phase 3 “Update triage” step).

---

## Legacy disposition ledger (keep/kill/migrate)

Authoritative source is Phase 2 section “8) Legacy disposition ledger”. This section is copied here so Phase 4 implementation is self-contained.

### Config properties

Interpretation note for implementers:
- “migrate” means “keep semantics but move/rename/restructure”; the legacy config shape must not survive inside the refactored Morphology domain.

#### `LandmassConfigSchema` (`mods/mod-swooper-maps/src/domain/morphology/landmass/config.ts`)

```yaml
LandmassConfigSchema:
  baseWaterPercent: migrate
  waterScalar: migrate
  boundaryBias: migrate
  boundaryShareTarget: migrate
  continentalFraction: migrate
  clusteringBias: migrate
  microcontinentChance: migrate
  crustEdgeBlend: migrate
  crustNoiseAmplitude: migrate
  continentalHeight: migrate
  oceanicHeight: migrate
  tectonics:
    interiorNoiseWeight: migrate
    boundaryArcWeight: migrate
    boundaryArcNoiseWeight: migrate
    fractalGrain: migrate
  geometry:
    post:
      expandTiles: kill
      expandWestTiles: kill
      expandEastTiles: kill
      clampWestMin: kill
      clampEastMax: kill
      overrideSouth: kill
      overrideNorth: kill
      minWidthTiles: kill
```

#### `MorphologyConfigSchema` (`mods/mod-swooper-maps/src/domain/morphology/config.ts`)

```yaml
MorphologyConfigSchema:
  oceanSeparation:
    enabled: migrate
    bandPairs: migrate
    baseSeparationTiles: migrate
    boundaryClosenessMultiplier: migrate
    maxPerRowDelta: migrate
    minChannelWidth: migrate
    channelJitter: migrate
    respectSeaLanes: migrate
    edgeWest:
      enabled: migrate
      baseTiles: migrate
      boundaryClosenessMultiplier: migrate
      maxPerRowDelta: migrate
    edgeEast:
      enabled: migrate
      baseTiles: migrate
      boundaryClosenessMultiplier: migrate
      maxPerRowDelta: migrate

  coastlines:
    bay:
      noiseGateAdd: migrate
      rollDenActive: migrate
      rollDenDefault: migrate
    fjord:
      baseDenom: migrate
      activeBonus: migrate
      passiveBonus: migrate
    plateBias:
      threshold: migrate
      power: migrate
      convergent: migrate
      transform: migrate
      divergent: migrate
      interior: migrate
      bayWeight: migrate
      bayNoiseBonus: migrate
      fjordWeight: migrate
    minSeaLaneWidth: migrate

  islands:
    fractalThresholdPercent: migrate
    minDistFromLandRadius: migrate
    baseIslandDenNearActive: migrate
    baseIslandDenElse: migrate
    hotspotSeedDenom: migrate
    clusterMax: migrate

  mountains:
    tectonicIntensity: migrate
    mountainThreshold: migrate
    hillThreshold: migrate
    upliftWeight: migrate
    fractalWeight: migrate
    riftDepth: migrate
    boundaryWeight: migrate
    boundaryGate: migrate
    boundaryExponent: migrate
    interiorPenaltyWeight: migrate
    convergenceBonus: migrate
    transformPenalty: migrate
    riftPenalty: migrate
    hillBoundaryWeight: migrate
    hillRiftBonus: migrate
    hillConvergentFoothill: migrate
    hillInteriorFalloff: migrate
    hillUpliftWeight: migrate

  volcanoes:
    enabled: migrate
    baseDensity: migrate
    minSpacing: migrate
    boundaryThreshold: migrate
    boundaryWeight: migrate
    convergentMultiplier: migrate
    transformMultiplier: migrate
    divergentMultiplier: migrate
    hotspotWeight: migrate
    shieldPenalty: migrate
    randomJitter: migrate
    minVolcanoes: migrate
    maxVolcanoes: migrate
```

### Rules/policies

```yaml
rules_and_policies:
  DEFAULT_OCEAN_SEPARATION:
    disposition: migrate
    target: "rule inside morphology/compute-landmask or morphology/compute-coastline-metrics"

  resolveSeaCorridorPolicy:
    disposition: migrate
    target: "step-level intake (derive protection mask from overlays); op consumes data-only mask"

  findNeighborSeaLaneAttributes:
    disposition: migrate
    target: "step-level intake (derive protection mask); no Narrative type coupling in Morphology domain"

  findNeighborSeaLaneEdgeConfig:
    disposition: migrate
    target: "step-level intake (derive protection mask)"
```

### Functions (outside view; current exports)

```yaml
domain_functions:
  createPlateDrivenLandmasses:
    disposition: migrate
    target: "morphology/compute-base-topography + morphology/compute-landmask (model-first; no window outputs)"

  applyLandmassPostAdjustments:
    disposition: kill
    rationale: "window post-processing is projection-only; move downstream if still needed"

  applyPlateAwareOceanSeparation:
    disposition: migrate
    target: "morphology/compute-landmask (ocean basin shaping; data-only edits)"

  addRuggedCoasts:
    disposition: migrate
    target: "morphology/compute-coastline-metrics + (optional) topography edits; must not publish effect tags"

  addIslandChains:
    disposition: migrate
    target: "morphology/plan-island-chains (plan op) + step applies edits"

  layerAddMountainsPhysics:
    disposition: migrate
    target: "morphology/plan-ridges-and-foothills (plan op) + step applies projections"

  layerAddVolcanoesPlateAware:
    disposition: migrate
    target: "morphology/plan-volcanoes (plan op) + step applies"

  computePlateBias:
    disposition: migrate
    target: "rule inside coastline-related ops"

  computeTargetLandTiles:
    disposition: migrate
    target: "rule inside morphology/compute-sea-level (hypsometry selection)"

  computeClosenessLimit:
    disposition: kill

  tryCrustFirstLandmask:
    disposition: kill

  applyLandmaskToTerrain:
    disposition: migrate
    target: "step-only effect boundary (engine writes); never inside ops"

  computePlateStatsFromLandMask:
    disposition: migrate
    target: "morphology/compute-landmasses (derived model output)"

  windowsFromPlateStats:
    disposition: kill
    rationale: "window outputs are projections; replace with landmass decomposition"

  windowFromPlateStat:
    disposition: kill
    rationale: "projection-only"

  computeFractalOnlyScores:
    disposition: kill
    rationale: "fallback hides missing foundation inputs; canonical model requires tectonic drivers"

  computePlateBasedScores:
    disposition: migrate
    target: "rule/strategy inside ridges plan op (tectonic regime classification + ridge scoring)"

  applyRiftDepressions:
    disposition: migrate
    target: "base-topography compute op (rift subsidence) rather than an afterthought in mountain scoring"

  scoreVolcanoWeight:
    disposition: migrate
    target: "rule inside volcano plan op"
```

---

## Lookback 3 (Phase 3 → Phase 4): Plan is locked; implementation gates

When Phase 3 planning completes, record:
- resolved decisions and remaining open questions,
- final slice order rationale (if it changes),
- deferrals/triage items introduced by this plan.

Resolved decisions (Phase 3 checkpoint):
- `LandmassRegionId` projection is **Gameplay-owned** (homelands vs distant lands), implemented at the apply boundary; see `docs/projects/engine-refactor-v1/resources/domains/gameplay/ISSUE-LANDMASS-REGION-ID-PROJECTION.md`.
- Transitional wiring is allowed only if it is fully removed by the end of Slice 6 (no transitional paths survive this refactor).
- Morphology config redesign is explicitly in-scope: destroy the legacy “bag” shape; “migrate” means semantics-only, not shape preservation.

Remaining open questions (must be answered during Slice 3/5 implementation):
- What is the default LandmassRegionId partition policy (e.g. “largest landmass = homelands”), and what is the explicit configuration surface for that policy (Gameplay-owned)?
- Does the adapter/runtime require any explicit re-stamping/recalculation calls after applying LandmassRegionId for resources/starts correctness, or is that already covered by existing adapter methods?

## Lookback 4 (post-implementation)

Append after Phase 4 lands: what drift happened, what guardrails paid off, what to change in the workflow for the next domain.

---

## Notes

- Rename this issue with the milestone once assigned.
