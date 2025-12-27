---
id: M5-U04
title: "[M5] Move standard steps + domain helpers: foundation & physics cluster"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture, Packaging]
parent: null
children: []
blocked_by: [M5-U03]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Move the foundation/physics step implementations (and their domain helpers) out of core into the standard mod package.

## Goal

Begin the real extraction of domain behavior. After this unit, core should still be runnable, but it should no longer structurally “own” the foundation/physics domain logic.

## Deliverables

- Move foundation/physics step implementations into the standard mod package.
- Move their supporting modules (domain helpers) with them, unless they are truly shared primitives.
- Tighten remaining core modules so anything kept is consciously generic.

## Acceptance Criteria

- The foundation/physics steps execute from the standard mod package (not from core).
- Shared primitives retained in core are minimal and do not encode domain ownership.
- Standard smoke test remains green (including `MockAdapter` runs).

## Testing / Verification

- Standard pipeline execution passes (MockAdapter).
- Workspace typecheck/build remains green after moves.

## Dependencies / Notes

- **Blocked by:** M5-U03 (registry/tags/recipes extraction).
- **Paper trail:** M5 spike; DEF-014 overlaps later at the foundation artifact inventory layer.
- **Complexity × parallelism:** high complexity, medium parallelism.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Bias toward moving helpers with the steps; err on the side of “mod-owned” unless a module is clearly cross-domain and reusable.
- Prefer a small number of stable “shared primitives” modules over many tiny indirections.

## Implementation Decisions

- Foundation step + producer + foundation algorithms are moved under `@mapgen/base/*` as base-mod-owned implementation.
- `@mapgen/pipeline/foundation/*`, `@mapgen/foundation/*`, and `@mapgen/orchestrator/foundation` remain as thin shims re-exporting the base implementations for transitional compatibility.

## Prework Findings (Complete)

Goal: map the foundation/physics cluster so the extraction is mostly “move files + fix imports”, with a small, explicit “shared primitives” remainder.

### 1) Dependency map (foundation/physics cluster)

High-level call chain (standard pipeline path today):
- `packages/mapgen-core/src/orchestrator/task-graph.ts`
  - supplies `runFoundation` runtime hook → `runFoundationWithDiagnostics(...)`
- `packages/mapgen-core/src/orchestrator/foundation.ts`
  - calls `runFoundationStage(ctx, config)`
- `packages/mapgen-core/src/pipeline/foundation/producer.ts`
  - computes foundation tensors (plates + dynamics)
  - builds the immutable `FoundationContext` snapshot via `createFoundationContext(...)`
  - publishes it to the artifact store: `context.artifacts.foundation = foundationContext` (i.e. `artifact:foundation`)

Primary implementation modules in the cluster:
- Stage wrapper / producer:
  - `packages/mapgen-core/src/pipeline/foundation/FoundationStep.ts`
  - `packages/mapgen-core/src/pipeline/foundation/producer.ts`
  - `packages/mapgen-core/src/orchestrator/foundation.ts`
- Foundation algorithms + types:
  - `packages/mapgen-core/src/foundation/plate-seed.ts`
  - `packages/mapgen-core/src/foundation/plates.ts`
  - `packages/mapgen-core/src/foundation/types.ts`
  - `packages/mapgen-core/src/foundation/constants.ts`
- Shared helpers currently used by foundation/physics:
  - `packages/mapgen-core/src/core/types.ts` (context + `createFoundationContext` + `validateFoundationContext`)
  - `packages/mapgen-core/src/lib/grid/**` + `packages/mapgen-core/src/lib/math/**`

### 2) “Moves with mod” vs “stays core” (ownership sketch)

Moves with the standard mod (domain-owned):
- `packages/mapgen-core/src/pipeline/foundation/**` (step wrappers + producer)
- `packages/mapgen-core/src/orchestrator/foundation.ts` (diagnostics wrapper around running foundation)
- `packages/mapgen-core/src/foundation/**` (plate generation + directionality + seed snapshots)

Likely stays in core as shared primitives (used across domains, not foundation-specific):
- `packages/mapgen-core/src/lib/**` utilities that are reused broadly (`grid`, `math`, etc.)
- `packages/mapgen-core/src/core/types.ts` *infrastructure* pieces (context creation, artifact store, writers)

Cross-issue overlap to watch:
- `FoundationContext` / `artifact:foundation` is explicitly targeted for splitting in DEF‑014 (`M5-U11`).
  - Short-term extraction can keep `FoundationContext` in a shared place, but avoid baking “monolithic foundation blob” deeper into new package boundaries.

### 3) Import edges that will need reshaping during extraction

Standard-owned imports inside “step wrappers”:
- `packages/mapgen-core/src/pipeline/foundation/FoundationStep.ts` depends on:
  - `FoundationConfigSchema` (`@mapgen/config/index.js`) and
  - `M3_STANDARD_STAGE_PHASE` (`@mapgen/pipeline/index.js` → `pipeline/standard.ts`)
  Both are standard-owned concepts post-boundary and should move alongside the standard mod.

Producer-to-core coupling:
- `packages/mapgen-core/src/pipeline/foundation/producer.ts` depends on:
  - context helpers (`createFoundationContext`, `ctxRandom`, `validateFoundationContext`) in `packages/mapgen-core/src/core/types.ts`
  - `FoundationConfig` types from `@mapgen/bootstrap/types.js`
  - dev logging (`@mapgen/dev/index.js`)

Boundary decision (locked for M5):
- `FoundationContext` and the foundation artifact contracts are **standard‑mod owned**.
- Core keeps only **generic** infrastructure (context creation helpers + the artifact store mechanism), not domain-level foundation types.
  - `M5-U11` further reshapes the foundation artifact surface by splitting `artifact:foundation` into discrete `artifact:foundation.*` products (still standard‑mod owned).

### 4) Suggested “mechanical move” guardrails (search targets)

Useful scoping queries for the extraction PR:
- `rg -n \"@mapgen/pipeline/foundation|runFoundationStage|createFoundationContext\" packages/`
- `rg -n \"@mapgen/foundation/\" packages/`
