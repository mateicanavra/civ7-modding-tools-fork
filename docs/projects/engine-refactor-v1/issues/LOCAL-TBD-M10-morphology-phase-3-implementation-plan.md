# M10: Morphology — Phase 3 Implementation Plan

## 0) Header (required)

- Title: `M10: Morphology — Phase 3 Implementation Plan`
- Effort estimate: `High × Medium` (cross-domain wiring + strict invariants; some workstreams parallelizable)
- Phase 2 authority (do not modify in Phase 4; Phase 3 slices must implement these as-written):
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md`
- Phase 3 workflow + traps (apply to every slice):
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/IMPLEMENTATION.md`
  - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md`

## 1) Objective (required)

Cut over the standard recipe to the Phase 2 Morphology posture: Morphology becomes truth-only (engine-agnostic, overlay-free) with contract-first ops and stable truth artifacts; all Civ7 adapter stamping/materialization and `artifact:map.*` projections move into a Gameplay-owned lane that produces boolean `effect:map.*` guarantees (no dual paths, no shims). In M10 specifically: remove the entire “story overlay” system as a load-bearing dependency (no random overlays; no overlay producers/consumers in Physics) and re-home `TerrainBuilder.buildElevation()` out of Hydrology.

## 2) Scope (required)

- In scope:
  - Standard recipe wiring and its Morphology-touching stages/steps (stage order evidence: `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`).
  - Remove the story-overlay system entirely (overlays are optional annotation only; in M10 they are removed to reduce complexity):
    - Delete `artifact:storyOverlays` production and all consumers.
    - Delete `narrative-pre` and `narrative-mid` stages from the standard recipe (and migrate any tests/configs that reference them).
    - Remove all overlay helpers/imports (`readOverlay*`, `overlays.js`) from Morphology and Ecology code paths.
    - Remove overlay-derived inputs from Morphology op contracts (see Slice 1).
  - Re-home Morphology-related adapter calls out of Physics-braided steps into Gameplay-owned `plot-*` / `build-*` steps:
    - `expandCoasts` (currently in `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts`)
    - `validateAndFixTerrain` / `recalculateAreas` / `stampContinents` (currently in `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts` and `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts`)
    - `TerrainBuilder.buildElevation()` (currently in `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts`)
    - Per-tile terrain/feature stamping currently embedded in Morphology steps:
      - `writeHeightfield(...)` (hits in `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-*/steps/*.ts`)
      - `setFeatureType(...)` (hit: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts`)
  - Introduce Phase 2 Gameplay contracts for stamping guarantees:
    - `effect:map.<thing><Verb>` with `*Plotted` / `*Built` (new map effects must not drift from Phase 2 verb posture).
    - Required Phase 2 `artifact:map.*` projection surfaces (minimum for M10): `artifact:map.projectionMeta` and `artifact:map.landmassRegionSlotByTile` (see Phase 2 stamping spec).
    - Define the new `effect:map.*` tags in the standard recipe tag catalog:
      - `mods/mod-swooper-maps/src/recipes/standard/tags.ts` (add `M10_EFFECT_TAGS.map.*` + `EFFECT_OWNERS` entries for the new Gameplay steps).
  - Replace engine-coupled “truth” surfaces:
    - Remove engine terrain IDs from Morphology truth artifacts (current violation: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts` includes `topography.terrain` described as “Engine terrain id per tile”).
  - Remove Morphology-relevant Physics-side “engine sync” coupling where it exists for Morphology-owned concepts:
    - `syncHeightfield(...)` usage in Hydrology climate baseline that exists to read engine elevation/cliffs today (`mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts`).
    - Phase 2 lock: Hydrology must not rely on legacy `artifact:heightfield` reads; migrate Hydrology truth steps to consume `artifact:morphology.topography` instead (and treat any remaining heightfield buffers as Gameplay-only runtime state).
  - Remove cross-domain dependencies that Phase 2 explicitly disallows for Morphology:
    - `artifact:morphology.routing` is internal-only (not a cross-domain contract); migrate any downstream consumers accordingly (see consumer matrix + Slice plan).
  - Re-home downstream adapter stamping steps that are currently misclassified as Physics (required to keep pipeline-green once Morphology stamping moves, and to satisfy the “Physics truth-only” boundary):
    - Ecology `features` step currently requires overlays + heightfield and provides an engine-applied effect (`phase: "ecology"` today): `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/contract.ts`
    - Hydrology `lakes` and `rivers` steps contain adapter modeling + `syncHeightfield` backfeed today:
      - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/lakes.ts`
      - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts`

- Out of scope:
  - Non-Morphology domain refactors beyond the minimal consumer migrations required to (a) remove overlays entirely and (b) preserve pipeline-green while moving Morphology stamping/materialization into Gameplay-owned steps.
  - Foundation refactors beyond the minimal tile-projection contract changes required to satisfy Phase 2 Morphology inputs (e.g., if `artifact:foundation.plates` is missing Phase 2-required drivers like `volcanism`, only add what Phase 2 requires and only to unblock Morphology).
  - Re-deriving or changing Phase 2 Morphology semantics (model changes belong in Phase 2 canon, not here).
  - Changing Civ7 adapter behavior or `packages/civ7-types` declarations (except where Phase 4 requires adding/renaming *effect tags* at the recipe layer).

## 3) Locked decisions + bans (required; copy verbatim)

Topology:
- Civ7 maps are a cylinder: `wrapX = true` always; `wrapY = false` always.
- No wrap knobs/env/config; wrap flags must not appear as contract inputs.

Truth vs map projection/materialization boundary:
- Physics domains publish truth-only artifacts (pure). No adapter coupling.
- Gameplay/materialization lane owns `artifact:map.*` (projection/annotation/observability) and adapter stamping.
- No backfeeding: Physics steps must not consume `artifact:map.*` or `effect:map.*` as inputs.
- Hard ban: no `artifact:map.realized.*` namespace.

Effects as execution guarantees:
- Completion is represented by boolean effects: `effect:map.<thing><Verb>`.
- Use semantically correct, short verbs:
  - `*Plotted` is appropriate for stamping/placement actions.
  - `*Built` is appropriate for TerrainBuilder build/postprocess actions (e.g. `effect:map.elevationBuilt`).
- Avoid inventing dozens of verbs; consolidate to a small set of clear verbs.

TerrainBuilder “no drift” lock (engine-derived elevation/cliffs):
- `TerrainBuilder.buildElevation()` produces engine-derived elevation/cliffs; there is no setter.
- Any decision that must match actual Civ7 elevation bands or cliff crossings belongs in Gameplay/map logic after `effect:map.elevationBuilt` and may read engine surfaces.
- Physics may publish complementary signals (slope/roughness/relief/etc.) but must not claim “Civ7 cliffs” as Physics truth.

No compat/shims:
- Do not plan or accept “temporary” shims, legacy paths, or dual APIs.
- Every slice must end pipeline-green with migrations + deletions in-slice.

Additional Phase 2 Morphology locks (domain-specific; enforced in M10):
- No story overlays at all in M10: overlays are not produced or consumed anywhere in the standard recipe (overlays are optional narrative annotations; they are removed in this milestone).
- No hidden multipliers/constants/defaults in compile/normalize/run paths for touched Morphology ops/steps (name constants or make them authored knobs; lock via tests).
- No placeholders / dead bags surviving any slice.

Enforcement mapping (must be implemented during Phase 4, and introduced in the same slice where it becomes true):
- `scripts/lint/lint-domain-refactor-guardrails.sh` (scoped): `REFRACTOR_DOMAINS="morphology" ./scripts/lint/lint-domain-refactor-guardrails.sh`
- Contract-guard tests (existing patterns):
  - `mods/mod-swooper-maps/test/morphology/contract-guard.test.ts` (extend for overlay + map boundary bans)
  - Add pipeline-level guard when introducing `effect:map.*` (see Slice plan guardrails).
- Hard-ban grep gate (code only; keep out of `docs/**` scope):
  - `rg -n "artifact:map\\.realized\\." mods/mod-swooper-maps/src packages/mapgen-core/src`

Locked decision → enforcement → slice (explicit):

| Lock | Enforcement mechanism | Slice introduced |
|---|---|---:|
| Topology lock (no wrap knobs; wrap not an input) | Extend `mods/mod-swooper-maps/test/morphology/contract-guard.test.ts` to fail on `wrapX`/`wrapY` authored fields in Morphology contracts/config; ensure `artifact:map.projectionMeta` uses fixed values | 1 (guard), 5 (projectionMeta) |
| No story overlays (no producers/consumers) | Contract-guard test bans `artifact:storyOverlays` in any step contract + `rg` bans overlay helper imports in non-Gameplay scopes + delete narrative stages | 1 (Morphology ban), 2 (full delete) |
| No `artifact:map.realized.*` | `rg` gate + add to pipeline contract guard | 1 (rg), 3 (pipeline test) |
| Boundary + no backfeeding (Physics cannot consume `artifact:map.*` / `effect:map.*`) | Guardrail script + contract inspection test for Morphology step contracts; full-profile guardrail once stamping removed from Morphology | 1 (script), 4 (full profile) |
| Effects posture (`effect:map.*` boolean; short verbs) | Regex-based contract guard on all `effect:map.*` ids + “no scattered literals” rule (tag catalog only) | 3 |
| TerrainBuilder no-drift | Allowlist + requires/provides gating tests for `.buildElevation`, `.getElevation`, `.isCliffCrossing` | 4 |
| No shims/dual paths | Removal ledger + per-slice exit gate commands; any legacy surface must be deleted in the slice that replaces it | All slices |
| No hidden multipliers/constants/defaults | Guardrail full profile + add explicit “no hidden defaulting” assertions in the pipeline guard for touched Gameplay steps | 4 (full profile), 5 (pipeline expansion) |
| No placeholders / dead bags | Phase 5 ruthlessness checklist + `rg`/fs checks added to fast gates for touched scopes | 5 |

## 4) Workstreams (required)

- Evidence + inventory (current state) and consumer migration matrix (break/fix by slice).
- Morphology contracts/ops changes (remove overlays; remove engine IDs from truth artifacts; ensure Phase 2 contract shape alignment).
- Overlay purge + recipe surgery (delete `narrative-pre`/`narrative-mid` stages; remove `artifact:storyOverlays` from the recipe; migrate any consumers/tests/configs in-slice).
- Gameplay stamping steps + effects (`map-morphology` stage; `effect:map.*` guarantees; adapter call allowlists).
- Gameplay map projections + stamping effects (`artifact:map.*` and `effect:map.*` introduction, naming lock, and allowlists for adapter/engine calls).
- Guardrails + verification gates (fast vs full), plus a cleanup/removal ledger with per-slice deletions.

## 5) Slice plan (required)

### Current-state inventory (verified; key Morphology-touching steps)

Morphology stages/steps (Physics-braided today; must be made truth-only):
- `morphology-pre/landmass-plates` (`id: "landmass-plates"`) — contract: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.contract.ts`, impl: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`
  - Violations: adapter writes (`writeHeightfield`), `validateAndFixTerrain`, `stampContinents`.
- `morphology-pre/coastlines` (`id: "coastlines"`) — contract: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.contract.ts`, impl: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts`
  - Violations: adapter write (`expandCoasts`) + manual sync back into `ctx.buffers.heightfield.*`.
- `morphology-mid/rugged-coasts` (`id: "rugged-coasts"`) — contract: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.contract.ts`, impl: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts`
  - Violations: consumes overlays + adapter writes (`writeHeightfield`).
- `morphology-post/islands` (`id: "islands"`) — contract: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.contract.ts`, impl: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts`
  - Violations: consumes overlays + adapter writes (`writeHeightfield`).
- `morphology-post/mountains` (`id: "mountains"`) — contract: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.contract.ts`, impl: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.ts`
  - Violations: adapter writes (`writeHeightfield`).
- `morphology-post/volcanoes` (`id: "volcanoes"`) — contract: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.contract.ts`, impl: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts`
  - Violations: consumes overlays + adapter writes (`writeHeightfield`, `setFeatureType`).

Braided consumers that must not backfeed into Physics (Gameplay-owned consumers; may be re-ordered later in the recipe):
- Story overlay system (to be deleted in M10):
  - Producer today: `artifact:storyOverlays` is provided by `narrative-pre/story-seed` and then used by Morphology violations and (test-only) Ecology helpers today.
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/artifacts.ts` and contract requires in Morphology steps.
- Placement landmass region stamping exists but does not yet publish Phase 2 `artifact:map.*` surfaces:
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts`.

Hydrology legacy mismatch explicitly called out by Phase 2 stamping spec (must re-home in M10):
- `TerrainBuilder.buildElevation()` currently called from a Physics-braided Hydrology step:
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts`.

### Target stage order (Phase 2 topology; no backfeeding)

Current order (verified): `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`:
- `foundation → morphology-pre → narrative-pre → morphology-mid → narrative-mid → morphology-post → hydrology-* → ecology → placement`

Target order after M10 (Physics truth first; Gameplay later; no overlays):
- `foundation → morphology-pre → morphology-mid → morphology-post → hydrology-* (truth-only) → ecology (truth-only) → map-morphology (new) → map-hydrology (new) → map-ecology (new) → placement`

Notes:
- `narrative-pre` / `narrative-mid` are removed in M10 (no overlay producers/consumers remain).
- `map-morphology` is a Gameplay-owned stamping stage that consumes frozen Physics truth and provides `effect:map.*`.
- `map-hydrology` / `map-ecology` are Gameplay-owned stamping stages that host adapter lake/river/feature stamping (moved out of Physics in Slice 4); they must not backfeed into Physics.

Interim ordering for pipeline-green slicing:
- Slice 3 inserts `map-morphology` at the legacy stamping boundary (before Hydrology/Ecology) to keep existing downstream engine-stamping steps runnable while they are re-homed.
- Slice 4 completes the re-home of downstream adapter stamping steps (Hydrology/Ecology) and then moves `map-morphology` to its final post-Physics position.

### New Gameplay stamping stage (proposed; ids + paths)

Stage:
- `id: "map-morphology"` — new stage at `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/index.ts`

Steps (all `phase: "gameplay"`; all provide `effect:map.*`):
- `plot-continents`
  - contract: `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/plotContinents.contract.ts`
  - impl: `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/plotContinents.ts`
- `plot-coasts`
  - contract: `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/plotCoasts.contract.ts`
  - impl: `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/plotCoasts.ts`
- `build-elevation`
  - contract: `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/buildElevation.contract.ts`
  - impl: `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/buildElevation.ts`
- `plot-mountains`
  - contract: `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/plotMountains.contract.ts`
  - impl: `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/plotMountains.ts`
- `plot-volcanoes`
  - contract: `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/plotVolcanoes.contract.ts`
  - impl: `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/plotVolcanoes.ts`

Tag definitions (new map effects live here; do not scatter string literals):
- `mods/mod-swooper-maps/src/recipes/standard/tags.ts`
  - add `M10_EFFECT_TAGS.map`:
    - `coastsPlotted: "effect:map.coastsPlotted"`
    - `continentsPlotted: "effect:map.continentsPlotted"`
    - `elevationBuilt: "effect:map.elevationBuilt"`
    - `mountainsPlotted: "effect:map.mountainsPlotted"`
    - `volcanoesPlotted: "effect:map.volcanoesPlotted"`
    - `landmassRegionsPlotted: "effect:map.landmassRegionsPlotted"`

Landmass region projection + stamping (Phase 2 `artifact:map.*`; placed in Placement stage to minimize wiring churn):
- Add `plot-landmass-regions` to Placement:
  - contract: `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/plot-landmass-regions/contract.ts`
  - impl: `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/plot-landmass-regions/index.ts`
  - Provides:
    - `artifact:map.projectionMeta`
    - `artifact:map.landmassRegionSlotByTile`
    - `effect:map.landmassRegionsPlotted`

Additional Gameplay stamping stages (introduced in Slice 4 for topology cutover; minimal definition here):
- `map-hydrology` (Gameplay) — hosts adapter lake/river stamping that must not live in Physics stages.
- `map-ecology` (Gameplay) — hosts adapter feature stamping that must not live in the Ecology Physics stage.

Proposed stage roots:
- `mods/mod-swooper-maps/src/recipes/standard/stages/map-hydrology/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/map-ecology/index.ts`

### Public surface vs internal-only posture (required)

- Public Morphology truth surfaces (cross-domain consumers; Phase 2 contracts are authority):
  - `artifact:morphology.topography`
  - `artifact:morphology.substrate`
  - `artifact:morphology.coastlineMetrics`
  - `artifact:morphology.landmasses`
  - `artifact:morphology.volcanoes`
- Non-public (internal-only) intermediates:
  - Any per-step scratch buffers and op-private rule outputs.
  - `artifact:morphology.routing` (internal-only; not a cross-domain contract per Phase 2; migrate Hydrology consumers).
  - Any Gameplay-only “intent” surfaces that have no downstream consumers (prefer compute-and-stamp without publishing when no other step needs the intent).
- Public Gameplay projection surfaces introduced/owned by this refactor (Phase 2):
  - `artifact:map.projectionMeta`
  - `artifact:map.landmassRegionSlotByTile`

### Consumer inventory + migration matrix (break/fix by slice)

Legend:
- Break = consumer must change in this slice.
- No-op = no required change.
- Optional = consumer can adopt new surface but not required.

| Consumer (today) | Today depends on | Slice 1 | Slice 2 | Slice 3 | Slice 4 | Slice 5 |
|---|---|---:|---:|---:|---:|---:|
| `morphology-mid/rugged-coasts` | `artifact:storyOverlays` | Break | No-op | No-op | Break (stamping removed) | No-op |
| `morphology-post/islands` | `artifact:storyOverlays` | Break | No-op | No-op | Break (stamping removed / move earlier if needed) | No-op |
| `morphology-post/volcanoes` | `artifact:storyOverlays` | Break | No-op | No-op | Break (stamping removed) | No-op |
| `hydrology-climate-baseline/climate-baseline` | legacy `artifact:heightfield` reads + `buildElevation()` + engine sync/read + `stampContinents()` + `adapter.getLatitude` | No-op | No-op | No-op | Break (remove legacy heightfield + `buildElevation()` + `stampContinents()` + engine sync/read + adapter latitude reads) | No-op |
| `hydrology-climate-baseline/lakes` | adapter lake modeling + `syncHeightfield` backfeed | No-op | No-op | No-op | Break (move to Gameplay stamping) | No-op |
| `hydrology-hydrography/rivers` | requires `artifact:morphology.routing` | No-op | No-op | No-op | Break (migrate off Morphology routing) | No-op |
| `ecology/features` | `artifact:storyOverlays` (bias overlays) | No-op | Break (drop overlays) | No-op | Break (move to Gameplay stamping) | No-op |
| `narrative-pre/*` + `narrative-mid/*` | produces/consumes overlays | No-op | Break (delete stages + migrate tests/configs) | No-op | No-op | No-op |
| `placement/placement` | stamps LandmassRegionId (no `artifact:map.*`) | No-op | No-op | No-op | No-op | Break (publish `artifact:map.*` + `effect:map.landmassRegionsPlotted`) |

### Removal ledger (required; every legacy surface removed in-slice)

| Legacy surface to remove | Why | Slice |
|---|---|---:|
| Overlay reads (`readOverlay*`) under Morphology steps | Overlay backfeeding ban | 1 |
| Overlay-derived inputs in Morphology ops (`plan-volcanoes`, `compute-coastline-metrics`, `plan-island-chains` if present) | Overlays removed in M10 | 1 |
| `artifact:storyOverlays` in any step contract under `mods/mod-swooper-maps/src/recipes/standard/stages/**` | Overlays removed in M10 | 2 |
| `narrative-pre` + `narrative-mid` stages in the standard recipe | Overlays removed in M10 | 2 |
| Adapter calls in `morphology-pre/landmassPlates.ts` (`validateAndFixTerrain`, `stampContinents`, `writeHeightfield`) | Boundary lock (Physics purity) | 3 |
| Adapter-coupled tracing/logging helpers in Morphology Physics steps (e.g. `logLandmassAscii`) | Boundary lock (Physics purity; no adapter coupling) | 3 |
| Adapter calls + sync in `morphology-pre/coastlines.ts` (`expandCoasts` + manual engine sync) | Boundary lock (Physics purity) | 3 |
| `artifact:morphology.coastlinesExpanded` (engine-expansion marker) | Boundary lock (Gameplay owns map stamping) | 3 |
| Engine terrain ids in Morphology truth (`artifact:morphology.topography.terrain`) | Truth-only artifact lock | 3 |
| `buildElevation()` + `stampContinents()` in `hydrology-climate-baseline/climateBaseline.ts` | TerrainBuilder no-drift + boundary lock | 4 |
| Adapter lake/river modeling + `syncHeightfield` backfeed in Hydrology steps | Boundary lock (Physics purity) | 4 |
| Hydrology truth steps relying on legacy `artifact:heightfield` reads (`heightfield.elevation/terrain/landMask`) | Phase 2 Hydrology input lock (use `artifact:morphology.topography` as canonical topography input) | 4 |
| Physics-stage `adapter.getLatitude(...)` usage in Hydrology/Ecology truth steps | Boundary lock (Physics purity; use `context.env.latitudeBounds` instead) | 4 |
| `writeHeightfield` in `morphology-mid/ruggedCoasts.ts` | Boundary lock (Physics purity) | 4 |
| `writeHeightfield` in `morphology-post/islands.ts` | Boundary lock (Physics purity) | 4 |
| `writeHeightfield` in `morphology-post/mountains.ts` | Boundary lock (Physics purity) | 4 |
| `writeHeightfield` / `setFeatureType` in `morphology-post/volcanoes.ts` | Boundary lock (Physics purity) | 4 |
| Adapter fractal calls (`createFractal` / `getFractalHeight`) inside Morphology Physics steps | Boundary lock (Physics purity) | 4 |
| Cross-domain use of `artifact:morphology.routing` | Phase 2 contract lock (routing is internal-only) | 4 |
| Missing Phase 2 map projection surfaces for landmass region slots | Phase 2 stamping contract | 5 |

### Sequencing refinement pass (required; single pass)

1. Drafted slices from Phase 2 deltas and current-state violations (overlay inputs, adapter writes in Physics, TerrainBuilder mis-homing).
2. Re-ordered for pipeline safety:
   - Remove overlays as early as possible:
     - Slice 1: remove overlays from Morphology contracts/ops/steps.
     - Slice 2: delete the overlay system entirely (no producers/consumers, delete narrative stages).
   - Then move the earliest, most load-bearing adapter stamping (`expandCoasts`, `stampContinents`) out of Morphology-pre into Gameplay (reduces “two truths” risks before addressing later stamps).
   - Then re-home `buildElevation()` out of Hydrology into Gameplay (establish the no-drift boundary before migrating other engine reads).
   - Then remove remaining Morphology adapter writes (rugged coasts / islands / mountains / volcanoes) by introducing Gameplay plotting steps and removing adapter fractal/noise calls from Physics.
   - Finally, complete truth artifact cleanup + required `artifact:map.*` projections and lock guardrails at full profile.
3. Re-checked downstream deltas: every slice includes the required consumer migrations and explicit deletions; no slice relies on shims or dual paths.
4. Locked: no Phase 2 model changes introduced; slice order is chosen to minimize “engine backfeed” surface area early.

---

### Slice 1 — Delete overlays as Morphology inputs (behavior-preserving where possible)

- Scope:
  - Remove `artifact:storyOverlays` from Morphology step contracts:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.contract.ts`
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.contract.ts`
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.contract.ts`
  - Remove overlay parsing from Morphology implementations:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts`
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts`
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts`
  - Remove overlay-derived inputs from Morphology ops:
    - `mods/mod-swooper-maps/src/domain/morphology/ops/plan-volcanoes/contract.ts` (remove overlay masks; no overlays permitted):
      - required: `artifact:morphology.topography.landMask` (vents are land-only)
      - required: `artifact:foundation.plates` (tile-space boundary context)
      - required: `artifact:foundation.tectonics.volcanism` (canonical upstream volcanism driver; no overlays)
      - optional (Phase 2 tie-breaker): `artifact:morphology.topography.elevation`
      - note: if Morphology’s volcano planning needs tile-space volcanism/tectonics signals, produce them deterministically from Foundation truth (prefer extending `artifact:foundation.plates` projection; do not re-introduce overlays).
    - `mods/mod-swooper-maps/src/domain/morphology/ops/compute-coastline-metrics/contract.ts` (remove overlay-derived masks/inputs if present).
    - `mods/mod-swooper-maps/src/domain/morphology/ops/plan-island-chains/contract.ts` (remove overlay-derived masks/inputs if present; this is a Morphology-internal helper, not an overlay and not a Gameplay plotting step).
- Cutovers/deletions:
  - Delete/replace any `readOverlay*` dependency from Morphology call paths (overlays are removed in M10; delete overlay helpers where they become unused).
- Prework Prompt (Agent Brief): Foundation volcanism + tectonics drivers for Morphology (no overlays)
  - **Purpose:** Make Phase 2’s upstream driver posture executable: Morphology volcano intent must be derived from Foundation truth (`artifact:foundation.plates` + `artifact:foundation.tectonics.volcanism`) with no overlay inputs.
  - **Expected Output:**
    - Confirm current `artifact:foundation.plates` schema vs Phase 2 required fields; list deltas.
    - Decide how tile-space Morphology consumes volcanism deterministically:
      - (A) extend the Foundation projection (`foundation/steps/projection` + `ops.computePlates`) to include the Phase 2 tile-space fields Morphology needs (preferred), or
      - (B) keep `artifact:foundation.plates` as-is and derive any needed tile-space volcanism signals inside Morphology from `artifact:foundation.tectonics` + `artifact:foundation.mesh` (only if Phase 2 allows and it does not create a second projection path).
    - Produce a concrete “contract patch” list:
      - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts` (schema updates if needed)
      - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.ts` + `.../projection.contract.ts` (if projection output changes)
      - `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/contract.ts` (if op outputs change)
      - `mods/mod-swooper-maps/src/domain/morphology/ops/plan-volcanoes/contract.ts` (final requires list; overlays removed)
    - Add/extend guard tests for the new contract fields (no silent defaults).
  - **Sources to Check:**
    - Phase 2 authority:
      - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`
      - `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`
    - Current repo truth:
      - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`
      - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.ts`
- Downstream:
  - Consumer matrix “Break” rows completed in-slice:
    - `morphology-mid/rugged-coasts` (stop requiring overlays)
    - `morphology-post/islands` (stop requiring overlays)
    - `morphology-post/volcanoes` (stop requiring overlays)
- Guardrails introduced in-slice:
  - Extend `mods/mod-swooper-maps/test/morphology/contract-guard.test.ts` to fail if:
    - any Morphology step contract `requires` `artifact:storyOverlays`,
    - any Morphology step implementation imports `overlays.js` / `readOverlay*`.
  - Run scoped guardrail script as the slice’s “must pass”:
    - `REFRACTOR_DOMAINS="morphology" ./scripts/lint/lint-domain-refactor-guardrails.sh`
- Exit criteria (pipeline-green):
  - Standard recipe builds/tests pass and Morphology step contracts no longer require overlays.
  - Ruthlessness mini-pass (in-slice; do not defer to Slice 5):
    - Delete any newly-unused overlay helper imports from the touched files.
    - Run fast gates.

**Acceptance criteria (Slice 1):**
- [ ] No Morphology step contract in `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-*` requires `artifact:storyOverlays`.
- [ ] No Morphology step implementation imports `overlays.js` or `readOverlay*`.
- [ ] Morphology ops touched in this slice have zero overlay-derived inputs (contracts enforce this).
- [ ] `REFRACTOR_DOMAINS="morphology" ./scripts/lint/lint-domain-refactor-guardrails.sh` passes.

**Files (Slice 1):**
```yaml
files:
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.contract.ts
    notes: Drop `artifact:storyOverlays` requires
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.contract.ts
    notes: Drop `artifact:storyOverlays` requires
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.contract.ts
    notes: Drop `artifact:storyOverlays` requires
  - path: mods/mod-swooper-maps/src/domain/morphology/ops/plan-volcanoes/contract.ts
    notes: Remove overlay masks; require Foundation drivers per Phase 2
  - path: mods/mod-swooper-maps/test/morphology/contract-guard.test.ts
    notes: Enforce “no overlays” posture for Morphology contracts + implementations
```

### Slice 2 — Delete the overlay system (no producers/consumers; delete Narrative stages)

- Scope:
  - Delete `artifact:storyOverlays` from the standard recipe:
    - Remove the producer stage(s) and any `narrativePreArtifacts.overlays` artifact contracts.
    - Remove any remaining consumers (should be none after Slice 1 + Ecology migration below).
  - Delete `narrative-pre` and `narrative-mid` stages from the standard recipe (no “move later”; they are removed in M10):
    - Update `mods/mod-swooper-maps/src/recipes/standard/recipe.ts` to remove these stages.
    - Migrate all configs/tests that reference `"narrative-pre"` / `"narrative-mid"` in-slice (no dual config paths):
      - `mods/mod-swooper-maps/src/maps/**`
      - `mods/mod-swooper-maps/test/standard-run.test.ts`
      - `mods/mod-swooper-maps/test/standard-recipe.test.ts`
      - Any tests importing narrative stage artifacts/contracts (grep gate: `rg -n "stages/narrative-(pre|mid)" mods/mod-swooper-maps/test mods/mod-swooper-maps/src`).
  - Remove Ecology overlay dependency (overlays are not load-bearing):
    - Update `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/contract.ts` (and any helpers) to stop requiring `narrativePreArtifacts.overlays`.
    - If Ecology previously used overlays as “biases” (hotspots/margins), delete those dependencies rather than inventing new overlays.
- Cutovers/deletions:
  - Enforce that `artifact:storyOverlays` no longer exists in the recipe layer (contracts + tags).
- Guardrails introduced in-slice:
  - Add an overlay purge gate (fast, code-only):
    - `rg -n "artifact:storyOverlays|narrativePreArtifacts\\.overlays|readOverlay|overlays\\.js" mods/mod-swooper-maps/src` must be empty outside `docs/**`.
- Downstream:
  - Consumer matrix “Break” rows completed in-slice:
    - `narrative-pre/*` + `narrative-mid/*` (deleted)
    - `ecology/features` (no overlay dependency)
- Exit criteria (pipeline-green):
  - No stage/step contracts in the standard recipe require `artifact:storyOverlays` (and the narrative stages are removed from recipe/config/tests).
  - Ruthlessness mini-pass (in-slice; do not defer to Slice 5):
    - Delete any now-unused overlay helpers/contracts/artifacts.
    - Run fast gates.

**Acceptance criteria (Slice 2):**
- [ ] `narrative-pre` and `narrative-mid` are removed from `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`.
- [ ] `rg -n "artifact:storyOverlays|narrativePreArtifacts\\.overlays|readOverlay|overlays\\.js" mods/mod-swooper-maps/src` returns zero hits (outside `docs/**`).
- [ ] `ecology/features` no longer requires overlays (and no replacement overlays are introduced).
- [ ] Standard recipe tests referencing narrative stages are migrated/deleted in-slice (no dual config paths).

**Files (Slice 2):**
```yaml
files:
  - path: mods/mod-swooper-maps/src/recipes/standard/recipe.ts
    notes: Remove `narrative-pre` and `narrative-mid` stages from standard recipe ordering
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/artifacts.ts
    notes: Deleted or fully unused after stage removal
  - path: mods/mod-swooper-maps/src/recipes/standard/overlays.ts
    notes: Deleted (or proven unused) once overlay system is removed
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/contract.ts
    notes: Drop overlay requires; delete overlay-bias logic
  - path: mods/mod-swooper-maps/test/standard-run.test.ts
    notes: Remove narrative stage expectations/config
  - path: mods/mod-swooper-maps/test/standard-recipe.test.ts
    notes: Remove narrative stage expectations/config
```

### Slice 3 — Introduce `map-morphology` (Gameplay stamping) + re-home coasts/continents/effects

- Scope:
  - Convert Morphology-pre steps to truth-only (no adapter writes):
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`
      - Replace `writeHeightfield(...)` usage with truth-only writes (Morphology truth artifacts + op-private scratch only; no `context.adapter.*` calls; do not publish or depend on legacy `artifact:heightfield` from Morphology).
      - Remove adapter-coupled debug/tracing helpers (e.g. `logLandmassAscii(context.trace, context.adapter, ...)`) from Physics steps (no adapter coupling).
    - Delete the now-obsolete Morphology coastline-expansion step (engine work moved to Gameplay):
      - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.contract.ts`
      - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts`
      - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/index.ts` (remove `coastlines` from `steps`)
    - Remove engine-coupled truth fields and engine-expansion marker artifacts:
      - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts` (delete `topography.terrain` and delete `artifact:morphology.coastlinesExpanded`).
  - Add `map-morphology` stage (Gameplay-owned stamping + guarantees):
    - Stage: `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/index.ts`
    - Steps:
      - `plot-continents` provides `effect:map.continentsPlotted`
      - `plot-coasts` provides `effect:map.coastsPlotted`
    - Required adapter ordering (Phase 2 stamping spec):
      - `plot-coasts`: `adapter.expandCoasts(width,height)` + required sync of any runtime-local buffers before asserting the effect.
      - `plot-continents`: `adapter.validateAndFixTerrain()` → `adapter.recalculateAreas()` → `adapter.stampContinents()`.
  - Insert `map-morphology` at the legacy stamping boundary (interim; pipeline-green):
    - `foundation → morphology-pre → morphology-mid → morphology-post → map-morphology → hydrology-* → ecology → placement`
    - Rationale: existing Hydrology/Ecology steps still depend on engine-stamped terrain/elevation today; Slice 4 re-homes those adapter-stamping steps into Gameplay and then moves `map-morphology` to its final post-Physics position.
  - Introduce map effect tags in a single place (no string literals):
    - `mods/mod-swooper-maps/src/recipes/standard/tags.ts` (`M10_EFFECT_TAGS.map.*`, `EFFECT_OWNERS`)
- Guardrails introduced in-slice:
  - Add a pipeline contract guard when `effect:map.*` is introduced:
    - `mods/mod-swooper-maps/test/pipeline/map-stamping.contract-guard.test.ts` (seeded here; expanded in Slice 5).
    - Assert that all Physics step contracts in the standard recipe do not `require` any `effect:map.*` or `artifact:map.*`.
    - Ban `artifact:map.realized.*` globally (cheap, global lock).
  - Add effect naming guardrail for newly introduced map effects:
    - All `effect:map.*` must match `^effect:map\\.[a-z][a-zA-Z0-9]*(Plotted|Built)$`.
- Downstream:
  - Consumer matrix “Break” rows completed in-slice:
    - `morphology-pre/*` (no adapter writes)
- Exit criteria (pipeline-green):
  - No adapter calls remain in Morphology-pre steps, and recipe executes with `map-morphology` providing `effect:map.coastsPlotted` / `effect:map.continentsPlotted`.
  - Ruthlessness mini-pass (in-slice; do not defer to Slice 5):
    - Delete any now-unused legacy Morphology stamping helpers/artifacts.
    - Run fast gates.

**Acceptance criteria (Slice 3):**
- [ ] `morphology-pre/landmass-plates` and any remaining `morphology-pre/*` steps contain zero adapter calls (`context.adapter.*`) and perform no engine stamping.
- [ ] No Morphology-pre Physics step depends on adapter-coupled tracing/logging helpers (e.g. `logLandmassAscii`).
- [ ] `morphology-pre/coastlines` step is deleted and removed from `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/index.ts`.
- [ ] `artifact:morphology.topography.terrain` and `artifact:morphology.coastlinesExpanded` are deleted (no engine IDs or engine-expansion markers in Physics truth).
- [ ] `map-morphology` exists and provides `effect:map.coastsPlotted` + `effect:map.continentsPlotted` via `plot-coasts` + `plot-continents`.
- [ ] A pipeline-level contract guard exists and prevents Physics contracts from requiring `artifact:map.*` / `effect:map.*`.

**Files (Slice 3):**
```yaml
files:
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts
    notes: Remove adapter calls + adapter-coupled debug; write truth-only buffers
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts
    notes: Deleted (engine expansion moved to Gameplay)
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/index.ts
    notes: Remove `coastlines` from step list
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts
    notes: Delete `topography.terrain` and `artifact:morphology.coastlinesExpanded`
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/index.ts
    notes: New Gameplay stamping stage (plot-coasts, plot-continents)
  - path: mods/mod-swooper-maps/src/recipes/standard/tags.ts
    notes: Define `effect:map.*` tags in one place; add owners
  - path: mods/mod-swooper-maps/test/pipeline/map-stamping.contract-guard.test.ts
    notes: New pipeline contract guard seeded here
```

### Slice 4 — Re-home TerrainBuilder elevation + remaining Morphology stamping into Gameplay

- Scope:
  - Complete the Phase 2 topology cutover (final ordering; no overlays; Gameplay after Physics):
    - Re-home downstream adapter stamping steps currently living in Physics:
      - Move Hydrology lake/river adapter modeling + `syncHeightfield` out of Physics stages (Gameplay-owned stamping steps).
        - Evidence loci:
          - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/lakes.ts`
          - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts`
      - Remove legacy Hydrology Physics dependencies on `artifact:heightfield` (Phase 2 ban):
        - Update Hydrology truth steps to consume `artifact:morphology.topography` as the canonical topography input (elevation/landMask/bathymetry), not `heightfield.elevation/terrain/landMask`.
        - Delete (or move to Gameplay-only runtime) any `deps.artifacts.heightfield.read(...)` usage in Hydrology Physics steps.
      - Remove remaining adapter reads in Hydrology/Ecology truth steps:
        - Replace `context.adapter.getLatitude(...)` in Hydrology and Ecology with a pure latitude computation derived from `context.env.latitudeBounds` + row index (no adapter reads in Physics).
      - Move Ecology `features` (and any associated “apply” stamping step) out of the Ecology Physics stage into a Gameplay-owned stamping step.
        - Evidence locus: `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/contract.ts`
    - Then update recipe order to the final M10 topology:
      - `foundation → morphology-pre → morphology-mid → morphology-post → hydrology-* (truth-only) → ecology (truth-only) → map-morphology → map-hydrology (new) → map-ecology (new) → placement`
  - Add Gameplay-owned `build-elevation` step in `map-morphology`:
    - Calls `recalculateAreas()` → `buildElevation()` → `recalculateAreas()` → `stampContinents()` via adapter (Phase 2 required ordering).
    - Provides `effect:map.elevationBuilt`.
  - Remove `buildElevation()` (and any coupled `stampContinents()` repetition) from:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts`
  - Remove adapter writes from Morphology steps (truth-only):
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts` (remove `writeHeightfield` and adapter fractals)
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts` (remove `writeHeightfield` and adapter fractals; islands are part of Morphology truth landMask, not a narrative overlay)
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.ts` (remove `writeHeightfield` and adapter fractals)
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts` (remove `writeHeightfield` / `setFeatureType`; publish Phase 2 volcano intent truth)
  - Introduce Gameplay-owned plotters (in `map-morphology`):
    - `plot-mountains` provides `effect:map.mountainsPlotted`
    - `plot-volcanoes` provides `effect:map.volcanoesPlotted`
- Guardrails introduced in-slice:
  - Add TerrainBuilder boundary allowlist:
    - `.buildElevation(` callsites only in Gameplay `build-elevation` step.
    - `.getElevation(` / `.isCliffCrossing(` callsites only in Gameplay steps that `require` `effect:map.elevationBuilt`.
  - Allowlist `writeHeightfield` / `setFeatureType` / `createFractal` / `getFractalHeight` to Gameplay plotting steps only.
  - Enable guardrail script “full profile” once Morphology stages are truth-only:
    - `REFRACTOR_DOMAINS="<slice-domains>" DOMAIN_REFACTOR_GUARDRAILS_PROFILE=full ./scripts/lint/lint-domain-refactor-guardrails.sh`
- Prework Prompt (Agent Brief): Hydrology rivers without `artifact:morphology.routing`
  - **Purpose:** Phase 2 locks `artifact:morphology.routing` as Morphology-internal. Hydrology must become independent of Morphology routing and derive its river modeling inputs from public truth artifacts.
  - **Expected Output:**
    - Inventory all call paths that read `artifact:morphology.routing` and what they use it for.
    - Propose the minimal replacement inputs for Hydrology rivers (prefer `artifact:morphology.topography` + `artifact:morphology.substrate` over any new cross-domain artifacts).
    - Produce a concrete contract patch list:
      - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.contract.ts`
      - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts`
      - Any Morphology internal exports that can be deleted once the consumer migration lands.
    - Define the slice-local verification for “no routing backfeed” (contract guard + `rg`).
  - **Sources to Check:**
    - Phase 2 authority: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md`
    - Current code: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts`
- Downstream:
  - Consumer matrix “Break” rows completed in-slice:
    - `hydrology-climate-baseline/climate-baseline` (remove `buildElevation()` + `stampContinents()` + engine sync/read usage)
    - `hydrology-hydrography/rivers` (migrate off `artifact:morphology.routing`; update `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.contract.ts`)
    - `hydrology-climate-baseline/lakes` (if moved out of Physics stages as part of the topology cutover)
    - `ecology/features` (move to Gameplay stamping; no overlays)
    - `morphology-mid/rugged-coasts` (remove stamping side-effects)
    - `morphology-post/islands` (remove stamping side-effects)
    - `morphology-post/volcanoes` (remove stamping side-effects)
- Exit criteria (pipeline-green):
  - No Morphology step performs adapter writes; all stamping occurs in Gameplay steps with the appropriate map effects.
  - No Physics step calls `buildElevation()` and any engine elevation/cliff reads are gated by `effect:map.elevationBuilt` in Gameplay only.
  - Ruthlessness mini-pass (in-slice; do not defer to Slice 5):
    - Delete any now-unused legacy stamping helpers and compat exports in touched scopes.
    - Run fast gates.

**Acceptance criteria (Slice 4):**
- [ ] `TerrainBuilder.buildElevation()` is called only from Gameplay (`map-morphology/build-elevation`) and provides `effect:map.elevationBuilt`.
- [ ] No Hydrology or Ecology Physics step reads `artifact:heightfield` or calls `syncHeightfield` to backfeed engine state into Physics decisions.
- [ ] No Hydrology or Ecology Physics step calls `context.adapter.getLatitude(...)` (latitude is derived from `context.env.latitudeBounds`).
- [ ] No Morphology Physics step performs adapter writes (`writeHeightfield`, `setFeatureType`, `createFractal`, `getFractalHeight`).
- [ ] `map-hydrology` and `map-ecology` stages exist (or equivalent Gameplay steps) and own all adapter stamping previously in Physics Hydrology/Ecology.

**Files (Slice 4):**
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

### Slice 5 — Truth artifact cleanup + required map projection artifacts + deletion sweep

- Scope:
  - Align Morphology truth artifacts to Phase 2 contract shapes (explicit deltas; no Phase 2 model changes):
    - `artifact:morphology.topography`: ensure engine IDs are removed; add Phase 2-required fields (e.g., `seaLevel`, `bathymetry`) and lock units.
    - `artifact:morphology.coastlineMetrics`: ensure Phase 2-required fields exist (e.g., `distanceToCoast`).
    - `artifact:morphology.landmasses`: ensure Phase 2-required fields (e.g., `coastlineLength`) + ordering/tie-breakers are explicit.
    - `artifact:morphology.volcanoes`: ensure Phase 2 intent artifact exists (land-only, ordered list) and is the only source for volcano plotting (including `strength01` derivation posture).
  - Implement required Phase 2 map projection surfaces (Gameplay-owned):
    - `artifact:map.projectionMeta` (fixed `wrapX=true`, `wrapY=false` as values; not knobs)
    - `artifact:map.landmassRegionSlotByTile` (slot projection per Phase 2 stamping spec)
    - Introduce `effect:map.landmassRegionsPlotted` on the stamping step.
  - Add the explicit stamping boundary for landmass regions (keeps existing algorithm; adds Phase 2 contract surfaces):
    - New step `plot-landmass-regions` under Placement stage:
      - contract: `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/plot-landmass-regions/contract.ts`
      - impl: `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/plot-landmass-regions/index.ts`
    - Wire it into Placement stage:
      - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/index.ts` (insert between `derivePlacementInputs` and `placement`)
      - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/index.ts` (export it)
    - Migration within Placement:
      - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts` consumes `artifact:map.landmassRegionSlotByTile` and does no slot computation.
  - Cleanup sweep (M10 scope):
    - Ensure `rg -n "artifact:map\\.realized\\." mods/mod-swooper-maps/src packages/mapgen-core/src` remains empty.
    - Ensure no `syncHeightfield` is used to backfeed engine state into Morphology truth or Physics decisions for Morphology-owned concepts.
    - Ensure legacy `artifact:heightfield` is deleted (or isolated to Gameplay-only runtime state with no cross-domain contracts):
      - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/artifacts.ts` (`id: "artifact:heightfield"`)
- Guardrails introduced in-slice:
  - Expand the pipeline-level contract guard (seeded in Slice 3) to full coverage of map-stamping posture:
    - `mods/mod-swooper-maps/test/pipeline/map-stamping.contract-guard.test.ts`
      - ban `artifact:map.realized.*`
      - enforce `effect:map.*` naming posture
      - enforce `buildElevation/getElevation/isCliffCrossing` allowlist + gating
  - Keep the full-profile guardrail script enabled (should remain green once Morphology is truth-only):
    - `REFRACTOR_DOMAINS="morphology" DOMAIN_REFACTOR_GUARDRAILS_PROFILE=full ./scripts/lint/lint-domain-refactor-guardrails.sh`
- Downstream:
  - Consumer matrix “Break” rows completed in-slice:
    - `placement/placement` (consume `artifact:map.landmassRegionSlotByTile` and stop slot computation)
- Exit criteria (pipeline-green):
  - Phase 2 contract surfaces exist and are the only sources (no duplicate computations, no engine IDs in Physics truth, no lingering legacy stamping in Physics).
  - Ruthlessness mini-pass (Phase 5 gate; do not defer):
    - Run the Phase 5 checklist (see `## 6) Acceptance criteria`).

**Acceptance criteria (Slice 5):**
- [ ] Morphology truth artifacts match Phase 2 schemas (including required fields + invariants; no engine terrain IDs).
- [ ] `artifact:map.projectionMeta` exists with fixed `wrapX=true`, `wrapY=false` values (not authored knobs).
- [ ] `artifact:map.landmassRegionSlotByTile` exists and Placement consumes it (no slot computation in placement apply).
- [ ] No legacy `artifact:heightfield` remains as a cross-domain contract input (Hydrology does not read it).
- [ ] Full-profile guardrails pass for `morphology` and the pipeline contract guard enforces map-stamping posture.

**Files (Slice 5):**
```yaml
files:
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts
    notes: Final Phase 2 topography truth shape (no engine IDs)
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/plot-landmass-regions/contract.ts
    notes: New Placement projection contract
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/plot-landmass-regions/index.ts
    notes: New Placement projection implementation
  - path: mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts
    notes: Consume `artifact:map.landmassRegionSlotByTile` only
  - path: mods/mod-swooper-maps/test/pipeline/map-stamping.contract-guard.test.ts
    notes: Expanded pipeline guard coverage
```

## 6) Acceptance criteria (required)

Phase 3 completion checklist (plan quality gates):
- [x] Slices are pipeline-green by construction: each slice lists explicit deletions + consumer migrations (no shims/dual paths).
- [x] Locked decisions are copied verbatim and have enforcement mechanisms mapped to the slice where they become true.
- [x] Consumer migration matrix exists and is consistent with the slice plan.
- [x] Removal ledger exists and assigns every legacy surface to a slice.
- [x] No Phase 2 model changes are proposed; Phase 2 trilogy remains the authority.

Phase 4 per-slice completion checklist (summary):
- [ ] All “in-scope” adapter calls are only in Gameplay-owned `plot-*` / `build-*` steps and are guarded by allowlists/tests.
- [ ] Overlays are fully removed (no `artifact:storyOverlays` producers/consumers); Morphology steps are truth-only and do not read overlays, `artifact:map.*`, or `effect:map.*`.
- [ ] No `artifact:map.realized.*` exists in code scope (only allowed in docs as quoted text).
- [ ] `effect:map.*` names are short and consistent (`Plotted` / `Built`); no verb explosion.
- [ ] `TerrainBuilder.buildElevation()` is Gameplay-only and gated by `effect:map.elevationBuilt`.
- [ ] Morphology truth artifacts contain no engine IDs; downstream consumers are migrated.

### Phase 5 gate (required; ruthlessness + traceability)

Hard rules:
- No Phase 2 model changes (Phase 2 trilogy is authority; any mismatch opens a modeling follow-up, not an opportunistic patch).
- No dual-path compute; no compatibility techniques/shims; no “follow-up cleanup PR” deferrals.
- No hidden multipliers/constants/defaults introduced in touched ops/steps (name constants or expose as authored knobs; update docs/tests as needed).
- No placeholders / dead bags / unused config bags/modules remaining in touched scopes.

Ruthlessness pass (must be explicitly biased toward deletion):
- Delete any now-unused legacy helpers/compat exports/re-exports that bypass the op boundary.
- Confirm steps are orchestration-only (no op-impl imports; no alternate dependency access paths; no ad-hoc artifact imports).
- Confirm ops are atomic/contract-first (no op composition; no adapter/RNG boundary leaks; normalized config only).

Verification gates:
- Domain guardrails (fast):
  - `REFRACTOR_DOMAINS="<slice-domains>" ./scripts/lint/lint-domain-refactor-guardrails.sh`
- Repo-level check (fast-ish):
  - `pnpm check`
- Full gates (must be green before “done”):
  - `pnpm -C packages/mapgen-core check`
  - `pnpm -C packages/mapgen-core test`
  - `pnpm -C mods/mod-swooper-maps check`
  - `pnpm -C mods/mod-swooper-maps test`
  - `pnpm -C mods/mod-swooper-maps build`
  - `pnpm deploy:mods`
- If a gate isn’t runnable due to environment constraints, record: which gate, why environmental, and surrogate evidence (CI job, narrower check, etc.).

Traceability (required):
- Ensure no compat/cleanup deferrals remain in-scope; if something cannot be deleted, redesign slices until it can.
- If a decision has cross-domain impact, capture it in `docs/projects/engine-refactor-v1/triage.md`.

### Lookback 4 (required at end of Phase 4)

Fill in at the end of Phase 4 (plan vs actual):
- What changed (deltas to slices / ordering / contracts)
- Why it changed (evidence)
- What follow-ups were opened (links)

## 7) Verification commands (required)

Per-slice domain set (`<slice-domains>`):
- Slice 1: `foundation,morphology` (Foundation only if needed to satisfy Phase 2 Morphology driver inputs; see Slice 1 prework prompt)
- Slice 2: `morphology,ecology` (plus recipe/config/test migrations)
- Slice 3: `morphology` (plus recipe wiring + new Gameplay stage)
- Slice 4: `morphology,hydrology,ecology` (plus any moved/updated consumers)
- Slice 5: `morphology,hydrology,placement` (includes deletion of legacy `artifact:heightfield` if still present)

Fast gates (per-slice exit gates):

```bash
REFRACTOR_DOMAINS="<slice-domains>" ./scripts/lint/lint-domain-refactor-guardrails.sh

# overlays must be gone after Slice 2
rg -n "artifact:storyOverlays|narrativePreArtifacts\\.overlays|readOverlay|overlays\\.js" mods/mod-swooper-maps/src

rg -n "artifact:map\\.realized\\." mods/mod-swooper-maps/src packages/mapgen-core/src

# legacy heightfield contract + adapter latitude reads must be gone from Physics after Slice 4
rg -n "artifact:heightfield|hydrologyClimateBaselineArtifacts\\.heightfield|deps\\.artifacts\\.heightfield\\.read" mods/mod-swooper-maps/src
rg -n "adapter\\.getLatitude\\(" mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-* mods/mod-swooper-maps/src/recipes/standard/stages/ecology

pnpm -C packages/mapgen-core check
pnpm -C mods/mod-swooper-maps check

pnpm -C mods/mod-swooper-maps test -- test/morphology/contract-guard.test.ts test/morphology/ops.test.ts

# after Slice 3 introduces `effect:map.*` + `map-morphology`
pnpm -C mods/mod-swooper-maps test -- test/pipeline/map-stamping.contract-guard.test.ts
```

Full gates (pre-merge / phase completion):

```bash
REFRACTOR_DOMAINS="<slice-domains>" DOMAIN_REFACTOR_GUARDRAILS_PROFILE=full ./scripts/lint/lint-domain-refactor-guardrails.sh

pnpm -C packages/mapgen-core check
pnpm -C packages/mapgen-core test
pnpm -C packages/mapgen-core build

pnpm -C mods/mod-swooper-maps check
pnpm -C mods/mod-swooper-maps test
pnpm -C mods/mod-swooper-maps build

pnpm deploy:mods

pnpm check
pnpm test
pnpm build
```

## 8) Risks + mitigations (required)

- Risk: “two truths” drift (engine-stamped terrain/water diverges from Morphology truth land/water/topography).
  - Mitigation: move stamping into explicit Gameplay steps with boolean effects; do not sync engine state back into Physics truth; add allowlist guardrails for engine reads/writes.
- Risk: hidden backfeeding via overlays (Morphology subtly depends on Narrative masks again).
  - Mitigation: contract-guard tests banning `artifact:storyOverlays` in Morphology contracts + banning overlay helper imports under Morphology steps/ops.
- Risk: TerrainBuilder ordering drift (elevation built too early/late; Physics consumes engine elevation).
  - Mitigation: dedicated `build-elevation` Gameplay step providing `effect:map.elevationBuilt`; allowlist + requires/provides gating for all engine elevation/cliff reads.
- Risk: effect naming sprawl causes brittle ordering and unreadable recipes.
  - Mitigation: lock naming regex and consolidate verbs (`Plotted` / `Built`); refuse versioned effect names.
- Risk: slice sequencing breaks pipeline due to contract deltas landing before consumer migrations.
  - Mitigation: each slice includes explicit consumer migrations and a removal ledger; use fast gates before stacking the next slice.

## 9) Open questions (optional; prefer zero)

- None (Phase 2 trilogy provides the authority; remaining choices are implementation details within the locked constraints).
