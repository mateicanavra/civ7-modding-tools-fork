---
id: M5-U10
title: "[M5] Colocation + consolidation pass (reduce wiring-only indirection; co-locate types/artifacts with owners)"
state: planned
priority: 3
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Cleanup]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

After extraction, do a move-based cleanup pass that makes the repo navigable and reduces “fractal” scattering of types/artifacts/schemas.

## Goal

Make the end-state layout unsurprising. Co-locate step code with the types/artifacts/schemas it owns, and consolidate wiring-only indirections where they add noise without abstraction value.

## Deliverables

- Co-locate step code with its artifact/type definitions and schema (when owned by the same module).
- Consolidate small wiring-only modules (e.g., dedupe executor loops) where it materially improves readability/maintainability.
- Remove milestone-coded identifiers where they’ve become permanent.

## Acceptance Criteria

- Key steps/domains have schemas/types/artifacts colocated with their owning module.
- Wiring-only modules are reduced where they add indirection without abstraction value.
- No new public API churn is introduced solely by colocation; this is primarily internal layout cleanup.

## Testing / Verification

- Workspace typecheck/build remains green.
- Standard smoke test remains green under `MockAdapter`.

## Dependencies / Notes

- **Paper trail:** M5 spike workstream “hygiene refactors”; triage “dedupe executor loops” follow-up from CIV-41.
- **Sequencing:** after extraction (M5-U02–U06); can overlap with schema split (M5-U09).
- **Complexity × parallelism:** low–medium complexity, high parallelism.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Prefer co-locating “artifact definitions” with the step/domain that publishes them (unless they are intentionally cross-domain primitives).

## Prework Findings (Complete)

Goal: identify the highest-value post-extraction layout fixes (fractal scattering + wiring-only indirection) and propose an end-state layout that remains stable after the M5 boundary work.

### 1) “Fractal offender” inventory (high-signal clusters)

#### A) Standard wiring split across many tiny modules

Symptoms:
- Standard stage phases + dependency spine live in `packages/mapgen-core/src/pipeline/standard.ts`.
- Standard registration wiring lives in `packages/mapgen-core/src/pipeline/standard-library.ts`.
- Per-domain layer registration is split across `packages/mapgen-core/src/pipeline/*/index.ts` + `steps.ts` + `*Step.ts`.

Proposed colocation target:
- After extraction (`M5-U02–U06`), co-locate:
  - recipe definitions,
  - stage descriptors (phases/spine),
  - and registration wiring
  inside the standard mod package entrypoint (single “standard mod” root), rather than leaving them scattered across `pipeline/*`.

#### B) Tag ids + artifact shapes are split across unrelated folders

Symptoms:
- Standard tag ids and default tag catalog are defined in `packages/mapgen-core/src/pipeline/tags.ts`.
- Artifact *shapes* / type guards live elsewhere:
  - narrative motifs: `packages/mapgen-core/src/domain/narrative/artifacts.ts`
  - placement inputs/outputs: `packages/mapgen-core/src/pipeline/placement/*`
  - climate/heightfield artifacts are “published” via helpers in `packages/mapgen-core/src/pipeline/artifacts.ts`

Proposed colocation target:
- Standard mod owns the tag catalog; implement a **single** standard‑mod tag catalog module (imports artifact type guards and exports ids + satisfy checks together) so tag ownership is centralized and discoverable.

#### C) Standard config wiring is embedded in the core entrypoint

Symptoms:
- `packages/mapgen-core/src/orchestrator/task-graph.ts` contains a large `buildStandardStepConfig(stepId, config)` switch.

Proposed colocation target:
- Move step-id → config wiring alongside the default recipe definition (standard mod), so the recipe and its config mapping evolve together.

### 2) Wiring-only indirection targets worth consolidating

High-value candidates (low risk, high readability payoff):
- `packages/mapgen-core/src/pipeline/standard-library.ts` (pure wiring)
- `packages/mapgen-core/src/pipeline/*/index.ts` + `packages/mapgen-core/src/pipeline/*/steps.ts` (mostly wiring/re-exports)
- `packages/mapgen-core/src/pipeline/artifacts.ts` (standard-only “publication” glue; likely belongs with the standard mod’s artifact contracts)

Executor-loop dedupe (follow-up mentioned in prior triage):
- There are multiple “walk the steps and do X” loops in:
  - `packages/mapgen-core/src/orchestrator/task-graph.ts` (enabled step validation + config wiring)
  - `packages/mapgen-core/src/pipeline/PipelineExecutor.ts` (plan execution)
After extraction, evaluate whether the enabled-step validation/config wiring can be consolidated into a single standard-mod helper rather than living inside the core orchestrator entrypoint.

### 3) Proposed end-state layout (stable after extraction)

Target invariants:
- Core package contains generic pipeline engine primitives only (compile/execute/registry/tag infra).
- Standard mod package owns:
  - tags/recipes/stage descriptors
  - step registration wiring
  - step implementations + domain helpers
  - standard config schemas/types
- Civ runtime integration stays in the civ adapter package(s).

Concrete end-state layout:
- `packages/mapgen-core` (generic engine)
- `@swooper/mapgen-core/base` (base mod: recipes + tags + step clusters)
- `packages/civ7-adapter` (engine integration + any civ-runtime-only readbacks)

### 4) Scoping queries for the consolidation PR

- `rg -n \"standard-library|M3_STAGE_DEPENDENCY_SPINE|M3_STANDARD_STAGE_PHASE\" packages/`
- `rg -n \"M3_DEPENDENCY_TAGS|M4_EFFECT_TAGS\" packages/`
- `rg -n \"buildStandardStepConfig\\(\" packages/mapgen-core/src/orchestrator/task-graph.ts`

## Implementation Decisions

### Remove `@mapgen/foundation/*` shim entrypoints
- **Context:** We had multiple “foundation” concepts (foundation stage, foundation artifacts, and a `@mapgen/foundation/*` shim folder) which created navigability and ownership confusion post-extraction.
- **Options:** (A) Keep `@mapgen/foundation/*` re-export shims, (B) delete the shim and require imports to come from the owning base mod (`@mapgen/base/foundation/*`).
- **Choice:** (B) delete `packages/mapgen-core/src/foundation/*` and update imports to `@mapgen/base/foundation/*`.
- **Rationale:** Makes ownership explicit and removes an unnecessary indirection layer; reduces “three different things named foundation” in the codebase.
- **Risk:** Any internal imports still using `@mapgen/foundation/*` would break; mitigated by repo-wide import migration + tests.
