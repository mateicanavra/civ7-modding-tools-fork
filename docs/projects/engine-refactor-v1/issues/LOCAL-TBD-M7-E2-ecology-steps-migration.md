---
id: LOCAL-TBD-M7-E2
title: "[M7] Ecology steps migration (compiler-first, no runtime resolveConfig)"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [architecture]
parent: LOCAL-TBD-M7-E
children: []
blocked_by:
  - LOCAL-TBD-M7-E1
  - LOCAL-TBD-M7-C2
blocked:
  - LOCAL-TBD-M7-E3
  - LOCAL-TBD-M7-F1
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Baseline ecology steps still use step-level `resolveConfig(...)` that delegates into op `resolveConfig(...)`. This unit removes those runtime dependencies and makes compilation the only place where configs are defaulted/cleaned/normalized.

## Deliverables

- Steps declare ops contracts and bind runtime ops by id.
- `step.normalize` (compile-time) replaces resolveConfig patterns where needed.
- Runtime step.run uses `runtimeOpsById` surface, not `ecology.ops` direct impls.

## Acceptance Criteria

- [ ] Ecology steps do not export or use step-level `resolveConfig` (no runtime normalization).
- [ ] Step configs are normalized at compile time via step.normalize and/or op.normalize (per the compiler pipeline).
- [ ] Runtime step code calls ops via `runtimeOpsById` (by id), not `ecology.ops.*` implementation objects.

## Scope Boundaries

**In scope:**
- Migrating all ecology stage steps (and the known placement derive step) off runtime `resolveConfig` to compile-time normalization.
- Wiring runtime step execution to call ops via `runtimeOpsById` by id (no direct `ecology.ops.*` usage).

**Out of scope:**
- Ecology domain entrypoint refactor (that is E1).
- Ecology stage public view + compile mapping (that is E3).

## Prework Findings (Complete)

### 1) Current standard recipe steps using step-level resolveConfig (must be migrated)
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biome-edge-refine/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-plan/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-apply/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-effects/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/pedology/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/resource-basins/index.ts`

### 2) Non-ecology standard recipe step using step-level resolveConfig (must be migrated)
- `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derive-placement-inputs/index.ts`

## Testing / Verification

- `pnpm -C mods/mod-swooper-maps test`
- `rg -n "resolveConfig:" mods/mod-swooper-maps/src/recipes/standard` (expect zero hits after migration)

## Dependencies / Notes

- **Blocked by:** [LOCAL-TBD-M7-E1](./LOCAL-TBD-M7-E1-ecology-domain-entrypoint.md), [LOCAL-TBD-M7-C2](./LOCAL-TBD-M7-C2-stage-step-config-shape.md)
- **Blocks:** [LOCAL-TBD-M7-E3](./LOCAL-TBD-M7-E3-ecology-stage-public-compile.md), [LOCAL-TBD-M7-F1](./LOCAL-TBD-M7-F1-verify-no-shims.md)
- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `spec_package`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Implementation Guidance

| File | Notes |
|---|---|
| `/mods/mod-swooper-maps/src/recipes/standard/stages/ecology/**` | Remove step-level resolveConfig blocks; bind runtime ops by id; keep adapter-dependent helpers step-scoped. |
| `/mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derive-placement-inputs/**` | Placement derive step currently uses resolveConfig; migrate to compiler-first normalization too. |

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Prework Findings (Complete)](#prework-findings-complete)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
