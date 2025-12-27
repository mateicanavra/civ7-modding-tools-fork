---
id: M5-U12
title: "[M5] DEF-010: climate prerequisite reification (remove hidden engine-read prerequisites)"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Make climate generation’s correctness dependencies explicit and TS-owned where feasible (no “read engine later” semantics).

## Goal

Eliminate hidden prerequisites that are satisfied only because some earlier step happened to run and mutate engine state. Climate should be schedulable/verifiable via explicit `field:*` / `artifact:*` products and/or explicit `effect:*` contracts.

## Deliverables

- Inventory climate-related adapter reads and classify which can be reified into TS-owned products.
- Introduce the necessary `field:*` / `artifact:*` prerequisites so cross-step dependencies are explicit.
- Where adapter reads remain necessary, ensure they are explicitly declared and verifiable (effects/contracts), not ambient.

## Acceptance Criteria

- Climate steps do not rely on hidden adapter reads as cross-step prerequisites.
- Any adapter reads that remain are either (a) moved earlier into explicit products or (b) declared/verified as effects with explicit contracts.
- Climate remains runnable under `MockAdapter` with explicit prerequisites (to the degree feasible).

## Testing / Verification

- Standard pipeline run passes under `MockAdapter`.
- Tests exist for the reified products/contracts that replace hidden prerequisites.

## Dependencies / Notes

- **Paper trail:** `docs/projects/engine-refactor-v1/deferrals.md` (DEF-010).
- **Sequencing:** overlaps extraction and schema split; benefits from a boring engine boundary posture (M5-U08).
- **Complexity × parallelism:** medium complexity, mixed parallelism.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Avoid turning “engine readbacks” into implicit globals; if we must read from adapter, make it explicit and testable.

## Prework Prompt (Agent Brief)

Goal: map climate’s hidden prerequisites and propose the explicit products/contracts that replace them.

Deliverables:
- Inventory all adapter reads used by climate generation.
- Classification per read: “can reify into TS product now” vs “must remain adapter read.”
- Proposed artifact/field products needed to eliminate hidden dependencies, including where they are produced/consumed in the pipeline.

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths). Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

Goal: enumerate climate’s adapter reads and propose explicit TS-owned prerequisites (`artifact:*` / `field:*`) so climate correctness doesn’t depend on “engine state happens to be ready”.

### 1) Inventory: adapter reads used by climate generation

Primary climate modules with adapter reads:
- `packages/mapgen-core/src/domain/hydrology/climate/baseline.ts`
- `packages/mapgen-core/src/domain/hydrology/climate/refine/*`
- `packages/mapgen-core/src/domain/hydrology/climate/swatches/*`
- `packages/mapgen-core/src/domain/hydrology/climate/orographic-shadow.ts`

Observed adapter reads (from `rg "\\b(adapter\\.|ctx\\.adapter\\.)" packages/mapgen-core/src/domain/hydrology/climate`):

| Adapter read | Where used | Replaceable with TS-owned product? |
| --- | --- | --- |
| `adapter.isWater(x,y)` | baseline + most refine passes | Yes → `artifact:heightfield` (`HeightfieldBuffer.landMask`) |
| `adapter.getElevation(x,y)` | baseline + refine passes | Yes → `artifact:heightfield` (`HeightfieldBuffer.elevation`) |
| `adapter.getLatitude(x,y)` / `getPlotLatitude` | baseline + orographic/shadow paths | Yes → compute from `RunRequest.settings.latitudeBounds` + `settings.dimensions` |
| `adapter.isAdjacentToRivers(x,y,1)` | river corridor refinement | Mostly yes → `artifact:riverAdjacency` (already published) |
| `adapter.isMountain(x,y)` | orographic shadow sampling (optional) | Yes → derive from `field:terrainType` or `artifact:heightfield.terrain` + terrain constants |
| `adapter.isCoastalLand(x,y)` | swatches | Yes → derive from `landMask` adjacency + terrain/coast info |

### 2) Proposed explicit prerequisites (products/contracts)

Existing products that climate can depend on (already in the repo):
- `artifact:heightfield` (published by hydrology steps; includes `terrain`, `elevation`, `landMask`)
  - `packages/mapgen-core/src/pipeline/artifacts.ts#publishHeightfieldArtifact`
  - Published by:
    - `packages/mapgen-core/src/pipeline/hydrology/LakesStep.ts`
    - `packages/mapgen-core/src/pipeline/hydrology/ClimateBaselineStep.ts`
    - `packages/mapgen-core/src/pipeline/hydrology/RiversStep.ts`
- `artifact:riverAdjacency` (published after rivers)
  - `packages/mapgen-core/src/pipeline/hydrology/RiversStep.ts#publishRiverAdjacencyArtifact`
- `artifact:climateField` (published during climate baseline/refine)

Settings boundary already exists (should be the home for latitude semantics):
- `RunRequest.settings.latitudeBounds` is constructed in `packages/mapgen-core/src/orchestrator/task-graph.ts`.

### 3) Classification + recommended replacements

Reify now (remove adapter reads in climate logic):
- Water + elevation: consume `artifact:heightfield` instead of reading engine state directly.
  - This aligns with the existing `syncHeightfield(ctx)` behavior (`packages/mapgen-core/src/core/types.ts`) which already materializes `terrain/elevation/landMask` into TS buffers.
- Latitude: compute from settings (no engine readback required).
  - Keep adapter latitude reads only as a civ-runtime debugging/validation tool if needed.
- River adjacency: consume `artifact:riverAdjacency` (already required by some climate paths; see `packages/mapgen-core/src/domain/hydrology/climate/runtime.ts` warnings/errors).

Potentially keep as adapter reads temporarily (if any gaps appear during implementation):
- Anything that is not yet represented in TS buffers (e.g., if some step mutates engine terrain without updating buffers/artifacts).
  - Use this as a signal to fix publication/wiring, not to keep permanent adapter reads.

### 4) Pipeline implications (where products are produced/consumed)

Current order (standard hydrology layer):
- `lakes` → `climateBaseline` → `rivers` → `climateRefine`

Explicit prerequisites implied by the replacement plan:
- `climateBaseline` should require `artifact:heightfield` (or publish it first, then run baseline using TS-owned heightfield).
- `climateRefine` should require:
  - `artifact:heightfield`
  - `artifact:riverAdjacency` (for river corridor refinement)
  - `artifact:climateField` (baseline produced rainfall/humidity fields)
  - `artifact:foundation.dynamics@v1` (once DEF‑014 split lands) for wind-driven refinement paths
