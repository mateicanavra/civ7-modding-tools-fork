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
- `env.directionality` is authoritative; authored config only influences env construction at the entry boundary.
- `foundation.seed/config/diagnostics` are trace-only; never required by downstream steps and never used as modeling inputs.
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

### Implementation Decisions

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

#### Slice 1 — Establish the contract-first spine (behavior-preserving)

Goal: route *existing* published outputs (`foundation.plates`, `foundation.dynamics`, trace artifacts) through the canonical ops + stage contract posture, without changing behavior.

Checklist:
- [ ] Declare op contracts:
  - `foundation/compute-plates-tensors`
  - `foundation/compute-dynamics-tensors`
- [ ] Implement ops by delegating to existing algorithms (legacy code becomes a private implementation detail, not a public entrypoint).
- [ ] Convert Foundation stage orchestration to call injected ops (no direct imports of Foundation implementation modules in the step runtime).
- [ ] Tighten stage-owned artifact schemas:
  - Replace `Type.Any()` posture with explicit typed-array schemas where feasible.
- [ ] Lock boundary semantics export surface (stable contract import for `BOUNDARY_TYPE`):
  - Prevent new deep imports; keep consumer-facing meaning stable.

#### Slice 2 — Add mesh-first artifacts as additive provides (model-first scaffolding)

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
- [ ] Add op-unit tests for each new op (determinism + invariants), even if initial implementations are thin wrappers.

#### Slice 3 — Remove cross-pipeline coupling (consumer migration)

Goal: eliminate `ctx.artifacts.get(artifact:foundation.*)` and other non-canonical reads without changing step contracts.

Checklist:
- [ ] Remove/replace `packages/mapgen-core/src/core/assertions.ts` access patterns that fetch Foundation artifacts via `ctx.artifacts.get(...)`.
- [ ] Update downstream domain logic call paths so plates/dynamics are passed explicitly or read through `deps` at step boundaries.
- [ ] Add guardrails (lint and/or script checks) to prevent regressions (optional if equivalent rails already exist).

#### Slice 4 — Directionality cutover + deletion sweep

Goal: enforce env ownership for directionality and delete the legacy monolith/compat surfaces.

Checklist:
- [ ] Ensure `env.directionality` is the only authoritative source (entry boundary constructs env; Foundation config does not “own” directionality as a hidden knob).
- [ ] Delete the monolithic Foundation producer surfaces and any stale compat helpers that bypass the ops/stage contract boundary.
- [ ] Re-run full pipeline gates and reconcile docs-as-code on any touched schema/exports.

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
