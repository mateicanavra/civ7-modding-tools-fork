---
id: LOCAL-TBD-M7-B3
title: "[M7] Domain ops registries + binding helpers (compile vs runtime)"
state: planned
priority: 2
estimate: 2
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
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Make op registry ownership explicit and enforce "domain entrypoint only" imports. Steps should bind runtime ops by id (not deep-import implementations), and the compiler should receive a recipe-owned `compileOpsById` assembled by the recipe boundary.

## Deliverables

- Canonical binding helpers exist in authoring core (bind compile-time ops vs runtime ops distinctly).
- Domains expose `compileOpsById` and `runtimeOpsById` registries keyed by `op.id`.
- Recipe boundary merges domain registries into a recipe-owned `compileOpsById` (no implicit globals).

## Acceptance Criteria

- [ ] Canonical binding helpers exist in authoring core (bind compile-time ops vs runtime ops distinctly).
- [ ] Domains expose `compileOpsById` and `runtimeOpsById` registries keyed by `op.id`.
- [ ] Recipe boundary merges domain registries into a recipe-owned `compileOpsById` (no implicit globals).

## Scope Boundaries

**In scope:**
- Binding helper surfaces and expected domain registry shape.

**Out of scope:**
- Full domain-by-domain adoption (ecology exemplar is E1/E2; other domains can follow later).

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes

- **Blocks:** [LOCAL-TBD-M7-C1](./LOCAL-TBD-M7-C1-recipe-boundary-compilation.md), [LOCAL-TBD-M7-E1](./LOCAL-TBD-M7-E1-ecology-domain-entrypoint.md)
- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `docs/projects/engine-refactor-v1/resources/spec/recipe-compile`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Implementation Guidance

| File | Notes |
|---|---|
| `/packages/mapgen-core/src/authoring/bindings.ts` | New: canonical bindCompileOps/bindRuntimeOps helpers (location pinned by spec). |
| `/docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/03-authoring-patterns.md` | Binding helpers canonical location + API shapes (§1.14). |
| `/docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/06-enforcement.md` | Import boundaries: domain entrypoints only; steps must not deep import ops/strategies. |

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
