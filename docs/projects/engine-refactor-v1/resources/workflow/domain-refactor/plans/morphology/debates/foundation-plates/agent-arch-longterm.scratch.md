# Debate Scratchpad — `artifact:foundation.plates` (Agent 1: Long-term architecture)

## UPDATE (decision locked)

We are **keeping `artifact:foundation.plates` in the Phase 2 model** as a Foundation-owned, derived-only tile-space view for tile-based physics consumers (especially Morphology).

Canonical references:
- Contract: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CONTRACTS.md` (`artifact:foundation.plates`)
- Pipeline posture: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/morphology/spec/PHASE-2-CORE-MODEL-AND-PIPELINE.md`

This file is preserved as historical debate notes from an earlier posture; treat the “Position” and “Spec verified” claims below as superseded where they contradict the canonical references above.

---

## Historical position (superseded)

**Yes — eliminate `artifact:foundation.plates` from the canonical Phase 2 model** and treat tile-projected “plate tensors” as *derived, consumer-local views* built from mesh-first Foundation truth.

(Superseded) Recommendation (minimize Phase 2 drift): **Option 2** (delete it; Morphology derives tile-space fields internally from mesh-first truth), with an explicit path to selectively adopt **Option 3** later *inside ops* (mesh-first internals) without changing Phase 2 truth contracts.

---

## What I verified (spec + code evidence)

### Spec (Phase 2 target)

- Verified: `PHASE-2-CONTRACTS.md` explicitly forbids `artifact:foundation.plates` in the target model (“does not exist in Phase 2; remove in Phase 3”).
- Verified: `PHASE-2-MAP-PROJECTIONS-AND-STAMPING.md` reiterates: if tile-space boundary signals are needed, they **must be derived inside Morphology/Gameplay ops** from mesh-first truths; they **must not** be a published Foundation tile-raster.
- Verified: `PHASE-2-CONTRACTS.md` defines a **canonical, deterministic mesh→tile projection rule** (tileToCellIndex via nearest mesh site with wrapX periodic distance + tie-breaker).

### Current implementation reality (legacy)

- Verified: Foundation publishes `foundationPlates` (tile arrays: `boundaryCloseness`, `boundaryType`, `upliftPotential`, etc.) as an artifact: `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`.
- Verified: Foundation produces it in the “projection” step by calling op `foundation/compute-plates-tensors`: `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/projection.ts`.
- Verified: The op builds tile-space tensors by (a) projecting mesh cells to tiles, then (b) computing a tile-space boundary distance field and decay: `mods/mod-swooper-maps/src/domain/foundation/lib/project-plates.ts`.
- Verified: Morphology currently consumes `foundationPlates` in multiple steps (e.g., `landmassPlates.ts`, `mountains.ts`, `volcanoes.ts`).

---

## Why eliminating it is the best long-term architecture

### 1) “Truth” vs “view” separation (avoid two sources of truth)

`foundation.plates` is a **tile-space view** derived from mesh-first physics. Publishing it as a Foundation artifact creates an attractive but harmful second “truth surface”:

- it bakes in a particular projection + discretization choice (tile raster) as if it were fundamental,
- it becomes a dependency magnet for downstream logic (Morphology/Hydrology/Gameplay), and
- it makes future changes to projection semantics (or even internal mesh modeling) a breaking contract event.

Phase 2’s modeling vocabulary explicitly wants physics domains to publish **truth-only artifacts**, with gameplay projections living under `artifact:map.*` and stamping effects as `effect:map.*Plotted`. `foundation.plates` doesn’t fit either category cleanly: it’s not mesh truth, and it’s not gameplay projection intent.

### 2) Domain ownership integrity (Foundation should not be tile-topology-driven)

The most “tile-like” parts of `foundation.plates` are *not* mesh physics; they are computations on the tile neighbor graph:

- “is this tile on a boundary?” is computed from tile-neighbor plate-id differences,
- boundary closeness is computed by a **tile BFS distance field** + decay.

That couples Foundation to **tile adjacency semantics** (hex-oddq neighborhood + wrapX + edge rules). In the target architecture, Foundation should own mesh-first plate dynamics and boundary classification; **Morphology** (or Gameplay projection ops) should own tile-derived, consumer-specific rasters when they’re needed.

### 3) Drift prevention: published convenience artifacts are hard to kill later

Once `foundation.plates` is a public contract, every downstream “just uses it” and cements assumptions:

- boundary closeness scale/decay and stress aggregation become de facto canonical even if they were originally “tuning helpers”,
- Morphology ends up *implicitly* shaped by a Foundation-controlled knob surface,
- it becomes harder to enforce “no shims outside steps” because teams will route around missing truths by grabbing this raster.

Eliminating it forces the healthy pattern: **domains consume mesh truth and derive what they need as ops**.

---

## Options analysis (against locked invariants)

### Option 1) Keep `artifact:foundation.plates` as a Foundation artifact

Pros (real but short-lived):
- One precomputed tile raster is convenient for current tile-based Morphology ops.
- Centralizes one implementation of “boundary closeness”.

Cons (architecturally disqualifying under Phase 2):
- Violates the Phase 2 contracts and map-projection policy (explicitly forbidden).
- Treats a projection-dependent raster as “physics truth”.
- Couples Foundation to tile topology and downstream tuning knobs.
- Increases cross-domain contract surface area and makes change expensive.

Conclusion: Not compatible with Phase 2 target; high long-term drift risk.

### Option 2) Delete it; Morphology derives tile-space tensors internally from mesh-first truth

Pros:
- Directly matches Phase 2 posture: Foundation publishes mesh truth; consumers derive tile views.
- Keeps Morphology free to remain tile-based (consistent with Phase 2 truth outputs being tile-indexed).
- Lets Morphology own “how boundary proximity influences landforms” (correct domain boundary).
- Compute cost can be paid only when needed; can be cached as a Morphology stage-local buffer.

Implementation requirements (resolved by the Phase 2 model):
- Centralize tile-space derivation behind a single **pure Morphology op** (called from steps) so multiple steps do not reimplement the same projection math.
- Use the **canonical mesh→tile projection rule** (wrapX periodic distance + deterministic tie-breakers) so outputs are deterministic and stable.

Conclusion: Best Phase 2-aligned option; minimizes drift.

### Option 3) Delete it; move Morphology to mesh-first ops to avoid tile tensors

Pros:
- Conceptually clean: morphology processes can operate in the same mesh space as tectonics.
- Avoids raster aliasing; opens the door to more “physics-like” morphology.

Cons (Phase 2 compatibility / drift):
- Phase 2 Morphology truth outputs are explicitly tile-indexed artifacts; a mesh-first Morphology truth model is a larger architectural shift.
- Requires introducing new truth artifacts or new projection stages (a Phase 2 contract expansion), not just refactoring.

Conclusion: Great *future direction inside ops*, but too large to make the canonical Phase 2 model depend on it.

---

## Recommendation (compatible with Phase 2 + long-term quality)

1) **Canonical model decision:** eliminate `artifact:foundation.plates` entirely (no published Foundation tile tensors).
2) **Phase 2 convergence:** implement a **Morphology-owned derivation op** (or stage-local buffer) that produces the tile-space driver rasters needed by tile-based Morphology ops from mesh-first truths.
3) **Optional long-term upgrade:** evolve Morphology algorithms to be mesh-first internally (Option 3 style) *without changing truth artifact contracts*, by projecting results to tile artifacts at step boundaries.

---

## What must be contract-locked if `foundation.plates` is deleted

The deletion is safe only if we lock **(A) the upstream truths** and **(B) the deterministic derivation rules** that downstream ops will rely on.

### A) Required upstream truth artifacts (Foundation → Morphology)

Verified as Phase 2 intent (from `PHASE-2-CONTRACTS.md` wording about “mesh-first truth”):
- `artifact:foundation.mesh` (mesh sites + wrapWidth + neighbor graph)
- `artifact:foundation.plateGraph` (cell→plate + per-plate kinematics)
- `artifact:foundation.tectonics` (per-cell boundary classification + uplift/rift/shear/volcanism drivers)
- (Potentially) `artifact:foundation.crust` if Morphology’s land definition uses crust typing/age (not required by this debate, but typically part of the causal chain)

### B) Canonical projection + derived-field semantics (determinism + meaning)

1) **Mesh→tile mapping rule** (already specified in Phase 2 contracts; must remain canonical):
- `tileToCellIndex[tileIndex]` selection rule (nearest mesh site in hex space, wrapX periodic distance, deterministic tie-breaker).

2) **If Morphology (or Gameplay projection ops) needs tile-space boundary/closeness signals**, lock the derivation as an explicit “view op” contract, rather than an implicit copy of legacy behavior. Minimally:

- `plateIdByTile[t] = plateGraph.cellToPlate[tileToCellIndex[t]]`.
- `isPlateBoundaryByTile[t] = 1` iff any canonical hex neighbor `n` has `plateIdByTile[n] !== plateIdByTile[t]` (wrapX-aware neighbors; no wrapY).
- `boundaryTypeByTile[t]` rule (must be explicit):
  - suggested canonical: if `isPlateBoundaryByTile[t]` then `tectonics.boundaryType[tileToCellIndex[t]]` else `BOUNDARY_TYPE.none`
  - plus: define the boundary-type enum as a Foundation truth vocabulary (so Morphology doesn’t invent new meanings).
- `boundaryClosenessByTile[t]` rule (must be explicit):
  - compute `distanceToBoundaryByTile` via BFS on the canonical tile neighbor graph seeded by `isPlateBoundaryByTile`,
  - clamp/truncate at `maxDistance`,
  - map distance→closeness via a deterministic function (e.g., exponential decay) and define clamping/rounding to `[0,255]`.

3) **Knob ownership for derived signals** (important to avoid reintroducing drift):
- Any parameters like `boundaryInfluenceDistance` and `boundaryDecay` are **not Foundation config** in Phase 2; they must be Morphology (or Gameplay projection-op) config, since they shape Morphology/gameplay interpretation rather than Foundation truth.

4) **Where these derived arrays live** (to avoid accidental cross-domain coupling):
- Preferred: stage-local **Morphology buffers** (or op outputs passed within the Morphology stage) so they don’t become cross-domain “semi-truth” artifacts.
- If published at all, publish under a Morphology-owned artifact id with an explicit “derived driver view” posture and clear non-authority language (but this is a slippery slope; avoid unless multiple downstream domains truly need it).

---

## Risks & mitigations

- Risk: recomputing tileToCell + boundary distance multiple times across Morphology steps.
  - Mitigation: one Morphology op computes all required derived rasters once; steps pass them to downstream ops, or store in Morphology stage-local buffers.
- Risk: behavioral regression when migrating off `foundation.plates` (because legacy closeness/stress is implicitly relied upon).
  - Mitigation: treat `mods/mod-swooper-maps/src/domain/foundation/lib/project-plates.ts` as *evidence* for initial semantics, then lock the semantics explicitly in Morphology’s derivation op contract.
- Risk: performance of naive nearest-cell projection (`O(tileCount * cellCount)`).
  - Mitigation: keep semantics identical but swap implementation (spatial index / kd-tree) later; this is a pure-op internal optimization, not a contract change.

---

## Proposed convergence path (low drift, high integrity)

1) Phase 2 model stays as written: **no `artifact:foundation.plates`**.
2) Introduce a Morphology internal derivation op (or buffer) for “tectonic driver views by tile” built from `foundation.mesh|plateGraph|tectonics` via the canonical projection rule.
3) Migrate Morphology ops/steps to consume that derived view (or consume mesh fields directly) and delete Foundation’s tile-projection artifact/step in the Phase 3 migration work.
