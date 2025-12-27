# PRD: Plate & Tectonics Generation (Foundation: Mesh → Crust → Partition → Tectonics)

## 1. Overview

This PRD defines the **desired Foundation (geology + kinematics) system** for MapGen: Voronoi-based plates, crust-first material modeling, plate partitioning, and tectonic force derivation. The **algorithms and physics** described here are the north star; the current tile-tensor implementation on the M5 branch tip is a transitional/legacy approximation and is *not* the target design.

The work this PRD drives is: **deliver these algorithms inside the M4/M5 target architecture** (recipe → `ExecutionPlan` → executor, registry-validated tags, explicit artifacts) without reverting to the pre-M4 stage/manifest orchestration model.

**Key Objectives**
1. **Realism:** Produce organic continents and island chains via material-aware partitioning.
2. **Physics-flavored causality:** Derive uplift / rift / shear from relative plate motion (not ad-hoc scoring).
3. **Decoupling:** Separate kinematics (plates) from material (crust) to enable passive margins and realistic subduction/collision.
4. **Determinism:** Deterministic outputs given seed + config; fail-fast on missing dependencies.
5. **Architecture alignment:** Express the Foundation system in terms of the current M4/M5 contracts: recipe-authored ordering, tag-validated `requires/provides`, and versioned artifacts published via `ctx.artifacts`.

### 1.1 Status (M5 baseline vs PRD target)

- **Already true in M5:** Foundation publishes versioned, tile-indexed artifacts (`artifact:foundation.plates@v1`, `artifact:foundation.dynamics@v1`, etc.) and the pipeline runs under the recipe → `ExecutionPlan` model.
- **Not yet true (this PRD’s core value):** The published tensors are not yet derived from the mesh/crust/partition/tectonics system described in `foundation.md`.
- **This PRD’s posture:** Keep the artifact/contract model as the stable “new architecture” surface; upgrade the internal algorithms behind those artifacts to match the mesh-first design.

---

## 2. Scope (What This PRD Covers)

### In scope
- **Foundation algorithms and data products** (mesh, crust, plate partitioning, tectonics) described in [`docs/system/libs/mapgen/foundation.md`](../../../system/libs/mapgen/foundation.md).
- **Ownership boundary and dependencies**: what Foundation produces vs what downstream domains (especially Morphology) interpret.
- **Artifact contracts**: how these data products are published and consumed using the M4/M5 tag/registry model (no stage manifests, no hidden globals).

### Out of scope
- Morphology’s interpretation of forces into **land–water decisions**, **elevation**, **coastlines**, and other “shape the surface” logic (consumers of Foundation outputs).
- Hydrology, ecology, narrative, placement.
- Engine adapter wiring and buffering details (that is an engine boundary concern; steps publish `field:*` / `effect:*` as needed).

---

## 3. Canonical References

- **Canonical algorithms & data products:** [`docs/system/libs/mapgen/foundation.md`](../../../system/libs/mapgen/foundation.md)
- **Domain layering overview:** [`docs/system/libs/mapgen/architecture.md`](../../../system/libs/mapgen/architecture.md)
- **Target architecture (contracts + orchestration model):** [`docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`](./SPEC-target-architecture-draft.md)
- **M5 cleanup context (post-M4 target posture):** [`docs/projects/engine-refactor-v1/spikes/2025-12-26-m5-clean-architecture-finalization-scope.md`](../spikes/2025-12-26-m5-clean-architecture-finalization-scope.md)

---

## 4. Requirements

### 4.1 Functional (Domain)
- **REQ-FND-1 (Mesh):** Generate a regularized Voronoi-based region mesh to act as the simulation board (Lloyd relaxation).
- **REQ-FND-2 (Crust):** Generate a crust mask (`CrustData`) independent of plate boundaries; must support craton seeding and crust age.
- **REQ-FND-3 (Partition):** Partition mesh cells into major/minor kinematic plates (not material plates), configurable counts, with material-aware weighting.
- **REQ-FND-4 (Tectonics):** Compute tectonic boundary fields from relative plate velocity and crust type:
  - `upliftPotential` (convergence), `riftPotential` (divergence), `shearStress` (transform)
  - derived `volcanism` and `fracture`
  - support iterative accumulation (`cumulativeUplift`) to model eras

### 4.2 Functional (Publication / Contracts)

#### 4.2.1 Core Foundation outputs (tile-indexed; current M4/M5 contract surface)

The stable M4/M5 contract for downstream consumers is a set of **versioned, tile-indexed** Foundation artifacts. These exist today; their internal algorithmic provenance is expected to change as the mesh-based PRD algorithms land.

- **REQ-FND-5 (Foundation artifacts, v1):** Publish the following artifacts to `ctx.artifacts` (keyed by dependency-tag strings):
  - `artifact:foundation.plates@v1` → tile-indexed plate + tectonic tensors (plate ID, boundary signals, stress, motion vectors)
  - `artifact:foundation.dynamics@v1` → tile-indexed atmospheric/oceanic tensors (winds, currents, pressure)
  - `artifact:foundation.seed@v1` → seed snapshot / provenance for determinism and debugging
  - `artifact:foundation.diagnostics@v1` → diagnostics payload (debug-only; stable presence, flexible shape)
  - `artifact:foundation.config@v1` → config snapshot that informed the foundation run

These are set via `ctx.artifacts.set(tagId, value)` and read via `ctx.artifacts.get(tagId)`:
- Tag IDs and artifact shapes live in `packages/mapgen-core/src/core/types.ts`.
- Registry definitions and satisfaction checks live in `packages/mapgen-core/src/base/tags.ts`.
- Consumer-facing assertions live in `packages/mapgen-core/src/core/assertions.ts`.

#### 4.2.2 Canonical intermediate products (mesh-indexed; target additions that enable the PRD algorithms)

The PRD algorithms are **mesh-first**. To make them first-class inside the new architecture (and to avoid hiding the mesh model inside opaque step internals), Foundation should publish a small set of intermediate artifacts.

- **REQ-FND-6 (Mesh-first intermediate artifacts, v1):** Publish the following mesh-indexed artifacts to `ctx.artifacts`:
  - `artifact:foundation.mesh@v1` → `RegionMesh`
  - `artifact:foundation.crust@v1` → `CrustData`
  - `artifact:foundation.plateGraph@v1` → `PlateGraph` (mesh-cell partition + plate kinematics)
  - `artifact:foundation.tectonics@v1` → `TectonicData` (mesh-cell force fields)

**Mapping note (contract-level):**
- `artifact:foundation.plates@v1` is the **tile-grid projection** of the mesh-first outputs (`plateGraph@v1` + `tectonics@v1`) plus any additional tile-level derived tensors required by downstream stages.
- Morphology should treat `artifact:foundation.plates@v1` (and optionally `artifact:foundation.crust@v1`) as its primary dependency surface, not reach into any legacy/global state.

#### 4.2.3 Mesh → tile projection (deterministic and specified)

- **REQ-FND-7 (Projection):** If mesh-indexed artifacts are produced, define and document the deterministic projection strategy used to emit tile-indexed Foundation tensors:
  - Stable sampling rules (nearest-site, barycentric within Delaunay triangles, etc.)
  - Invariants (determinism, bounds, wrap semantics)
  - Which mesh signals map to which tile tensors (including any normalization/clamping)

### 4.3 Functional (Step decomposition under the new architecture)

This PRD treats “Foundation geology” as a **set of steps** whose ordering is authored in the recipe and compiled into the `ExecutionPlan`. There is no `stageManifest`, no `STAGE_ORDER`, and no stage-driven enablement in the target runtime.

- **REQ-FND-8 (Decomposable steps):** The Foundation geology pipeline must be decomposable into separate `MapGenStep`s with explicit `requires/provides`.

Canonical step set (IDs are canonical; strategies are swappable):
1. `foundation.mesh.voronoi` (phase `foundation`)
2. `foundation.crust.craton` (phase `foundation`)
3. `foundation.plates.partition` (phase `foundation`)
4. `foundation.tectonics.physics` (phase `foundation`)
5. `foundation.project.tiles` (phase `foundation`) — publishes `artifact:foundation.plates@v1` (and any tile-grid tensors derived from the mesh-first model)

Canonical dependency wiring:
- `foundation.mesh.voronoi`
  - `requires: []`
  - `provides: ["artifact:foundation.mesh@v1"]`
- `foundation.crust.craton`
  - `requires: ["artifact:foundation.mesh@v1"]`
  - `provides: ["artifact:foundation.crust@v1"]`
- `foundation.plates.partition`
  - `requires: ["artifact:foundation.mesh@v1", "artifact:foundation.crust@v1"]`
  - `provides: ["artifact:foundation.plateGraph@v1"]`
- `foundation.tectonics.physics`
  - `requires: ["artifact:foundation.mesh@v1", "artifact:foundation.crust@v1", "artifact:foundation.plateGraph@v1"]`
  - `provides: ["artifact:foundation.tectonics@v1"]`
- `foundation.project.tiles`
  - `requires: ["artifact:foundation.mesh@v1", "artifact:foundation.plateGraph@v1", "artifact:foundation.tectonics@v1"]`
  - `provides: ["artifact:foundation.plates@v1"]`

Notes:
- A recipe may still choose to run a **composite** step (e.g. a single `foundation` step) during migration, but the contract obligation remains: publish the same artifacts and honor the same dependency language.
- `artifact:foundation.dynamics@v1` may be produced by a dedicated step (e.g. `foundation.dynamics.atmosphere`) or by the composite foundation step; this PRD does not require dynamics to be coupled to the plate pipeline, only that the artifact contract is explicit and stable.

### 4.4 Non-functional
- **REQ-PERF-1:** Mesh generation (≈4000 cells) completes within 100ms on standard hardware.
- **REQ-STAB-1:** Deterministic given seed + config.
- **REQ-COMP-1:** Runs in the Civ7 embedded V8 environment (ES2020-compatible).

---

## 5. Data Products (Canonical Artifacts)

The canonical data product shapes are described in `docs/system/libs/mapgen/foundation.md`. This PRD constrains **how they are represented in the new architecture** and clarifies which products are cross-domain contracts vs internal intermediates.

### 5.1 Indexing model
- `RegionMesh`, `CrustData`, `PlateGraph`, `TectonicData` are **mesh-cell indexed** intermediate products (simulation board space).
- `artifact:foundation.plates@v1` and `artifact:foundation.dynamics@v1` are **tile indexed** cross-domain contracts (consumer space).

### 5.2 Why we keep tile-indexed contracts

Most downstream steps today (and likely for V1) operate in tile space. The PRD algorithms can remain mesh-first while still serving tile consumers via an explicit projection step. This avoids forcing a mesh-wide migration across Morphology/Hydrology/etc while still making the mesh model first-class and testable.

---

## 6. Ownership Boundaries (Foundation vs Morphology)

This PRD uses the “earth + physics in the most logical way” boundary:

**Foundation owns**
- The simulation board: mesh topology, adjacency, geometry, sampling/projection invariants.
- Material substrate: crust type/age and other lithosphere signals that exist before surface shaping.
- Kinematics: plate identities, velocities, rotations, boundary classification.
- Physics tensors/fields: stress, uplift potential, rift potential, shear, volcanism/fracture drivers.
- Dynamics tensors that are true “substrate signals” (winds/currents/pressure), published explicitly.

**Morphology owns**
- Turning Foundation signals into **land/water decisions**, **coastlines**, and **playable elevation** (heightfield).
- “Crust-first landmask” logic and ocean separation are morphology responsibilities: they interpret crust + tectonic fields; they are not the producer of those fields.

This boundary should be treated as a requirement for any PRD updates and for future implementation work.

---

## 7. Implementation Boundaries (Target Architecture Within `mapgen-core`)

This PRD is architecture-facing: it describes what should exist when implemented inside the M4/M5 system, but it does not require a specific internal folder layout beyond the “core vs mod-owned” split.

Within this repo today:
- **Core pipeline/runtime (generic):** `packages/mapgen-core/src/core/**`, `packages/mapgen-core/src/pipeline/**`, `packages/mapgen-core/src/orchestrator/**`
- **Base (standard) mod content (domain-owned):** `packages/mapgen-core/src/base/**`
  - foundation steps and their domain helpers live here while the base mod is still colocated inside `mapgen-core` (see the M5 “pluginization” workstream).
- **Shared helpers (reusable primitives):** `packages/mapgen-core/src/lib/**` (math, geometry, graphs, sampling utilities)

Implementation posture requirements:
- The mesh/crust/plates/tectonics algorithms should be expressed as **pure, deterministic domain functions** called by thin step wrappers.
- Steps must not depend on hidden global singletons; any runtime-only shims must be explicit and treated as transitional.

---

## 8. Execution Plan (Concrete Work Items)

This is intentionally phrased in terms of the M4/M5 architecture (registry + recipes + plan compilation), not legacy stages.

### Phase 1: Contracts and tag inventory
- Register the mesh-first intermediate artifact tags in the base mod registry (`artifact:foundation.mesh@v1`, `artifact:foundation.crust@v1`, `artifact:foundation.plateGraph@v1`, `artifact:foundation.tectonics@v1`).
- Add satisfaction checks so `provides` is enforced (not “declaration-only”).
- Define TypeBox schemas (or equivalent runtime validators) for the new artifacts and a minimal set of demo payloads for registry construction.

### Phase 2: Algorithmic implementation (north star)
- Implement the four strategies described in `foundation.md`:
  - Voronoi mesh builder (Lloyd relaxation)
  - Crust generator (craton seeding + growth + age)
  - Plate partitioner (multi-source weighted flood fill; kinematics-first)
  - Tectonic engine (material-aware boundary interaction + era accumulation)

### Phase 3: Integration via recipe → `ExecutionPlan`
- Provide `MapGenStep` wrappers for the canonical steps and wire them into the base mod registry.
- Ensure the base mod default recipe runs the selected foundation steps (or the composite step during migration) and produces `artifact:foundation.plates@v1` / `artifact:foundation.dynamics@v1`.
- Keep dependencies explicit: downstream consumers should depend on `artifact:foundation.*@v1` tags, not read implicit runtime services.

---

## 9. Technical Notes (Canonical Choices)

- **Voronoi/Delaunay:** Use a Voronoi/Delaunay implementation suitable for the Civ7 runtime (e.g. `d3-delaunay`, or an equivalent adapter-backed implementation if bundling/runtime constraints require it). The PRD algorithmic intent is Voronoi mesh + Lloyd relaxation; the library is an implementation choice constrained by runtime reality.
- **WrapX:** Horizontal wrapping strategy must be explicitly handled by the mesh/projection model; initial v1 can scope to bounded meshes if needed, but wrap semantics must be a planned extension (not an implicit global).
- **Default resolution:** Target ~4000 mesh cells as the default “Large map” baseline.
- **Eras:** Support multi-pass accumulation (`cumulativeUplift`) as the canonical hook for “geologic history.”

---

## 10. Dependencies

- This PRD assumes the M4/M5 orchestration model is the only runtime path: recipe → `ExecutionPlan` → executor (see `SPEC-target-architecture-draft.md`).
- This PRD assumes configuration is provided as explicit per-step config (recipe) plus global run settings (not legacy manifests/globals).
- This PRD depends on the tag registry enforcing new artifact tags (registration + satisfaction checks) so `provides` is a real contract.

---

## Appendix A: M5 Architecture Alignment Notes (Algorithms stay; scaffolding updates)

This appendix captures the architectural reframing required to implement the PRD algorithms inside the current system without regressing to pre-M4 orchestration.

### A.1 Artifact naming and versioning

- The M5 codebase uses **versioned** artifact tags (e.g. `artifact:foundation.plates@v1`), and tags are registry-validated.
- The foundation artifact inventory in the SPEC’s artifact table is conceptually correct (mesh/crust/plateGraph/tectonics exist as first-class artifacts), but tag IDs and versioning must follow the current registry conventions.

### A.2 Current Foundation contract vs target algorithm provenance

- The existence of `artifact:foundation.plates@v1` does not imply the current plate algorithm is correct; it is a **consumer contract surface**.
- The PRD algorithmic upgrade is expected to change how `foundation.plates@v1` is computed (mesh-first simulation + explicit projection), while preserving the tag contract and determinism.

### A.3 Type/name collisions to avoid

`PlateGraph` already exists in tile-space utilities. The mesh-space partition graph should use a disambiguating name (e.g. `RegionPlateGraph`) so APIs and docs do not blur tile vs mesh semantics.

### A.4 Open decisions (blocking questions for implementation work)

1. **Projection method:** Which deterministic sampling approach is canonical for mesh→tile projection, and what invariants must it satisfy?
2. **Dynamics coupling:** Should dynamics be computed independently of plates (default) or partially derived from plate kinematics (optional refinement)?
3. **Runtime constraints:** Confirm Voronoi library feasibility in the Civ7 bundling/runtime environment; if not feasible, define the allowed alternative while keeping Voronoi + relaxation intent.
4. **Registry enforcement posture:** Ensure all new artifact tags have satisfaction checks so the executor can enforce `provides` postconditions.
