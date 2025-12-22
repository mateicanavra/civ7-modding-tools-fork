---
id: LOCAL-TBD-M4-EFFECTS-3
title: "[M4] Effects verification: remove state:engine surface + close DEF-008"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TESTS-VALIDATION-CLEANUP
assignees: []
labels: [Architecture, Validation]
parent: LOCAL-TBD-M4-EFFECTS-VERIFICATION
children: []
blocked_by: [LOCAL-TBD-M4-EFFECTS-2, LOCAL-TBD-M4-PLACEMENT-INPUTS]
blocked: []
related_to: [LOCAL-TBD-M4-PLACEMENT-INPUTS]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Remove `state:engine.*` from the target registry/contract surface and update deferrals once verified `effect:*` tags and reified fields cover the remaining dependencies.

## Deliverables

- `state:engine.*` tags removed from target registry surface and standard pipeline steps.
- DEF-008 updated to “resolved” once the target surface is clean.
- Any remaining compatibility shims explicitly isolated (no silent fallback in the target path).

## Acceptance Criteria

- No standard pipeline step requires/provides `state:engine.*` tags.
- Registry surface rejects or omits `state:engine.*` in the target contract.
- DEF-008 marked resolved with a brief note pointing to the verified `effect:*` replacements.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- A standard pipeline run succeeds without `state:engine.*` in the dependency graph.

## Dependencies / Notes

- **Parent:** [LOCAL-TBD-M4-EFFECTS-VERIFICATION](M4-EFFECTS-VERIFICATION.md)
- **Blocked by:** LOCAL-TBD-M4-EFFECTS-2, [LOCAL-TBD-M4-PLACEMENT-INPUTS](M4-PLACEMENT-INPUTS.md)
- **Related:** LOCAL-TBD-M4-PLACEMENT-INPUTS (placement effect verification)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Treat this as cleanup: do not change algorithms.
- If any placement-related `state:engine.*` dependencies remain, defer to LOCAL-TBD-M4-PLACEMENT-INPUTS for the effect/reify replacement.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

## Prework Prompt (Agent Brief)

Goal: build the final `state:engine.*` removal map so cleanup is mechanical and complete.

Deliverables:
- An inventory of all `state:engine.*` tags in steps, registry validation, and tests.
- For each usage, the planned replacement (`effect:*`, `field:*`, or `artifact:*`) or explicit deletion.
- A short cleanup checklist for removing `state:engine.*` from the registry/tag validation surface and standard pipeline.

Where to look:
- Search: `rg "state:engine" packages/mapgen-core/src packages/mapgen-core/test`.
- Code: `packages/mapgen-core/src/pipeline/standard.ts`, `packages/mapgen-core/src/pipeline/tags.ts`,
  `packages/mapgen-core/src/pipeline/PipelineExecutor.ts`.
- Deferrals: `docs/projects/engine-refactor-v1/deferrals.md` (DEF-008).

Constraints/notes:
- No algorithm changes; this is cleanup only.
- Coordinate with placement inputs so placement effects are already verified.
- Do not implement code; return the inventory and checklist as markdown tables/lists.
