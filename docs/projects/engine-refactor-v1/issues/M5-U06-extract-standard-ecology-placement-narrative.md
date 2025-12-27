---
id: M5-U06
title: "[M5] Move standard steps + domain helpers: ecology, placement, narrative clusters"
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

Move the remaining major standard-domain clusters (ecology, placement, narrative) out of core into the standard mod package so core has no structural reason to embed standard behavior.

## Goal

Finish the extraction: after this unit, core should be structurally generic, and the standard pipeline should be mod-owned end-to-end (steps + helpers + registrations).

## Deliverables

- Move ecology/placement/narrative step implementations into the standard mod package.
- Move domain helpers with them (including any adapter-facing helpers or tag/recipe wiring that is standard-domain).
- Leave only shared, cross-domain primitives in core.

## Acceptance Criteria

- Ecology/placement/narrative steps execute from the standard mod package (not core).
- Core retains only generic primitives (no domain ownership).
- Standard smoke test remains green under `MockAdapter`.

## Testing / Verification

- Standard pipeline execution passes (MockAdapter).
- Workspace typecheck/build remains green after moves.

## Dependencies / Notes

- **Blocked by:** M5-U03 (registry/tags/recipes extraction).
- **Paper trail:** narrative has already been migrated off StoryTags in M4 (CIV-74); this unit is about ownership/packaging, not “bring StoryTags back.”
- **Complexity × parallelism:** high complexity, medium parallelism.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Pay special attention to adapter-facing helpers; keep the boundary boring and explicit (avoid reintroducing ambient/global patterns).
- Treat narrative artifacts/queries as standard-mod owned, not core owned, unless they are intentionally made generic primitives.

## Prework Prompt (Agent Brief)

Goal: map the dependency/ownership edges so the extraction is safe and complete.

Deliverables:
- A dependency map for ecology/placement/narrative step clusters.
- A proposed “stays core” vs “moves with mod” decision list, with special attention to adapter-facing helpers and tag definitions.
- A list of any runtime entrypoints or exports that still assume these domains are core-owned.

Method / tooling:
- Use the Narsil MCP server for deep code intel as needed (symbol references, dependency graphs, call paths). Re-index before you start so findings match the tip you’re working from.
- The prework output should answer almost all implementation questions; implementation agents should not have to rediscover basic call paths or hidden consumers.

Completion rule:
- Once the prework packet is written up, delete this “Prework Prompt” section entirely (leave only the prework findings) so implementation agents don’t misread it as remaining work.

## Pre-work

Goal: map ecology + placement + narrative clusters (steps + helpers) and flag the adapter-facing and tag/recipe couplings that must be handled explicitly when the standard mod boundary becomes real.

### 1) Dependency map: ecology cluster

Layer wiring (standard-owned composition):
- `packages/mapgen-core/src/pipeline/ecology/index.ts` registers:
  - `biomes` (`packages/mapgen-core/src/pipeline/ecology/BiomesStep.ts`)
  - `features` (`packages/mapgen-core/src/pipeline/ecology/FeaturesStep.ts`)

Primary domain modules invoked by those steps:
- `packages/mapgen-core/src/domain/ecology/biomes/**`
- `packages/mapgen-core/src/domain/ecology/features/**`

Key inputs / couplings:
- Ecology consumes published artifacts + narrative queries:
  - `designateEnhancedBiomes(...)` reads:
    - `artifact:climateField` + `artifact:riverAdjacency` (via `packages/mapgen-core/src/pipeline/artifacts.ts`)
    - narrative motifs/corridors via `packages/mapgen-core/src/domain/narrative/queries.ts`
  - `addDiverseFeatures(...)` reads:
    - `artifact:climateField`
    - reified `field:biomeId`
    - narrative motifs/margins via `queries.ts`
- Ecology depends on engine surfaces via adapter calls (vanilla baseline):
  - `adapter.designateBiomes(...)`
  - `adapter.addFeatures(...)`
  - biome/feature globals + indices lookups (`adapter.getBiomeGlobal(...)`, `adapter.getFeatureTypeIndex(...)`, etc.)

### 2) Dependency map: placement cluster

Layer wiring (standard-owned composition):
- `packages/mapgen-core/src/pipeline/placement/index.ts` registers:
  - `derivePlacementInputs` (`packages/mapgen-core/src/pipeline/placement/DerivePlacementInputsStep.ts`)
  - `placement` (`packages/mapgen-core/src/pipeline/placement/PlacementStep.ts`)

Artifacts owned by the placement cluster:
- `artifact:placementInputs@v1` (`packages/mapgen-core/src/pipeline/placement/placement-inputs.ts`)
- `artifact:placementOutputs@v1` (`packages/mapgen-core/src/pipeline/placement/placement-outputs.ts`)
- Published via `packages/mapgen-core/src/pipeline/artifacts.ts`

Domain code invoked:
- `packages/mapgen-core/src/domain/placement/**` (e.g. `runPlacement(...)`, wonders helpers)

Adapter-facing coupling:
- Placement ultimately calls into base-standard/engine via the adapter (start positions, region division, etc.).
  - This is exactly the sort of civ-runtime-only integration that should live in the civ adapter / standard mod, not in the generic core engine.

### 3) Dependency map: narrative cluster

Layer wiring (standard-owned composition):
- `packages/mapgen-core/src/pipeline/narrative/index.ts` registers:
  - `storySeed`, `storyHotspots`, `storyRifts`, `storyOrogeny`,
    `storyCorridorsPre`, `storySwatches`, `storyCorridorsPost`
  - Step implementations live under `packages/mapgen-core/src/pipeline/narrative/**`

Primary domain modules:
- `packages/mapgen-core/src/domain/narrative/**`

Key inputs / couplings:
- Narrative consumes foundation tensors (`assertFoundationContext(...)`) for rifts/orogeny/etc.
- Narrative publishes multiple artifacts via standard tag IDs:
  - Example: `packages/mapgen-core/src/domain/narrative/orogeny/belts.ts` imports `M3_DEPENDENCY_TAGS` to publish `artifact:narrative.motifs.orogeny@v1`.
- Narrative uses adapter reads (water/elevation/latitude) throughout the “utils” layer (e.g. `utils/water.ts`, `utils/latitude.ts`), so engine-boundary work (`M5-U08`) and climate prerequisite reification (`M5-U12`) will overlap.

### 4) “Moves with mod” vs “stays core” (ownership sketch)

Moves with the standard mod (domain-owned):
- `packages/mapgen-core/src/pipeline/ecology/**` + `packages/mapgen-core/src/domain/ecology/**`
- `packages/mapgen-core/src/pipeline/placement/**` + `packages/mapgen-core/src/domain/placement/**`
- `packages/mapgen-core/src/pipeline/narrative/**` + `packages/mapgen-core/src/domain/narrative/**`
- Standard tag catalog / artifact ids that are currently defined in core (`packages/mapgen-core/src/pipeline/tags.ts`)

Likely stays in core as shared primitives:
- Generic pipeline engine primitives (`compileExecutionPlan`, `PipelineExecutor`, `StepRegistry`)
- Context + artifact store infrastructure (`packages/mapgen-core/src/core/types.ts`)
- Shared math/grid helpers (`packages/mapgen-core/src/lib/**`)

### 5) Runtime entrypoints/exports that assume “standard lives in core”

These will need inversion once the standard mod is externalized:
- `packages/mapgen-core/src/index.ts` re-exports `@mapgen/domain/*` and `standardMod`
- `packages/mapgen-core/src/orchestrator/task-graph.ts` builds standard step configs and imports the standard mod directly
