# Agent C Scratchpad — TerrainBuilder ↔ Engine Sync Posture

## Status / Canonicality

This file is **NOT CANONICAL**. It is a debate scratchpad.

Important: any mention of a “realized snapshot” artifact layer below is an **explored alternative that is explicitly REJECTED** by our locked Phase 2 posture.

Canonical Phase 2 uses:
- `artifact:map.*` (projection intent / observability)
- `effect:map.<thing>Plotted` (short boolean execution guarantees)

There is **no** “realized snapshot” artifact layer in the canonical model.

Goal: stress-test the “no backfeeding” posture with the real Civ7 `TerrainBuilder`/postprocess semantics and current repo patterns; decide whether Phase 3 needs any engine→physics “sync”, and how to model TerrainBuilder/postprocess without making Physics depend on engine truth.

## Questions (from prompt)

1) Does any TerrainBuilder step create information that Physics domains must consume to remain correct? Or is it purely a derived materialization/repair layer?
2) If TerrainBuilder adjusts terrain/elevation, is that a bug in our pipeline (should avoid/disable) or a required engine canonicalization step (must model as Gameplay-side postprocess)?
3) How do we reconcile “no backfeeding” with necessary engine fixups?
4) What invariants should Phase 3 enforce so downstream Physics never depends on engine results? Identify “gotchas”.
5) Decisive recommendation: (a) one-way materialization, (b) partial sync boundary, or (c) re-derive truth after engine canonicalization.

---

## Evidence (repo)

### TerrainBuilder surface: elevation is engine-owned and not settable
- `packages/civ7-types/index.d.ts:189` shows `TerrainBuilder.buildElevation()` but **no** `TerrainBuilder.setElevation(...)`.
- `docs/system/DEFERRALS.md:25` (DEF-001) explicitly states:
  - engine elevation/cliffs are derived via `TerrainBuilder.buildElevation()` using engine fractals + terrain tags;
  - our physics `WorldModel` heightfield cannot be pushed 1:1 (no API);
  - “engine elevation and cliffs remain a lossy derivative…; our internal heightfield is used for physics/story only.”

Implication: any attempt to treat engine elevation as Physics truth is structurally incompatible with “physics-first truth”.

### Existing engine → buffer sync primitive (today)
- `packages/mapgen-core/src/core/types.ts:418` defines `syncHeightfield(ctx)`:
  - reads engine surface via adapter: `getTerrainType`, `getElevation`, `isWater`
  - writes into `ctx.buffers.heightfield.{terrain,elevation,landMask}`.
- `packages/mapgen-core/src/core/types.ts:447` shows `syncClimateField` was removed and now hard-errors; climate must be artifact-driven (no engine seeding).

Implication: the codebase already distinguishes “engine reads are forbidden for climate”, but still supports engine reads for heightfield (terrain/elevation/landMask) via `syncHeightfield`.

### Existing calls that treat engine postprocess as required (and then sync)
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-climate-baseline/steps/climateBaseline.ts:330`
  - calls `adapter.buildElevation()` + `adapter.recalculateAreas()` + `adapter.stampContinents()`
  - then calls `syncHeightfield(context)`
  - then uses `deps.artifacts.heightfield.read(context)` for elevation/terrain/landMask downstream in the step.
- `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts:209`
  - calls `adapter.modelRivers(...)`, then `adapter.validateAndFixTerrain()`, then `syncHeightfield(context)`.

Implication: in current code, multiple non-Gameplay steps explicitly incorporate engine postprocess + sync, so “engine results” can leak into staged buffers and any artifact that aliases those buffers.

### Current Morphology “topography” artifact is engine-coupled (known Phase 2 violation)
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts:3` defines `artifact:morphology.topography` as publish-once buffer handles:
  - `elevation: Int16Array`
  - `terrain: Uint8Array` described as “Engine terrain id per tile”
  - `landMask: Uint8Array`

Implication: as currently typed and described, a Physics truth artifact is carrying an engine id surface (`terrain`), and its “publish-once buffer handle” semantics make it vulnerable to later mutation by `syncHeightfield()`.

### Phase 2 posture already anticipates engine postprocess mutating map
- Phase 2 models postprocess/stamping as explicit `plot-*` effect boundaries (`effect:map.<thing>Plotted`), not as a “realized snapshot” artifact layer.
- Phase 2 explicitly forbids Physics from reading engine surfaces directly or consuming `artifact:map.*`.
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spike-morphology-modeling-gpt.md:575`
  - lists base-standard sequencing patterns including `validateAndFixTerrain`, `stampContinents`, `buildElevation`, `modelRivers`, `storeWaterData`.
  - notes “Multiple passes of terrain fix-ups… Externalized” and “we do not try to incorporate engine fixes into our model except to aim not to need them.”

Implication: the architecture direction already treats engine fixups as Gameplay-owned materialization concerns, not as Physics truths.

### Missing evidence worth calling out
- This scratchpad was originally written without deep inspection of base-standard scripts. We now have evidence via `.civ7/outputs/resources/Base/modules/base-standard/maps/*` that scripts call `buildElevation()` and then read `getElevation` / `isCliffCrossing` for downstream decisions.

---

## Interim assumptions (flagged) vs. what we can prove

### Assumption A1 (needs A/B confirmation): `TerrainBuilder.validateAndFixTerrain()` can change engine-visible tile classification
We do not have direct base-standard source locally right now. However, its name and repeated invocation in pipeline docs strongly suggests it can “repair” invalid local patterns (coasts, lakes, etc.). If it changes any of:
- terrain type
- land/water status (via implicit terrain→water classification)
then it can cause divergence between “intent” and “engine realized”.

Phase 3 should treat such divergence as **observable** and (default) **fatal unless allowlisted**.

### Proven P1: `buildElevation()` is necessarily engine-derived and can’t be treated as Physics truth
This is directly supported by DEF-001 + missing `setElevation`.

---

## Analysis: do we need engine → physics sync?

### What TerrainBuilder produces that matters
TerrainBuilder calls produce/normalize **engine-facing surfaces** and derived engine state:
- `buildElevation()` produces elevation/cliffs in engine space (and cliff-crossing semantics used by movement/pathing).
- `modelRivers()`/`defineNamedRivers()`/`storeWaterData()` produce engine river network + cached water data used by gameplay systems.
- `stampContinents()` and `AreaBuilder.recalculateAreas()` produce area/continent classifications used by base-standard logic.
- `validateAndFixTerrain()` presumably enforces coherence constraints for engine systems.

All of the above are necessary for “the engine world to behave correctly”, but they are **not** a sound basis for Physics truth because:
- Some are not reconstructible or writable from scripts (elevation/cliffs).
- Some are explicitly derived postprocess (continents/areas).
- Some are engine caches (water data).

### Answer (1): should Physics consume TerrainBuilder outputs?
Verdict: **No** — Physics domains must not consume TerrainBuilder outputs to “remain correct”.

Instead:
- Physics should remain correct relative to **physics truth artifacts** (e.g., `artifact:morphology.topography`).
- Gameplay/materialization stages may (must) use TerrainBuilder postprocess for the engine.
- Any engine-derived information required by later Gameplay steps may be modeled as **Gameplay-owned derived artifacts** (`artifact:map.*`) produced after the relevant `effect:map.*Plotted` boundary, not as Physics truth.

This aligns with the repo’s locked posture: “Physics truth one-way; no backfeeding”.

### Answer (2): if TerrainBuilder adjusts terrain/elevation, bug or required step?
Two cases:

1) **Engine-only derived surfaces** (e.g., elevation/cliffs after `buildElevation()`):
   - Not a bug; it is a **required engine canonicalization/derivation** step.
   - Must be modeled as Gameplay-side postprocess.
   - Physics must not “sync back” and treat this as its own elevation truth.

2) **Engine fixups that mutate intent** (e.g., `validateAndFixTerrain()` changing terrain/water adjacency):
   - This is either:
     - a pipeline bug (our intent produces invalid states; we should adjust projection rules so fixups are a no-op), or
     - a necessary engine repair layer for constraints we can’t (yet) model perfectly.
   - Either way: it is still Gameplay-owned. Phase 3 should make it explicit and observable, not silently absorbed into Physics.

### Answer (3): reconcile “no backfeeding” with necessary engine fixups
Acceptable patterns (ordered by strictness):

**Pattern S (strict default): “fixups are validation-only; divergence is failure”**
- Stamp intent → run engine postprocess → read back minimal engine-derived surfaces → compare to intent-derived expectations.
- If land/water classification, terrain IDs, or region IDs diverge outside allowlist: fail fast.

**Pattern R (re-materialize): “engine fixups are allowed but truth wins”**
- Stamp intent → postprocess → detect divergence → immediately re-stamp from the same truth/intent to restore invariants.
- Do **not** update Physics truths; do **not** let the run proceed with engine diverged surfaces.
- Useful if a postprocess temporarily needs an intermediate valid state but we want final to match truth.

**Pattern A (allowlist + explicit projection): “some divergences are tolerated (explicitly)”**
- For specific, well-understood fixups, allow the divergence but keep it strictly Gameplay-owned:
  - assert the corresponding `effect:map.<thing>Plotted`,
  - optionally publish `artifact:map.*` observability layers derived from engine reads after the effect,
  - fail fast on unexpected divergence (no receipts/snapshots).

Non-acceptable pattern:
- “Sync engine results into Physics truth artifacts/buffers so physics continues from what engine did.”

### Answer (4): Phase 3 invariants + gotchas

**Invariant I1 — Physics reads truth artifacts only**
- Physics steps must not call `context.adapter.*` for reads (`isWater`, `getElevation`, etc.).
- Physics steps must not call `syncHeightfield()`.
- Physics steps must not consume `artifact:map.*`.

**Invariant I2 — Truth artifacts must not alias engine-synced buffers**
- Current `artifact:morphology.topography` is a “publish-once buffer handle”; if those buffers are ever mutated by `syncHeightfield`, Physics truths become engine-coupled.
- Phase 3 should ensure Physics truth artifacts are either:
  - immutable snapshots, or
  - backed by Physics-owned buffers that are never overwritten by engine sync.

**Invariant I3 — Remove engine IDs from Physics truths**
- `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/artifacts.ts:9` includes `terrain` as “Engine terrain id”.
- Phase 3 should relocate any engine terrain typing to `artifact:map.*` projection, not Physics.

**Invariant I4 — Hydrology must not derive water/elevation from engine**
Gotcha today:
- `syncHeightfield()` sets `landMask` from `adapter.isWater(...)`.
- `hydrology-climate-baseline` calls `buildElevation()` then uses the synced heightfield to compute climate fields.

Phase 3 expectation:
- Hydrology uses `artifact:morphology.topography` (physics elevation/landMask) for climate/routing.
- Any engine-only elevation/cliff semantics remain Gameplay-only (or become a separate Gameplay overlay if needed).

**Invariant I5 — “Engine materialization” is explicitly braided and effect-tagged**
- If we must run `validateAndFixTerrain()/buildElevation()/stampContinents()/storeWaterData()`, it happens in a Gameplay-owned stamping step.
- That step asserts the corresponding `effect:map.<thing>Plotted`. Downstream Gameplay may read engine surfaces directly (or consume `artifact:map.*` projections produced after the effect). Physics never sees engine reads or `artifact:map.*`.

### Answer (5): recommendation (decisive)

Recommendation: **(b) controlled, one-way materialization with a strict boundary**.

Concretely:
- Physics → Gameplay is one-way via `artifact:map.*` intent.
- Gameplay may run TerrainBuilder postprocess and may read back engine state, but only as a Gameplay concern:
  - to produce `artifact:map.*` observability layers, and/or
  - to make later Gameplay plot decisions that must match engine-derived state.
- **No engine → Physics sync**: `syncHeightfield()` (or its successor) is allowed only as a Gameplay concern (updating realized map surfaces / runtime buffers), never as an input to Physics truth.

Why not (a) “pure one-way, no readback”?
- Because engine postprocess can legitimately mutate/derive state; without explicit effect boundaries + (optional) observability projections, it’s too easy to make cliff/elevation-dependent Gameplay decisions against stale assumptions.

Why not (c) “re-derive truth after engine canonicalization”?
- The engine produces non-writable derivatives (elevation/cliffs). Treating engine results as truth would invert ownership and break the established posture (and DEF-001).

---

## Phase 3 checklist (risks + validations)

### Structural / contract risks
- R1: Physics truth artifacts still alias `ctx.buffers.heightfield` that gets mutated by `syncHeightfield`.
- R2: Any Physics step reads `adapter.isWater/getElevation/getTerrainType` (directly or via helper), reintroducing hidden coupling.
- R3: Any Physics step depends on engine terrain ids carried in truth artifacts (`terrain` in `artifact:morphology.topography`).
- R4: Hydrology/Placement/etc gate on implicit adapter state instead of explicit artifacts/effects.

### Required validations (make failures observable)
- V1: Make every engine mutation/postprocess a named `plot-*` step that asserts its corresponding `effect:map.<thing>Plotted`.
- V2: Where useful for debugging and later Gameplay reads, publish `artifact:map.*` layers *after* the effect (e.g., `map.elevation`, `map.cliffs`, `map.terrain`, `map.isWater`).
  - Explicitly do **not** treat engine elevation/cliffs as Physics corrections; if projected at all, they are Gameplay-only.
- V3: Add guardrails:
  - “Physics stage cannot call `syncHeightfield`” (lint, runtime assertion, or step classification enforcement).
  - “Physics cannot read `artifact:map.*`” (already a stated Phase 2 rule; Phase 3 should enforce mechanically).

### What I need from Agents A/B to tighten this further
- From Agent A (official scripts): confirm whether `validateAndFixTerrain()` or `expandCoasts()` can change terrain/land-water classification or LandmassRegionId in ways that would require allowlisting.
- From Agent B (callsites): enumerate where `syncHeightfield()` is called during “Physics stages” vs “Gameplay stamping stages” today, so Phase 3 can re-home those calls into the braid.
