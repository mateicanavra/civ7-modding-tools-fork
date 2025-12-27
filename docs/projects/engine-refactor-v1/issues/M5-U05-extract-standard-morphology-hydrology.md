---
id: M5-U05
title: "[M5] Move standard steps + domain helpers: morphology & hydrology cluster"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture, Packaging]
parent: null
children: []
blocked_by: [M5-U03]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Move the morphology/hydrology step implementations (and their domain helpers) out of core into the standard mod package.

## Goal

Continue extraction of standard-domain behavior until core is structurally generic. After this unit, core should not need to “know” morphology/hydrology exist.

## Deliverables

- Move morphology/hydrology step implementations into the standard mod package.
- Move domain helpers with them, retaining only true shared primitives in core.
- Remove or invert any remaining core→standard import edges.

## Acceptance Criteria

- Morphology/hydrology steps execute from the standard mod package (not from core).
- Core retains only generic primitives; no “standard pipeline knowledge” is embedded.
- Standard smoke test remains green (including `MockAdapter` runs).

## Testing / Verification

- Standard pipeline execution passes (MockAdapter).
- Workspace typecheck/build remains green after moves.

## Dependencies / Notes

- **Blocked by:** M5-U03 (registry/tags/recipes extraction).
- **Complexity × parallelism:** high complexity, medium parallelism.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Treat shared helpers skeptically: if it exists only because the standard pipeline needs it, it should probably move.

## Prework Prompt (Agent Brief)

Goal: map the cluster so extraction is mechanical and we don’t accidentally keep domain ownership in core.

Deliverables:
- A dependency map for morphology/hydrology steps and helpers.
- A list of shared utility candidates vs domain helpers that must move with the mod.
- A list of boundary reshapes required (imports, exports, shared-primitives API adjustments).

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths). Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

Goal: map morphology + hydrology clusters (steps + helpers) so extraction is mostly mechanical moves, with explicit callouts for the few cross-domain couplings.

### 1) Dependency map: morphology cluster

Layer wiring (standard-owned composition):
- `packages/mapgen-core/src/pipeline/morphology/index.ts` registers:
  - `landmassPlates` (`packages/mapgen-core/src/pipeline/morphology/LandmassStep.ts`)
  - `coastlines` (`packages/mapgen-core/src/pipeline/morphology/CoastlinesStep.ts`)
  - `ruggedCoasts` (`packages/mapgen-core/src/pipeline/morphology/RuggedCoastsStep.ts`)
  - `islands` (`packages/mapgen-core/src/pipeline/morphology/IslandsStep.ts`)
  - `mountains` (`packages/mapgen-core/src/pipeline/morphology/MountainsStep.ts`)
  - `volcanoes` (`packages/mapgen-core/src/pipeline/morphology/VolcanoesStep.ts`)

Primary domain modules invoked by those steps:
- Landmass + ocean separation:
  - `packages/mapgen-core/src/domain/morphology/landmass/**`
- Coastlines / rugged coasts:
  - `packages/mapgen-core/src/domain/morphology/coastlines/**`
- Islands:
  - `packages/mapgen-core/src/domain/morphology/islands/**`
- Mountains + volcanoes:
  - `packages/mapgen-core/src/domain/morphology/mountains/**`
  - `packages/mapgen-core/src/domain/morphology/volcanoes/**`

Key shared inputs / cross-domain couplings to note:
- Foundation dependency:
  - Most morphology domain functions call `assertFoundationContext(...)` and read `foundation.plates.*` tensors (plate id, boundary closeness/type, uplift, etc.).
- Narrative coupling (already present today):
  - `packages/mapgen-core/src/domain/morphology/coastlines/rugged-coasts.ts` reads narrative artifacts via `getNarrativeCorridors(...)` / `getNarrativeMotifsMargins(...)` for sea-lane and margin-aware carving.

### 2) Dependency map: hydrology cluster

Layer wiring (standard-owned composition):
- `packages/mapgen-core/src/pipeline/hydrology/index.ts` registers:
  - `lakes` (`packages/mapgen-core/src/pipeline/hydrology/LakesStep.ts`)
  - `climateBaseline` (`packages/mapgen-core/src/pipeline/hydrology/ClimateBaselineStep.ts`)
  - `rivers` (`packages/mapgen-core/src/pipeline/hydrology/RiversStep.ts`)
  - `climateRefine` (`packages/mapgen-core/src/pipeline/hydrology/ClimateRefineStep.ts`)

Primary domain modules invoked by those steps:
- Climate baseline/refine/swatches runtime:
  - `packages/mapgen-core/src/domain/hydrology/climate/**`

Key shared inputs / cross-domain couplings to note:
- Foundation dependency:
  - Climate refinement/swatches read `foundation.dynamics.*` (wind/currents/pressure) via `assertFoundationContext(...)`.
- Narrative coupling:
  - Rivers step optionally calls `storyTagClimatePaleo(...)` (`packages/mapgen-core/src/domain/narrative/swatches.ts`) when story is enabled, then republishes climate artifacts.

Hydrology publishes shared artifacts used by later steps:
- `packages/mapgen-core/src/pipeline/hydrology/RiversStep.ts` + `LakesStep.ts` publish artifacts via `packages/mapgen-core/src/pipeline/artifacts.ts`:
  - `publishHeightfieldArtifact(...)`
  - `publishClimateFieldArtifact(...)`
  - `publishRiverAdjacencyArtifact(...)`
  - `computeRiverAdjacencyMask(...)`
These helper modules are “standard pipeline infra” rather than generic core primitives.

### 3) “Moves with mod” vs “stays core” (ownership sketch)

Moves with the standard mod (domain-owned):
- `packages/mapgen-core/src/pipeline/morphology/**` and `packages/mapgen-core/src/domain/morphology/**`
- `packages/mapgen-core/src/pipeline/hydrology/**` and `packages/mapgen-core/src/domain/hydrology/**`
- `packages/mapgen-core/src/pipeline/artifacts.ts` (standard artifact publication helpers)

Likely stays in core as shared primitives:
- Pipeline engine primitives (`StepRegistry`, `PipelineExecutor`, `compileExecutionPlan`) and tag infrastructure (`TagRegistry` class)
- Shared math/grid utilities (`packages/mapgen-core/src/lib/**`)
- Context + writers infrastructure (`packages/mapgen-core/src/core/types.ts`) — but note DEF‑014/`M5-U11` will reshape `artifact:foundation`.

### 4) Extraction risk notes (import edges to watch)

Morphology ↔ narrative coupling:
- If narrative moves later than morphology, rugged coast carving will need an intermediate API (or co-move those modules).

Hydrology ↔ narrative coupling:
- `storyTagClimatePaleo(...)` is called from hydrology; extraction ordering should either co-move the paleo helper or make it an optional hook owned by the standard mod.
