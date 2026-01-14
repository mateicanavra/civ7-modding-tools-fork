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
 
Hydrology owns wind/currents as climate products (not Foundation).

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

### 3.3 Directionality posture (removed; derived signals only)

Directionality is **removed** as a global knob. Orientation biases must be derived from artifacts/buffers.

Decision (locked):
- No `env.directionality` or config-level directionality surface exists.
- Plate/tectonic orientation uses Foundation artifacts (plateGraph/tectonics).
- Climate/narrative orientation uses Hydrology products (winds/currents), not a global knob.

Rationale:
- Global knobs were shaping internals and leaking legacy assumptions across domains.
- Artifact-derived signals keep causality explicit and domain-owned.

### 3.4 Typed-array contract posture (schemas + validation)

Decision (locked):
- Ops consume/produce plain values (POJOs + typed arrays); no runtime views/adapters in op contracts (ADR-ER1-030).
- Artifact/operation schemas should use the canonical typed-array schema helpers (not `Type.Any()`), and rely on runtime validators for length/invariant enforcement where schema precision is impossible.

---

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
- **Input:** `{ mesh, crust, rngSeed }`
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
 
Hydrology owns wind/currents as climate products (not a Foundation op).

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
1) Build plain inputs from `ctx` (dimensions/wrap/lat bounds + deterministic RNG seeds).
2) Call ops in causal order:
   - `compute-mesh` → `compute-crust` → `compute-plate-graph` → `compute-tectonics`
   - `compute-plates-tensors` (projection)
3) Publish artifacts via stage-owned contracts (write-once semantics).
4) Optionally publish trace artifacts (non-required).

---

## 6) Pipeline delta list (what must adapt if we pursue this model)

This is **not** an implementation plan; it’s the list of contract-level impacts implied by the authoritative model.

### 6.1 Additive contract changes (low risk)

- Add new mesh-first artifacts: `foundation.mesh`, `foundation.crust`, `foundation.plateGraph`, `foundation.tectonics`.
- Keep existing consumer artifact (`foundation.plates`) as a projection until downstream domains migrate to mesh-first consumption.

### 6.2 Stabilization changes (must happen to avoid reintroducing coupling)

- Provide a stable contract surface for boundary semantics so downstream code stops importing `BOUNDARY_TYPE` from Foundation implementation modules.
- Normalize typed-array schema posture so stage artifact schemas are not “Type.Any + runtime validators” by default.

### 6.3 Known downstream consumers of current artifacts (must remain coherent)

- `artifact:foundation.plates` consumers: morphology (landmass, rugged coasts, mountains, volcanoes) and narrative (rifts, orogeny).
- Hydrology/narrative consumers should read climate/wind products from Hydrology (not Foundation).

---

## 7) Non-goals (explicit)

- Multi-era geology simulation (“eras”) and long-term accumulation buffers are out of scope for this Foundation refactor unless explicitly pulled into the slice plan.
- Morphology’s elevation/land/sea shaping logic is not a Foundation responsibility.
- Hydrology/climate realism beyond a minimal baseline circulation signal is not a Foundation responsibility.

---

## Lookback (Phase 2 → Phase 3): Adjust implementation plan

Phase 2 locked the **authoritative, model-first Foundation posture**. This lookback converts that posture into a slice plan that can be implemented without breaking the pipeline.

### 1) Finalized invariants (must not change during implementation)

These are the “laws of the land” for the Foundation refactor. If an implementation detail conflicts with any invariant, the implementation is wrong.

1) **Model-first (authoritative):** mesh/graph causality is canonical; tile-indexed tensors are projections for downstream compatibility, not the model.
2) **Single-path authoring:** steps orchestrate via `run(ctx, config, ops, deps)` and access dependencies via `deps` only (no `ctx.artifacts.get(...)` and no step imports of op implementations).
3) **Atomic ops:** ops do not call other ops; composition lives in the stage/step.
4) **Stage-owned artifacts:** Foundation outputs are published via stage-owned artifact contracts; consumers depend on those contracts, not ad-hoc tags or internal module paths.
5) **Stable boundary semantics:** `BOUNDARY_TYPE` meaning is stable and available via a stable export surface (consumers must not depend on Foundation module layout beyond that contract surface).
6) **No directionality knob:** orientation biases are derived from artifacts/buffers (plateGraph/tectonics, hydrology winds/currents).
7) **Trace artifacts are non-canonical:** `foundation.seed/config/diagnostics` remain trace-only (never required by downstream steps; never used as modeling inputs).
8) **Typed-array schemas are explicit:** artifact/op schemas must not default to `Type.Any()` for typed-array payloads; prefer explicit schema helpers + runtime invariant validation (ADR-ER1-030).

### 2) Top risks (and how slice ordering mitigates them)

1) **Blocking: downstream reads via `ctx.artifacts.get(...)`.**
   - Risk: any attempt to make Foundation contract-first while downstream still “reaches around” the step boundary recreates coupling and makes slice-by-slice unsafe.
   - Mitigation: land an early slice that removes (or mechanically fences) `ctx.artifacts.get(artifact:foundation.*)` usage from `packages/mapgen-core` and downstream domain logic, and routes all reads through `deps.artifacts.<contractName>.read()` in step runtimes.

2) **Blocking: downstream imports depend on Foundation implementation module layout (`BOUNDARY_TYPE`).**
   - Risk: if we reorganize Foundation modules as part of ops-first refactor, downstream breaks (and the “contract-only” posture becomes fiction).
   - Mitigation: treat boundary semantics as a first-class contract surface and lock a stable export path *before* deleting/moving Foundation internals; optionally add lint/guardrails to prevent new deep imports.

3) **Non-blocking (but must be enforced): typed-array schemas are currently `Type.Any()`.**
   - Risk: contract-first refactor without schema tightening leaves the system “typed by vibes” and encourages more `Any`-shaped artifacts.
   - Mitigation: introduce typed-array schemas as part of slice 1 (or slice 2) while behavior is unchanged; this keeps failures local and makes later refactors safer.

### 3) Pipeline delta slicing strategy (keep the pipeline coherent at every boundary)

The safest path is **additive-first, then migration, then deletion**:

- **Additive-first:** introduce mesh-first artifacts (`foundation.mesh/crust/plateGraph/tectonics`) as *additional* provides from the Foundation stage while keeping existing consumer artifact (`foundation.plates`) stable.
- **Migration:** move consumers off legacy access paths (deep imports, `ctx.artifacts.get`) and onto stable step/stage contracts + `deps`.
- **Deletion:** once the pipeline is coherent through contracts, delete legacy entrypoints (monolithic producer surfaces, `ctx.artifacts` assertions, and any “compat” helpers that bypass `deps`).

This ordering keeps the pipeline working while still honoring the “no dual paths” intent: the “dual” period is contract-level (additive artifacts), not two competing implementations.

### 4) Contract matrix delta by slice (draft)

This is expressed in terms of the shared Contract Matrix in the plan doc (Appendix B).

- **Slice 1 (contract-first surfacing; behavior-preserving):**
  - `foundation/foundation` provides remain: `foundation.plates` (and any legacy dynamics until removed), trace artifacts.
  - Change: schemas become explicit (typed-array posture); step runtime orchestration shifts to injected ops (no direct imports of implementations).
  - No downstream contract changes yet (purely internal + schema tightening).

- **Slice 2 (additive mesh-first contracts):**
  - `foundation/foundation` additionally provides: `foundation.mesh`, `foundation.crust`, `foundation.plateGraph`, `foundation.tectonics`.
  - Downstream requires remain unchanged (they still require `foundation.plates`, and any legacy dynamics until removed).

- **Slice 3 (consumer migration off legacy access paths):**
  - No `requires/provides` changes at the step-contract layer.
  - Change: downstream domain logic/steps stop using `ctx.artifacts.get(artifact:foundation.*)` and any deep imports not on the stable contract surface.

- **Slice 4 (directionality removal + deletion sweep):**
  - Delete any directionality knobs (no env/config surfaces remain).
  - Delete legacy entrypoints that bypass ops/stage contracts (producer-only surfaces, stale assertion helpers).

### 5) Draft slice boundaries (Phase 3 hardens this into an executable checklist)

Slice boundaries are chosen to keep “blast radius” small and to ensure each slice can end with the pipeline green.

1) **Slice 1 — Establish Foundation’s contract-first “spine” (behavior-preserving).**
   - Introduce: Foundation op contracts + implementations for the *existing* published outputs (`foundation.plates`, plus any legacy dynamics until removed), implemented by delegating to the current algorithms.
   - Convert: Foundation stage orchestration to call injected ops; stop importing Foundation implementation modules from the step.
   - Tighten: stage-owned artifact schemas (remove `Type.Any()` posture where possible).
   - Stabilize: boundary semantics export surface is treated as a contract (no new deep imports).

2) **Slice 2 — Add mesh-first artifacts as additive provides (model-first scaffolding).**
   - Introduce: mesh-first artifact contracts + op contracts (`compute-mesh`, `compute-crust`, `compute-plate-graph`, `compute-tectonics`), even if initial implementations are thin wrappers around existing in-memory structures.
   - Publish: additive artifacts from the Foundation stage without changing downstream requirements.

3) **Slice 3 — Remove legacy cross-pipeline coupling (consumers migrate).**
   - Replace: `packages/mapgen-core` `assertFoundation*` artifact reads via `ctx.artifacts.get(...)` with canonical `deps` access patterns at step boundaries.
   - Update: downstream domain logic call sites so plates/dynamics are passed explicitly (or read via `deps` in step runtime), not fetched from ctx.

4) **Slice 4 — Directionality removal + deletion sweep.**
   - Enforce: no directionality surfaces (env/config) and no hidden knobs.
   - Delete: monolithic producer entrypoints and any stale “compat” paths that bypass ops/stage contracts.

### 6) Test strategy notes (deterministic harnessing vs thin integration)

- **Op-unit tests (deterministic, fast):** each `foundation/compute-*` op should have targeted tests that lock invariants (array lengths, bounds, determinism for a fixed seed/env, and boundary enum meaning).
- **Thin integration tests (pipeline sanity):** keep at least one end-to-end “standard recipe runs” test path that asserts:
  - Foundation publishes required artifacts,
  - downstream stages still consume plates/dynamics coherently,
  - no `ctx.artifacts.get(artifact:foundation.*)` reads exist outside explicitly allowed legacy test harnesses.

If determinism is not currently achievable for a given op (because of engine RNG or floating-point sensitivity), record that as an explicit test gap and require a follow-up slice to make it deterministic.
