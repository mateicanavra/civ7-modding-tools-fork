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

- [ ] Port remaining legacy story passes: corridors, swatches, paleo (and any remaining in-slice orogeny work if still missing).
- [ ] Publish narrative outputs via canonical `StoryOverlays` (downstream consumers read overlays, not ad-hoc globals).
- [ ] Wrap story stages as `MapGenStep`s with explicit `requires/provides` and runtime-gated execution.

## Acceptance Criteria

- [ ] TS equivalents exist for all legacy story passes and corridors
- [ ] Corridors/swatches/paleo overlays are populated when stages enabled
- [ ] Story logic runs as steps under the Task Graph with explicit contracts
- [ ] Downstream consumers use `StoryOverlays`/`ClimateField` rather than ad‑hoc reads
- [ ] Story steps declare `requires`/`provides` and run via `PipelineExecutor`
- [ ] Steps fail fast if required products are missing (runtime gating enforced)

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- `pnpm test:mapgen`
- Spot-check overlays are non-empty for a few canonical seeds/sizes used in M2 smoke tests.

## Dependencies / Notes

- **System area:** Story/narrative layers (`packages/mapgen-core/src/story/*`) and their pipeline boundaries.
- **Change:** Implement the remaining legacy narrative passes and execute them as Task Graph steps; publish outputs as canonical overlays.
- **Outcome:** Narrative signals become explicit products/contracts (`StoryOverlays`) for downstream consumers (biomes/features/placement).
- **Scope guardrail:** Preserve current story quality; no new story motifs or tuning-heavy rewrites in M3.
- **Depends on:** `CIV-36` (M2 minimal story parity) and `LOCAL-M3-TASK-GRAPH-MVP` (runtime-gated step execution).
- **Blocks:** `LOCAL-M3-BIOMES-FEATURES-WRAPPER` (biomes/features consume narrative signals).
- **Related:** `LOCAL-M3-HYDROLOGY-PRODUCTS` (corridor/swatches logic may consume climate/river signals).
- **Open questions (track here):**
  - Step boundaries: do we model story as multiple steps (`storySeed`/`storyHotspots`/`storyRifts`/`storyCorridorsPre`/`storySwatches`/`storyCorridorsPost`/`storyPaleo`) matching `STAGE_ORDER`, or collapse some into fewer steps?
  - Compatibility: keep `StoryTags` as a derived compatibility layer (populated from overlays), or require consumers to read `StoryOverlays` directly in M3?
  - Global overlay registry: `story/overlays.ts` currently supports a global fallback; decide whether to keep it through M3 and retire it post‑M3 (see triage entry).
- **Links:**
  - Parent: `CIV-21-story-tagging.md`
  - Milestone: `../milestones/M3-core-engine-refactor-config-evolution.md`
  - JS sources: `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/story/tagging.js`, `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/story/corridors.js`
  - Code references: `packages/mapgen-core/src/story/tagging.ts`, `packages/mapgen-core/src/story/overlays.ts`, `packages/mapgen-core/src/bootstrap/resolved.ts` (`STAGE_ORDER`)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Notes
- Port from:
  - `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/story/tagging.js`
  - `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/story/corridors.js`
- Decide whether `paleo` is its own step or folds into `swatches` / `climateRefine` boundaries.
