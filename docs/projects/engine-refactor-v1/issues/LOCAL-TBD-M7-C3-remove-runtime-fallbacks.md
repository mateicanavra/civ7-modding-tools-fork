---
id: LOCAL-TBD-M7-C3
title: "[M7] Remove runtime compilation fallbacks at the recipe boundary"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [architecture]
parent: LOCAL-TBD-M7-C
children: []
blocked_by:
  - LOCAL-TBD-M7-C2
blocked:
  - LOCAL-TBD-M7-D1
  - LOCAL-TBD-M7-D2
  - LOCAL-TBD-M7-F1
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Remove any bypass paths that allow uncompiled configs to flow into engine plan compilation. After this, the only supported entry is compilation-first.

## Deliverables

- Remove/forbid passing raw configs into engine plan without compilation.
- Ensure error surfaces point to compiler errors, not engine resolveConfig failures.

## Acceptance Criteria

- [x] No code path constructs an engine plan from uncompiled (author-facing) configs.
- [x] Errors that used to surface during engine planning/resolveConfig now surface as compiler errors at the recipe boundary.

## Scope Boundaries

**In scope:**
- Removing bypass paths that let author-facing configs flow into engine planning without recipe-boundary compilation.
- Making the recipe module reject/ban legacy config shapes once compilation is mandatory.

**Out of scope:**
- Engine validate-only flip (that is D1-D2).
- Stage-by-stage authoring migration details (that is C2); C3 only removes remaining bypasses after migration.

## Testing / Verification

- `pnpm test`
- `rg -n "RecipeConfigInputOf" packages/mapgen-core/src mods/mod-swooper-maps/src` (expect only author-facing call sites; no engine usage)

## Dependencies / Notes

- **Blocked by:** [LOCAL-TBD-M7-C2](./LOCAL-TBD-M7-C2-stage-step-config-shape.md)
- **Blocks:** [LOCAL-TBD-M7-D1](./LOCAL-TBD-M7-D1-executor-plan-only.md), [LOCAL-TBD-M7-D2](./LOCAL-TBD-M7-D2-planner-validate-only.md), [LOCAL-TBD-M7-F1](./LOCAL-TBD-M7-F1-verify-no-shims.md)
- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `docs/projects/engine-refactor-v1/resources/spec/recipe-compile`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Implementation Guidance

| File | Notes |
|---|---|
| `/packages/mapgen-core/src/authoring/recipe.ts` | Recipe boundary: remove any legacy author-config plumbing once compileRecipeConfig is mandatory. |
| `/mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts` | Primary mod entry to recipe.run; ensure it cannot pass uncompiled config into planning after C3. |
| `/mods/mod-swooper-maps/src/maps/_runtime/standard-entry.ts` | Standard entry wiring; ensure only the compile-first config path remains. |

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Implementation Decisions

### Require total step-id config for instantiate/runRequest
- **Context:** `instantiate`/`runRequest` could be called with author-facing or partial configs, bypassing recipe-boundary compilation.
- **Options:** Remove these methods, add a compiled-config marker, or enforce total step-id config at runtime.
- **Choice:** Enforce total step-id config at runtime and keep methods public.
- **Rationale:** Preserves API surface while preventing author-facing configs from reaching engine planning without compilation.
- **Risk:** Callers that relied on partial configs must now call `compileConfig` before instantiate/runRequest.
