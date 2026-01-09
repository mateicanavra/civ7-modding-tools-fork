---
id: LOCAL-TBD-M7-B2
title: "[M7] Stage Option A: public+compile with computed surfaceSchema"
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
  - LOCAL-TBD-M7-C2
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Make stages the authoritative "author-facing config surface" owner. Stage config becomes a single object per stage: either `{ knobs, ...publicFields }` (when `public` is present) or `{ knobs, ...stepKeys }` (for internal-as-public stages). The compiler is the only place where the stage surface is normalized and compiled into per-step configs.

## Deliverables

- `knobsSchema` and reserved key enforcement ("knobs")
- Internal-as-public stage surface schema uses optional unknown per-step keys
- Public stages require compile and compile receives only non-knob portion

## Acceptance Criteria

- [ ] `createStage(...)` computes and attaches `surfaceSchema` for the stage (including `"knobs"` reserved key handling).
- [ ] Stage Option A exists: stages may declare optional `public` schema and a `compile` mapping; internal-as-public stages remain valid.
- [ ] Reserved key enforcement: authors cannot declare a step id/key named `"knobs"` and `"knobs"` must not appear inside step configs post-compilation.

## Scope Boundaries

**In scope:**
- Stage factory + types to support Option A (public+compile optional; internal-as-public otherwise).
- Reserved key enforcement for `"knobs"`.

**Out of scope:**
- The compiler implementation that consumes these surfaces (A2 owns compileRecipeConfig; this unit owns stage shapes).

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- `pnpm -C packages/mapgen-core check`

## Dependencies / Notes

- **Blocks:** [LOCAL-TBD-M7-C1](./LOCAL-TBD-M7-C1-recipe-boundary-compilation.md), [LOCAL-TBD-M7-C2](./LOCAL-TBD-M7-C2-stage-step-config-shape.md)
- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `docs/projects/engine-refactor-v1/resources/spec/recipe-compile`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Implementation Guidance

| File | Notes |
|---|---|
| `/packages/mapgen-core/src/authoring/stage.ts` | Upgrade createStage to compute surfaceSchema + standard toInternal wrapper per spec. |
| `/packages/mapgen-core/src/authoring/types.ts` | Introduce stage surface/public typing as pinned by spec; ensure RecipeConfigInputOf/CompiledRecipeConfigOf can evolve accordingly. |
| `/mods/mod-swooper-maps/src/recipes/standard/stages/**/index.ts` | Stage module call sites will need updates once createStage signature/type changes. |

### Paper Trail

- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/01-config-model.md` (§1.6 knobs model; reserved key rule)
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/04-type-surfaces.md` (Stage definition; Stage Option A)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
