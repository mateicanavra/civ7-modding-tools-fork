---
id: LOCAL-TBD-M4-NARRATIVE-2
title: "[M4] Narrative cleanup (2/2): remove StoryTags + caches and update consumers"
state: planned
priority: 3
estimate: 2
project: engine-refactor-v1
milestone: M4-tests-validation-cleanup
assignees: []
labels: [Architecture, Narrative]
parent: M4-NARRATIVE-CLEANUP
children: []
blocked_by: [LOCAL-TBD-M4-NARRATIVE-1]
blocked: []
related_to: [CIV-43]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Migrate consumers off StoryTags and remove module-level narrative caches so narrative correctness relies only on `artifact:narrative.*`.

## Deliverables

- All narrative consumers read from `artifact:narrative.*` (directly or via derived query helpers).
- StoryTags removed or fenced as explicit compatibility tooling (non-default).
- Module-level narrative caches eliminated or made context-scoped and reset-safe.
- DEF-002 and DEF-012 marked resolved.

## Acceptance Criteria

- StoryTags is not required for correctness by any in-repo consumer.
- Narrative caches do not leak across runs (context-scoped or removed).
- DEF-002 and DEF-012 updated to resolved with pointers to the new artifact surface.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- A test or smoke run validates narrative outputs without StoryTags/caches.

## Dependencies / Notes

- **Parent:** [M4-NARRATIVE-CLEANUP](M4-NARRATIVE-CLEANUP.md)
- **Blocked by:** LOCAL-TBD-M4-NARRATIVE-1

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Prefer deleting StoryTags rather than maintaining compatibility shims.
- If any cache must remain, make it context-scoped and cleared per run.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
