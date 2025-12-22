---
id: CIV-43
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
blocked_by: [CIV-36, CIV-41]
blocked: [CIV-44]
related_to: [CIV-21, CIV-42]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Complete the story port by implementing the remaining legacy narrative layers and corridors, then migrating story logic to the Task Graph as `MapGenStep`s with canonical `artifact:storyOverlays`. This lands in M3 alongside pipeline refactoring and config evolution.

Parent issue: `CIV-21-story-tagging.md`.

## Deliverables

- [x] Port remaining legacy story passes: corridors, swatches, paleo (and any remaining in-slice orogeny work if still missing).
- [x] Publish narrative outputs via canonical `StoryOverlays` (downstream consumers read overlays, not ad-hoc globals).
- [x] Wrap story stages as `MapGenStep`s with explicit `requires/provides` and runtime-gated execution.

## Acceptance Criteria

- [x] TS equivalents exist for all legacy story passes and corridors
- [x] Corridors/swatches/paleo overlays are populated when stages enabled
- [x] Story logic runs as steps under the Task Graph with explicit contracts
- [ ] Downstream consumers use `StoryOverlays`/`ClimateField` rather than ad‑hoc reads (deferred: DEF-002, tracked in CIV-44)
- [x] Story steps declare `requires`/`provides` and run via `PipelineExecutor`
- [x] Steps fail fast if required dependency tags are missing (runtime gating enforced)

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- `pnpm test:mapgen`
- Spot-check overlays are non-empty for a few canonical seeds/sizes used in M2 smoke tests.

## Dependencies / Notes

- **System area:** Story/narrative layers (`packages/mapgen-core/src/story/*`) and their pipeline boundaries.
- **Change:** Implement the remaining legacy narrative passes and execute them as Task Graph steps; publish outputs as canonical overlays.
- **Outcome:** Narrative signals become explicit artifacts/contracts (`artifact:storyOverlays`) for downstream consumers (biomes/features/placement).
- **Scope guardrail:** Preserve current story quality; no new story motifs or tuning-heavy rewrites in M3.
- **Depends on:** CIV-36 (M2 minimal story parity) and CIV-41 (runtime-gated step execution).
- **Blocks:** CIV-44 (biomes/features consume narrative signals).
- **Related:** CIV-42 (corridor/swatches logic may consume climate/river signals).
- **Locked decisions for M3 (remove ambiguity):**
  - **Step boundaries:** Keep story aligned to existing stage boundaries (wrapper steps matching `STAGE_ORDER`), to preserve behavior and avoid a tuning-grade rewrite in M3.
  - **Compatibility layer:** Keep `StoryTags` as a derived compatibility layer in M3 (populated from overlays) while consumers migrate; do not force all consumers to read overlays directly as a condition of landing M3 (tracked as `docs/projects/engine-refactor-v1/deferrals.md` DEF-002).
  - **Global overlay registry:** Keep the global fallback through M3 for compatibility; retire it explicitly post‑M3 (tracked as `docs/projects/engine-refactor-v1/deferrals.md` DEF-003).
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
- M3 decision: implement `paleo` as part of the `storySwatches` stage/step (no new `storyPaleo` stage in `STAGE_ORDER` for M3).

### Review Follow-ups
- Removed `syncClimateField()` usage from paleo; tests seed canonical climate buffers instead.
- Ensured `storySwatches` republishes `artifact:climateField` after swatches/paleo mutations.
- Tightened `storyCorridorsPost` dependency spine to require climate + river artifacts (fail-fast on misordered/disabled stages).
- Reset story globals at generation start to prevent cross-run leakage when story stages are selectively enabled.
