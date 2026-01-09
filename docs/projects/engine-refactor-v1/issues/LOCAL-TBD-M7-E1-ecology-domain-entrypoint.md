---
id: LOCAL-TBD-M7-E1
title: "[M7] Ecology domain entrypoint refactor (contracts + registries)"
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
  - LOCAL-TBD-M7-B3
  - LOCAL-TBD-M7-B4
blocked:
  - LOCAL-TBD-M7-E2
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Ecology is the exemplar domain for the new ownership model. This unit reshapes the ecology domain entrypoint into:
- a contract-only surface (`@mapgen/domain/ecology/contracts`), and
- a canonical entrypoint that exports registries (`compileOpsById`, `runtimeOpsById`) and other safe domain types/constants.

## Deliverables

- Export contracts from `@mapgen/domain/ecology/contracts` (contract-only).
- Export `compileOpsById` and `runtimeOpsById` from `@mapgen/domain/ecology`.
- Avoid deep imports from steps/recipes/tests.

## Acceptance Criteria

- [ ] `@mapgen/domain/ecology/contracts` exports contracts only (no engine binding, no strategy implementations).
- [ ] `@mapgen/domain/ecology` exports `compileOpsById` and `runtimeOpsById` keyed by `op.id`.
- [ ] Recipes/steps/tests do not deep-import from `@mapgen/domain/ecology/ops/**` (enforced by lint and/or `rg` scans).

## Scope Boundaries

**In scope:**
- Splitting ecology into contract-only exports vs runtime/compile registries (per B3/B4 patterns).
- Updating ecology imports in recipes/steps/tests to use entrypoint exports (no deep imports).

**Out of scope:**
- Removing step-level `resolveConfig` (that is E2).
- Adding an ecology stage public schema/compile mapping (that is E3).

## Testing / Verification

- `pnpm -C mods/mod-swooper-maps test`
- `rg -n "@mapgen/domain/ecology/ops/" mods/mod-swooper-maps/src` (expect zero hits after refactor)

## Dependencies / Notes

- **Blocked by:** [LOCAL-TBD-M7-B3](./LOCAL-TBD-M7-B3-domain-ops-registries.md), [LOCAL-TBD-M7-B4](./LOCAL-TBD-M7-B4-op-normalize-semantics.md)
- **Blocks:** [LOCAL-TBD-M7-E2](./LOCAL-TBD-M7-E2-ecology-steps-migration.md)
- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `docs/projects/engine-refactor-v1/resources/spec/recipe-compile`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Implementation Guidance

| File | Notes |
|---|---|
| `/mods/mod-swooper-maps/src/domain/ecology/index.ts` | Baseline exports `ops` object and misc schemas/types; refactor into contract-only + registries model. |
| `/docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/03-authoring-patterns.md` | Domain entrypoint shape and import boundaries (pinned). |
| `/docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/06-enforcement.md` | Domain entrypoints only (no deep imports) enforcement. |

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
