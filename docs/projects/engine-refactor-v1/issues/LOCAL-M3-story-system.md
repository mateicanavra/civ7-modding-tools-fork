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
blocked_by: [CIV-36, LOCAL-M3-TASK-GRAPH-MVP]
blocked: [LOCAL-M3-BIOMES-FEATURES-WRAPPER]
related_to: [CIV-21, LOCAL-M3-HYDROLOGY-PRODUCTS]
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
  - Publish all narrative outputs through `StoryOverlays` as the **canonical data product**.
  - `StoryOverlays` becomes the authoritative source for downstream consumers (biomes, features, placement).
  - Reduce direct `StoryTags` mutation to a compatibility layer or retire it where possible.
- [ ] **Wrap story system as steps**
  - Implement `MapGenStep` wrappers for story stages once `PipelineExecutor` exists.
  - Declare `requires`/`provides` and phase alignment per architecture.
- [ ] **Behavior checks**
  - Add step‑level or integration tests for corridors/swatches/paleo once the pipeline is in place.

## Acceptance Criteria

- [ ] TS equivalents exist for all legacy story passes and corridors
- [ ] Corridors/swatches/paleo overlays are populated when stages enabled
- [ ] Story logic runs as steps under the Task Graph with explicit contracts
- [ ] Downstream consumers use `StoryOverlays`/`ClimateField` rather than ad‑hoc reads
- [ ] Story steps declare `requires`/`provides` and run via `PipelineExecutor`
- [ ] Steps fail fast if required products are missing (runtime gating enforced)

## Out of Scope

- Re‑tuning narrative parameters beyond parity checks.
- New story motifs not present in the JS archive.

## Dependencies & Relationships

**Depends on:**
- `CIV-36` (M2): Minimal story parity must land first
- `LOCAL-M3-TASK-GRAPH-MVP` (Stack 1): Pipeline primitives must exist before wrapping story stages

**Blocks:**
- `LOCAL-M3-BIOMES-FEATURES-WRAPPER` (Stack 4): Biomes/features consume `StoryOverlays` product

**Related:**
- `CIV-21`: Parent issue for full story port
- `LOCAL-M3-HYDROLOGY-PRODUCTS` (Stack 2): Story overlays may consume river/climate products

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Port from:
  - `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/story/tagging.js`
  - `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/story/corridors.js`
- Decide whether to introduce a dedicated `storyPaleo` stage or fold paleo into swatches/climate refinement steps.
