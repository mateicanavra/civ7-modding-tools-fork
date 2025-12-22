---
id: LOCAL-TBD-M4-TAG-REGISTRY-CUTOVER
title: "[M4] Tag registry cutover: registry-instantiated catalog + validation (effect:* schedulable)"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TESTS-VALIDATION-CLEANUP
assignees: []
labels: [Architecture, Validation]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Make the registry-instantiated tag catalog canonical for validation and verification, and make `effect:*` a first-class schedulable namespace (with demo payload validation when present).

## Why This Exists

M3 still relies on regex/allowlist tag validation and hard-coded verification lists in the executor. The accepted target model is registry-instantiated tags (fields/artifacts/effects) with registry-driven validation and verification, including schedulable `effect:*` tags.

## Recommended Target Scope

### In scope

- Replace regex/allowlist tag validation with registry-instantiated catalog validation (fail-fast on unknown tags).
- Replace executor hard-coded verification lists with registry-driven verification rules.
- Ensure `effect:*` is first-class and schedulable in the registry catalog.
- Validate demo payloads when present (fail-fast on invalid demo shape).

### Out of scope

- Expanding tag semantics beyond the accepted SPEC/SPIKE.
- Algorithm changes inside steps.
- New registry systems unrelated to tag validation/verification.

## Acceptance Criteria

- Regex/allowlist tag validation and executor hard-coded verification lists are replaced by registry-driven validation/verification.
- `effect:*` is a first-class, schedulable namespace.
- Demo payload validation lives here (fail-fast on invalid demo payload shape when present).

## Primary Touchpoints (Expected)

- Tag validation and executor verification:
  - `packages/mapgen-core/src/pipeline/tags.ts`
  - `packages/mapgen-core/src/pipeline/PipelineExecutor.ts`
  - `packages/mapgen-core/src/pipeline/artifacts.ts`
- Registry catalog sources:
  - `packages/mapgen-core/src/pipeline/StepRegistry.ts`
  - registry entries under `packages/mapgen-core/src/pipeline/**`
- Deferrals and policy:
  - `docs/projects/engine-refactor-v1/deferrals.md`
  - `docs/system/libs/mapgen/architecture.md`

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Add/extend a test that fails fast on invalid tags or demo payloads.

## Dependencies / Notes

- Phase B work; blocks effects verification and narrative producers that rely on the canonical tag catalog.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Plan (Concrete)

### 1) Inventory current tag validation and verification

- List current regex/allowlist validation rules.
- Identify hard-coded verification lists in the executor.

### 2) Define the registry-instantiated catalog

- Establish the canonical catalog for fields/artifacts/effects from registry entries.
- Ensure catalog enforces collisions and unknown tags as errors.

### 3) Wire registry-driven validation and verification

- Replace regex/allowlist validation with catalog-driven checks.
- Replace hard-coded verification with registry-driven verification rules.

### 4) Support demo payload validation

- Validate demo payload shapes when present; ensure failures are explicit.

## Prework Prompt (Agent Brief)

Goal: define the registry-driven tag catalog and validation/verification rules so implementation is mechanical.

Deliverables:
- An inventory of current tag validation rules (regex/allowlists) and executor verification lists.
- A proposed registry-instantiated tag catalog table (tag ID, namespace, owner, demo payload shape if any).
- A replacement plan for validation/verification (what moves from hard-coded lists to registry-driven rules).
- A list of demo payload shapes and where they should be validated.

Where to look:
- Tag validation: `packages/mapgen-core/src/pipeline/tags.ts`.
- Executor verification: `packages/mapgen-core/src/pipeline/PipelineExecutor.ts`.
- Registry entries and artifacts: `packages/mapgen-core/src/pipeline/**` (search for `register` or tag definitions).
- SPEC/SPIKE: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (Tag registry),
  `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.5).
- Milestone notes: `docs/projects/engine-refactor-v1/milestones/M4-tests-validation-cleanup.md`.

Constraints/notes:
- Keep behavior stable; this is validation/verification wiring, not algorithm change.
- `effect:*` must be schedulable and verifiable via the registry catalog.
- Do not implement code; return the inventory and catalog plan as markdown tables/lists.
