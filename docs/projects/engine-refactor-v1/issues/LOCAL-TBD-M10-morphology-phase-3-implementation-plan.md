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

Cut over the standard recipe to the Phase 2 Morphology posture: Morphology becomes truth-only (engine-agnostic, overlay-free) with contract-first ops and stable truth artifacts; all Civ7 adapter stamping/materialization and `artifact:map.*` projections move into a Gameplay-owned lane that produces boolean `effect:map.*` guarantees (no dual paths, no shims), including re-homing `TerrainBuilder.buildElevation()` out of Hydrology and eliminating Physics reads/writes of engine surfaces.

## 2) Scope (required)

- In scope:
  - Standard recipe wiring and its Morphology-touching stages/steps (stage order evidence: `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`).
  - Remove narrative/story overlay dependencies from Morphology steps and Morphology op contracts:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts`
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/islands.ts`
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts`
    - `mods/mod-swooper-maps/src/domain/morphology/ops/plan-volcanoes/contract.ts`
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

- Out of scope:
  - Non-Morphology domain refactors (Hydrology/Ecology/Placement) beyond the minimal consumer migrations needed to preserve pipeline-green while removing Morphology-owned engine calls and overlay backfeeding.
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
- No overlays as physics inputs (Morphology must not require or consume `artifact:storyOverlays` / overlay masks).
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
| No overlays as physics inputs | Contract-guard test bans `artifact:storyOverlays` in Morphology step contracts + bans overlay helper imports in Morphology steps | 1 |
| No `artifact:map.realized.*` | `rg` gate + add to pipeline contract guard | 1 (rg), 5 (pipeline test) |
| Boundary + no backfeeding (Physics cannot consume `artifact:map.*` / `effect:map.*`) | Guardrail script + contract inspection test for Morphology step contracts; full-profile guardrail once stamping removed from Morphology | 1 (script), 4 (full profile) |
| Effects posture (`effect:map.*` boolean; short verbs) | Regex-based contract guard on all `effect:map.*` ids + “no scattered literals” rule (tag catalog only) | 2 |
| TerrainBuilder no-drift | Allowlist + requires/provides gating tests for `.buildElevation`, `.getElevation`, `.isCliffCrossing` | 3 |
| No shims/dual paths | Removal ledger + per-slice exit gate commands; any legacy surface must be deleted in the slice that replaces it | All slices |

## 4) Workstreams (required)

- Evidence + inventory (current state) and consumer migration matrix (break/fix by slice).
- Morphology contracts/ops changes (overlay removal; determinism tie-breakers; remove engine IDs from truth artifacts).
- Recipe wiring + stage/step surgery (move braided Narrative to Gameplay lane; insert Gameplay stamping steps; delete legacy stamping-in-physics callsites).
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
- Narrative overlay producer: `artifact:storyOverlays` is provided by `narrative-pre/story-seed` and then used by Morphology violations today.
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/artifacts.ts` and contract requires in Morphology steps.
- Placement landmass region stamping exists but does not yet publish Phase 2 `artifact:map.*` surfaces:
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts`.

Hydrology legacy mismatch explicitly called out by Phase 2 stamping spec (must re-home in M10):
- `TerrainBuilder.buildElevation()` currently called from a Physics-braided Hydrology step:
  - Evidence: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts`.

### Target stage order (Phase 2 topology; no backfeeding)

Current order (verified): `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`:
- `foundation → morphology-pre → narrative-pre → morphology-mid → narrative-mid → morphology-post → hydrology-* → ecology → placement`

Target order after M10 (Physics truth first; Gameplay later):
- `foundation → morphology-pre → morphology-mid → morphology-post → hydrology-* → ecology → map-morphology (new) → narrative-pre (moved) → narrative-mid (moved) → placement`

Notes:
- Narrative is Gameplay-owned (overlays) and must not braid into Physics once Morphology no longer consumes overlays.
- `map-morphology` is a Gameplay-owned stamping stage that consumes frozen Physics truth and provides `effect:map.*`.

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

### Public surface vs internal-only posture (required)

- Public Morphology truth surfaces (cross-domain consumers; Phase 2 contracts are authority):
  - `artifact:morphology.topography`
  - `artifact:morphology.substrate`
  - `artifact:morphology.routing`
  - `artifact:morphology.coastlineMetrics`
  - `artifact:morphology.landmasses`
- Non-public (internal-only) intermediates:
  - Any per-step scratch buffers and op-private rule outputs.
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
| `hydrology-climate-baseline/climate-baseline` | `buildElevation()` + engine sync/read + `stampContinents()` | No-op | No-op | Break (remove `buildElevation()` + `stampContinents()` + engine sync/read) | No-op | No-op |
| `narrative-pre/*` + `narrative-mid/*` | relies on Morphology artifacts, produces overlays | No-op | Break (move after `map-morphology`) | No-op | No-op | No-op |
| `placement/placement` | stamps LandmassRegionId (no `artifact:map.*`) | No-op | No-op | No-op | No-op | Break (publish `artifact:map.*` + `effect:map.landmassRegionsPlotted`) |

### Removal ledger (required; every legacy surface removed in-slice)

| Legacy surface to remove | Why | Slice |
|---|---|---:|
| Overlay reads (`readOverlay*`) under Morphology steps | Overlay backfeeding ban | 1 |
| `artifact:storyOverlays` in Morphology step contracts | Overlay backfeeding ban | 1 |
| `hotspotMask` (or equivalent overlay-derived inputs) in Morphology volcano planning contracts | Overlay backfeeding ban | 1 |
| Adapter calls in `morphology-pre/landmassPlates.ts` (`validateAndFixTerrain`, `stampContinents`, `writeHeightfield`) | Boundary lock (Physics purity) | 2 |
| Adapter calls + sync in `morphology-pre/coastlines.ts` (`expandCoasts` + manual engine sync) | Boundary lock (Physics purity) | 2 |
| `artifact:morphology.coastlinesExpanded` (engine-expansion marker) | Boundary lock (Gameplay owns map stamping) | 2 |
| Engine terrain ids in Morphology truth (`artifact:morphology.topography.terrain`) | Truth-only artifact lock | 2 |
| `buildElevation()` + `stampContinents()` in `hydrology-climate-baseline/climateBaseline.ts` | TerrainBuilder no-drift + boundary lock | 3 |
| `writeHeightfield` in `morphology-mid/ruggedCoasts.ts` | Boundary lock (Physics purity) | 4 |
| `writeHeightfield` in `morphology-post/mountains.ts` | Boundary lock (Physics purity) | 4 |
| `writeHeightfield` / `setFeatureType` in `morphology-post/volcanoes.ts` | Boundary lock (Physics purity) | 4 |
| Missing Phase 2 map projection surfaces for landmass region slots | Phase 2 stamping contract | 5 |

### Sequencing refinement pass (required; single pass)

1. Drafted slices from Phase 2 deltas and current-state violations (overlay inputs, adapter writes in Physics, TerrainBuilder mis-homing).
2. Re-ordered for pipeline safety:
   - Overlay removal first (low coupling; immediately reduces backfeeding).
   - Then move the earliest, most load-bearing adapter stamping (`expandCoasts`, `stampContinents`) out of Morphology-pre (reduces “two truths” risks before addressing later stamps).
   - Then re-home `buildElevation()` out of Hydrology (establish the no-drift boundary before migrating other engine reads).
   - Then remove remaining Morphology adapter writes (mountains/volcanoes/rugged coasts) by introducing Gameplay plotting steps.
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
    - `mods/mod-swooper-maps/src/domain/morphology/ops/plan-volcanoes/contract.ts` (replace overlay masks with Phase 2 drivers only; no overlays permitted):
      - required: `artifact:foundation.tectonics.volcanism` (canonical driver)
      - required: `artifact:morphology.topography.landMask` (vents are land-only)
      - required: Foundation boundary regime signals (to determine `VolcanoKind`)
      - optional (Phase 2 tie-breaker): `artifact:morphology.topography.elevation`
- Cutovers/deletions:
  - Delete/replace any `readOverlay*` dependency from Morphology call paths (keep overlay helpers for Gameplay/Narrative where still used).
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

### Slice 2 — Re-home coasts + continents stamping into Gameplay (`effect:map.coastsPlotted`, `effect:map.continentsPlotted`)

- Scope:
  - Convert Morphology-pre steps to truth-only (no adapter writes):
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts`
      - Replace `writeHeightfield(...)` usage with direct buffer-only writes (no `context.adapter.*` calls) so `deps.artifacts.topography.publish(context, context.buffers.heightfield)` remains valid.
    - Delete the now-obsolete Morphology coastline-expansion step (engine work moved to Gameplay):
      - contract: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.contract.ts`
      - impl: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/coastlines.ts`
      - stage wiring: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/index.ts` (remove `coastlines` from `steps`)
    - Remove engine-coupled truth fields and engine-expansion marker artifacts:
      - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts` (delete `topography.terrain` and delete `artifact:morphology.coastlinesExpanded` in favor of `effect:map.coastsPlotted`).
  - Add Gameplay-owned stamping steps in the new stage:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/index.ts`
    - `plot-continents`:
      - Reads Morphology truth (`artifact:morphology.topography` and any required land/water intent).
      - Performs any required per-tile terrain/land/water stamping currently done by `writeHeightfield`.
      - Calls `validateAndFixTerrain()` → `recalculateAreas()` → `stampContinents()`.
      - Provides `effect:map.continentsPlotted`.
    - `plot-coasts`:
      - Calls `expandCoasts(width, height)`.
      - After `expandCoasts`, synchronizes any Gameplay-owned runtime buffers/caches used by later Gameplay steps (if any), then provides `effect:map.coastsPlotted`.
    - Lock posture (explicit; no ambiguity / no shims):
      - No Physics step may `require`, branch on, or otherwise consume `effect:map.*` as an input.
      - No Physics step may `require` or consume `artifact:map.*` as an input.
  - Recipe braid correction:
    - Update stage ordering in `mods/mod-swooper-maps/src/recipes/standard/recipe.ts` so `map-morphology` runs after the last Physics stage (`ecology`) and before Narrative/Placement:
      - `foundation → morphology-pre → morphology-mid → morphology-post → hydrology-* → ecology → map-morphology → narrative-pre → narrative-mid → placement`
    - Rationale: prevents engine/materialization state from backfeeding into Physics (`map-morphology` is Gameplay-only).
  - Narrative consumer migration (required because `artifact:morphology.coastlinesExpanded` is deleted):
    - Update `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storySeed.contract.ts` and `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storySeed.ts` to stop requiring/reading `artifact:morphology.coastlinesExpanded`.
- Cutovers/deletions:
  - Delete adapter calls from Morphology-pre steps:
    - `validateAndFixTerrain` / `stampContinents` and any direct terrain stamping in `morphology-pre/landmassPlates.ts`
- Guardrails introduced in-slice:
  - Add a Morphology-domain contract-guard allowlist for adapter calls:
    - `expandCoasts`, `validateAndFixTerrain`, `stampContinents` callsites must not exist under Morphology steps after this slice.
    - Note: `buildElevation()` and its coupled `stampContinents()` sequence still exists in Hydrology until Slice 3; do not prematurely “global allowlist” `stampContinents()` in Slice 2.
  - Add a pipeline contract guard (Physics posture) when `effect:map.*` is introduced:
    - Add: `mods/mod-swooper-maps/test/pipeline/map-stamping.contract-guard.test.ts` (seeded in Slice 2; expanded in Slice 5).
    - Assert that all Physics step contracts in the standard recipe do not `require` any `effect:map.*` or `artifact:map.*`.
  - Add effect naming guardrail for newly introduced map effects:
    - All `effect:map.*` must match `^effect:map\\.[a-z][a-zA-Z0-9]*(Plotted|Built)$`.
- Downstream:
  - Consumer matrix “Break” rows completed in-slice:
    - `narrative-pre/*` + `narrative-mid/*` (stage order moves after `map-morphology`)
- Exit criteria (pipeline-green):
  - No adapter calls remain in Morphology-pre steps, and recipe executes with the new Gameplay stamping steps providing `effect:map.coastsPlotted` / `effect:map.continentsPlotted`.

### Slice 3 — Re-home TerrainBuilder elevation build into Gameplay (`effect:map.elevationBuilt`)

- Scope:
  - Add Gameplay-owned `build-elevation` step in `map-morphology`:
    - Calls `recalculateAreas()` → `buildElevation()` → `recalculateAreas()` → `stampContinents()` via adapter (Phase 2 required ordering).
    - Provides `effect:map.elevationBuilt`.
  - Remove `buildElevation()` (and any coupled `stampContinents()` repetition) from:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts`
  - Consumer migration (minimal but required):
    - Replace Hydrology’s use of engine-derived elevation/land/terrain buffers (today via `syncHeightfield` + `deps.artifacts.heightfield`) with Morphology truth signals:
      - use `artifact:morphology.topography` (Phase 2 truth) for `landMask` and tile-indexed elevation-like drivers
      - remove `syncHeightfield(context)` from Hydrology
    - No Physics step may `require` or branch on `effect:map.elevationBuilt`; Physics must consume truth artifacts only.
- Guardrails introduced in-slice:
  - Add TerrainBuilder boundary allowlist:
    - `.buildElevation(` callsites only in Gameplay `build-elevation` step.
    - `.getElevation(` / `.isCliffCrossing(` (if used) only in Gameplay steps that `require` `effect:map.elevationBuilt`.
- Downstream:
  - Consumer matrix “Break” rows completed in-slice:
    - `hydrology-climate-baseline/climate-baseline` (remove `buildElevation()` + `stampContinents()` + engine sync/read usage)
- Exit criteria (pipeline-green):
  - No Physics step calls `buildElevation()` and any engine elevation/cliff reads are gated by `effect:map.elevationBuilt` in Gameplay only.

### Slice 4 — Re-home remaining Morphology stamping into Gameplay (`effect:map.mountainsPlotted`, `effect:map.volcanoesPlotted`)

- Scope:
  - Remove adapter writes from Morphology steps:
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/ruggedCoasts.ts` (remove `writeHeightfield`)
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.ts` (remove `writeHeightfield`)
    - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts` (remove `writeHeightfield` / `setFeatureType`)
  - Introduce Gameplay-owned plotting steps (new; in `map-morphology`):
    - `plot-mountains` (stamps terrain changes; provides `effect:map.mountainsPlotted`)
    - `plot-volcanoes` (stamps terrain/features; provides `effect:map.volcanoesPlotted`)
  - Ensure Morphology publishes the truth intent required by these plotters as truth artifacts (Phase 2 contracts are authority; do not invent engine IDs).
- Guardrails introduced in-slice:
  - Allowlist `writeHeightfield` / `setFeatureType` to Gameplay plotting steps only.
  - Enable guardrail script “full profile” once Morphology stages are truth-only:
    - `REFRACTOR_DOMAINS="morphology" DOMAIN_REFACTOR_GUARDRAILS_PROFILE=full ./scripts/lint/lint-domain-refactor-guardrails.sh`
- Downstream:
  - Consumer matrix “Break” rows completed in-slice:
    - `morphology-mid/rugged-coasts` (remove stamping side-effects)
    - `morphology-post/islands` (remove stamping side-effects / move earlier if needed)
    - `morphology-post/volcanoes` (remove stamping side-effects)
- Exit criteria (pipeline-green):
  - No Morphology step performs adapter writes; all stamping occurs in Gameplay steps with the appropriate map effects.

### Slice 5 — Truth artifact cleanup + required map projection artifacts + deletion sweep

- Scope:
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
  - Cleanup sweep (Morphology scope):
    - Ensure `rg -n "artifact:map\\.realized\\." mods/mod-swooper-maps/src packages/mapgen-core/src` remains empty.
    - Ensure no `syncHeightfield` is used to backfeed engine state into Morphology truth or Physics decisions for Morphology-owned concepts.
- Guardrails introduced in-slice:
- Guardrails introduced in-slice:
  - Expand the pipeline-level contract guard (seeded in Slice 2) to full coverage of map-stamping posture:
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

## 6) Acceptance criteria (required)

Phase 3 completion checklist (plan quality gates):
- [x] Slices are pipeline-green by construction: each slice lists explicit deletions + consumer migrations (no shims/dual paths).
- [x] Locked decisions are copied verbatim and have enforcement mechanisms mapped to the slice where they become true.
- [x] Consumer migration matrix exists and is consistent with the slice plan.
- [x] Removal ledger exists and assigns every legacy surface to a slice.
- [x] No Phase 2 model changes are proposed; Phase 2 trilogy remains the authority.

Phase 4 per-slice completion checklist (summary):
- [ ] All “in-scope” adapter calls are only in Gameplay-owned `plot-*` / `build-*` steps and are guarded by allowlists/tests.
- [ ] Morphology steps are truth-only and do not read overlays, `artifact:map.*`, or `effect:map.*`.
- [ ] No `artifact:map.realized.*` exists in code scope (only allowed in docs as quoted text).
- [ ] `effect:map.*` names are short and consistent (`Plotted` / `Built`); no verb explosion.
- [ ] `TerrainBuilder.buildElevation()` is Gameplay-only and gated by `effect:map.elevationBuilt`.
- [ ] Morphology truth artifacts contain no engine IDs; downstream consumers are migrated.

## 7) Verification commands (required)

Fast gates (per-slice exit gates):

```bash
REFRACTOR_DOMAINS="morphology" ./scripts/lint/lint-domain-refactor-guardrails.sh

rg -n "artifact:map\\.realized\\." mods/mod-swooper-maps/src packages/mapgen-core/src

pnpm -C packages/mapgen-core check
pnpm -C mods/mod-swooper-maps check

pnpm -C mods/mod-swooper-maps test -- test/morphology/contract-guard.test.ts test/morphology/ops.test.ts
```

Full gates (pre-merge / phase completion):

```bash
REFRACTOR_DOMAINS="morphology" DOMAIN_REFACTOR_GUARDRAILS_PROFILE=full ./scripts/lint/lint-domain-refactor-guardrails.sh

pnpm -C packages/mapgen-core check
pnpm -C packages/mapgen-core test
pnpm -C packages/mapgen-core build

pnpm -C mods/mod-swooper-maps check
pnpm -C mods/mod-swooper-maps test
pnpm -C mods/mod-swooper-maps build

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
