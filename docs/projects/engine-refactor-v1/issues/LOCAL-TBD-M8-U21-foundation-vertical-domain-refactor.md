---
id: LOCAL-TBD-M8-U21-FOUNDATION-VERTICAL
title: "[M8/U21] Foundation vertical domain refactor (model-first, contract-first ops)"
state: planned
priority: 1
estimate: 5
project: engine-refactor-v1
milestone: M8
assignees: []
labels: [foundation, architecture, modeling]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Refactor Foundation into the canonical architecture: **contract-first ops + orchestration-only steps**, with **stage-owned artifact contracts** and **single-path `deps` access**.
- Enforce the **authoritative, first-principles Foundation model** (mesh/graph-first); keep tile-indexed tensors as **projections** until downstream domains migrate.
- Remove cross-pipeline coupling (no `ctx.artifacts.get(artifact:foundation.*)` reads and no deep imports that depend on Foundation module layout).

## Authoritative posture (locked)

Lock this in: “authoritative first-principles model even if artifacts change” (model-first).

Non-negotiables for implementation:
- Mesh/graph causality is canonical; tile-indexed tensors are projections for downstream compatibility, not the model.
- Directionality is deleted; orientation biases are derived from artifacts/buffers (plateGraph/tectonics + Hydrology winds/currents).
- No `foundation.seed`/`foundation.diagnostics`/`foundation.config` artifacts exist; debugging stays in step-level trace logs, not artifacts.
- Typed-array payloads must not be “Type.Any by default”; prefer explicit typed-array schemas + runtime invariant validation (ADR-ER1-030).

## Dependencies / Sources
- Plan spine: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/FOUNDATION.md`
- Phase 1 (current-state): `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-current-state.md`
- Phase 2 (model-first): `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-modeling.md`

## Deliverables
- Foundation domain has a real op surface:
  - `mods/mod-swooper-maps/src/domain/foundation/ops/contracts.ts` declares atomic op contracts.
  - `mods/mod-swooper-maps/src/domain/foundation/ops/index.ts` registers implementations (ops do not call ops).
- Foundation stage is canonical:
  - Stage-owned artifacts are defined in `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`.
  - Step contracts use `artifacts.requires` / `artifacts.provides`.
  - Step runtime uses `run(ctx, config, ops, deps)` and reads/writes via `deps.artifacts.*` only.
- New mesh-first artifacts are published additively (until consumers migrate):
  - `artifact:foundation.mesh`, `artifact:foundation.crust`, `artifact:foundation.plateGraph`, `artifact:foundation.tectonics`.
- Legacy coupling is deleted (not “kept as compat forever”):
  - No `ctx.artifacts.get(artifact:foundation.*)` access from downstream domain logic via `packages/mapgen-core/src/core/assertions.ts`.
  - No downstream imports that depend on Foundation internal module layout beyond a stable contract surface for boundary semantics.

## Acceptance Criteria
- [ ] Foundation remains pipeline-green at the end of every slice:
  - `pnpm -C mods/mod-swooper-maps check`
  - `pnpm -C mods/mod-swooper-maps test`
  - `pnpm -C mods/mod-swooper-maps build`
  - `pnpm deploy:mods`
- [ ] No legacy artifact access paths remain:
  - `rg -n "ctx\\.artifacts\\.get\\(.*foundation\\." mods/mod-swooper-maps/src packages/mapgen-core` returns no hits (allowlist test harnesses only, if explicitly documented).
- [ ] Directionality is fully removed:
  - `rg -n "directionality" mods/mod-swooper-maps/src packages/mapgen-core/src` returns no hits.
- [ ] Foundation op/step contracts do not import domain config bags:
  - no `@mapgen/domain/config` imports or `Type.Partial(FoundationConfigSchema)` in Foundation ops/contracts.
- [ ] Foundation step is orchestration-only:
  - No step runtime imports Foundation op implementations directly.
  - No step runtime calls the legacy monolithic producer (once deleted).
- [ ] Boundary semantics are stable for consumers:
  - `BOUNDARY_TYPE` meaning stays stable and is importable from a stable surface (no module-layout coupling).
- [ ] Typed-array schema posture is enforced on Foundation artifacts and op contracts:
  - `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts` does not use `Type.Any()` for typed-array payloads.

## Testing / Verification
- Slice-local targeted verification:
  - `pnpm -C mods/mod-swooper-maps test -- --testPathPattern foundation` (or the repo’s equivalent Foundation test selector)
  - `rg -n "ctx\\.artifacts\\.get\\(.*foundation\\." mods/mod-swooper-maps/src packages/mapgen-core`
- Full gates (end of each slice, minimum once at the end):
  - `pnpm check`
  - `pnpm test`
  - `pnpm build`
  - `pnpm deploy:mods`

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

Complexity × parallelism: high complexity × low parallelism (Foundation is upstream of everything).

### Baseline checks (Phase 0)
- `pnpm -C packages/mapgen-core check`: pass
- `pnpm -C packages/mapgen-core test`: fail
  - `packages/mapgen-core/test/pipeline/tag-registry.test.ts` fails with duplicate provider error for `artifact:test.foo` (provider step duplicates)
- `pnpm -C mods/mod-swooper-maps check`: fail
  - Type errors in `mods/mod-swooper-maps/src/recipes/standard/stages/**` where `deps.artifacts.*` types resolve as `{}` (multiple stages)
- `pnpm -C mods/mod-swooper-maps test`: fail
  - Duplicate provider error for `artifact:foundation.plates` in standard recipe
  - `ReferenceError: Cannot access 'standardRecipe' before initialization` in standard recipe tests
- `pnpm -C mods/mod-swooper-maps build`: pass
- `pnpm deploy:mods`: pass

Post Slice 1 re-run (after contract-first spine cutover + toolchain fixes):
- `pnpm -C packages/mapgen-core check`: pass
- `pnpm -C packages/mapgen-core test`: pass
- `pnpm -C mods/mod-swooper-maps check`: pass
- `pnpm -C mods/mod-swooper-maps test`: pass

Post Slice 2 re-run (after additive mesh-first artifacts + ops scaffolding):
- `pnpm -C packages/mapgen-core check`: pass
- `pnpm -C packages/mapgen-core test`: pass
- `pnpm -C mods/mod-swooper-maps check`: pass
- `pnpm -C mods/mod-swooper-maps test`: pass
- `pnpm -C mods/mod-swooper-maps build`: pass
- `pnpm deploy:mods`: pass

Post Slice 3 re-run (after removing ctx.artifacts.get coupling for Foundation consumers):
- `pnpm -C packages/mapgen-core check`: pass
- `pnpm -C packages/mapgen-core test`: pass
- `pnpm -C mods/mod-swooper-maps check`: pass
- `pnpm -C mods/mod-swooper-maps test`: pass

Post Slice 4 re-run (after directionality removal + deletion sweep):
- `pnpm -C packages/mapgen-core check`: pass
- `pnpm -C packages/mapgen-core test`: pass
- `pnpm -C mods/mod-swooper-maps check`: pass
- `pnpm -C mods/mod-swooper-maps test`: pass
- `pnpm -C mods/mod-swooper-maps build`: pass
- `pnpm deploy:mods`: pass

Post Slice 5 re-run (after config purity + FoundationContext removal):
- `pnpm -C packages/mapgen-core check`: pass
- `pnpm -C packages/mapgen-core test`: pass
- `pnpm -C mods/mod-swooper-maps check`: pass
- `pnpm -C mods/mod-swooper-maps test`: pass

#### Slice 4: directionality removal (schema hardening)
- Context: directionality was a global knob that leaked across domains.
- Choice: remove all directionality surfaces (env/config) and any runtime validation tied to it.
- Rationale: keeps orientation bias derived from artifacts/buffers, not hidden config.

### Implementation Decisions

#### Slice 5: stage-level public surface for foundation config
- **Context:** Foundation config must not nest under `foundation.foundation` or propagate legacy wrappers; the stage should expose a clean public surface.
- **Options:** (a) keep internal-only step schema and require nested step ids, (b) add a public stage schema mapped directly to the foundation step.
- **Choice:** add a `public` schema + `compile` that maps stage config directly to the foundation step.
- **Rationale:** keeps the recipe config surface clean while preserving step internals and op envelopes.
- **Risk:** other stages may remain internal-only; future work might choose to expose similar public surfaces for consistency.

#### Slice 6: move foundation stage to internal step surfaces
- **Context:** Foundation stage is being split into multiple steps (mesh/crust/plate-graph/tectonics/projection), and the public mapping was designed for a single step.
- **Options:** (a) keep a public stage schema and compile into multiple steps, (b) remove the public surface and use the internal step-level schema directly.
- **Choice:** remove the public surface and expose step-level config directly.
- **Rationale:** aligns with the architecture posture (explicit step envelopes) and avoids adding a new synthetic config layer.
- **Risk:** recipe configs must be updated to use step ids directly.

#### Slice 6: implement Delaunay backend in mapgen-core with CSR neighbors
- **Context:** Mesh backend must move off adapter Voronoi utilities and use d3-delaunay with backend adjacency, while preserving the existing mesh artifact contract.
- **Options:** (a) implement Delaunay directly inside the mod step, (b) add a mapgen-core mesh backend and reuse it from the Foundation op; store neighbors as CSR arrays vs array-of-arrays.
- **Choice:** implement a mapgen-core `lib/mesh` Delaunay backend and keep CSR neighbors/offsets in the mesh artifact.
- **Rationale:** keeps backend ownership in mapgen-core and avoids changing the mesh artifact contract shape.
- **Risk:** CSR representation stays as the canonical mesh adjacency shape; any consumer expecting array-of-arrays must adapt (none in-tree today).

#### Slice 6: wrapX periodic Voronoi is required (no non-wrap path)
- **Context:** Civ maps are cylindrical in X; the mesh-first model must be wrap-correct for seam adjacency and any mesh-level vector math, or tectonics/projections will artifact at the seam.
- **Options:** (a) keep planar-only mesh and compensate downstream, (b) implement periodic Voronoi via replication (`x±wrapWidth`) and fold back adjacency/areas into the mesh artifact.
- **Choice:** implement periodic wrapX Voronoi via replication + foldback in the canonical `d3-delaunay` backend, and remove wrap controls from entry/runtime layers (no authored knob, no alternate path).
- **Rationale:** preserves a single authoritative mesh model and keeps seam correctness owned by the mesh layer, without leaking wrap toggles into runtime/entry code.
- **Risk:** any downstream that previously relied on `env.wrap` must be updated; wrap is now an invariant inside Foundation only.

#### Slice 6: remove wrap toggles from runtime/env surfaces
- **Context:** Wrap behavior is a Foundation-owned invariant and should not live in entry/runtime env surfaces.
- **Options:** (a) keep `env.wrap` and validate/override, (b) remove wrap from `Env` and from map init/runtime entry entirely.
- **Choice:** remove wrap from `Env` and from map init/runtime entry; Foundation assumes wrapX and treats wrapY as unsupported.
- **Rationale:** prevents wrap toggles from leaking outside the domain boundary and aligns with the “no optionality” directive.
- **Risk:** tests and any callers must update their env fixtures to drop `wrap`.

#### Slice 6: mesh contract wrap semantics surface
- **Context:** WrapX is a Foundation-owned invariant; downstream math still needs the periodic span.
- **Options:** (a) include `wrapX` + `wrapWidth` in the mesh contract, (b) include only `wrapWidth` and treat wrap as implicit.
- **Choice:** include only `wrapWidth` in the mesh contract.
- **Rationale:** downstream math needs the span but should not be tempted to branch on a wrap toggle; the span is sufficient.
- **Risk:** any code expecting a `wrapX` flag in the mesh artifact must be updated to use `wrapWidth` alone.

#### Slice 6: remove foundation seed/diagnostics artifacts
- **Context:** `foundation.seed` / `foundation.diagnostics` are legacy surfaces with no active consumers in-tree.
- **Options:** (a) keep them for potential debug consumers, (b) remove them and keep the projection output surface minimal.
- **Choice:** remove both artifacts and associated tags/validators.
- **Rationale:** aligns with the “ruthless deletion” directive and avoids carrying legacy surfaces without clear ownership.
- **Risk:** any external tooling that relied on these tags will need to migrate or drop usage.

#### Slice 6: run Delaunay/Voronoi in Civ hex space (not raw grid space)
- **Context:** The PRD explicitly expects mesh sites and distances to live in a continuous coordinate space derived from Civ’s hex grid geometry so Euclidean distances correspond to hex adjacency.
- **Options:** (a) treat `(x,y)` as raw grid coordinates (rectangular metric), (b) project into odd-q “hex space” for Delaunay/Voronoi and carry `wrapWidth` in those units.
- **Choice:** compute Delaunay/Voronoi in odd-q hex space (as already used by legacy plate generation distance math) and treat `wrapWidth = width * sqrt(3)` as the periodic X span.
- **Rationale:** keeps mesh adjacency, plate assignment, and tile projection distance consistent in the same metric space.
- **Risk:** mesh “area” invariants must be expressed in the chosen mesh coordinate units (use bbox area, not `width * height` blindly).

#### Slice 6: mesh area validation tolerance in tests
- **Context:** Delaunay/Voronoi area sums should approximate the mesh bbox area (`(xr-xl) * (yb-yt)` in mesh coordinate units), but floating-point and clipping can introduce minor drift.
- **Options:** (a) strict equality, (b) small relative tolerance (1–5%).
- **Choice:** 5% relative tolerance for mesh area sum checks in tests.
- **Rationale:** keeps the invariant meaningful while avoiding false negatives from numeric drift.
- **Risk:** tolerance could hide small regressions in total area; monitor if failures cluster near the threshold.

#### Slice 6: derive mesh cellCount from plate semantics (deviate from explicit cellCount spec)
- **Context:** Spec draft required explicit `cellCount`, but authored configs should not force users to reason about internal mesh resolution directly.
- **Options:** (a) require explicit `cellCount`, (b) derive `cellCount` from authored plate semantics via op normalization.
- **Choice:** derive `cellCount` in `foundation/compute-mesh` normalization from scaled `plateCount` and authored `cellsPerPlate`.
- **Rationale:** preserves “no hidden defaults in run handlers” while keeping mesh resolution internal and still explicitly controlled.
- **Risk:** this diverges from the earlier mesh-spec lock and must be kept consistent across `compute-mesh` and `compute-plate-graph` scaling.

#### Slice 6: mesh cellCount values in presets
- **Context:** Mesh config originally required explicit `cellCount`, which forced per-map authoring.
- **Options:** (a) keep `cellCount` authored directly, (b) derive `cellCount` from authored plate semantics.
- **Choice:** derive `cellCount` during `foundation/compute-mesh` normalization from scaled `plateCount` and authored `cellsPerPlate`.
- **Rationale:** keeps `cellCount` internal while still giving explicit resolution control (`cellsPerPlate`) and consistent scaling across map sizes.
- **Risk:** normalization formula changes will affect mesh resolution across all maps; keep invariant tests and review diffs carefully.

#### Slice 2: mesh-first artifact representation (scaffolding)
- Context: we need to publish `foundation.mesh/crust/plateGraph/tectonics` additively without changing downstream behavior (tiles remain projections).
- Options:
  - publish raw adapter Voronoi objects (hard to validate/type; non-POJO shapes),
  - publish typed-array+POJO mesh with best-effort neighbor reconstruction (schema-able; deterministic),
  - publish a tile-graph “mesh” (wrap-correct but violates mesh-first intent).
- Choice: publish a typed-array+POJO mesh artifact; neighbors are best-effort reconstructed from Voronoi halfedges when available (mock adapter yields empty halfedges, so adjacency is empty in tests).
- Rationale: keeps artifacts schema-able and deterministic while avoiding a second “tile mesh” model path.
- Risk: adjacency/wrap semantics are not yet authoritative across adapters; tectonics fields are placeholder/invariant-focused until consumers migrate.

### Slice plan (draft; executable checklists per slice)

This slice plan is derived from the Phase 2 modeling spike Lookback (Phase 2 → Phase 3). Each slice must be independently shippable and leave the pipeline coherent.

### Algorithmic reference (Delaunay/Voronoi; do not treat as architecture)

These are trusted for algorithmic direction only. Canonical architecture remains `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`.

- PRD north-star (algorithm): `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`
- Audit (alignment gap): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/SPIKE-FOUNDATION-PRD-AUDIT.md`
- Feasibility spike: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/foundation/SPIKE-FOUNDATION-DELAUNAY-FEASIBILITY.md`
- Canonical mesh spec: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/foundation/SPEC-FOUNDATION-DELAUNAY-VORONOI.md`
- WrapX periodic implementation appendix: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/foundation/APPENDIX-WRAPX-PERIODIC-MESH-IMPLEMENTATION.md`

Locked decisions for implementation (algorithmic):
- Use `d3-delaunay` as the canonical Delaunay/Voronoi backend (no adapter, no fallback).
- Mesh operates in odd-q hex space and must implement wrapX periodic adjacency (wrapY unsupported).
- wrapX is not an authored knob and does not exist in entry/runtime env surfaces; Foundation assumes wrapX and exposes `mesh.wrapWidth` for downstream wrap-aware math.
- Mesh distance semantics must align with Civ’s hex grid geometry: run the Delaunay/Voronoi in “hex space” (odd-q vertical layout), so Euclidean distances match downstream hex adjacency and tile projection.
- Neighbor/adjacency comes from the backend’s neighbor iterator (no “halfedge inference” against empty mock data).
- Plate counts are authored as base values and scaled to runtime map size during op normalization (no per-map manual retuning).
- Mesh `cellCount` is derived during normalization from scaled `plateCount` and an authored `cellsPerPlate` factor; users do not author `cellCount` directly.
- The mesh contract must include `wrapWidth` so downstream ops can compute wrap-correct distances without introducing wrap toggles.

Spec alignment pass (mesh backend):
- Spec: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/foundation/SPEC-FOUNDATION-DELAUNAY-VORONOI.md` (created from the same spikes; locks “wrapX required” and “no adapter/fallback”).
- Alignment: the Slice 6 plan matches the spec’s key hard locks; the remaining deltas are now explicitly checklist items in Subissue 6.3/6.4:
  - implement wrapX periodic Voronoi via site replication at `x±wrapWidth`, fold neighbors back to base indices, and clip polygons to the base domain for area/centroid (Appendix “WrapX Periodic Voronoi Strategy”)
  - keep “no hidden defaults in run handlers”: all defaults/derivations happen in `normalize` (e.g. `plateCount → cellCount`), not in `run`
  - derive adjacency only from the backend iterator (no halfedge inference against empty mock data)
  - add validation criteria beyond symmetry (total area ~ mesh bbox area, determinism, wrapX seam adjacency)

#### Slice 1 — Establish the contract-first spine (behavior-preserving)

Goal: route *existing* published outputs (`foundation.plates`, `foundation.dynamics`, trace artifacts) through the canonical ops + stage contract posture, without changing behavior.

Checklist:
- [x] Declare op contracts:
  - `foundation/compute-plates-tensors`
  - `foundation/compute-dynamics-tensors`
- [x] Implement ops by delegating to existing algorithms (legacy code becomes a private implementation detail, not a public entrypoint).
- [x] Convert Foundation stage orchestration to call injected ops (no direct imports of Foundation implementation modules in the step runtime).
- [x] Tighten stage-owned artifact schemas:
  - Replace `Type.Any()` posture with explicit typed-array schemas where feasible.
- [x] Lock boundary semantics export surface (stable contract import for `BOUNDARY_TYPE`):
  - Prevent new deep imports; keep consumer-facing meaning stable.

#### Slice 2 — Add mesh-first artifacts as additive provides (model-first scaffolding)

Goal: publish mesh/graph-first artifacts as additional provides without changing downstream requirements.

Checklist:
- [x] Add stage-owned artifact contracts:
  - `foundation.mesh`, `foundation.crust`, `foundation.plateGraph`, `foundation.tectonics`.
- [x] Declare op contracts + implementations:
  - `foundation/compute-mesh`
  - `foundation/compute-crust`
  - `foundation/compute-plate-graph`
  - `foundation/compute-tectonics`
- [x] Publish additive artifacts from the Foundation step while keeping `foundation.plates/dynamics` stable as projections.
- [x] Add op-unit tests for each new op (determinism + invariants), even if initial implementations are thin wrappers.

#### Slice 3 — Remove cross-pipeline coupling (consumer migration)

Goal: eliminate `ctx.artifacts.get(artifact:foundation.*)` and other non-canonical reads without changing step contracts.

Checklist:
- [x] Remove/replace `packages/mapgen-core/src/core/assertions.ts` access patterns that fetch Foundation artifacts via `ctx.artifacts.get(...)`.
- [x] Update downstream domain logic call paths so plates/dynamics are passed explicitly or read through `deps` at step boundaries.
- [x] Add guardrails (lint and/or script checks) to prevent regressions (optional if equivalent rails already exist).

#### Slice 4 — Directionality removal + deletion sweep

Goal: delete directionality everywhere and remove legacy monolith/compat surfaces.

Checklist:
- [x] Remove all directionality surfaces (env/config) and runtime validation tied to it.
- [x] Delete the monolithic Foundation producer surfaces and any stale compat helpers that bypass the ops/stage contract boundary.
- [x] Re-run full pipeline gates and reconcile docs-as-code on any touched schema/exports.

#### Slice 5 — Config purity + directionality purge (remediation)

Goal: Foundation internals + op contracts are pristine; no domain config bag or directionality surfaces remain.

Checklist:
- [x] Delete `mods/mod-swooper-maps/src/domain/foundation/config.ts` and remove `@mapgen/domain/config` from Foundation op/step contracts.
- [x] Ensure op configs are op-owned (TypeBox + `Static<typeof Schema>` only; no manual TS duplication).
- [x] Remove directionality references from all steps/domains/tests/presets (artifact-derived signals only).
- [x] Delete `FoundationContext` wrapper + tests; publish artifacts directly from step ops.

#### Slice 6 — Derived projections + move winds/currents to Hydrology (and de-monolith Foundation stage)

Goal: enforce the authoritative spine and remove “Foundation dynamics” by moving climate products to Hydrology; Foundation stage must be multi-step (no monolith).

##### Subissue 6.1 — Split Foundation stage into multiple canonical steps

Create a step-per-op spine in `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/`:
- `mesh` (ops: `computeMesh`; provides: `artifact:foundation.mesh`)
- `crust` (requires: mesh; ops: `computeCrust`; provides: `artifact:foundation.crust`)
- `plate-graph` (requires: mesh+crust; ops: `computePlateGraph`; provides: `artifact:foundation.plateGraph`)
- `tectonics` (requires: mesh+crust+plateGraph; ops: `computeTectonics`; provides: `artifact:foundation.tectonics`)
- `projection` (requires: mesh+plateGraph+tectonics; ops: `computePlatesTensors`; provides: tile projections needed downstream)

Checklist:
- [x] Add step contract + runtime for each step (kebab-case step ids; no shared monolithic contract).
- [x] Update `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/index.ts` to register the new steps in order.
- [x] Delete the old `foundation` monolith step and remove it from the stage index.

Acceptance criteria:
- [x] There is no “single foundation step” in the recipe; the stage is explicitly multi-step with step-level contracts.
- [x] Each step runtime is orchestration-only and calls injected ops; no step imports op implementations directly.

##### Subissue 6.2 — Delete config snapshots entirely (hard lock)

Checklist:
- [x] Delete any `foundation.config` artifact (definition + publish + validation).
- [x] Remove any config snapshot types/validators in `packages/mapgen-core/src/core/types.ts` and `packages/mapgen-core/src/core/assertions.ts`.

Acceptance criteria:
- [x] No config payload is published as an artifact anywhere in Foundation.
- [ ] `rg -n \"foundation\\.config\" mods/mod-swooper-maps/src packages/mapgen-core/src` returns no hits.

##### Subissue 6.3 — Make mesh generation PRD-aligned: use `d3-delaunay` (canonical-only backend)

Checklist:
- [ ] Add `d3-delaunay` as a dependency in the canonical location (expected: `packages/mapgen-core`), and ensure it is bundled for builds.
- [ ] Implement a deterministic, engine-independent Voronoi backend in mapgen-core per `SPEC-FOUNDATION-DELAUNAY-VORONOI`.
- [ ] Update `foundation/compute-mesh` op to use the canonical backend and delete its dependency on adapter Voronoi utilities.
- [ ] Remove wrap toggles from entry/runtime env layers:
  - delete `wrapX/wrapY` from `mods/mod-swooper-maps/src/maps/_runtime/map-init.ts` and `standard-entry.ts`.
  - remove `env.wrap` from the core env schema and test fixtures.
  - do not introduce any Foundation config knob for wrap.
- [ ] Ensure Delaunay/Voronoi is computed in “hex space” (odd-q vertical layout) so Euclidean distances correspond to tile geometry (PRD-plate-generation coordinate system).
- [ ] Encode wrap semantics in the mesh contract (`wrapWidth` only) and implement periodic adjacency (wrapY unsupported).
- [ ] Implement wrapX periodic Voronoi via site replication at `x±wrapWidth`, fold neighbors back to base indices, and clip polygons to the base domain for area/centroid (per spec Appendix “WrapX Periodic Voronoi Strategy”).
- [ ] Keep mesh resolution internal: derive `cellCount` in `foundation/compute-mesh` normalization from scaled `plateCount` and authored `cellsPerPlate` (no run-handler defaults/derivations).
- [ ] Update the test harness so mock adapter does not need to emulate Voronoi halfedges (mesh tests must run offline deterministically).

Acceptance criteria:
- [ ] No Foundation op or step requires `adapter.getVoronoiUtils`.
- [ ] Mesh neighbor symmetry invariants are validated under tests.
- [ ] Mesh total area approximates the mesh bbox area (`(xr-xl) * (yb-yt)`) within tolerance under tests.
- [ ] Mesh is deterministic for fixed seed + config under tests.
- [ ] At least one seam-adjacent cell has neighbors across the seam (wrap-correct adjacency), and the mesh contract exposes `wrapWidth` for wrap-aware downstream distance math.
- [ ] There is no “adapter Voronoi” fallback path (single canonical backend).

##### Subissue 6.4 — Make `foundation.plates` projections derived from canonical artifacts

Checklist:
- [ ] Ensure `foundation/compute-plates-tensors` consumes only mesh-first artifacts (`mesh/crust/plateGraph/tectonics`) and produces tile-indexed tensors strictly by projection (no adapter Voronoi inputs).
- [ ] Remove any “parallel tile-first plate generation” path; no second algorithm should compute plates from unrelated inputs.
- [ ] Make all mesh-space distance/vector math wrap-aware using the mesh contract’s `wrapWidth`:
  - `foundation/compute-plate-graph`: plate assignment distances must use periodic X distance (no seam bias).
  - `foundation/compute-tectonics`: boundary typing must use wrapped `dx` so dot-products are meaningful across the seam.
  - `foundation/compute-plates-tensors` projection: nearest-cell assignment must use wrap-correct distance in hex space (either replicate sites at `x±wrapWidth` or implement wrapped distance directly).

Acceptance criteria:
- [ ] `foundation.plates` is derived solely from mesh-first artifacts and tectonics outputs (single-path causality).
- [ ] There is no call path that recomputes Voronoi/plates independently inside projection ops.

##### Subissue 6.5 — Hydrology owns winds/currents; Foundation does not

Checklist:
- [ ] Keep `hydrology/compute-wind-fields` as the only producer of wind/current fields (Hydrology-owned artifacts).
- [ ] Remove Foundation dynamics artifacts/types/validators and update any consumers to read Hydrology wind fields instead.
- [ ] Remove any remaining climate/wind concepts from Foundation ops/contracts.

Acceptance criteria:
- [ ] `rg -n \"foundation\\.dynamics\" mods/mod-swooper-maps/src packages/mapgen-core/src` returns no hits.
- [ ] Foundation stage publishes no wind/current/pressure tensors.

##### Subissue 6.6 — Update authoring surfaces (presets/tests) and compile ops wiring

Checklist:
- [ ] Update `mods/mod-swooper-maps/src/recipes/standard/recipe.ts` to include Hydrology ops in compilation (as needed for new op usage).
- [ ] Update presets (`mods/mod-swooper-maps/src/maps/*.ts`) and runtime tests to:
  - remove any deleted foundation dynamics config,
  - author wind config under `hydrology-pre` climate baseline step/op envelope,
  - align foundation projection config with the new contract (no legacy fields).

Acceptance criteria:
- [ ] `pnpm -C mods/mod-swooper-maps check` passes (type-level surface is coherent).

##### Slice 6 gates (must pass before Slice 7)
- [ ] `pnpm -C packages/mapgen-core check`
- [ ] `pnpm -C packages/mapgen-core test`
- [ ] `pnpm -C mods/mod-swooper-maps check`
- [ ] `pnpm -C mods/mod-swooper-maps test`
- [ ] `pnpm -C mods/mod-swooper-maps build`

#### Slice 7 — Downstream rebuild (authoritative surfaces only)

Goal: downstream domains consume authoritative artifacts/buffers only; remove any remaining legacy assumptions and delete any remaining directionality or “hidden global” inputs.

##### Subissue 7.1 — Rewrite consumer steps/contracts to the new surfaces

Checklist:
- [ ] Morphology steps read only the specific Foundation artifacts/projections they require via `deps.artifacts.*`.
- [ ] Narrative steps read only the specific artifacts they require via `deps.artifacts.*`.
- [ ] Hydrology refine continues to use Hydrology wind fields (no Foundation “dynamics”).

Acceptance criteria:
- [ ] No downstream step or domain code imports deleted Foundation modules or deep paths.
- [ ] No downstream step requires artifacts that were deleted in Slice 6 (e.g., `foundation.dynamics`).

##### Subissue 7.2 — Remove any lingering directionality-era validations or knobs

Checklist:
- [ ] Delete any runtime “directionality required” checks, including in presets/tests.
- [ ] Replace any remaining orientation bias logic with artifact/buffer derived signals only (plate boundaries/tectonics + hydrology winds/currents).

Acceptance criteria:
- [ ] `rg -n \"directionality\" mods/mod-swooper-maps/src packages/mapgen-core/src` returns no hits.

##### Slice 7 gates
- [ ] `pnpm -C packages/mapgen-core check`
- [ ] `pnpm -C packages/mapgen-core test`
- [ ] `pnpm -C mods/mod-swooper-maps check`
- [ ] `pnpm -C mods/mod-swooper-maps test`
- [ ] `pnpm -C mods/mod-swooper-maps build`

#### Slice 8 — Ruthless deletion sweep (no shims, no legacy, no compat)

Goal: delete everything legacy/compat/unused; leave no alternate paths behind.

##### Subissue 8.1 — Delete dead modules/exports/tests and remove duplicate providers

Checklist:
- [ ] Delete any remaining legacy Foundation helper modules (e.g. tile-first plate generators) and associated tests.
- [ ] Delete any deprecated/compat/legacy strategy ids, providers, or registry entries.
- [ ] Fix any “duplicate provider” failures by removing the extra provider at the source (never by weakening validation).

Acceptance criteria:
- [ ] `rg -n \"compat|deprecated|legacy\" mods/mod-swooper-maps/src packages/mapgen-core/src` returns no hits.
- [ ] Tag registry tests do not fail due to duplicate providers.

##### Subissue 8.2 — Guardrails (cheap CI rails)

Checklist:
- [ ] Add/extend a small test or script that fails if any of these reappear:
  - imports of domain config bags in Foundation op/step contracts,
  - `Type.Partial(FoundationConfigSchema)` usage,
  - `directionality` or `foundation.dynamics` surfaces.

##### Slice 8 final gates
- [ ] `pnpm -C packages/mapgen-core check`
- [ ] `pnpm -C packages/mapgen-core test`
- [ ] `pnpm -C mods/mod-swooper-maps check`
- [ ] `pnpm -C mods/mod-swooper-maps test`
- [ ] `pnpm -C mods/mod-swooper-maps build`
- [ ] `pnpm deploy:mods`

## Lookback (Phase 3 → Phase 4): Finalize slices + sequencing

Pre-implementation confirmation to run (and record) before writing code:
- Confirmed slice DAG:
  - Slice 1 is required before any consumer migration (Slice 3) because it establishes the canonical access paths.
  - Slice 2 is additive and can land before or after Slice 3; default is before Slice 3 to make mesh-first contracts available early without forcing migration.
  - Slice 5 cleans config/directionality; Slice 6 moves dynamics to Hydrology; Slice 7 rebuilds downstream; Slice 8 is the ruthless deletion sweep.
- Prework checks (done during planning; re-run if files moved):
  - Downstream `BOUNDARY_TYPE` imports currently come from `@mapgen/domain/foundation/constants.js` (treat this as the stable contract surface).
  - Legacy Foundation artifact reads are routed through `packages/mapgen-core/src/core/assertions.ts` (must be removed/migrated in Slice 3).
- Open decisions (should remain rare):
  - Where the stable “boundary semantics contract surface” should live long-term if `@mapgen/domain/foundation/constants.js` is ever deprecated.
- First slice is safe checklist:
  - [x] Slice 1 deletes (or makes private) any legacy entrypoints it replaces (no dual implementation surfaces).
  - [x] Slice 1 updates docs-as-code for touched contracts/schemas.
  - [x] Slice 1 has deterministic tests (or explicit test gaps recorded with triggers).
