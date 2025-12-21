---
id: M4-NARRATIVE-CLEANUP
title: "[M4] Narrative/playability cleanup: canonical artifact:narrative.*; remove StoryTags and caches"
state: planned
priority: 3
estimate: 4
project: engine-refactor-v1
milestone: M4-tests-validation-cleanup
assignees: []
labels: [Architecture, Narrative]
parent: null
children: []
blocked_by: [M4-PIPELINE-CUTOVER]
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

