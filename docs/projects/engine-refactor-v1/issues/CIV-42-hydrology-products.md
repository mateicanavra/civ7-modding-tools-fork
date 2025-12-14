---
id: CIV-42
title: "[M3] Hydrology Productization (ClimateField + River Artifacts)"
state: planned
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Hydrology, Architecture]
parent: null
children: []
blocked_by: [CIV-41]
blocked: [CIV-44]
related_to: [CIV-43]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Make hydrology/climate outputs consumable as **canonical artifacts (data products)**: `ClimateField` becomes the authoritative rainfall source for downstream logic, and a minimal river artifact is published for overlays/biomes/placement, without changing the underlying river generation behavior.

## Deliverables

- [x] Make `ClimateField` the canonical rainfall/moisture read surface for downstream consumers (stop direct `GameplayMap.getRainfall()` reads in modernized code paths).
- [x] Define and publish a minimal, stable river artifact suitable for consumers (overlays/biomes/placement) without changing river generation algorithms.
- [x] Establish a wrap-first hydrology/climate step boundary that provides these artifacts (engine rivers + existing TS climate passes).

## Acceptance Criteria

- [x] No new/modernized consumer reads rainfall directly from `GameplayMap` once the step pipeline is in place
- [x] River summary data is available as an explicit artifact (e.g., `artifact:riverAdjacency`) and can be required by steps via `requires`/`provides`
- [x] The map quality and overall river behavior remains consistent (wrap-first; no algorithm swap in M3)
- [x] Hydrology wrapper step declares `requires`/`provides` and runs via `PipelineExecutor`
- [x] Steps fail fast if required dependency tags are missing (runtime gating enforced)

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- `pnpm test:mapgen`

## Dependencies / Notes

- **System area:** Hydrology/climate artifact spine and consumer reads.
- **Change:** Publish canonical climate + river artifacts (wrap-first) and migrate consumers to read those artifacts instead of engine globals.
- **Outcome:** Downstream steps can declare `requires` on hydrology/climate outputs and remain testable/portable.
- **Scope guardrail:** No new hydrology/geomorphology algorithms in M3; preserve map quality.
- **Depends on:** CIV-41 (runtime gating + step execution).
- **Blocks:** CIV-44 (biomes/features consume climate/river signals).
- **Related:** CIV-43 (story overlays may consume river/climate artifacts).
- **Follow-up:** Full consumer migration onto `artifact:climateField` / `artifact:riverAdjacency` beyond hydrology is owned by CIV-43/CIV-44.
- **Locked decisions for M3 (remove ambiguity):**
  - **River artifact shape/source:** Publish `artifact:riverAdjacency` as a `Uint8Array` mask (0/1) computed once from `EngineAdapter.isAdjacentToRivers()` after engine rivers are modeled. Do **not** promise or model a full river graph in M3; `state:engine.riversModeled` remains the contract for “engine rivers exist on the surface” (tracked as `docs/projects/engine-refactor-v1/deferrals.md` DEF-005).
  - **Step boundaries:** Keep wrapper steps aligned to the existing stage boundaries: `climateBaseline` → `rivers` → `climateRefine` (matching `STAGE_ORDER`). Any future split/merge refactors are post‑M3.
  - **Post‑M3 optionality:** If a “navigable river terrain” distinction becomes necessary, add a second derived mask later; do not expand the river artifact beyond adjacency in M3.
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
