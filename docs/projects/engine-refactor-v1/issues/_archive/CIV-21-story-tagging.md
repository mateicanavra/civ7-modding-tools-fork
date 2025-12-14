---
id: CIV-21
title: "Port Full Story Tagging, Corridors, and Overlays"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [bug]
parent: CIV-14
children: [CIV-36, LOCAL-M3-STORY-SYSTEM]
blocked_by: [CIV-18]
blocked: [CIV-23]
related_to: [CIV-10]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Port the complete legacy story system from JS into TypeScript: minimal tagging parity, remaining narrative overlays (orogeny, swatches, paleo), and strategic corridors, with clear orchestration and overlay publication so downstream climate/biomes/features regain narrative signals.

> **Note:** This issue was originally scoped as P0 remediation under the M1 TypeScript migration (CIV-14). It now represents the full story porting program, split into two canonical child issues:
> - `CIV-36-story-parity.md` (minimal parity in M2)
> - `LOCAL-M3-story-system.md` (remaining system in M3)

## Problem

### The Story Void

The TypeScript migration created `story/tags.ts` with type definitions, but `story/tagging.ts` (the actual tagging logic) was never ported. This means:

- `StoryTags` data structures exist but are always empty
- Climate code checks for margin tags → finds nothing → skips moisture adjustments
- Biomes code checks for hotspot tags → finds nothing → skips volcanic rules
- Features code checks for rift tags → finds nothing → skips geological placement

**Result:** All story-aware code paths are no-ops, producing bland, uniform maps.

### What We Need (Complete Set)

The JS archive implements a layered “history in terrain” system. Full parity requires porting:
1. **Continental margins** — active vs passive shelves, subduction indicators
2. **Hotspot trails** — volcanic chains and paradise/volcanic sub-tags
3. **Rift valleys** — rift lines and rift shoulders
4. **Orogeny belts** — belt tagging + windward/lee caches used by climate
5. **Climate swatches** — macro swatch overlays with soft edges
6. **Paleo hydrology motifs** — elevation-aware paleo wetness overlays
7. **Strategic corridors** — pre‑islands and post‑rivers corridor tagging with kind/style metadata

These feed rainfall refinement, biome biasing, feature placement, and strategic “lanes” in later layers.

## Deliverables

This parent issue tracks the *complete* story port. Delivery is split across child issues:

- [ ] **M2 minimal parity (child: `CIV-36`)**
  - Port and wire continental margins, hotspot trails, rift valleys (optional orogeny belts).
  - Publish corresponding overlays and re-enable story‑aware consumers.
- [ ] **M3 remaining system (child: `LOCAL-M3-STORY-SYSTEM`)**
  - Port corridors, climate swatches, paleo hydrology, and any deferred orogeny work.
  - Canonicalize `StoryOverlays` as a data product and wrap story logic into steps once the pipeline executor exists.

Legacy references:
- `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/story/tagging.js`
- `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/story/corridors.js`

## Acceptance Criteria

Parent completion requires both children to be complete:

- [ ] Minimal story parity landed in M2 (`CIV-36` complete).
- [ ] Remaining story system landed in M3 (`LOCAL-M3-STORY-SYSTEM` complete).
- [ ] Story stages/steps populate `StoryTags` and publish overlays before consumers run.
- [ ] Climate/biomes/features/corridor consumers regain narrative behavior.
- [ ] Build passes, tests pass.

## Testing / Verification

See the child issues for concrete test cases. At a high level:
- M2 child adds smoke checks for non‑empty margins/hotspots/rifts when enabled.
- M3 child adds corridor/swatches/paleo behavior checks and step‑level tests after pipeline refactor.

## Dependencies / Notes

- **Blocked by**: Config resolver + call-site fixes (Stack 2)
- **Blocks**: Integration tests (story enables meaningful downstream behavior)
- **Related to**: CIV-10 (original story migration, incomplete)
- **Scope**: Full story system, split across M2/M3 children.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

Implementation is tracked in the children:
- M2 minimal parity is implemented in orchestrator story stages.
- M3 remaining system is implemented as steps after pipeline refactor.
