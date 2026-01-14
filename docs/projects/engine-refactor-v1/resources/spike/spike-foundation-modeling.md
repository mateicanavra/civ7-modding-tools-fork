# Foundation Domain Refactor — Phase 2 Modeling Spike (Model-First)

This spike is the **Phase 2 output** for the Foundation vertical refactor workflow:
- Plan: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/FOUNDATION.md`
- Backbone workflow: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
- Phase 1 (current-state): `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-current-state.md`

Goal: define the **authoritative first-principles Foundation model**, even if artifacts change. Artifacts are contracts we publish because the pipeline needs stable surfaces—not because “that’s what the legacy producer happens to emit today”.

---

## 0) Authority stack (what is canonical vs supporting)

**Canonical (authoritative):**
- Domain-only causality + ownership: `docs/system/libs/mapgen/foundation.md`
- Cross-domain data model (buffers/artifacts/overlays): `docs/system/libs/mapgen/architecture.md`
- Domain modeling rules (ops/strategies/rules/steps): `docs/projects/engine-refactor-v1/resources/spec/SPEC-DOMAIN-MODELING-GUIDELINES.md`
- Operation contracts policy + kind semantics:
  - `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-030-operation-inputs-policy.md`
  - `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-034-operation-kind-semantics.md`
  - `docs/projects/engine-refactor-v1/resources/spec/adr/adr-er1-035-config-normalization-and-derived-defaults.md`

**Supporting (algorithmic north star; not canonical for contracts):**
- Plate generation PRD (useful detail, but not “truth”): `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`

---

## 1) Locked modeling principle (model-first)

**Authoritative first-principles model, even if artifacts change.**
- We preserve **causal truth** (mesh → crust → kinematics → tectonic interaction) and the pipeline’s ability to consume it coherently.
- We do not preserve a legacy artifact set/shape as an end in itself.
- When a stable consumer surface is still needed (because downstream domains are not refactored yet), we publish a **projection** (derived artifact) rather than letting consumers drive the model.

---

## 2) Domain-only Foundation model (first principles)

Source of truth: `docs/system/libs/mapgen/foundation.md`

### 2.1 Causality spine (what exists before what)

1) **Mesh (board geometry):** a graph/mesh substrate (Delaunay → Voronoi) with wrap-correct neighbor semantics.
2) **Crust (material):** lithosphere substrate signals (oceanic vs continental, age, thickness hints) that exist *before* plates.
3) **Plate graph (kinematics):** partition of mesh cells into kinematic domains (plates), with motion vectors and rotation.
4) **Tectonics (interaction):** forces derived at plate boundaries by intersecting kinematics with material (uplift, rift, shear, volcanism, fracture).
5) **Projections (consumer surfaces):** any tile-indexed representation is derived for downstream compatibility; it must not feed back into 1–4.

### 2.2 Ownership boundary (Foundation vs downstream)

Foundation owns:
- Mesh topology + wrap semantics.
- Crust material signals and “deep time” stability signals.
- Plate partition + kinematics.
- Boundary classification + tectonic force fields (drivers).

Foundation does not own:
- Turning tectonic drivers into elevation/land/sea decisions (Morphology).
- Climate/hydrology final fields; ecology; placement; narrative “meaning”.

---

## 3) Target product surfaces (artifacts vs buffers vs overlays)

This section defines the **target** Foundation outputs as pipeline contracts. Some are new (mesh-first); some are existing consumer contracts we keep stable as projections until downstream domains are refactored.

### 3.1 Target artifact inventory (Foundation stage)

**Mesh-indexed (model-first; first-class):**
- `artifact:foundation.mesh` — region mesh topology/geometry (wrap-correct).
- `artifact:foundation.crust` — crust material signals on the mesh.
- `artifact:foundation.plateGraph` — plate partition + kinematics on the mesh.
- `artifact:foundation.tectonics` — boundary interaction + force fields on the mesh.

**Tile-indexed (projection; stable consumer surface for current pipeline):**
- `artifact:foundation.plates` — tile-indexed tensors derived from mesh-first model (plate id, boundary proximity/type, plate motion, tectonic driver fields).
- `artifact:foundation.dynamics` — tile-indexed “planetary baseline” tensors (winds/currents/pressure) used by downstream narrative + hydrology logic.

**Trace-only (debug/forensics; not part of the physical model):**
- `artifact:foundation.seed` — seed snapshot / replay metadata.
- `artifact:foundation.config` — config snapshot for traceability.
- `artifact:foundation.diagnostics` — diagnostic payloads (visualization aids, non-required).

Model-first rule for trace artifacts:
- They must remain **non-required** by step contracts outside the Foundation stage.
- They must never become “inputs” to downstream modeling (no coupling to debugging surfaces).

### 3.2 Stable boundary semantics (public meaning)

Boundary semantics are part of the **Foundation contract surface** and must be stable.

Canonical boundary enum meaning (values are stable):
```ts
BOUNDARY_TYPE = {
  none: 0,
  convergent: 1,
  divergent: 2,
  transform: 3,
}
```

Target rule:
- Downstream domains may depend on the **meaning** above, but must not depend on Foundation **module layout** to import it.
- Implementation must provide a stable contract export (exact module placement is Phase 3 work; this spike locks the semantics).

### 3.3 Directionality posture (ownership + meaning)

Directionality is a **planetary boundary condition** used to bias large-scale orientation (plates / winds / currents).

Decision (locked):
- **`env.directionality` is the authoritative runtime input.**
- Recipe/map config may define defaults, but only by influencing env construction at the entry boundary (not by embedding directionality as domain-private “hidden config”).
- Steps pass directionality into ops as explicit **op inputs** when needed (never as callback “views”).

Rationale:
- `Env` already owns run-defining parameters (seed, dimensions, latitude bounds, wrap); directionality belongs in the same class.
- Multiple downstream steps already assume `env.directionality` exists; keeping this centralized avoids drift.

### 3.4 Typed-array contract posture (schemas + validation)

Decision (locked):
- Ops consume/produce plain values (POJOs + typed arrays); no runtime views/adapters in op contracts (ADR-ER1-030).
- Artifact/operation schemas should use the canonical typed-array schema helpers (not `Type.Any()`), and rely on runtime validators for length/invariant enforcement where schema precision is impossible.

---

## 3.5 Target contract matrix (target)

```yaml
steps:
  - id: foundation/foundation
    title: "Publish Foundation tensors (plates/dynamics) + snapshots"
    requires:
      artifacts: []
      buffers: []
      overlays: []
    provides:
      artifacts:
        - artifact:foundation.mesh
        - artifact:foundation.crust
        - artifact:foundation.plateGraph
        - artifact:foundation.tectonics
        - artifact:foundation.plates
        - artifact:foundation.dynamics
        - artifact:foundation.seed
        - artifact:foundation.diagnostics
        - artifact:foundation.config
      buffers: []
      overlays: []
    consumers:
      - morphology-pre/landmass-plates
      - morphology-mid/rugged-coasts
      - narrative-pre/story-rifts
      - narrative-mid/story-orogeny
      - morphology-post/mountains
      - morphology-post/volcanoes
      - narrative-swatches/story-swatches (dynamics)
      - hydrology-post/climate-refine (dynamics)
    notes: "Mesh-first artifacts are canonical; plates/dynamics remain projections until downstream migrates."

  - id: morphology-pre/landmass-plates
    title: "Landmass generation (plate-driven)"
    requires:
      artifacts: [artifact:foundation.plates]
      buffers: []
      overlays: []
    provides:
      artifacts: []
      buffers: []
      overlays: []
    consumers: []

  - id: morphology-mid/rugged-coasts
    title: "Rugged coasts (margin/corridor-aware)"
    requires:
      artifacts: [artifact:foundation.plates]
      buffers: []
      overlays: [artifact:storyOverlays]
    provides:
      artifacts: []
      buffers: []
      overlays: []
    consumers: []

  - id: narrative-pre/story-rifts
    title: "Story motifs: rift valleys"
    requires:
      artifacts: [artifact:foundation.plates]
      buffers: []
      overlays: [artifact:storyOverlays]
    provides:
      artifacts: []
      buffers: []
      overlays: [artifact:storyOverlays]
    consumers: []

  - id: narrative-mid/story-orogeny
    title: "Story motifs: orogeny belts"
    requires:
      artifacts: [artifact:foundation.plates, artifact:foundation.dynamics]
      buffers: []
      overlays: [artifact:storyOverlays]
    provides:
      artifacts: []
      buffers: []
      overlays: [artifact:storyOverlays]
    consumers: []

  - id: narrative-swatches/story-swatches
    title: "Story overlays: climate swatches (hydrology-facing)"
    requires:
      artifacts: [artifact:foundation.dynamics]
      buffers: [artifact:heightfield, artifact:climateField]
      overlays: [artifact:storyOverlays]
    provides:
      artifacts: []
      buffers: []
      overlays: [artifact:storyOverlays]
    consumers: []

  - id: hydrology-post/climate-refine
    title: "Post-rivers climate refinement (earthlike)"
    requires:
      artifacts: [artifact:foundation.dynamics, artifact:riverAdjacency]
      buffers: [artifact:heightfield, artifact:climateField]
      overlays: [artifact:storyOverlays]
    provides:
      artifacts: []
      buffers: []
      overlays: []
    consumers: []

  - id: morphology-post/mountains
    title: "Mountains placement (plate-aware physics)"
    requires:
      artifacts: [artifact:foundation.plates]
      buffers: []
      overlays: []
    provides:
      artifacts: []
      buffers: []
      overlays: []
    consumers: []

  - id: morphology-post/volcanoes
    title: "Volcano placement (plate-aware)"
    requires:
      artifacts: [artifact:foundation.plates]
      buffers: []
      overlays: []
    provides:
      artifacts: []
      buffers: []
      overlays: []
    consumers: []
```

## 4) Target Foundation op catalog (atomic; no op-calls-op)

This is the model-first op catalog. Each op is a stable, step-callable contract and is independently testable.

Notes:
- Ids are verb-forward and domain-scoped (see existing patterns like `placement/plan-starts`).
- All ops are **atomic**: composition happens in steps/stages.

### 4.1 Mesh + substrate (mesh-indexed)

1) `foundation/compute-mesh` (`compute`)
- **Input:** `{ dimensions, wrap, rngSeed }`
- **Config (strategy envelope):** mesh cell count, relaxation steps, sampling policy.
- **Output:** `artifact:foundation.mesh`

2) `foundation/compute-crust` (`compute`)
- **Input:** `{ mesh, rngSeed }`
- **Config:** continental ratio, craton seeding policy, age distribution knobs.
- **Output:** `artifact:foundation.crust`

3) `foundation/compute-plate-graph` (`compute`)
- **Input:** `{ mesh, crust, rngSeed, directionality? }`
- **Config:** major/minor plate counts, partition cost policy, kinematics distribution.
- **Output:** `artifact:foundation.plateGraph`

4) `foundation/compute-tectonics` (`compute`)
- **Input:** `{ mesh, crust, plateGraph }`
- **Config:** boundary physics scales, hotspot/plume policy (if modeled here).
- **Output:** `artifact:foundation.tectonics`

### 4.2 Projections for current consumers (tile-indexed)

5) `foundation/compute-plates-tensors` (`compute`)
- **Input:** `{ dimensions, mesh, crust, plateGraph, tectonics }`
- **Config:** projection policy (how mesh signals map to tile tensors; smoothing rules).
- **Output:** `artifact:foundation.plates`

6) `foundation/compute-dynamics-tensors` (`compute`)
- **Input:** `{ dimensions, latitudeBounds, wrap, directionality?, rngSeed }`
- **Config:** baseline circulation knobs (kept minimal; downstream climate owns refinement).
- **Output:** `artifact:foundation.dynamics`

### 4.3 Things that are *not* ops (step-owned effects / trace surfaces)

Step-owned (not modeled as ops by default):
- Publishing trace artifacts (`foundation.seed`, `foundation.config`, `foundation.diagnostics`).
- Any engine adapter writes (Foundation is runnable offline; adapter application is a step boundary).

Trigger to revisit:
- If a trace artifact becomes a first-class, independently testable product with stable I/O that multiple steps/tools consume, promote it into a dedicated compute op.

---

## 5) Foundation step/stage composition (conceptual)

Current Standard recipe has one Foundation step: `foundation/foundation`.

Target composition inside that step (still one step unless Phase 3 slicing demands more):
1) Build plain inputs from `ctx` (dimensions/wrap/lat bounds + `env.directionality` + deterministic RNG seeds).
2) Call ops in causal order:
   - `compute-mesh` → `compute-crust` → `compute-plate-graph` → `compute-tectonics`
   - `compute-plates-tensors` (+ projection) and `compute-dynamics-tensors`
3) Publish artifacts via stage-owned contracts (write-once semantics).
4) Optionally publish trace artifacts (non-required).

---

## 6) Pipeline delta list (what must adapt if we pursue this model)

This is **not** an implementation plan; it’s the list of contract-level impacts implied by the authoritative model.

### 6.1 Additive contract changes (low risk)

- Add new mesh-first artifacts: `foundation.mesh`, `foundation.crust`, `foundation.plateGraph`, `foundation.tectonics`.
- Keep existing consumer artifacts (`foundation.plates`, `foundation.dynamics`) as projections until downstream domains migrate to mesh-first consumption.

### 6.2 Stabilization changes (must happen to avoid reintroducing coupling)

- Provide a stable contract surface for boundary semantics so downstream code stops importing `BOUNDARY_TYPE` from Foundation implementation modules.
- Normalize typed-array schema posture so stage artifact schemas are not “Type.Any + runtime validators” by default.

### 6.3 Known downstream consumers of current artifacts (must remain coherent)

- `artifact:foundation.plates` consumers: morphology (landmass, rugged coasts, mountains, volcanoes) and narrative (rifts, orogeny).
- `artifact:foundation.dynamics` consumers: narrative swatches/orogeny and hydrology climate refinement.

---

## 7) Legacy disposition ledger (keep/kill/migrate)

- TBD (every config property, rule/policy, and domain function must be explicitly accepted into the model or rejected as legacy)

---

## 8) Upstream authoritative input selection

- Not applicable (Foundation is the pipeline root).

---

## 9) Non-goals (explicit)

- Multi-era geology simulation (“eras”) and long-term accumulation buffers are out of scope for this Foundation refactor unless explicitly pulled into the slice plan.
- Morphology’s elevation/land/sea shaping logic is not a Foundation responsibility.
- Hydrology/climate realism beyond a minimal baseline circulation signal is not a Foundation responsibility.

---

## 10) Invariants (locked)

- Model-first: mesh/graph causality is canonical; tile-indexed tensors are projections for downstream compatibility, not the model.
- `env.directionality` is authoritative; authored config only influences env construction at the entry boundary.
- `foundation.seed/config/diagnostics` are trace-only; never required by downstream steps and never used as modeling inputs.
- Typed-array payloads must not be `Type.Any()` by default; prefer explicit typed-array schemas + runtime invariant validation (ADR-ER1-030).

## 11) Decisions + defaults (modeling)

### Decision: Foundation posture is plate-graph-first
- **Context:** PRD direction is plate graph (Delaunay/Voronoi) rather than legacy tile-first foundation.
- **Choice:** Locked: Foundation is graph/mesh-first; tile-indexed tensors are projections for consumers.
- **Trigger to revisit:** Only if an engine constraint makes graph/mesh-first infeasible without a staged migration.

### Decision: Stable boundary semantics surface
- **Context:** Downstream domain code imports boundary enums/constants (`BOUNDARY_TYPE`) from Foundation implementation modules today.
- **Choice:** Locked: boundary semantics are a public Foundation contract; consumers must depend on a stable contract export.
- **Current contract surface:** `@mapgen/domain/foundation/constants.js` (backs onto `mods/mod-swooper-maps/src/domain/foundation/constants.ts`).
- **Trigger to revisit:** Only when Morphology refactor lands and no longer needs boundary constants from Foundation.

### Decision: Mesh-first artifact representation (typed arrays + POJOs)
- **Context:** We need mesh-first artifacts that are schema-able and deterministic across adapters.
- **Choice:** Publish typed-array + POJO mesh artifacts; neighbors are best-effort reconstructed from Voronoi halfedges when available.
- **Risk:** adjacency/wrap semantics are not yet authoritative across adapters; tectonics fields are placeholder/invariant-focused until consumers migrate.

### Default: Trace artifacts are non-canonical
- **Context:** `foundation.seed/config/diagnostics` are useful for replay/forensics but are not part of the physical model.
- **Choice:** Keep them trace-only; never required by downstream step contracts.
- **Trigger to revisit:** Only if a trace artifact becomes a first-class, independently testable product with stable I/O.

### Default: Typed-array schemas are explicit
- **Context:** Current artifact contracts use permissive `Type.Any()` while runtime validators enforce typed arrays.
- **Choice:** Prefer canonical typed-array schema helpers + runtime invariant validation; treat `Type.Any()` as a migration smell.
- **Trigger to revisit:** Only if authoring SDK changes typed-array schema strategy.

## 12) Risk register (modeling)

```yaml
risks:
  - id: R1
    title: "Downstream domains read Foundation artifacts via ctx.artifacts"
    severity: high
    blocking: true
    notes: "Must be removed via canonical deps access before completion."
  - id: R2
    title: "Downstream imports depend on Foundation module layout"
    severity: high
    blocking: true
    notes: "Boundary semantics must be a stable contract surface before refactor deletes or moves internals."
  - id: R3
    title: "Directionality ownership is duplicated (env + config)"
    severity: medium
    blocking: false
    notes: "Enforce env ownership at the entry boundary in implementation."
  - id: R4
    title: "Typed-array schema posture is split between Type.Any and runtime validators"
    severity: medium
    blocking: false
    notes: "Tighten schemas early to avoid reinforcing permissive contracts."
```

## 13) Golden path (authoritative)

Use this as the “one representative step” reference when authoring new Foundation steps.

Targets to demonstrate:
- `contract.ts` imports only the domain entrypoint + stage-owned artifact contracts.
- Step runtime uses `run(ctx, config, ops, deps)` and reads/writes via `deps.artifacts.*`.
- No redundant config typing imports when inference already provides it.

Reference for style (existing exemplar):
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/contract.ts`

Foundation target (shape, not implementation):
- Step contract: `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/foundation.contract.ts`
- Step runtime: `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/foundation.ts`
- Stage-owned artifact contracts: `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`
- Domain entrypoint + ops surface: `mods/mod-swooper-maps/src/domain/foundation/index.ts`

Minimal contract sketch (illustrative):
```ts
defineStep({
  id: "foundation",
  phase: "foundation",
  artifacts: { provides: [foundationArtifacts.plates, foundationArtifacts.dynamics /* ... */] },
  ops: { computePlates: foundation.ops.computePlatesTensors },
});
```

## Lookback (Phase 2 → Phase 3): Adjust implementation plan

Phase 2 locked the authoritative model. This lookback provides **inputs** to Phase 3 without prescribing slice ordering.

### 1) Finalized invariants (must not change during implementation)

1) Model-first: mesh/graph causality is canonical; tile-indexed tensors are projections for downstream compatibility, not the model.
2) Single-path authoring: steps orchestrate via `run(ctx, config, ops, deps)` and access dependencies via `deps` only (no `ctx.artifacts.get(...)`).
3) Atomic ops: ops do not call other ops; composition lives in the stage/step.
4) Stage-owned artifacts: Foundation outputs are published via stage-owned artifact contracts.
5) Stable boundary semantics: `BOUNDARY_TYPE` meaning is stable and available via a stable export surface.
6) Env-owned directionality: `env.directionality` is authoritative; authored config only influences env construction at the entry boundary.
7) Trace artifacts are non-canonical: `foundation.seed/config/diagnostics` are trace-only.
8) Typed-array schemas are explicit: artifact/op schemas must not default to `Type.Any()` for typed-array payloads.

### 2) Pipeline delta summary (contract-level changes)

- Add mesh-first artifacts: `foundation.mesh`, `foundation.crust`, `foundation.plateGraph`, `foundation.tectonics`.
- Keep `foundation.plates` and `foundation.dynamics` as projections until downstream domains migrate.
- Provide a stable contract surface for boundary semantics (no module-layout coupling).
- Normalize typed-array schema posture for Foundation artifacts and ops.

### 3) Risk priorities for Phase 3

- **Blocking:** downstream reads via `ctx.artifacts.get(...)` must be removed.
- **Blocking:** downstream imports depend on Foundation implementation module layout.
- **Non-blocking:** typed-array schema posture (tighten early to avoid reinforcing `Type.Any`).
- **Non-blocking:** directionality ownership (enforce env ownership at the entry boundary).

Phase 3 owns slice ordering and mitigation sequencing using these inputs.
