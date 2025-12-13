---
id: LOCAL-M3-STORY-SYSTEM
title: "[M3] Full Story System Modernization (Corridors, Swatches, Paleo, Steps)"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Story, Architecture]
parent: CIV-21
children: []
blocked_by: [CIV-36]
blocked: []
related_to: [CIV-21]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Complete the story port by implementing the remaining legacy narrative layers and corridors, then migrating story logic to the Task Graph as `MapGenStep`s with canonical `StoryOverlays` products. This lands in M3 alongside pipeline refactoring and config evolution.

Parent issue: `CIV-21-story-tagging.md`.

## Deliverables

- [ ] **Port remaining `story/tagging` passes**
  - Orogeny belts + windward/lee caches (if not done in M2).
  - Climate swatches (macro swatch overlay + soft edges).
  - Paleo hydrology overlays (deltas/oxbows/fossil channels).
- [ ] **Port `story/corridors.ts`**
  - Pre‑islands corridor tagging.
  - Post‑rivers corridor tagging.
  - Corridor kind/style/attribute metadata.
- [ ] **Canonicalize overlays**
  - Publish all narrative outputs through `StoryOverlays` as authoritative products.
  - Reduce direct `StoryTags` mutation to a compatibility layer or retire it where possible.
- [ ] **Wrap story system as steps**
  - Implement `MapGenStep` wrappers for story stages once `PipelineExecutor` exists.
  - Declare `requires`/`provides` and phase alignment per architecture.
- [ ] **Behavior checks**
  - Add step‑level or integration tests for corridors/swatches/paleo once the pipeline is in place.

## Acceptance Criteria

- [ ] TS equivalents exist for all legacy story passes and corridors.
- [ ] Corridors/swatches/paleo overlays are populated when stages enabled.
- [ ] Story logic runs as steps under the Task Graph with explicit contracts.
- [ ] Downstream consumers use `StoryOverlays`/`ClimateField` rather than ad‑hoc reads.

## Out of Scope

- Re‑tuning narrative parameters beyond parity checks.
- New story motifs not present in the JS archive.

## Dependencies / Notes

- Depends on minimal parity landing in M2 (`CIV-36`).
- Must coordinate with pipeline primitives and config shape evolution in M3.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Port from:
  - `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/story/tagging.js`
  - `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/story/corridors.js`
- Decide whether to introduce a dedicated `storyPaleo` stage or fold paleo into swatches/climate refinement steps.
