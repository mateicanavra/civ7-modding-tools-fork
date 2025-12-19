# PRD: Plate & Landmass Generation (Foundation: Mesh → Crust → Partition → Physics)

## 1. Overview

This PRD defines the requirements for the **Foundation (geology) sub-pipeline** of the map generation engine. It is the canonical replacement for the legacy plate / crust / boundary system and is intended to be the canonical example of the target mapgen architecture: **small, single-purpose `MapGenStep`s** with explicit `requires`/`provides`, pure domain logic, and explicit publication to `MapGenContext`.

**Key Objectives**
1. **Realism:** Produce organic continents and island chains via material-aware partitioning.
2. **Physics-flavored causality:** Derive uplift / rift / shear from relative plate motion (not ad-hoc scoring).
3. **Decoupling:** Separate kinematics (plates) from material (crust) to enable passive margins and realistic subduction/collision.
4. **Determinism:** Deterministic outputs given seed + config; fail-fast on missing dependencies.
5. **Architecture exemplar:** Foundation is decomposed into separate `MapGenStep`s and publishes intermediate artifacts via dependency-tag keys.

---

## 2. Scope (What This PRD Covers)

### In scope
- **Geology model and artifacts** described in [`docs/system/libs/mapgen/foundation.md`](../../../system/libs/mapgen/foundation.md): mesh, crust, plate partitioning, and tectonic physics.
- **Pipeline structure and boundaries** for implementing those strategies within `packages/mapgen-core` (domain vs lib vs pipeline steps).
- **Publication contracts** for downstream consumers:
  - Canonical intermediate artifacts published to `ctx.artifacts` (keyed by dependency tags).
  - Compatibility publication to `ctx.foundation` (satisfies `artifact:foundation`).

### Out of scope
- Downstream morphology/hydrology/ecology algorithms (consumers of these outputs).
- Long-term decisions about replacing the *entire* `FoundationContext` shape; this PRD targets compatibility with the current consumer boundary while establishing canonical intermediate artifacts.

---

## 3. Canonical References

- **Canonical design + algorithms:** [`docs/system/libs/mapgen/foundation.md`](../../../system/libs/mapgen/foundation.md)
- **Target engine architecture:** [`docs/system/libs/mapgen/architecture.md`](../../../system/libs/mapgen/architecture.md)
- **Current consumer boundary (M2/M3 binding contract):** [`docs/projects/engine-refactor-v1/resources/CONTRACT-foundation-context.md`](./CONTRACT-foundation-context.md)

---

## 4. Requirements

### 4.1 Functional (Domain)
- **REQ-FND-1 (Mesh):** Generate a regularized Voronoi-based region mesh to act as the simulation board (Lloyd relaxation).
- **REQ-FND-2 (Crust):** Generate a crust mask (`CrustData`) independent of plate boundaries; must support craton seeding and crust age.
- **REQ-FND-3 (Partition):** Partition mesh cells into major/minor kinematic plates (not material plates), configurable counts, with material-aware weighting.
- **REQ-FND-4 (Physics):** Compute tectonic boundary fields from relative plate velocity and crust type:
  - `upliftPotential` (convergence), `riftPotential` (divergence), `shearStress` (transform)
  - derived `volcanism` and `fracture`
  - support iterative accumulation (`cumulativeUplift`) to model eras

### 4.2 Functional (Publication / Contracts)
- **REQ-FND-5 (Intermediate artifacts):** Publish the canonical foundation artifacts to `ctx.artifacts` keyed by dependency-tag strings:
  - `artifact:regionMesh` → `RegionMesh`
  - `artifact:crustData` → `CrustData`
  - `artifact:plateGraph` → `PlateGraph`
  - `artifact:tectonicData` → `TectonicData`

  Publication must use `ctx.artifacts.set(tag, value)` (see `packages/mapgen-core/src/core/types.ts`).

- **REQ-FND-6 (Consumer boundary):** Publish a `FoundationContext` snapshot to `ctx.foundation`, satisfying `artifact:foundation` as the M2/M3 consumer boundary.
  - The authoritative compatibility contract is `CONTRACT-foundation-context.md`.
  - This publication must **not** require `WorldModel` as the source of truth; `ctx.foundation` must be buildable from the foundation artifacts (plus config snapshots) so the legacy approach can be replaced cleanly.

### 4.3 Functional (Step decomposition: canonical target architecture example)
- **REQ-FND-7 (Separate steps):** The Foundation geology pipeline **must** be implemented as separate `MapGenStep`s (not a single composite `foundation` step).

  Canonical step set (IDs are canonical, strategies are swappable):
  1. `core.mesh.voronoi` (phase `foundation`)
  2. `core.crust.craton` (phase `foundation`)
  3. `core.plates.weighted` (phase `foundation`)
  4. `core.tectonics.standard` (phase `foundation`)

  Canonical dependency-tag wiring:
  - `core.mesh.voronoi`
    - `requires: []`
    - `provides: ["artifact:regionMesh"]`
  - `core.crust.craton`
    - `requires: ["artifact:regionMesh"]`
    - `provides: ["artifact:crustData"]`
  - `core.plates.weighted`
    - `requires: ["artifact:regionMesh", "artifact:crustData"]`
    - `provides: ["artifact:plateGraph"]`
  - `core.tectonics.standard`
    - `requires: ["artifact:regionMesh", "artifact:crustData", "artifact:plateGraph"]`
    - `provides: ["artifact:tectonicData", "artifact:foundation"]`

  Notes:
  - `artifact:foundation` is satisfied by setting `ctx.foundation` (it is not stored in `ctx.artifacts` in the current hybrid pipeline).
  - The dependency-tag validator is currently strict; adding the new `artifact:*` keys above requires extending the canonical tag set (see Execution Plan).

### 4.4 Non-functional
- **REQ-PERF-1:** Mesh generation (≈4000 cells) completes within 100ms on standard hardware.
- **REQ-STAB-1:** Deterministic given seed + config.
- **REQ-COMP-1:** Runs in the Civ7 embedded V8 environment (ES2020-compatible).

---

## 5. Data Products (Canonical Artifacts)

The canonical artifact shapes are described in `docs/system/libs/mapgen/foundation.md`. This PRD additionally constrains **where they live** and **how they’re published** (dependency-tag keyed artifacts).

### 5.1 Indexing model
- `RegionMesh`, `CrustData`, `PlateGraph`, `TectonicData` are **per-mesh-cell** data products (indexed by mesh cell ID).
- `FoundationContext` (`ctx.foundation`) is a **per-tile** snapshot used by existing M2/M3 consumers.

### 5.2 Compatibility projection (mesh → tiles)
- `core.tectonics.standard` must publish `ctx.foundation` by projecting mesh-cell outputs to the tile grid in a deterministic way.
- The projection algorithm must be stable and reproducible; exact sampling (nearest-site, barycentric within Delaunay triangles, etc.) is an implementation choice, but must be documented in the implementation and remain deterministic.

---

## 6. Implementation Boundaries (Target Architecture Within `mapgen-core`)

This PRD’s primary “architecture alignment” requirement is that the Foundation system is implemented within the intended package boundaries:

- **Domain logic (pure, deterministic):** `packages/mapgen-core/src/domain/foundation/**`
  - Builders/strategies: mesh, crust, partition, tectonics.
- **Shared helpers (reusable primitives):** `packages/mapgen-core/src/lib/**`
  - math, geometry, graphs, sampling utilities.
- **Pipeline steps (thin wrappers):** `packages/mapgen-core/src/pipeline/foundation/**`
  - `MapGenStep` implementations that:
    - validate inputs (types, sizes)
    - run domain logic
    - publish artifacts to `ctx.artifacts`
    - (final step) publish `ctx.foundation`

New foundation code must not depend on the global `WorldModel` singleton. Any remaining legacy bridging should live at the orchestrator boundary.

---

## 7. Execution Plan (Concrete Work Items)

### Phase 1: Plumbing / Contracts
- Add the new dependency tags to the canonical set (e.g. extend `packages/mapgen-core/src/pipeline/tags.ts`):
  - `artifact:regionMesh`, `artifact:crustData`, `artifact:plateGraph`, `artifact:tectonicData`
- Extend the standard stage/phase mapping and dependency spine so the four foundation steps can be registered and executed in order (hybrid pipeline).
- Establish typed artifact helpers (optional but recommended) to centralize tag strings and casting.

### Phase 2: Strategy implementations (domain)
- Implement the four strategies described in `foundation.md`:
  - `MeshBuilder` (Voronoi + Lloyd)
  - `CrustGenerator` (craton seeding + growth)
  - `PlatePartitioner` (multi-source weighted flood fill)
  - `TectonicEngine` (material-aware boundary physics + era accumulation)

### Phase 3: Pipeline integration
- Implement `MapGenStep` wrappers for the four canonical steps under `packages/mapgen-core/src/pipeline/foundation/**`.
- Wire the steps into the current hybrid execution shell (`StepRegistry` / `PipelineExecutor`) and ensure:
  - intermediate artifacts are published using the tags from REQ-FND-5
  - `ctx.foundation` is published and satisfies the binding contract (REQ-FND-6)
- Keep any legacy consumer compatibility as an explicit boundary bridge (do not reintroduce new global-singleton dependencies in the new foundation steps).

---

## 8. Technical Notes (Canonical Choices)

- **Library selection:** Use `d3-delaunay` (Delaunator) for Voronoi/Delaunay computations.
- **WrapX:** Horizontal wrapping is out of scope for v1 (bounded Voronoi first).
- **Default resolution:** Target ~4000 mesh cells as the default “Large map” baseline.
- **Eras:** Support multi-pass accumulation (`cumulativeUplift`) as the canonical hook for “geologic history.”

---

## 9. Dependencies

- This PRD depends on configuration hygiene from [`PRD-config-refactor.md`](./PRD-config-refactor.md):
  - Foundation parameters are modeled/validated in `MapGenConfig`.
  - Foundation steps read configuration via `ctx.config` (not globals).

---

## Appendix A: Implementation Alignment Findings (Needs Review Before Canonicalizing)

This appendix captures repo-grounded constraints, gaps, and decisions that must be resolved to make this PRD truly canonical **for implementation inside the current hybrid TaskGraph shell**. The algorithms and approach in `foundation.md` remain the canonical target; the open items here are about **how we implement and integrate them** within `mapgen-core`.

### A.1 Current hybrid pipeline constraints (stage ⇄ step identity)

- **Standard recipe is stage-driven and requires 1:1 IDs.** `StepRegistry.getStandardRecipe()` returns `stageManifest.order` filtered by enablement, and the resulting recipe IDs must match registered step IDs 1:1 (`packages/mapgen-core/src/pipeline/StepRegistry.ts`).
- **Stage enablement is only for known stages.** `bootstrap/resolved.ts` computes `stageManifest` from a fixed `STAGE_ORDER` and ignores unknown `stageConfig` keys (`packages/mapgen-core/src/bootstrap/resolved.ts`).
- **Implication:** The canonical step IDs proposed above (`core.mesh.voronoi`, `core.crust.craton`, `core.plates.weighted`, `core.tectonics.standard`) cannot execute as first-class “standard recipe” steps without one of these integration decisions:
  - **Option 1 (recommended):** Keep `foundation` as the single stage in `STAGE_ORDER`, but add a deterministic **stage→substep expansion** mechanism so `foundation` expands into the four sub-steps at runtime (still respecting DEF-004 / no arbitrary recipe composition).
  - **Option 2:** Add the four sub-steps as new “stages” in `STAGE_ORDER` (high churn; impacts config, docs, tests, and stage gating surfaces).

### A.2 Dependency-tag registry is strict (new artifacts require plumbing)

- Dependency tags are a closed set: unknown tags throw during step registration (`packages/mapgen-core/src/pipeline/tags.ts`).
- The executor only verifies postconditions (`provides` → “is satisfied”) for a hardcoded subset of artifact tags and all `field:*` tags (`packages/mapgen-core/src/pipeline/PipelineExecutor.ts`).
- **Implication:** Introducing `artifact:regionMesh`, `artifact:crustData`, `artifact:plateGraph`, `artifact:tectonicData` requires:
  - Extending `M3_DEPENDENCY_TAGS` and `M3_CANONICAL_DEPENDENCY_TAGS`.
  - Adding satisfaction checks for these new artifacts if we want “provides verification” (otherwise they’ll be treated as “satisfied by declaration only”, which weakens the contracts this PRD is trying to exemplify).

### A.3 Current “foundation” source of truth is still `WorldModel`

- Today the `foundation` step calls `WorldModel.init()` and builds `ctx.foundation` via `createFoundationContext(WorldModel, ...)` (`packages/mapgen-core/src/MapOrchestrator.ts`).
- Downstream steps largely consume `ctx.foundation` (not `ctx.worldModel`), but `ctx.foundation` itself is currently derived from `WorldModel`.
- **Implication:** REQ-FND-6 (“must not require WorldModel as source of truth”) is not implementable without an explicit cutover plan:
  - **Bridge plan:** publish `ctx.foundation` from the new artifacts and (optionally) backfill `WorldModel` only as a compatibility sink.
  - **Or** keep `WorldModel` authoritative temporarily and treat the new artifacts as derived/diagnostic (not aligned with PRD intent).

### A.4 Downstream consumers depend on more than “plates”

The existing `FoundationContext` contract is already wired into multiple stages. Any foundation replacement must either preserve these fields or provide a deliberate compatibility mapping:

- **Morphology:** mountains/volcanoes/landmass read plate tensors like `upliftPotential`, `riftPotential`, `boundaryType`, `boundaryCloseness`, `tectonicStress`, and `shieldStability` (`packages/mapgen-core/src/domain/morphology/mountains/scoring.ts`, `packages/mapgen-core/src/domain/morphology/volcanoes/apply.ts`, `packages/mapgen-core/src/domain/morphology/landmass/index.ts`).
- **Climate:** several passes optionally read `ctx.foundation.dynamics.windU/windV` for wind-aware behavior (`packages/mapgen-core/src/domain/hydrology/climate/swatches/monsoon-bias.ts`, `packages/mapgen-core/src/domain/hydrology/climate/refine/orographic-shadow.ts`).
- **Story overlays:** some story logic reads both plate tensors and dynamics (`packages/mapgen-core/src/domain/narrative/orogeny/belts.ts`).

**Implication:** If the new foundation pipeline only produces plate/tectonic signals but drops dynamics, climate/story behavior may silently degrade to fallback heuristics (or change output materially).

### A.5 Naming and type collisions already exist

- `PlateGraph` is already a concrete type in `packages/mapgen-core/src/lib/plates/topology.ts` (plate adjacency derived from tile-indexed plate IDs), used by current landmass logic (`packages/mapgen-core/src/domain/morphology/landmass/crust-first-landmask.ts`).
- The canonical `foundation.md` “PlateGraph” is a **different** artifact (mesh-cell partition graph).

**Implication:** The implementation must use disambiguating names (e.g., `TilePlateTopology` vs `RegionPlateGraph`, or similar) and keep module boundaries explicit to avoid semantic drift and confusing APIs.

### A.6 Readiness assessment (what to land before “serious implementation”)

The repo is close enough to start work, but a small set of enabling decisions/changes should land first to prevent thrash:

1. **Decide and implement the “foundation expands into substeps” mechanism** (or explicitly choose the `STAGE_ORDER` churn alternative).
2. **Extend the dependency-tag canonical set** and add satisfaction checks for the new foundation artifacts.
3. **Define the compatibility projection**: how mesh-cell artifacts map deterministically to the existing tile-indexed `FoundationContext` arrays.
4. **Decide how `FoundationContext.dynamics` is handled** during the transition (preserve via existing model, or replace with a deterministic wind model, or explicitly scope it out with a known output change).
5. **Define the bridge posture for `WorldModel`**: compatibility sink only vs retained source of truth.

### A.7 Open decisions (must be answered to make this PRD implementable-canonical)

1. **Stage integration:** Do we implement stage→substep expansion for `foundation`, or do we introduce new stages into `STAGE_ORDER`?
2. **Artifact tag names:** Finalize canonical tag strings for intermediate artifacts (and whether they are “artifact:*” tags or a different namespace).
3. **Mesh→tile projection algorithm:** Choose and document the deterministic sampling method (nearest-site, barycentric interpolation, etc.) and its invariants.
4. **Dynamics contract:** Is `ctx.foundation.dynamics` in-scope for this PRD’s foundation replacement, and if so what produces it?
5. **Compatibility mapping for plate tensors:** How do `TectonicData` outputs map to the existing tensors (`tectonicStress`, `shieldStability`, movement vectors, etc.) consumed today?
6. **Library/runtime constraints:** Confirm `d3-delaunay` feasibility in the actual Civ7 V8/bundling environment (or define the allowed alternative while keeping the algorithmic intent canonical).
7. **Type naming:** Decide canonical names to avoid collisions with existing `PlateGraph` topology utilities.

### A.8 Primary risks if we proceed without resolving A.7

- **Architecture churn:** Implementing 4 steps without resolving stage identity will force a later “rename/rekey” across config, docs, tests, and pipeline wiring.
- **Contract weakness:** Adding artifact tags without satisfaction checks risks turning “provides” into unenforced declarations.
- **Silent behavior changes:** Dropping/altering `ctx.foundation.dynamics` changes climate/story outputs via fallback heuristics.
- **Scope explosion:** Refactoring `MapOrchestrator` at the same time as replacing foundation physics multiplies drift risk; keep orchestrator changes minimal until contracts/expansion are settled.

### A.9 Orchestrator “hidden blackboard” drift (readiness / sequencing)

- The current hybrid pipeline injects a `runFoundation` callback plus many cross-step inputs through `StandardLibraryRuntime`, which functions as a hidden blackboard rather than explicit `requires`/`provides` on `MapGenContext` (`packages/mapgen-core/src/pipeline/standard-library.ts`, `packages/mapgen-core/src/MapOrchestrator.ts`).
- This increases the blast radius of a Foundation refactor: step decomposition is necessary but not sufficient if downstream steps still read/write via the runtime object instead of `ctx.artifacts` / `ctx.foundation`.
- Practical sequencing implication: land the **stage→substep expansion** + **artifact tag plumbing** first, then iteratively shrink the runtime surface as each layer migrates to explicit artifacts (avoid a single mega-refactor that touches orchestrator + foundation physics + downstream consumers simultaneously).
