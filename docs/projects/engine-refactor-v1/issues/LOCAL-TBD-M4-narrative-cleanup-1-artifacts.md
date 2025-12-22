---
id: LOCAL-TBD-M4-NARRATIVE-1
title: "[M4] Narrative cleanup: canonical artifact:narrative.* producers"
state: planned
priority: 3
estimate: 4
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TARGET-ARCH-CUTOVER
assignees: []
labels: [Architecture, Narrative]
parent: LOCAL-TBD-M4-NARRATIVE-CLEANUP
children: []
blocked_by: []
blocked: [LOCAL-TBD-M4-NARRATIVE-2]
related_to: [CIV-43]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Define the canonical `artifact:narrative.*` set and ensure narrative steps publish those artifacts explicitly.

## Deliverables

- Typed, versioned `artifact:narrative.*` definitions registered (optional safe demos where useful for tooling/tests).
- Narrative steps updated to publish these artifacts and declare their dependencies explicitly.
- Standard recipe updated to consume the new narrative artifacts where applicable.

## Acceptance Criteria

- Narrative producers provide explicit `artifact:narrative.*` outputs (no implicit StoryTags dependency surface).
- Artifacts are versioned; demo payloads are optional (recommended when useful for tooling/tests).
- No behavior change beyond representation/wiring.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- A narrative pipeline run compiles and executes using the new artifacts.

## Dependencies / Notes

- **Parent:** [LOCAL-TBD-M4-NARRATIVE-CLEANUP](LOCAL-TBD-M4-NARRATIVE-CLEANUP.md)
- **Blocks:** LOCAL-TBD-M4-NARRATIVE-2
- **Sequencing:** Start after the tag registry cutover (LOCAL-TBD-M4-TAG-REGISTRY-CUTOVER) so narrative artifacts are registered in the canonical catalog.

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

## Prework Prompt (Agent Brief)

Goal: define the canonical `artifact:narrative.*@v1` inventory and map producers so implementation is mechanical.

Deliverables:
- A minimal inventory of narrative artifacts (IDs + short purpose + version).
- Schema sketches for each artifact, including any demo payloads we choose to provide (optional; recommended for tooling/tests).
- A mapping of which narrative steps produce each artifact and which consumers require them.

Where to look:
- SPEC: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (Narrative model, tag registry).
- SPIKE: `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.4).
- Code: `packages/mapgen-core/src/domain/narrative/**`, `packages/mapgen-core/src/pipeline/narrative/**`,
  and any `artifact:storyOverlays` or StoryTags outputs.

Constraints/notes:
- Narrative artifacts must be typed, versioned, and optional via recipe composition.
- No StoryTags surface in the target contract.
- Do not implement code; return the inventory and mappings as markdown tables/lists.
- Coordinate with the tag registry cutover so artifacts are registered in the canonical catalog.

## Prework Results / References

- Resource doc: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-narrative-1-artifact-inventory.md`
- Includes: a minimal `artifact:narrative.*@v1` inventory (IDs + purposes + schema sketches + demo guidance), a producer→artifact map from current story steps/overlays, and a consumer map highlighting where StoryTags/overlays are currently read (plus a notable hotspot tag-set drift to resolve during cutover).
