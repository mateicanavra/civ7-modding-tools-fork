id: LOCAL-TBD-M9-hydrology-s5-hydrography-cutover
title: "M9 / Slice 5 — Hydrography ownership cutover (discharge-driven projection)"
state: done
priority: 1
estimate: 16
project: engine-refactor-v1
milestone: null
assignees: [codex]
labels: [hydrology, domain-refactor, slice-5]
parent: LOCAL-TBD-hydrology-vertical-domain-refactor
children: []
blocked_by:
  - LOCAL-TBD-M9-hydrology-s4-cryosphere-aridity-diagnostics
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Make Hydrology the canonical owner of hydrography by deriving rivers/lakes from discharge + routing geometry, then projecting that hydrography downstream (and to the engine where feasible) without allowing engine heuristics to define internal truth.

## Deliverables
- Adopt Morphology-owned routing geometry (`artifact:morphology.routing`) as the authoritative flow direction input.
- Implement discharge/runoff accumulation and river classification (minor vs major/navigable) as Hydrology ops (deterministic, fixed passes).
- Publish a stable, typed hydrography artifact surface (river network + lake/basin snapshots) that downstream systems can consume.
- Preserve or migrate existing projection artifacts:
  - keep `artifact:riverAdjacency` as a projection derived from the new hydrography (preferred for pipeline safety), or replace it with a richer successor and migrate consumers in-slice.

## Acceptance Criteria
- [x] Hydrology does not use engine-provided river adjacency (`adapter.isAdjacentToRivers`) as internal truth for hydrography; internal truth is discharge + routing derived fields.
- [x] Hydrology consumes `artifact:morphology.routing` (or an equivalent Morphology-owned routing artifact) and does not re-compute flow direction in Hydrology.
- [x] Major/minor river projections are deterministic for the same knobs + seed and exhibit monotonicity with `riverDensity` knob.
- [x] Downstream remains pipeline-green:
  - Narrative post and any other consumers either continue to receive `artifact:riverAdjacency` or are migrated to the new hydrography artifact in this slice.
  - Placement’s `effect:engine.riversModeled` gating is preserved (either via continuing engine projection or explicitly re-owning the effect semantics).
- [x] `bun run check` and `bun run --cwd mods/mod-swooper-maps test` pass.

## Implementation Decisions
- Preserve engine river modeling as projection-only (`adapter.modelRivers(...)`) for pipeline safety, but publish Hydrology truth as discharge-derived artifacts and never read `adapter.isAdjacentToRivers(...)` in Hydrology hydrography ownership.
- Keep `artifact:riverAdjacency` stable for downstream by projecting it from discharge-derived `riverClass` (radius=1); introduce `artifact:hydrology.hydrography` additively for consumers that want richer hydrography.
- Compile minor/major river thresholds deterministically from the discharge distribution using knob-driven percentiles (`riverDensity`), and lock monotonicity via tests.

## Testing / Verification
- `bun run check`
- `bun run --cwd mods/mod-swooper-maps test`
- `rg -n \"artifact:morphology\\.routing\" mods/mod-swooper-maps/src/recipes/standard` (expect Hydrology consumes routing artifact in Slice 5)

## Dependencies / Notes
- Phase 2 authority (hydrography posture; discharge-driven): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling-synthesis.md`
- Parent plan: `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-hydrology-vertical-domain-refactor.md`
- Upstream routing artifact definition: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts`

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

<!-- Path roots -->
swooper-src = mods/mod-swooper-maps/src

### Current-state evidence (engine-driven hydrography)

Rivers:
- `swooper-src/recipes/standard/stages/hydrology-core/steps/rivers.ts` calls:
  - `context.adapter.modelRivers(...)`
  - `context.adapter.defineNamedRivers()`
  - publishes `artifact:riverAdjacency` by querying `adapter.isAdjacentToRivers(...)` (engine truth).

Lakes:
- `swooper-src/recipes/standard/stages/hydrology-pre/steps/lakes.ts` calls:
  - `context.adapter.generateLakes(...)`
  - publishes `artifact:heightfield` (projection of engine terrain/elevation masks).

Slice 5 makes engine hydrography a projection, not the canonical representation.

### Files (expected touchpoints)

```yaml
files:
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts
    notes: Routing artifact (`artifact:morphology.routing`) is the upstream contract Hydrology consumes.
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-core/steps/rivers.ts
    notes: Replace engine-truth adjacency with discharge-driven hydrography projection; keep effect gating stable.
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-core/artifacts.ts
    notes: Add typed hydrography artifacts; keep or replace `artifact:riverAdjacency` explicitly.
  - path: /mods/mod-swooper-maps/src/domain/hydrology/ops
    notes: Add discharge accumulation + river classification ops; consume routing + runoff inputs.
  - path: /mods/mod-swooper-maps/src/recipes/standard/stages/narrative-post/steps/storyCorridorsPost.contract.ts
    notes: Update consumer requirements if `artifact:riverAdjacency` is replaced.
```

### Engine projection constraints (must be surfaced, not assumed)

The current adapter surface has:
- `modelRivers(minLength, maxLength, navigableTerrain)` and `defineNamedRivers()` (engine-generated rivers),
- `generateLakes(width, height, tilesPerLake)` (engine-generated lakes),
- no API to “set river mask/graph” explicitly.

If Slice 5 requires discharge-driven rivers in-engine (not just in artifacts), this likely needs an adapter extension or a different projection strategy. Do not silently assume engine support.

### Open Questions

### Can we stamp discharge-driven rivers into the engine with existing adapter APIs?
- **Context:** The Phase 2 model wants discharge-driven hydrography; current adapter exposes only `modelRivers(...)` which generates rivers heuristically.\n
- **Options:**\n
  - (A) Keep engine river generation (`modelRivers`) as a projection for now, while downstream consumes Hydrology’s new hydrography artifact as truth.\n
  - (B) Extend adapter to support explicit river stamping (new `EngineAdapter` capability), enabling discharge-driven engine rivers.\n
- **Tradeoff:** (A) keeps compatibility but engine rivers won’t reflect discharge truth; (B) is higher scope but aligns projections with realism.\n
- **Recommendation:** (B) if Civ7 surface supports it; otherwise (A) as a temporary projection with explicit deprecation + removal trigger recorded outside Hydrology.

### Prework Results (Resolved)

**Result:** (2) Explicit stamping of rivers/lakes is not available via the current adapter surface or the Civ7 `TerrainBuilder` typing in this repo.

Evidence (adapter surface + Civ7 globals):
- `EngineAdapter` has engine-driven river/lake generation calls, but no “set river network” / “set lake mask” capability:
  - `/packages/civ7-adapter/src/types.ts`:
    - `modelRivers(minLength, maxLength, navigableTerrain)`
    - `defineNamedRivers()`
    - `generateLakes(width, height, tilesPerLake)`
    - (plus `storeWaterData()`, `addFloodplains()`; no explicit stamping inputs)
  - `/packages/civ7-adapter/src/civ7-adapter.ts`:
    - `modelRivers(...)` delegates to `TerrainBuilder.modelRivers(...)`
    - `defineNamedRivers()` delegates to `TerrainBuilder.defineNamedRivers()`
    - `generateLakes(...)` delegates to `/base-standard/maps/elevation-terrain-generator.js` helper
- Civ7 types for `TerrainBuilder` show no explicit river/lake stamping functions:
  - `/packages/civ7-types/index.d.ts` (`TerrainBuilder` only includes `modelRivers(...)` and no river-edge/graph setters)

Official Civ7 resources are not present in this checkout (`civ7-official-resources/` missing), so there is no additional engine scripting surface available to inspect here.

**Recommended temporary projection posture (until explicit stamping exists)**
- Keep Hydrology’s discharge-driven hydrography as the **canonical internal truth** and publish it as typed artifacts for downstream consumption.
- Treat engine hydrography calls as **projection-only**, using one of:
  - Continue to call `adapter.modelRivers(...)` / `adapter.generateLakes(...)` for “engine visuals/effects” while downstream logic migrates to Hydrology artifacts (preferred for keeping the pipeline green).
  - Do not attempt to “fake” river stamping by setting terrain types; Civ rivers are not represented purely as terrain, and the adapter does not expose a supported setter for river edge graphs.

**Removal trigger (explicit; not silent compat)**
- If/when a Civ7 API exists that can accept explicit river/lake geometry (or when the repo adds an adapter extension backed by real engine APIs), introduce a new `EngineAdapter` capability for stamping hydrography derived from Hydrology artifacts and:
  - deprecate any reliance on `modelRivers(...)` as a truth-bearing mechanism,
  - update `MockAdapter` to support the new stamping capability so determinism tests can cover it.
