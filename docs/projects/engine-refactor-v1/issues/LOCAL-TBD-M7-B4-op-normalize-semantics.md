---
id: LOCAL-TBD-M7-B4
title: "[M7] Op normalization hook semantics: resolveConfig -> normalize"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [architecture]
parent: LOCAL-TBD-M7-B
children: []
blocked_by: []
blocked:
  - LOCAL-TBD-M7-C1
  - LOCAL-TBD-M7-E1
  - LOCAL-TBD-M7-F1
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

The compiler architecture renames and narrows "config normalization hooks":
- **Old/baseline:** `resolveConfig(config, settings)` exists on steps and ops and can influence engine planning.
- **Target:** `normalize(envelope, ctx)` exists only as a **compile-time** hook and is dispatched by `envelope.strategy`. Runtime surfaces are stripped and never normalize/default/clean.

## Deliverables

- Rename op.resolveConfig to op.normalize.
- Implement normalize dispatch by envelope.strategy (strategy-specific normalize hook).

## Acceptance Criteria

- [x] `resolveConfig` is renamed to `normalize` on op and step authoring surfaces.
- [x] `createOp(...)` implements `op.normalize` dispatch by `envelope.strategy` (strategy-specific normalize hook).
- [x] No runtime code path calls `normalize` (enforced by imports + tests).

## Scope Boundaries

**In scope:**
- Renaming and semantic tightening for op/step normalization surfaces.
- Updating existing strategy/step implementations to match the new naming/contract.

**Out of scope:**
- Removing engine planner's step normalization calls (D2 owns validate-only flip).

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`
- `rg -n "\\bresolveConfig\\b" packages/mapgen-core/src mods/mod-swooper-maps/src` (expect zero hits by the end of this unit)

## Dependencies / Notes

- **Blocks:** [LOCAL-TBD-M7-C1](./LOCAL-TBD-M7-C1-recipe-boundary-compilation.md), [LOCAL-TBD-M7-E1](./LOCAL-TBD-M7-E1-ecology-domain-entrypoint.md), [LOCAL-TBD-M7-F1](./LOCAL-TBD-M7-F1-verify-no-shims.md)
- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `docs/projects/engine-refactor-v1/resources/spec/recipe-compile`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

## Implementation Decisions

### Normalize context uses RunSettings as env in planner
- **Context:** Engine plan compilation still invokes step normalization, but there is no knobs/env boundary available yet.
- **Options:** Remove planner normalization now; bridge using `{ env: settings, knobs: {} }`.
- **Choice:** Bridge using `{ env: settings, knobs: {} }`.
- **Rationale:** Preserves current behavior while aligning with the new normalize signature until D2 removes planner normalization.
- **Risk:** Env naming mismatch persists temporarily; mitigated by the D2 cutover.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Implementation Guidance

| File | Notes |
|---|---|
| `/packages/mapgen-core/src/authoring/op/types.ts` | Rename DomainOp.resolveConfig -> normalize; ensure compile-time-only intent stays true. |
| `/packages/mapgen-core/src/authoring/op/create.ts` | Rename dispatcher to normalize; preserve 'return cfg unchanged if selected strategy has no normalize'. |
| `/packages/mapgen-core/src/authoring/types.ts` | Rename Step.resolveConfig -> normalize (compile-time only); propagate through authoring surfaces. |
| `/mods/mod-swooper-maps/src/recipes/standard/stages/**/steps/**/index.ts` | Remove step-level resolveConfig blocks; replace with compiler-time normalization in later units (E2/C2). |
| `/mods/mod-swooper-maps/src/domain/**/ops/**/strategies/*.ts` | Rename strategy-local resolveConfig helpers to normalize where they are part of the op's compile-time surface. |

### Paper Trail

- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/00-fundamentals.md` (I2, I3)
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/01-config-model.md` (§1.7 hook semantics)
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/05-file-reconciliation.md` ("Rename: resolveConfig -> normalize")

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
