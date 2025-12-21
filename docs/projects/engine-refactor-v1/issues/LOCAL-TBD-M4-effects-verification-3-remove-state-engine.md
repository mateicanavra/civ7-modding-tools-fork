---
id: LOCAL-TBD-M4-EFFECTS-3
title: "[M4] Effects verification (3/3): remove state:engine surface + close DEF-008"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M4-tests-validation-cleanup
assignees: []
labels: [Architecture, Validation]
parent: M4-EFFECTS-VERIFICATION
children: []
blocked_by: [LOCAL-TBD-M4-EFFECTS-2, M4-PLACEMENT-INPUTS]
blocked: []
related_to: [M4-PLACEMENT-INPUTS]
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

- **Parent:** [M4-EFFECTS-VERIFICATION](M4-EFFECTS-VERIFICATION.md)
- **Blocked by:** LOCAL-TBD-M4-EFFECTS-2, [M4-PLACEMENT-INPUTS](M4-PLACEMENT-INPUTS.md)
- **Related:** M4-PLACEMENT-INPUTS (placement effect verification)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Treat this as cleanup: do not change algorithms.
- If any placement-related `state:engine.*` dependencies remain, defer to M4-PLACEMENT-INPUTS for the effect/reify replacement.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
