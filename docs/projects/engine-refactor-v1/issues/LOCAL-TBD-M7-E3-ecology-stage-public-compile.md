---
id: LOCAL-TBD-M7-E3
title: "[M7] Ecology stage public view + compile (Option A) where beneficial"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [architecture]
parent: LOCAL-TBD-M7-E
children: []
blocked_by:
  - LOCAL-TBD-M7-E2
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Use ecology to demonstrate the optional stage public schema and compile mapping end-to-end. This is the "copyable exemplar" for future stages/domains.

## Deliverables

- Ecology stage defines `knobsSchema`, and where beneficial, an explicit `public` schema.
- Ecology stage `compile` maps public fields to internal per-step configs deterministically.
- Compiler error examples and validation behavior exercised end-to-end.

## Acceptance Criteria

- [ ] Ecology stage defines `knobsSchema`, and where beneficial, an explicit `public` schema.
- [ ] Ecology stage `compile` maps public fields to internal per-step configs deterministically.
- [ ] Compiler error examples (unknown step ids, unknown keys, schema errors) are exercised end-to-end using ecology as the reference.

## Scope Boundaries

**In scope:**
- Updating the ecology stage module to the Stage Option A shape (`knobsSchema`, optional public schema, and `compile` mapping).
- Adding/adjusting ecology stage configs so author-facing config stays stage-scoped and compiles to step configs.

**Out of scope:**
- Refactoring ecology domain entrypoint exports (that is E1).
- Step-level runtime normalization removal and runtime ops binding by id (that is E2).

## Testing / Verification

- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes

- **Blocked by:** [LOCAL-TBD-M7-E2](./LOCAL-TBD-M7-E2-ecology-steps-migration.md)
- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `spec_package`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Implementation Guidance

| File | Notes |
|---|---|
| `/mods/mod-swooper-maps/src/recipes/standard/stages/ecology/index.ts` | Upgrade to Stage Option A (knobsSchema/public schema/compile mapping) once B2 is available. |
| `/mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**` | Ensure compiled configs line up with step ids and schemas; keep runtime code consuming canonical step configs only. |
| `/docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/03-authoring-patterns.md` | Stage Option A patterns; ecology should be a copyable exemplar. |

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
