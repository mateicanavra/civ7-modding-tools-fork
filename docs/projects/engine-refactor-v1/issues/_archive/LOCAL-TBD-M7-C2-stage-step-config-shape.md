---
id: LOCAL-TBD-M7-C2
title: "[M7] Update stage+step authoring to the new config shape"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [architecture]
parent: LOCAL-TBD-M7-C
children: []
blocked_by:
  - LOCAL-TBD-M7-C1
  - LOCAL-TBD-M7-B1
  - LOCAL-TBD-M7-B2
blocked:
  - LOCAL-TBD-M7-C3
  - LOCAL-TBD-M7-E2
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Migrate the standard recipe to the new authoring surface incrementally, keeping the repo runnable after each stage migration.

## Deliverables

- Stage config input is a single object per stage matching one of:
  - internal-as-public: `{ knobs, ...[stepId]: unknown }` (step fields remain unknown at Phase A), or
  - public+compile: `{ knobs, ...publicFields }` validated by `stage.public`, then compiled by `stage.compile`.
- Compiled output is total: `stageId -> stepId -> canonical step config` (no missing required envelopes/config).
- At least one migrated stage runs end-to-end through compiler -> plan -> `executePlan`.

## Acceptance Criteria

- [x] Stage config input is a single object per stage and matches one of:
  - internal-as-public: `{ knobs, ...[stepId]: unknown }` (step fields remain unknown at Phase A), or
  - public+compile: `{ knobs, ...publicFields }` validated by `stage.public`, then compiled by `stage.compile`.
- [x] Compiled output is total: `stageId -> stepId -> canonical step config` (no missing required envelopes/config).
- [x] At least one migrated stage runs end-to-end through compiler -> plan -> `executePlan` and passes tests.

## Scope Boundaries

**In scope:**
- Updating standard recipe stages one by one to the new shape.
- Starting with the foundation stage (no step.resolveConfig today) to establish the migration pattern.

**Out of scope:**
- Ecology exemplar refactor (that is E1-E3, intentionally later).

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes

- **Blocked by:** [LOCAL-TBD-M7-C1](./LOCAL-TBD-M7-C1-recipe-boundary-compilation.md), [LOCAL-TBD-M7-B1](./LOCAL-TBD-M7-B1-step-id-kebab-case.md), [LOCAL-TBD-M7-B2](./LOCAL-TBD-M7-B2-stage-option-a.md)
- **Blocks:** [LOCAL-TBD-M7-C3](./LOCAL-TBD-M7-C3-remove-runtime-fallbacks.md), [LOCAL-TBD-M7-E2](./LOCAL-TBD-M7-E2-ecology-steps-migration.md)
- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `docs/projects/engine-refactor-v1/resources/spec/recipe-compile`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Implementation Guidance

| File | Notes |
|---|---|
| `/mods/mod-swooper-maps/src/recipes/standard/recipe.ts` | Stage ordering is explicit; migrate stage modules one by one and keep tests green after each. |
| `/mods/mod-swooper-maps/src/recipes/standard/stages/foundation/index.ts` | Pinned as the first stage to migrate (small surface; no step.resolveConfig in this stage today). |
| `/mods/mod-swooper-maps/src/recipes/standard/stages/**/index.ts` | Stage modules will need updates after Stage Option A and config shape changes. |

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Implementation Decisions

### Drop legacy ecology features config in map presets
- **Context:** Map presets still authored `ecology.features` (legacy step id) which fails compiler validation now that the stage uses `features-plan`/`features-apply`.
- **Options:** Keep a temporary stage-level public compile shim, map legacy `features` into the new step configs, or remove the legacy block and rely on defaults.
- **Choice:** Remove the legacy `features` block from map presets and standard-run config.
- **Rationale:** Keeps stage input strictly keyed by step ids without introducing compatibility shims ahead of the ecology refactor.
- **Risk:** Preset tuning for feature placement/embellishments is lost until E2/E3 reintroduce explicit config mapping.
