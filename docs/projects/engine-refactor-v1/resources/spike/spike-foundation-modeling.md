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

## 7) Non-goals (explicit)

- Multi-era geology simulation (“eras”) and long-term accumulation buffers are out of scope for this Foundation refactor unless explicitly pulled into the slice plan.
- Morphology’s elevation/land/sea shaping logic is not a Foundation responsibility.
- Hydrology/climate realism beyond a minimal baseline circulation signal is not a Foundation responsibility.

---

## Lookback (Phase 2 → Phase 3): Adjust implementation plan

Intentionally left as a placeholder to be written after Phase 3 slicing draft exists:
- finalized invariants (what must not change during implementation),
- risks (top 3) + how slice ordering mitigates them,
- pipeline delta slicing strategy (how contract changes land without breaking the pipeline),
- contract matrix deltas (what requires/provides changes by slice),
- test strategy notes (op-unit vs thin integration).

