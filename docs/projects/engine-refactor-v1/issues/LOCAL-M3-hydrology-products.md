---
id: LOCAL-M3-HYDROLOGY-PRODUCTS
title: "[M3] Hydrology Productization (ClimateField + River Data Products)"
state: planned
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Hydrology, Architecture]
parent: null
children: []
blocked_by: [LOCAL-M3-TASK-GRAPH-MVP]
blocked: [LOCAL-M3-BIOMES-FEATURES-WRAPPER]
related_to: [LOCAL-M3-STORY-SYSTEM]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Make hydrology/climate outputs consumable as **canonical data products**: `ClimateField` becomes the authoritative rainfall source for downstream logic, and a minimal “river data product” is published for overlays/biomes/placement, without changing the underlying river generation behavior.

## Deliverables

- [ ] Make `ClimateField` the canonical rainfall/moisture read surface for downstream consumers (stop direct `GameplayMap.getRainfall()` reads in modernized code paths).
- [ ] Define and publish a minimal, stable river product suitable for consumers (overlays/biomes/placement) without changing river generation algorithms.
- [ ] Establish a wrap-first hydrology/climate step boundary that provides these products (engine rivers + existing TS climate passes).

## Acceptance Criteria

- [ ] No new/modernized consumer reads rainfall directly from `GameplayMap` once the step pipeline is in place
- [ ] River summary data is available as an explicit product and can be required by steps via `requires`/`provides`
- [ ] The map quality and overall river behavior remains consistent (wrap-first; no algorithm swap in M3)
- [ ] Hydrology wrapper step declares `requires`/`provides` and runs via `PipelineExecutor`
- [ ] Steps fail fast if required products are missing (runtime gating enforced)

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- `pnpm test:mapgen`

## Dependencies / Notes

- **System area:** Hydrology/climate product spine and consumer reads.
- **Change:** Publish canonical climate + river products (wrap-first) and migrate consumers to read those products instead of engine globals.
- **Outcome:** Downstream steps can declare `requires` on hydrology/climate outputs and remain testable/portable.
- **Scope guardrail:** No new hydrology/geomorphology algorithms in M3; preserve map quality.
- **Depends on:** `LOCAL-M3-TASK-GRAPH-MVP` (runtime gating + step execution).
- **Blocks:** `LOCAL-M3-BIOMES-FEATURES-WRAPPER` (biomes/features consume climate/river signals).
- **Related:** `LOCAL-M3-STORY-SYSTEM` (story overlays may consume river/climate products).
- **Open questions (track here):**
  - River product shape: adjacency mask vs “near-river” score vs coarse “navigable river terrain” mask. The base `EngineAdapter` only exposes `isAdjacentToRivers()`.
  - River product source: derived from adapter queries vs derived from terrain types after `modelRivers()` (see `NAVIGABLE_RIVER_TERRAIN` usage in `MapOrchestrator`).
  - Step boundary: one combined “hydrology/climate” wrapper step vs separate `climateBaseline` / `rivers` / `climateRefine` steps (must preserve current stage order).
- **Links:**
  - Milestone: `../milestones/M3-core-engine-refactor-config-evolution.md`
  - Pipeline PRD: `../resources/PRD-pipeline-refactor.md`
  - Target system docs: `../../../system/libs/mapgen/hydrology.md`, `../../../system/libs/mapgen/ecology.md`
  - Code references: `packages/mapgen-core/src/MapOrchestrator.ts` (rivers stage), `packages/mapgen-core/src/core/types.ts` (`ClimateFieldBuffer`, `writeClimateField`, `syncClimateField`), `packages/civ7-adapter/src/types.ts` (`EngineAdapter`)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
