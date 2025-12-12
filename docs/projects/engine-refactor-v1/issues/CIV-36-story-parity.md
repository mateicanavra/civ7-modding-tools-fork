---
id: CIV-36
title: "[M2] Minimal Story Parity (Margins, Hotspots, Rifts)"
state: planned
priority: 1
estimate: 2
project: engine-refactor-v1
milestone: M2-stable-engine-slice
assignees: []
labels: [Improvement, Story, Architecture]
parent: CIV-21
children: []
blocked_by: [CIV-18]
blocked: [CIV-39]
related_to: [CIV-21]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Restore the minimum narrative signals needed for downstream parity by porting and wiring **continental margins**, **hotspot trails**, and **rift valleys** (optionally **orogeny belts**) into the current orchestrator flow. This lands in M2 to stabilize config/consumer behavior without waiting for pipeline refactoring.

Parent issue: `CIV-21-story-tagging.md`.

## Deliverables

- [x] **Port minimal `story/tagging.ts` subset**
  - Continental margins tagging (active/passive shelves) and publish a margins overlay.
  - Hotspot trail tagging with core sub-tags (`hotspot`, `hotspotParadise`, `hotspotVolcanic`).
  - Rift line + shoulder tagging.
  - Optional: basic orogeny belts if it is low‑risk in the orchestrator slice.
- [x] **Wire into `MapOrchestrator`**
  - Call minimal tagging in `storySeed` / `storyHotspots` / `storyRifts` stages without changing ordering.
  - Ensure story tags/overlays exist before climate/biomes/features run.
- [x] **Minimal validation**
  - When story stages are enabled, emit a warning or assert if the corresponding tag sets remain empty.
- [x] **Smoke checks**
  - Add one orchestrator/story smoke test that asserts non‑empty margins/hotspots/rifts on a typical map when enabled.

## Acceptance Criteria

- [x] TS `story/tagging.ts` exists and implements margins/hotspots/rifts (± orogeny).
- [x] `StoryTags` are populated after story stages execute.
- [x] Margins overlay is published and `hydrateMarginsStoryTags` is exercised.
- [x] Downstream climate/biomes/features regain story‑aware branches.
- [x] Build passes; smoke checks pass.

## Out of Scope

- Strategic corridors (pre/post passes).
- Climate swatches and paleo hydrology overlays.
- Canonical `StoryOverlays` product migration and `MapGenStep` wrapping.
- Any pipeline executor / task‑graph changes.

These land under `LOCAL-M3-story-system.md`.

## Dependencies / Notes

- Depends on config/call‑site stability (CIV‑18).
- This is an orchestrator‑centric port intended to be wrapped as steps in M3.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Port directly from `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/story/tagging.js`, keeping behavior close to JS.
- Prefer context‑oriented helpers (pure functions on `ExtendedMapContext`) to minimize later refactors into steps.
