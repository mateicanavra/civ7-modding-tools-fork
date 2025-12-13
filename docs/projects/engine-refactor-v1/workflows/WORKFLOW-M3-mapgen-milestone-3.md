# WORKFLOW: Milestone 3 - Core Engine Refactor & Config Evolution

**Milestone ID:** `M3-core-engine-refactor-config-evolution`
**Status:** Active
**Last Updated:** 2025-12-13

> This workflow describes the complete execution path through M3, with tasks organized by dependency chains, parallelization opportunities, and explicit sequencing. Use AGENTS.md breadcrumbs to navigate to canonical documentation.

---

## Quick Navigation (AGENTS.md Breadcrumbs)

### Canonical Documentation
- **Milestone Definition:** `docs/projects/engine-refactor-v1/milestones/M3-core-engine-refactor-config-evolution.md`
- **Project Brief:** `docs/projects/engine-refactor-v1/PROJECT-engine-refactor-v1.md`
- **Current Status:** `docs/projects/engine-refactor-v1/status.md`

### Architecture References
- **Engine Architecture:** `docs/system/libs/mapgen/architecture.md`
- **Foundation Design:** `docs/system/libs/mapgen/foundation.md`
- **Design Principles:** `docs/system/libs/mapgen/design.md`

### PRD References
- **Pipeline Refactor PRD:** `docs/projects/engine-refactor-v1/resources/PRD-pipeline-refactor.md`
- **Config Refactor PRD:** `docs/projects/engine-refactor-v1/resources/PRD-config-refactor.md`
- **Plate Generation PRD:** `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`

### Status & Tracking
- **Parity Matrix:** `docs/projects/engine-refactor-v1/resources/STATUS-M-TS-parity-matrix.md`
- **Config Wiring Status:** `docs/projects/engine-refactor-v1/resources/config-wiring-status.md`

### Issue Files
- **Story System (M3):** `docs/projects/engine-refactor-v1/issues/LOCAL-M3-story-system.md`
- **Pipeline Step 1:** `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-foundation-step-1-pipeline.md`

### Code Locations
- **mapgen-core:** `packages/mapgen-core/src/`
- **Config Schema:** `packages/mapgen-core/src/config/schema.ts`
- **Config Loader:** `packages/mapgen-core/src/config/loader.ts`
- **Orchestrator:** `packages/mapgen-core/src/MapOrchestrator.ts`
- **Story Tags/Overlays:** `packages/mapgen-core/src/story/`
- **Layers:** `packages/mapgen-core/src/layers/`
- **World Model:** `packages/mapgen-core/src/world/`
- **Dev Tools:** `packages/mapgen-core/src/dev/`

### Legacy Reference (JS Archive)
- **Story Tagging:** `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/story/tagging.js`
- **Corridors:** `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/story/corridors.js`
- **Presets:** `docs/system/libs/mapgen/_archive/original-mod-swooper-maps-js/bootstrap/presets/`

---

## M3 Objectives Summary

1. **Pipeline Generalization:** Make all major stages run as `MapGenStep`s with explicit `requires`/`provides`
2. **Config Evolution:** Evolve `MapGenConfig` from Phase 1 "hygiene" into step-aligned, phase-aware config
3. **Data Products:** Establish canonical data products (`FoundationContext`, `Heightfield`, `ClimateField`, `StoryOverlays`)
4. **Story System Completion:** Port remaining narrative layers (corridors, swatches, paleo) and wrap as steps

---

## Execution Phases

M3 is organized into **5 sequential phases** with parallelizable work within each phase.

```
Phase A: Pipeline Infrastructure (foundation)
    ↓
Phase B: Config Integration (Phase 2 of PRD)
    ↓
Phase C: Legacy Wrapper Steps + Story System (parallel tracks)
    ↓
Phase D: Config Shape Evolution (Phase 3 of PRD)
    ↓
Phase E: Validation & Cleanup
```

---

## Phase A: Pipeline Infrastructure

**Goal:** Establish `MapGenStep`, `StepRegistry`, and `PipelineExecutor` as the foundation for all subsequent work.

**Prerequisites:** M2 complete (validated config, foundation slice, minimal story parity)

### A.1 Core Pipeline Primitives [SEQUENTIAL]

**Issue:** `LOCAL-TBD-foundation-step-1-pipeline.md`

```
A.1.1 Define MapGenStep Interface
├── Location: packages/mapgen-core/src/core/pipeline.ts
├── Deliverables:
│   ├── MapGenStep interface (id, phase, requires, provides, shouldRun, run)
│   ├── StepConfig type for per-step configuration
│   └── StepResult type for step outputs
├── Reference: PRD-pipeline-refactor.md §3.1
└── AC: Interface compiles, types exported from core/index.ts

A.1.2 Implement StepRegistry
├── Location: packages/mapgen-core/src/core/pipeline.ts
├── Deliverables:
│   ├── StepRegistry class (Map-based plugin system)
│   ├── register(step), get(id), getByPhase(phase) methods
│   └── Registration validation (no duplicate IDs)
├── Reference: PRD-pipeline-refactor.md §3.1
└── AC: Unit tests pass for registration/retrieval/error cases

A.1.3 Implement PipelineExecutor
├── Location: packages/mapgen-core/src/core/pipeline.ts
├── Deliverables:
│   ├── PipelineExecutor class
│   ├── run(context, recipe) method
│   ├── Dependency validation (requires present before step runs)
│   ├── MissingDependencyError for fail-fast behavior
│   └── Step timing/logging integration
├── Reference: PRD-pipeline-refactor.md §4.1–4.2
└── AC: Executor runs steps in order, fails fast on missing deps
```

### A.2 MapGenContext Evolution [SEQUENTIAL after A.1]

```
A.2.1 Extend MapGenContext with artifacts
├── Location: packages/mapgen-core/src/core/types.ts
├── Deliverables:
│   ├── artifacts container (mesh, crust, plateGraph, tectonics)
│   ├── Clear separation: fields (mutable output) vs artifacts (intermediate)
│   └── Type guards for artifact presence checks
├── Reference: foundation.md data model, architecture.md §MapGenContext
└── AC: Context types compile, backward compatible with existing code

A.2.2 Define Foundation artifact types
├── Location: packages/mapgen-core/src/core/types.ts
├── Deliverables:
│   ├── RegionMesh interface
│   ├── CrustData interface
│   ├── PlateGraph interface
│   ├── TectonicData interface
│   └── Export from core/index.ts
├── Reference: LOCAL-TBD-foundation-step-1-pipeline.md implementation notes
└── AC: Types match foundation.md spec, used by existing FoundationContext
```

### A.3 Foundation Pipeline Pilot [SEQUENTIAL after A.2]

**Goal:** Implement Foundation as the first concrete Task Graph pilot.

```
A.3.1 Wrap existing foundation as step
├── Location: packages/mapgen-core/src/steps/foundation/
├── Deliverables:
│   ├── FoundationStep implements MapGenStep
│   ├── Wraps existing WorldModel + plate generation
│   ├── provides: ['foundation', 'heightfield']
│   └── Register in StepRegistry
├── Reference: PRD-plate-generation.md, foundation.md
└── AC: Foundation runs via executor, produces FoundationContext

A.3.2 Integrate executor into MapOrchestrator
├── Location: packages/mapgen-core/src/MapOrchestrator.ts
├── Deliverables:
│   ├── Call PipelineExecutor for foundation phase
│   ├── Sync artifacts to legacy WorldModel for downstream
│   └── Preserve backward compatibility
├── Reference: PRD-pipeline-refactor.md §4.3 (Legacy Bridge)
└── AC: Existing tests pass, foundation runs via pipeline
```

**Phase A Verification:**
```bash
pnpm -C packages/mapgen-core test
pnpm -C packages/mapgen-core run check-types
```

---

## Phase B: Config Integration (PRD Phase 2)

**Goal:** Make validated `MapGenConfig` the single read path for all steps via context.

**Prerequisites:** Phase A complete

### B.1 Context Config Integration [SEQUENTIAL]

```
B.1.1 Ensure MapGenContext.config is populated
├── Location: packages/mapgen-core/src/core/types.ts, MapOrchestrator.ts
├── Deliverables:
│   ├── context.config: MapGenConfig required field
│   ├── Orchestrator populates at start
│   └── Executor validates config presence
├── Reference: PRD-config-refactor.md §5.1
└── AC: All contexts have validated config, no globals

B.1.2 Step config consumption convention
├── Location: packages/mapgen-core/src/core/pipeline.ts
├── Deliverables:
│   ├── Define how steps read config (context.config.<group>)
│   ├── Helper: getStepConfig<T>(ctx, 'groupName')
│   └── Document convention in architecture.md
├── Reference: PRD-config-refactor.md §5.3
└── AC: Convention documented, helper works for foundation config
```

### B.2 Domain Sub-schema Mapping [PARALLEL]

Map domain-specific configs into sub-schemas of `MapGenConfig`:

```
B.2.1 Foundation config sub-schema          B.2.2 Morphology config sub-schema
├── plates → config.foundation.plates       ├── mountains → config.mountains
├── dynamics → config.foundation.dynamics   ├── volcanoes → config.volcanoes
├── directionality → foundation.dynamics    ├── landmass → config.landmass
└── AC: Foundation steps read from schema   └── AC: Morphology layers read from schema

B.2.3 Climate config sub-schema             B.2.4 Story config sub-schema
├── baseline → config.climate.baseline      ├── hotspots → config.story.hotspot
├── refine → config.climate.refine          ├── rifts → config.story.rifts (new)
├── swatches → config.climate.swatches      ├── corridors → config.corridors
└── AC: Climate layers read from schema     └── AC: Story stages read from schema

B.2.5 Placement config sub-schema
├── starts → config.placement.starts
├── floodplains → config.placement.floodplains
└── AC: Placement layer reads from schema
```

### B.3 Tunables Reduction [SEQUENTIAL after B.2]

```
B.3.1 Audit tunables consumers
├── Location: packages/mapgen-core/src/bootstrap/tunables.ts
├── Deliverables:
│   ├── List all FOUNDATION_CFG, CLIMATE_CFG consumers
│   ├── Identify which can migrate to context.config
│   └── Mark legacy-only surfaces
├── Reference: config-wiring-status.md
└── AC: Migration plan documented

B.3.2 Migrate high-priority consumers to context.config
├── Location: packages/mapgen-core/src/layers/*.ts
├── Deliverables:
│   ├── climate-engine.ts reads from context.config.climate
│   ├── mountains.ts reads from context.config.mountains
│   ├── volcanoes.ts reads from context.config.volcanoes
│   └── Update tests
└── AC: Major layers no longer depend on tunables
```

**Phase B Verification:**
```bash
pnpm -C packages/mapgen-core test
pnpm -C packages/mapgen-core run check-types
```

---

## Phase C: Legacy Wrapper Steps + Story System

**Goal:** Wrap remaining legacy phases as steps, complete story system port.

**Prerequisites:** Phase B complete

### C.1 Legacy Wrapper Steps [PARALLEL TRACK]

Create `MapGenStep` wrappers for each legacy phase:

```
C.1.1 LegacyMorphologyStep                  C.1.2 LegacyHydrologyStep
├── Wraps: landmass, coastlines,            ├── Wraps: lakes, rivers
│          islands, mountains, volcanoes    ├── requires: ['foundation', 'heightfield']
├── requires: ['foundation']                ├── provides: ['hydrology', 'riverFlow']
├── provides: ['heightfield', 'shoreMask']  └── Location: steps/legacy/hydrology.ts
└── Location: steps/legacy/morphology.ts

C.1.3 LegacyClimateStep                     C.1.4 LegacyBiomesStep
├── Wraps: climateBaseline, climateRefine   ├── Wraps: biomes, features
├── requires: ['heightfield', 'hydrology']  ├── requires: ['heightfield', 'climateField']
├── provides: ['climateField']              ├── provides: ['biomeField', 'featureField']
└── Location: steps/legacy/climate.ts       └── Location: steps/legacy/biomes.ts

C.1.5 LegacyPlacementStep
├── Wraps: placement
├── requires: ['heightfield', 'biomeField']
├── provides: ['playerStarts', 'resources']
└── Location: steps/legacy/placement.ts
```

### C.2 Story System Completion [PARALLEL TRACK]

**Issue:** `LOCAL-M3-story-system.md`

```
C.2.1 Port story/tagging.ts passes [SEQUENTIAL]
├── C.2.1a Orogeny belts + windward/lee caches (if not in M2)
│   ├── Location: packages/mapgen-core/src/story/tagging.ts
│   ├── Deliverables: storyTagOrogenyBelts(), OrogenyCache
│   └── Reference: original-mod-swooper-maps-js/story/tagging.js
│
├── C.2.1b Climate swatches
│   ├── Deliverables: storyTagClimateSwatches()
│   ├── Publishes: StoryOverlays.SWATCHES
│   └── Supports: macroDesertBelt, equatorialRainbelt, etc.
│
└── C.2.1c Paleo hydrology
    ├── Deliverables: storyTagPaleoHydrology()
    ├── Publishes: StoryOverlays.PALEO
    └── Overlays: deltas, oxbows, fossil channels

C.2.2 Port story/corridors.ts [SEQUENTIAL after C.2.1]
├── Location: packages/mapgen-core/src/story/corridors.ts
├── Deliverables:
│   ├── storyTagStrategicCorridors(stage: 'pre-islands' | 'post-rivers')
│   ├── Sea lane tagging
│   ├── Island-hop corridors
│   ├── Land-open corridors
│   ├── River-chain corridors
│   └── Corridor kind/style/attribute metadata
├── Reference: original-mod-swooper-maps-js/story/corridors.js
└── AC: All corridor types populated when stages enabled

C.2.3 Canonicalize StoryOverlays [SEQUENTIAL after C.2.2]
├── Location: packages/mapgen-core/src/story/overlays.ts
├── Deliverables:
│   ├── Add STORY_OVERLAY_KEYS: OROGENY, SWATCHES, PALEO, CORRIDORS_PRE, CORRIDORS_POST
│   ├── All story outputs publish through StoryOverlays
│   ├── StoryOverlays as authoritative product
│   └── Reduce direct StoryTags mutation where possible
├── Reference: architecture.md data products
└── AC: Downstream consumers use StoryOverlays rather than ad-hoc reads

C.2.4 Wrap story system as MapGenSteps [SEQUENTIAL after C.2.3]
├── StoryHotspotsStep
│   ├── requires: ['foundation'], provides: ['storyHotspots']
├── StoryRiftsStep
│   ├── requires: ['foundation'], provides: ['storyRifts']
├── StoryOrogenyStep
│   ├── requires: ['foundation', 'storyRifts'], provides: ['storyOrogeny']
├── StorySwatchesStep
│   ├── requires: ['climateField'], provides: ['storySwatches']
├── StoryCorridorsPreStep
│   ├── requires: ['foundation'], provides: ['corridorsPre']
├── StoryCorridorsPostStep
│   ├── requires: ['hydrology'], provides: ['corridorsPost']
└── StoryPaleoStep
    ├── requires: ['hydrology'], provides: ['storyPaleo']
```

### C.3 Data Product Canonicalization [AFTER C.1 + C.2]

```
C.3.1 Heightfield as canonical product
├── Location: packages/mapgen-core/src/core/types.ts
├── Deliverables:
│   ├── Heightfield interface (elevation, terrain, landMask)
│   ├── Final heightfield published after morphology
│   └── Downstream stages consume via context.heightfield
└── AC: No direct GameplayMap reads in modernized stages

C.3.2 ClimateField as canonical product
├── Deliverables:
│   ├── ClimateField interface (rainfall, humidity grids)
│   ├── Published after climate refinement
│   └── Climate consumers read ClimateField not GameplayMap
└── AC: config-wiring-status shows ClimateField wired

C.3.3 StoryOverlays as canonical product
├── Deliverables:
│   ├── All overlays populated and versioned
│   ├── Consumers use getStoryOverlay() API
│   └── Legacy StoryTags reduced to compat layer
└── AC: No direct StoryTags reads in new code

C.3.4 River flow data product
├── Deliverables:
│   ├── RiverFlowData interface (graph or masks)
│   ├── Published by hydrology step
│   └── Available for paleo/corridors
└── AC: River data accessible as product
```

**Phase C Verification:**
```bash
pnpm -C packages/mapgen-core test
pnpm run check-types
# Manual: Enable story stages and verify behavior in game
```

---

## Phase D: Config Shape Evolution (PRD Phase 3)

**Goal:** Flatten config to step/phase-aligned sections, retire tunables.

**Prerequisites:** Phase C complete (all steps exist, can see which knobs matter)

### D.1 Config Shape Rationalization [SEQUENTIAL]

```
D.1.1 Design new config shape
├── Location: packages/mapgen-core/src/config/schema.ts
├── Deliverables:
│   ├── Flatten nested patterns (foundation.mountains → mountains)
│   ├── Step-aligned groups:
│   │   ├── plates, landmass, mountains, volcanoes
│   │   ├── climate, rivers, humidity
│   │   ├── story, corridors, overlays
│   │   └── placement, diagnostics
│   └── Document rationale in schema comments
├── Reference: PRD-config-refactor.md §6.1
└── AC: New shape documented, migration path clear

D.1.2 Implement config shape migration
├── Deliverables:
│   ├── Old-shape adapter for backward compat
│   ├── parseConfig() handles both shapes
│   ├── Console warnings for deprecated paths
│   └── Deprecation timeline documented
└── AC: Existing Swooper map scripts still work

D.1.3 Update all config consumers
├── Location: packages/mapgen-core/src/**/*.ts
├── Deliverables:
│   ├── All steps/layers read new shape via context.config
│   ├── Remove legacy tunables lookups
│   └── Update tests
└── AC: No FOUNDATION_CFG/CLIMATE_CFG reads in new code
```

### D.2 Tunables Retirement [SEQUENTIAL after D.1]

```
D.2.1 Reduce tunables to minimal compat shim
├── Location: packages/mapgen-core/src/bootstrap/tunables.ts
├── Deliverables:
│   ├── Keep only: STAGE_MANIFEST, stageEnabled()
│   ├── Remove: FOUNDATION_CFG, CLIMATE_CFG facades
│   ├── Legacy consumers get deprecation warnings
│   └── Document migration in CHANGELOG
└── AC: tunables.ts < 100 LOC

D.2.2 Update map script entries
├── Location: mods/mod-swooper-maps/src/map-entries/*.ts
├── Deliverables:
│   ├── Map scripts provide config in new shape
│   ├── Remove preset indirection if applicable
│   └── Verify all entries still work
└── AC: All map entries use new config shape
```

### D.3 Presets & Recipes [OPTIONAL M3 / CAN DEFER]

```
D.3.1 Define preset resolution model
├── Deliverables:
│   ├── Canonical BASE_CONFIG
│   ├── Named presets: classic, temperate, etc.
│   ├── Resolution: BASE + preset + overrides
│   └── Where resolution lives (bootstrap vs pipeline)
└── AC: presets field works if present

D.3.2 Document recipe format
├── Deliverables:
│   ├── Pipeline recipe JSON format
│   ├── Step enable/disable via recipe
│   ├── Per-step config overrides
│   └── Example recipes in docs/
└── AC: Recipe format documented for M4+
```

**Phase D Verification:**
```bash
pnpm -C packages/mapgen-core test
pnpm run check-types
# Manual: Test with both old and new config shapes
```

---

## Phase E: Validation & Cleanup

**Goal:** Enforce requires/provides, adapter cleanup, final polish.

**Prerequisites:** Phase D complete

### E.1 Dependency Validation [SEQUENTIAL]

```
E.1.1 Implement requires/provides enforcement
├── Location: packages/mapgen-core/src/core/pipeline.ts
├── Deliverables:
│   ├── PipelineExecutor validates requires before each step
│   ├── Validates provides after each step
│   ├── MissingDependencyError with clear message
│   └── Dev mode: dependency graph visualization
└── AC: Missing deps fail fast with actionable errors

E.1.2 Stage manifest dependency semantics
├── Location: packages/mapgen-core/src/bootstrap/resolved.ts
├── Deliverables:
│   ├── StageManifest.stages[].requires actually enforced
│   ├── Provides tracked and validated
│   ├── Cycle detection
│   └── Warning for unused provides
└── AC: Dependency graph validated at bootstrap
```

### E.2 Adapter Boundary Cleanup [OPTIONAL M3]

```
E.2.1 Extend EngineAdapter for map-init
├── Location: @civ7/adapter
├── Deliverables:
│   ├── EngineAdapter covers map initialization
│   ├── Delete internal OrchestratorAdapter
│   ├── Match architecture.md boundary
│   └── Civ7-specific init stays in adapter
└── AC: Single adapter boundary, architecture.md aligned

E.2.2 Non-Civ7 adapter surface
├── Deliverables:
│   ├── Minimal API for non-Civ7 adapters
│   ├── Document required vs optional methods
│   └── Example: HeadlessAdapter for tests
└── AC: Tests run without Civ7 engine
```

### E.3 Final Verification & Documentation [SEQUENTIAL]

```
E.3.1 Comprehensive testing
├── Deliverables:
│   ├── Smoke tests for all step clusters
│   ├── Integration test: full pipeline execution
│   ├── Story system behavior checks
│   └── Config shape migration tests
└── AC: All tests pass, coverage targets met

E.3.2 Documentation updates
├── Locations:
│   ├── docs/system/libs/mapgen/architecture.md (Config, Pipeline sections)
│   ├── docs/system/libs/mapgen/foundation.md (FoundationContext)
│   ├── config-wiring-status.md (all fields)
│   ├── STATUS-M-TS-parity-matrix.md (close remaining gaps)
│   └── CHANGELOG.md
└── AC: Docs match implementation, no stale content

E.3.3 Parity matrix cleanup
├── Location: STATUS-M-TS-parity-matrix.md
├── Deliverables:
│   ├── Update all story/corridor rows to Parity
│   ├── Close or defer remaining Detraction/Open items
│   ├── Document intentional divergences
│   └── Link issues for any remaining gaps
└── AC: No unexplained Missing rows for M3 scope
```

**Phase E Verification:**
```bash
pnpm test
pnpm run check-types
./scripts/lint-adapter-boundary.sh
```

---

## Parallelization Summary

```
PHASE A (Sequential Foundation)
│
└─> PHASE B (Config Integration)
    │
    └─> PHASE C ─┬─> C.1 Legacy Wrappers ──────┬─> C.3 Data Products
                 │                              │
                 └─> C.2 Story System ─────────┘
                     │
                     └─> PHASE D (Config Evolution)
                         │
                         └─> PHASE E (Validation)
```

**Within-Phase Parallelism:**
- **Phase B.2:** All sub-schema mappings (B.2.1–B.2.5) can run in parallel
- **Phase C.1:** All legacy wrapper steps can be developed in parallel
- **Phase C.2.1:** Story tagging passes can be developed in parallel
- **Phase E.2:** Adapter work can run parallel to E.1 and E.3

---

## Issue Tracking

### Create Issues For:

**Phase A:**
- [ ] `CIV-XX: Core Pipeline Primitives (MapGenStep, Registry, Executor)`
- [ ] `CIV-XX: MapGenContext artifacts evolution`
- [ ] `CIV-XX: Foundation Pipeline Pilot`

**Phase B:**
- [ ] `CIV-XX: Config Integration Phase 2`
- [ ] `CIV-XX: Tunables reduction audit`

**Phase C:**
- [ ] `CIV-XX: Legacy Wrapper Steps (parent)`
  - [ ] `CIV-XX: LegacyMorphologyStep`
  - [ ] `CIV-XX: LegacyHydrologyStep`
  - [ ] `CIV-XX: LegacyClimateStep`
  - [ ] `CIV-XX: LegacyBiomesStep`
  - [ ] `CIV-XX: LegacyPlacementStep`
- [ ] Existing: `LOCAL-M3-story-system.md` (parent for story work)
- [ ] `CIV-XX: Data Products Canonicalization`

**Phase D:**
- [ ] `CIV-XX: Config Shape Evolution Phase 3`
- [ ] `CIV-XX: Tunables Retirement`

**Phase E:**
- [ ] `CIV-XX: Pipeline Dependency Validation`
- [ ] `CIV-XX: Adapter Boundary Cleanup` (may defer to M4)
- [ ] `CIV-XX: M3 Documentation & Parity Cleanup`

---

## Acceptance Criteria (Milestone Level)

- [ ] All major engine phases represented as pipeline steps with clear `requires`/`provides`
- [ ] `MapGenConfig` reflects engine's phase/step structure, used consistently via `MapGenContext`
- [ ] Legacy tunables retired or reduced to small compat layer
- [ ] Downstream stages consume data products (`ClimateField`, `StoryOverlays`) not hard-coded globals
- [ ] Story system complete: corridors, swatches, paleo all functional when enabled
- [ ] Build passes: `pnpm build`, `pnpm check-types`, `pnpm test`
- [ ] Parity matrix shows no unexplained `Missing` rows for M3 scope

---

## Risk Mitigations

| Risk | Mitigation |
|------|------------|
| Performance overhead from executor | Executor overhead negligible vs Voronoi/erosion math |
| Config shape migration breaks mods | Provide adapter for old shape, deprecation warnings |
| Story system complexity | Port incrementally, validate each pass against JS reference |
| Scope creep into M4 | Adapter boundary cleanup and full preset system can defer |
| Double-refactoring | Config Phase 2 before shape evolution; wrapper steps before internal refactor |

---

## Commands Reference

```bash
# Type checking
pnpm -C packages/mapgen-core run check-types
pnpm run check-types

# Tests
pnpm -C packages/mapgen-core test
pnpm test

# Build
pnpm build

# Lint adapter boundary
./scripts/lint-adapter-boundary.sh

# Deploy mods for testing
pnpm deploy:mods
```

---

## Related Documents

- `docs/projects/engine-refactor-v1/milestones/M2-stable-engine-slice.md` (prerequisite)
- `docs/projects/engine-refactor-v1/milestones/M4-tests-validation-cleanup.md` (follow-up)
- `docs/system/ADR.md` (architectural decisions)
- `docs/system/DEFERRALS.md` (deferred items)
