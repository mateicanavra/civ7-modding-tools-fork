---
id: LOCAL-TBD-M4-NARRATIVE-CLEANUP
title: "[M4] Narrative/playability cleanup: canonical artifact:narrative.*; remove StoryTags and caches"
state: planned
priority: 3
estimate: 8
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TESTS-VALIDATION-CLEANUP
assignees: []
labels: [Architecture, Narrative]
parent: null
children: [LOCAL-TBD-M4-NARRATIVE-1, LOCAL-TBD-M4-NARRATIVE-2]
blocked_by: []
blocked: []
related_to: [CIV-43]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Make typed narrative/playability products canonical (`artifact:narrative.*`) and remove StoryTags + module-level caches as correctness dependencies.

## Why This Exists

M3 introduced context-scoped overlays and derived StoryTags as a compatibility layer (DEF-002) while caches still exist (DEF-012). Target architecture treats narrative products as normal artifacts, scheduled like everything else, with no hidden global state.

This issue closes DEF-002 and DEF-012.

## Recommended Target Scope

### In scope

- Define and use typed, versioned `artifact:narrative.*` products as the canonical surface.
- Migrate in-repo consumers off StoryTags (read narrative artifacts directly or via derived query helpers).
- Remove module-level caches or make them context-scoped and reset-safe.
- Ensure narrative artifacts participate in scheduling like any other artifact/effect (no side-channel dependencies).

### Out of scope

- Full mod patching/insertion UX for narrative steps.
- Large narrative algorithm rework (keep behavior stable; change representation + wiring).

## Acceptance Criteria

- StoryTags is not required for correctness by any in-repo consumer; it is deleted or fenced as explicit, non-default compatibility tooling.
- Module-level caches affecting narrative outcomes are eliminated or made context-scoped.
- Narrative steps publish and consume `artifact:narrative.*` explicitly; no “double deriving” tags/flags for the same motifs.

## Primary Touchpoints (Expected)

- Narrative domain:
  - `packages/mapgen-core/src/domain/narrative/*`
  - `packages/mapgen-core/src/pipeline/narrative/*`
- Deferrals:
  - `docs/projects/engine-refactor-v1/deferrals.md` (DEF-002, DEF-012 status updates)

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Add/extend at least one test that:
  - compiles and runs narrative steps deterministically
  - validates no global cache leaks between runs

## Dependencies / Notes

- NARRATIVE-1 can start after the tag registry cutover (LOCAL-TBD-M4-TAG-REGISTRY-CUTOVER).
- NARRATIVE-2 should land after legacy ordering deletion (LOCAL-TBD-M4-PIPELINE-5) to avoid stage/manifest drift while migrating consumers.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Plan (Concrete)

### 1) Confirm canonical narrative artifact set

- Establish the minimal typed `artifact:narrative.*` set needed by downstream consumers (regions/corridors/labels/heatmaps as applicable).

### 2) Migrate consumers

- Update any consumers that read StoryTags to read narrative artifacts directly or use derived query helpers that operate on narrative artifacts.

### 3) Remove caches / global state

- Replace module-level caches with:
  - per-context memoization keyed by run id, or
  - pure functions with explicit inputs, or
  - removal if unnecessary

### 4) Remove StoryTags compatibility surface

- Delete StoryTags (preferred) or keep only as explicit compatibility tooling that is not part of the default pipeline correctness.

### 5) Update deferrals

- Mark DEF-002 and DEF-012 resolved when StoryTags/caches are no longer correctness dependencies.

## Prework Prompt (Agent Brief)

Goal: confirm the narrative cleanup prework artifacts are complete and consistent before implementation.

Deliverables:
- A short readiness checklist pointing to the child prework artifacts for:
  - Canonical `artifact:narrative.*@v1` inventory + schema sketches.
  - StoryTags consumer map + narrative cache inventory.
- A brief gap list if any narrative artifact is missing or if consumers outside narrative modules are unaccounted for.

Where to look:
- Child issues: `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-narrative-cleanup-1-artifacts.md`,
  `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M4-narrative-cleanup-2-remove-storytags.md`.
- SPEC/SPIKE: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (Narrative model),
  `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.4).
- Milestone notes: `docs/projects/engine-refactor-v1/milestones/M4-tests-validation-cleanup.md`.

Constraints/notes:
- Narrative is optional via recipe; `StoryTags` is not a canonical surface.
- Caches must be context-owned or removed.
- Do not implement code; deliver only the checklist + gaps as notes.
- Follow the milestone sequencing: producers after tag registry cutover; consumer migration after legacy ordering deletion.
