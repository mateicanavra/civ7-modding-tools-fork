---
id: LOCAL-TBD-M4-NARRATIVE-1
title: "[M4] Narrative cleanup (1/2): canonical artifact:narrative.* producers"
state: planned
priority: 3
estimate: 2
project: engine-refactor-v1
milestone: M4-tests-validation-cleanup
assignees: []
labels: [Architecture, Narrative]
parent: M4-NARRATIVE-CLEANUP
children: []
blocked_by: []
blocked: [LOCAL-TBD-M4-NARRATIVE-2]
related_to: [CIV-43]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Define the canonical `artifact:narrative.*` set and ensure narrative steps publish those artifacts explicitly.

## Deliverables

- Typed, versioned `artifact:narrative.*` definitions registered with safe demos.
- Narrative steps updated to publish these artifacts and declare their dependencies explicitly.
- Standard recipe updated to consume the new narrative artifacts where applicable.

## Acceptance Criteria

- Narrative producers provide explicit `artifact:narrative.*` outputs (no implicit StoryTags dependency surface).
- Artifacts are versioned and have demo payloads.
- No behavior change beyond representation/wiring.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- A narrative pipeline run compiles and executes using the new artifacts.

## Dependencies / Notes

- **Parent:** [M4-NARRATIVE-CLEANUP](M4-NARRATIVE-CLEANUP.md)
- **Blocks:** LOCAL-TBD-M4-NARRATIVE-2

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep behavior stable; focus on artifact products and declared dependencies.
- Use the canonical narrative artifact shapes defined in the target spec.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
