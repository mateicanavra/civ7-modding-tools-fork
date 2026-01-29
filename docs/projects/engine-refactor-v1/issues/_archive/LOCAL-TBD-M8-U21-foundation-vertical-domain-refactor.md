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
## TL;DR
- Implement the Phase 2 Foundation model through contract-first ops + orchestration-only steps.
- Add mesh-first artifacts as additive provides while keeping plates/dynamics projections for current consumers.
- Remove legacy coupling (`ctx.artifacts.get` and deep imports) and delete compat surfaces.

## Phase artifact links
- Plan: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/FOUNDATION.md`
- Phase 1 (current-state): `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-current-state.md`
- Phase 2 (model-first): `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-modeling.md`

## Scope and constraints
- This issue implements the Phase 2 model; it does not redefine it.
- All model changes must be recorded in the Phase 2 spike before implementation.
- Phase 3 owns slice sequencing and verification gates.

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
  - `bun run --cwd mods/mod-swooper-maps check`
  - `bun run --cwd mods/mod-swooper-maps test`
  - `bun run --cwd mods/mod-swooper-maps build`
  - `bun run deploy:mods`
- [ ] No legacy artifact access paths remain:
  - `rg -n "ctx\.artifacts\.get\(.*foundation\." mods/mod-swooper-maps/src packages/mapgen-core` returns no hits (allowlist test harnesses only, if explicitly documented).
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
  - `bun run --cwd mods/mod-swooper-maps test -- --testPathPattern foundation` (or the repo’s equivalent Foundation test selector)
  - `rg -n "ctx\.artifacts\.get\(.*foundation\." mods/mod-swooper-maps/src packages/mapgen-core`
- Full gates (end of each slice, minimum once at the end):
  - `bun run check`
  - `bun run test`
  - `bun run build`
  - `bun run deploy:mods`

## Slicing strategy (additive → migration → deletion)

- Additive-first: publish mesh-first artifacts while keeping plates/dynamics stable.
- Migration: move consumers off legacy access paths (deep imports, `ctx.artifacts.get`).
- Deletion: remove legacy entrypoints and compat helpers once contracts are coherent.

## Contract deltas by slice (summary)

- Slice 1: no `requires/provides` changes; contract-first spine + schema tightening.
- Slice 2: add mesh-first artifacts as additional provides.
- Slice 3: no `requires/provides` changes; migrate off legacy access paths.
- Slice 4: directionality cutover + delete legacy entrypoints/compat surfaces.

## Slice plan (executable checklists per slice)

This slice plan is derived from the Phase 2 lookback inputs. Each slice must be independently shippable and leave the pipeline coherent.

### Slice 1 — Establish the contract-first spine (behavior-preserving)

Goal: route existing outputs (`foundation.plates`, `foundation.dynamics`, trace artifacts) through canonical ops + stage contract posture without changing behavior.

Checklist:
- [ ] Declare op contracts:
  - `foundation/compute-plates-tensors`
  - `foundation/compute-dynamics-tensors`
- [ ] Implement ops by delegating to existing algorithms (legacy code becomes a private implementation detail).
- [ ] Convert Foundation stage orchestration to call injected ops (no direct imports of Foundation implementation modules in the step runtime).
- [ ] Tighten stage-owned artifact schemas (remove `Type.Any()` for typed-array payloads where possible).
- [ ] Lock boundary semantics export surface (stable contract import for `BOUNDARY_TYPE`).

### Slice 2 — Add mesh-first artifacts as additive provides (model-first scaffolding)

Goal: publish mesh/graph-first artifacts as additional provides without changing downstream requirements.

Checklist:
- [ ] Add stage-owned artifact contracts:
  - `foundation.mesh`, `foundation.crust`, `foundation.plateGraph`, `foundation.tectonics`.
- [ ] Declare op contracts + implementations:
  - `foundation/compute-mesh`
  - `foundation/compute-crust`
  - `foundation/compute-plate-graph`
  - `foundation/compute-tectonics`
- [ ] Publish additive artifacts from the Foundation step while keeping `foundation.plates/dynamics` stable as projections.
- [ ] Add op-unit tests for each new op (determinism + invariants).

### Slice 3 — Remove cross-pipeline coupling (consumer migration)

Goal: eliminate `ctx.artifacts.get(artifact:foundation.*)` and other non-canonical reads without changing step contracts.

Checklist:
- [ ] Remove/replace `packages/mapgen-core/src/core/assertions.ts` access patterns that fetch Foundation artifacts via `ctx.artifacts.get(...)`.
- [ ] Update downstream domain logic call paths so plates/dynamics are passed explicitly or read through `deps` at step boundaries.
- [ ] Add guardrails (lint and/or script checks) to prevent regressions (optional if equivalent rails already exist).

### Slice 4 — Directionality cutover + deletion sweep

Goal: enforce env ownership for directionality and delete the legacy monolith/compat surfaces.

Checklist:
- [ ] Ensure `env.directionality` is the only authoritative source (entry boundary constructs env; Foundation config does not own directionality).
- [ ] Delete the monolithic Foundation producer surfaces and any stale compat helpers that bypass the ops/stage contract boundary.
- [ ] Re-run full pipeline gates and reconcile docs-as-code on any touched schema/exports.

## Test strategy notes

- Op-unit tests (deterministic, fast): each `foundation/compute-*` op should have targeted tests that lock invariants.
- Thin integration tests (pipeline sanity): keep at least one end-to-end “standard recipe runs” test that asserts:
  - Foundation publishes required artifacts,
  - downstream stages still consume plates/dynamics coherently,
  - no `ctx.artifacts.get(artifact:foundation.*)` reads exist outside explicitly allowed legacy test harnesses.

If determinism is not achievable for a given op, record the gap and require a follow-up slice to make it deterministic.

## Cleanup ownership

- If compat projections remain, add a cleanup item in `docs/projects/engine-refactor-v1/triage.md`.
- If the immediate downstream domain can remove them safely and no other downstream consumers are affected, that downstream owns the cleanup and must have a dedicated issue; link it from triage.

---

## Lookback (Phase 3 → Phase 4): Finalize slices + sequencing

Pre-implementation confirmation to run (and record) before writing code:
- Confirmed slice DAG:
  - Slice 1 is required before any consumer migration (Slice 3) because it establishes the canonical access paths.
  - Slice 2 is additive and can land before or after Slice 3; default is before Slice 3 to make mesh-first contracts available early without forcing migration.
  - Slice 4 is last because it deletes legacy surfaces and tightens directionality semantics.
- Prework checks (done during planning; re-run if files moved):
  - Downstream `BOUNDARY_TYPE` imports currently come from `@mapgen/domain/foundation/constants.js` (treat this as the stable contract surface).
  - Legacy Foundation artifact reads are routed through `packages/mapgen-core/src/core/assertions.ts` (must be removed/migrated in Slice 3).
- Open decisions (should remain rare):
  - Where the stable “boundary semantics contract surface” should live long-term if `@mapgen/domain/foundation/constants.js` is ever deprecated.
  - Whether directionality should remain configurable at the entry boundary or become fully derived from Foundation modeling (default: entry boundary provides it; env-owned).
- First slice is safe checklist:
  - [ ] Slice 1 deletes (or makes private) any legacy entrypoints it replaces (no dual implementation surfaces).
  - [ ] Slice 1 updates docs-as-code for touched contracts/schemas.
  - [ ] Slice 1 has deterministic tests (or explicit test gaps recorded with triggers).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation log (Phase 4; local only)

Complexity × parallelism: high complexity × low parallelism (Foundation is upstream of everything).

### Baseline checks (Phase 0)
- `bun run --cwd packages/mapgen-core check`: pass
- `bun run --cwd packages/mapgen-core test`: fail
  - `packages/mapgen-core/test/pipeline/tag-registry.test.ts` fails with duplicate provider error for `artifact:test.foo` (provider step duplicates)
- `bun run --cwd mods/mod-swooper-maps check`: fail
  - Type errors in `mods/mod-swooper-maps/src/recipes/standard/stages/**` where `deps.artifacts.*` types resolve as `{}` (multiple stages)
- `bun run --cwd mods/mod-swooper-maps test`: fail
  - Duplicate provider error for `artifact:foundation.plates` in standard recipe
  - `ReferenceError: Cannot access 'standardRecipe' before initialization` in standard recipe tests
- `bun run --cwd mods/mod-swooper-maps build`: pass
- `bun run deploy:mods`: pass

Post Slice 1 re-run (after contract-first spine cutover + toolchain fixes):
- `bun run --cwd packages/mapgen-core check`: pass
- `bun run --cwd packages/mapgen-core test`: pass
- `bun run --cwd mods/mod-swooper-maps check`: pass
- `bun run --cwd mods/mod-swooper-maps test`: pass

Post Slice 2 re-run (after additive mesh-first artifacts + ops scaffolding):
- `bun run --cwd packages/mapgen-core check`: pass
- `bun run --cwd packages/mapgen-core test`: pass
- `bun run --cwd mods/mod-swooper-maps check`: pass
- `bun run --cwd mods/mod-swooper-maps test`: pass
- `bun run --cwd mods/mod-swooper-maps build`: pass
- `bun run deploy:mods`: pass

Post Slice 3 re-run (after removing ctx.artifacts.get coupling for Foundation consumers):
- `bun run --cwd packages/mapgen-core check`: pass
- `bun run --cwd packages/mapgen-core test`: pass
- `bun run --cwd mods/mod-swooper-maps check`: pass
- `bun run --cwd mods/mod-swooper-maps test`: pass

Post Slice 4 re-run (after directionality cutover to env-only + deletion sweep):
- `bun run --cwd packages/mapgen-core check`: pass
- `bun run --cwd packages/mapgen-core test`: pass
- `bun run --cwd mods/mod-swooper-maps check`: pass
- `bun run --cwd mods/mod-swooper-maps test`: pass
- `bun run --cwd mods/mod-swooper-maps build`: pass
- `bun run deploy:mods`: pass
Post Slice 5 re-run (after config purity + FoundationContext removal):
- `bun run --cwd packages/mapgen-core check`: pass
- `bun run --cwd packages/mapgen-core test`: pass
- `bun run --cwd mods/mod-swooper-maps check`: pass
- `bun run --cwd mods/mod-swooper-maps test`: pass

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

#### Slice 6: remove config snapshots from foundation seed artifacts
- **Context:** Plate seed artifacts were embedding projection/config metadata; directive is to avoid config snapshots in artifacts.
- **Options:** (a) keep config metadata inside `foundation.seed` for diagnostics, (b) remove config data entirely and keep only seed locations.
- **Choice:** remove config payload from `foundation.seed`.
- **Rationale:** enforces the “no config snapshot artifacts” rule and keeps artifacts strictly model outputs.
- **Risk:** any downstream tooling that expected config metadata in the seed artifact loses that introspection.

#### Slice 6: mesh area validation tolerance in tests
- **Context:** Delaunay/Voronoi area sums should approximate `width * height` but floating-point and clipping can introduce minor drift.
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
- Risk: adjacency/wrap semantics are not yet authoritative in scaffolding; mesh-first wrap must be canonical before projections migrate.

### Slice plan (draft; executable checklists per slice)

This slice plan is derived from the Phase 2 modeling spike Lookback (Phase 2 → Phase 3). Each slice must be independently shippable and leave the pipeline coherent.

### Algorithmic reference (Delaunay/Voronoi; do not treat as architecture)

These are trusted for algorithmic direction only. Canonical architecture remains `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`.

- PRD north-star (algorithm): `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`
- Audit (alignment gap): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/SPIKE-FOUNDATION-PRD-AUDIT.md`
- Feasibility spike: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/foundation/SPIKE-FOUNDATION-DELAUNAY-FEASIBILITY.md`
- Canonical mesh spec: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/foundation/SPEC-FOUNDATION-DELAUNAY-VORONOI.md`

Locked decisions for implementation (algorithmic):
- Use `d3-delaunay` as the canonical Delaunay/Voronoi backend (no adapter, no fallback).
- Mesh operates in planar map-space (`0..width`, `0..height`) and must implement wrapX periodic adjacency when `env.wrapX` is true (wrapY unsupported).
- Neighbor/adjacency comes from the backend’s neighbor iterator (no “halfedge inference” against empty mock data).
- Plate counts are authored as base values and scaled to runtime map size during op normalization (no per-map manual retuning).
- Mesh `cellCount` is derived during normalization from scaled `plateCount` and an authored `cellsPerPlate` factor; users do not author `cellCount` directly.

Spec alignment pass (mesh backend):
- Spec: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/foundation/SPEC-FOUNDATION-DELAUNAY-VORONOI.md` (created from the same spikes; locks “wrapX required” and “no adapter/fallback”).
- Alignment: the Slice 6 plan already matches the spec’s key hard locks; the remaining deltas are now explicitly checklist items in Subissue 6.3/6.4:
  - remove all implicit heuristics inside mesh ops (`plateCount → cellCount`, `cellDensity`, etc.); config must be explicit (`cellCount`, `relaxationSteps`)
  - include wrapX semantics in the mesh contract and enforce wrap-correct adjacency
  - remove halfedge-based neighbor inference and derive adjacency only from the backend iterator
  - add validation criteria beyond symmetry (total area ~ `width * height`, determinism, wrapX seam adjacency)

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
- [ ] Add step contract + runtime for each step (kebab-case step ids; no shared monolithic contract).
- [ ] Update `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/index.ts` to register the new steps in order.
- [ ] Delete the old `foundation` monolith step and remove it from the stage index.

Acceptance criteria:
- [ ] There is no “single foundation step” in the recipe; the stage is explicitly multi-step with step-level contracts.
- [ ] Each step runtime is orchestration-only and calls injected ops; no step imports op implementations directly.

##### Subissue 6.2 — Delete config snapshots entirely (hard lock)

Checklist:
- [ ] Delete any `foundation.config` artifact (definition + publish + validation).
- [ ] Remove any config snapshot types/validators in `packages/mapgen-core/src/core/types.ts` and `packages/mapgen-core/src/core/assertions.ts`.

Acceptance criteria:
- [ ] No config payload is published as an artifact anywhere in Foundation.
- [ ] `rg -n \"foundation\\.config\" mods/mod-swooper-maps/src packages/mapgen-core/src` returns no hits.

##### Subissue 6.3 — Make mesh generation PRD-aligned: use `d3-delaunay` (canonical-only backend)

Checklist:
- [ ] Add `d3-delaunay` as a dependency in the canonical location (expected: `packages/mapgen-core`), and ensure it is bundled for builds.
- [ ] Implement a deterministic, engine-independent Voronoi backend in mapgen-core per `SPEC-FOUNDATION-DELAUNAY-VORONOI`.
- [ ] Update `foundation/compute-mesh` op to use the canonical backend and delete its dependency on adapter Voronoi utilities.
- [ ] Encode wrapX semantics in the mesh contract and implement periodic adjacency when `env.wrapX` is true (wrapY unsupported).
- [ ] Delete any implicit heuristics inside the mesh op (`plateCount → cellCount`, `cellDensity`, etc.); require explicit `cellCount` + `relaxationSteps` only.
- [ ] Update the test harness so mock adapter does not need to emulate Voronoi halfedges (mesh tests must run offline deterministically).

Acceptance criteria:
- [ ] No Foundation op or step requires `adapter.getVoronoiUtils`.
- [ ] Mesh neighbor symmetry invariants are validated under tests.
- [ ] Mesh total area approximates `width * height` within tolerance under tests.
- [ ] Mesh is deterministic for fixed seed + config under tests.
- [ ] There is no “adapter Voronoi” fallback path (single canonical backend).

##### Subissue 6.4 — Make `foundation.plates` projections derived from canonical artifacts

Checklist:
- [ ] Ensure `foundation/compute-plates-tensors` consumes only mesh-first artifacts (`mesh/crust/plateGraph/tectonics`) and produces tile-indexed tensors strictly by projection (no adapter Voronoi inputs).
- [ ] Remove any “parallel tile-first plate generation” path; no second algorithm should compute plates from unrelated inputs.

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
- [ ] `bun run --cwd mods/mod-swooper-maps check` passes (type-level surface is coherent).

##### Slice 6 gates (must pass before Slice 7)
- [ ] `bun run --cwd packages/mapgen-core check`
- [ ] `bun run --cwd packages/mapgen-core test`
- [ ] `bun run --cwd mods/mod-swooper-maps check`
- [ ] `bun run --cwd mods/mod-swooper-maps test`
- [ ] `bun run --cwd mods/mod-swooper-maps build`

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
- [ ] `bun run --cwd packages/mapgen-core check`
- [ ] `bun run --cwd packages/mapgen-core test`
- [ ] `bun run --cwd mods/mod-swooper-maps check`
- [ ] `bun run --cwd mods/mod-swooper-maps test`
- [ ] `bun run --cwd mods/mod-swooper-maps build`

#### Slice 8 — Ruthless deletion sweep (no shims, no legacy, no compat)

Goal: delete everything legacy/compat/unused; leave no alternate paths behind.

##### Subissue 8.1 — Delete dead modules/exports/tests and remove duplicate providers

Checklist:
- [x] Delete any remaining legacy Foundation helper modules (e.g. tile-first plate generators) and associated tests.
- [x] Delete any deprecated/compat/legacy strategy ids, providers, or registry entries.
- [x] Fix any “duplicate provider” failures by removing the extra provider at the source (never by weakening validation).

Acceptance criteria:
- [x] `rg -n \"@mapgen/domain/foundation/(plates|plate-seed|types)\" mods/mod-swooper-maps/src mods/mod-swooper-maps/test` returns no hits.
- [x] Tag registry tests do not fail due to duplicate providers.

##### Subissue 8.2 — Guardrails (cheap CI rails)

Checklist:
- [x] Add/extend a small test or script that fails if any of these reappear:
  - imports of domain config bags in Foundation op/step contracts,
  - `Type.Partial(FoundationConfigSchema)` usage,
  - `directionality` or `foundation.dynamics` surfaces.

##### Slice 8 final gates
- [x] `bun run --cwd packages/mapgen-core check`
- [x] `bun run --cwd packages/mapgen-core test`
- [x] `bun run --cwd mods/mod-swooper-maps check`
- [x] `bun run --cwd mods/mod-swooper-maps test`
- [x] `bun run --cwd mods/mod-swooper-maps build`
- [ ] `bun run deploy:mods` (currently fails due to `civ-mod-dacia` deploy `ENOTEMPTY`; `bun run --cwd mods/mod-swooper-maps deploy` passes)

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
