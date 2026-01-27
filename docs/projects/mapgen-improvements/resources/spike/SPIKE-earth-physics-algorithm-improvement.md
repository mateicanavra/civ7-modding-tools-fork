# SPIKE: Earth Physics Algorithm Improvement (Hydrology Flow Routing)

## Problem statement

Our current “earth physics” pipeline (especially hydrology + routing) produces too many sinks/endorheic basins and under-determined drainage on flat terrain because flow routing is based on strict steepest-descent on quantized `Int16` elevations. This cascades into:

- Unstable/low-quality discharge fields (many isolated “wet” tiles; poor river class continuity).
- Extra downstream heuristics to paper over missing physical causality.
- Redundant routing computation (Morphology computes routing; Hydrology recomputes it anyway), with mismatched ownership vs contracts.
- Engine river/lake generation being effectively disconnected from our computed hydrography.

This spike targets **one major algorithmic upgrade**: robust flow routing on a hex grid via **Priority-Flood depression handling + flat resolution**.

## Current state (repo pointers)

### Where routing + hydrography lives

- Morphology “routing” buffers:
  - Contract + step wiring: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/routing.contract.ts`
  - Step implementation: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/routing.ts`
  - Op implementation (default strategy): `mods/mod-swooper-maps/src/domain/morphology/ops/compute-flow-routing/strategies/default.ts`
  - Core routing rules: `mods/mod-swooper-maps/src/domain/morphology/ops/compute-flow-routing/rules/index.ts`

- Hydrology “rivers → hydrography artifact” step:
  - Step: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.ts`
  - Contract (ops wiring): `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/steps/rivers.contract.ts`
  - Discharge accumulation op (expects flowDir as input): `mods/mod-swooper-maps/src/domain/hydrology/ops/accumulate-discharge/contract.ts`

- Engine-surface projection (currently mostly engine-owned):
  - Rivers projection: `mods/mod-swooper-maps/src/recipes/standard/stages/map-hydrology/steps/plotRivers.ts` (calls `adapter.modelRivers(...)`, does not use computed hydrography)
  - Lakes projection: `mods/mod-swooper-maps/src/recipes/standard/stages/map-hydrology/steps/lakes.ts` (calls `adapter.generateLakes(...)`)

### Current algorithm (what it does)

- Routing is computed as “choose lowest neighbor” (`selectFlowReceiver`) on an odd-q hex grid with wrapX:
  - Core helper: `packages/mapgen-core/src/lib/grid/flow-routing.ts`
  - Neighbor iteration wraps X: `packages/mapgen-core/src/lib/grid/neighborhood/hex-oddq.ts`
- Flats (equal elevation) and local minima produce `flowDir = -1` sinks by construction.
- Morphology flow accumulation is a high-to-low sort pass (O(n log n)) and leaves sinks intact.
- Hydrology’s discharge accumulation is topological (O(n)) but inherits sinks/cycles from the provided `flowDir`; if cycles remain it drops routing for those tiles.

### Notable mismatches / weaknesses

- Hydrology’s `accumulate-discharge` contract says `flowDir` “should not be recomputed inside this op”, but the Hydrology rivers step currently recomputes `flowDir` locally from topography.
- We already compute `artifact:morphology.routing`, but Hydrology does not reuse it.
- Engine rivers are generated via `adapter.modelRivers(...)` rather than our computed discharge/river classes, so improving hydrography alone currently won’t improve rendered rivers unless we also affect the elevation surface the engine consumes (or change projection later).

## Candidate algorithms (at least 2)

### Option A — Priority-Flood depression filling (with epsilon) + “pick lowest filled neighbor”

Use **Priority-Flood** to build a hydrologically-conditioned surface (no pits) while guaranteeing an ε-descending path to the boundary, then compute `flowDir` from the conditioned surface (ties broken deterministically).

- Pros: strong theoretical footing; simple; works with 6-neighbor (hex) grids; can be O(n log n) (or O(n) for integer variants).
- Cons: “filling” can create large flats; needs a companion flat-resolution / epsilon strategy to avoid ambiguous flow on plateaus.

### Option B — Explicit flat-resolution drainage direction assignment (Garbrecht–Martz / Barnes improvements)

Detect flat regions and impose a synthetic drainage gradient:

- Gradient away from higher terrain + gradient toward lower terrain (superposition), resolving flow directions over flats in one pass.
- Pros: very good at “DEM as integer meters” cases; avoids heavy elevation modifications; designed specifically for flats.
- Cons: more moving parts; still needs a depression strategy (pit removal) or it can only resolve drainable flats.

### Option C — Hybrid breaching–filling sink removal

Prefer carving (“breaching”) narrow outlets for depressions where it preserves terrain realism (vs raising large basins), falling back to filling when breaching is expensive/undesirable.

- Pros: often more realistic than pure filling (less “lake flattening”).
- Cons: more complex; parameterization required; harder to ensure determinism + bounded runtime.

## Chosen direction (Phase 1 decision) + rationale

Implement **Option A as the spine** (Priority-Flood with ε-descending guarantee), optionally layering **Option B concepts** for robust flat draining on the conditioned surface.

Rationale:

- Fits our constraints: deterministic, fast on moderate tile counts, and adaptable to a 6-neighbor hex grid with wrapX.
- Directly addresses the biggest current failure mode: pervasive sinks due to quantized elevation.
- Can be introduced in a “routing-only” posture first (compute routing without mutating canonical topography), then extended to optional “conditioning” outputs if/when we want lakes or erosion coupling.

## Open questions (to answer in Phase 2)

1. **Ownership boundary:** Should Morphology own conditioned routing (and Hydrology reuse it), or should Hydrology own a `hydrology/compute-flow-routing` op (and Morphology stop publishing routing)?
2. **Do we mutate elevation?** Prefer a derived `Float32Array routingElevation` (or equivalent) rather than mutating `Int16Array elevation`, unless we explicitly want conditioned topography to influence engine `modelRivers` and later erosion.
3. **Edge semantics:** Which tiles count as “boundary outlets” given wrapX + non-wrapped poles? Do we treat water tiles as outlets (land→water) as well as top/bottom edges?
4. **Flat determinism:** What deterministic tie-breaking do we want when multiple neighbors share the same filled/conditioned elevation?
5. **Downstream integration:** If we don’t change engine projection yet, do we still get meaningful wins (climate refine + discharge-based signals)? If we *do* want rendered rivers to improve, do we condition the engine-consumed heightfield pre-`modelRivers` and later erosion?

## Sources / links (web research)

- Priority-Flood paper (Barnes et al.): `https://rbarnes.org/sci/2014_depressions.pdf`
- Priority-Flood (arXiv): `https://arxiv.org/abs/1511.04463`
- Efficient drainage directions over flats (Barnes): `https://rbarnes.org/sci/2014_flats.pdf`
- Garbrecht & Martz (1997) flat drainage directions (journal landing page): `https://www.sciencedirect.com/science/article/abs/pii/S0022169496031381`
- Hybrid breaching–filling sink removal (Lindsay preprint): `https://jblindsay.github.io/ghrg/pubs/Lindsay-HP-preprint.pdf`
- RichDEM docs (depression filling/breaching background + implementations): `https://richdem.readthedocs.io/en/latest/depression_filling.html`
