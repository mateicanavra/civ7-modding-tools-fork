---
id: CIV-67
title: "[M4] Engine boundary cleanup: remove engine-global dependency surfaces"
state: planned
priority: 3
estimate: 8
project: engine-refactor-v1
milestone: M4
assignees: []
labels: [Architecture, Cleanup]
parent: null
children: []
blocked_by: [CIV-60]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Remove or fence engine-global dependency surfaces (`GameplayMap`, module-load `GameInfo`, `PlotTags`/`LandmassRegion`) so cross-step dependencies are explicit and fail-fast.

## Why This Exists

The accepted engine-boundary policy disallows “read engine later” dependency surfaces. M4 must eliminate remaining engine-global reads so pipeline correctness is driven by explicit artifacts/effects, not hidden globals.

## Recommended Target Scope

### In scope

- Remove/fence direct engine-global reads used as dependency surfaces.
- Replace with adapter-backed reads or reified fields/artifacts as needed.
- Ensure failures are explicit (no silent fallbacks to globals).

### Out of scope

- Algorithm changes inside steps.
- Full redesign of adapter APIs beyond minimal replacements.

## Acceptance Criteria

- [x] `GameplayMap` fallbacks, module-load-time `GameInfo` lookups, and `PlotTags`/`LandmassRegion` globals are removed or explicitly fenced behind adapter/runtime surfaces (dev/test-only isolated where needed).
- [x] No new engine-global dependency surfaces are introduced; failures are explicit.

## Primary Touchpoints (Expected)

- Engine-global reads:
  - `packages/mapgen-core/src/domain/narrative/utils/*.ts`
  - `packages/mapgen-core/src/core/terrain-constants.ts`
  - `packages/mapgen-core/src/core/plot-tags.ts`
- Policy references:
  - `docs/system/libs/mapgen/architecture.md`
  - `docs/projects/engine-refactor-v1/deferrals.md`

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- A smoke run validates no implicit engine-global reads remain on the default path.
- Static guard: `rg -n "GameplayMap|GameInfo|PlotTags|LandmassRegion" packages/mapgen-core/src` only matches explicitly fenced dev/test code (or returns no matches).

## Dependencies / Notes

- **Blocked by:** CIV-60 (legacy orchestration removal complete).
- Phase F work; coordinate with narrative cleanup where paths overlap.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Plan (Concrete)

### 1) Inventory engine-global reads

- Enumerate `GameplayMap` fallbacks, module-load `GameInfo` access, and `PlotTags`/`LandmassRegion` globals.

### 2) Define replacement surfaces

- For each usage, classify the replacement surface: adapter-backed read, reified field/artifact, or explicit fencing.

### 3) Implement removal/fencing

- Replace globals with explicit inputs or adapter calls.
- Ensure any remaining global access is dev/test-only and fails loudly.

## Prework Prompt (Agent Brief)

Goal: map every engine-global dependency surface and define its replacement so cleanup is mechanical.

Deliverables:
- An inventory of `GameplayMap`, `GameInfo`, `PlotTags`, and `LandmassRegion` usages (file + usage + dependency role).
- A proposed replacement for each usage (adapter read, reified field/artifact, or explicit fence).
- A shortlist of tests/docs that must be updated to reflect the new boundary.

Where to look:
- Narrative utilities: `packages/mapgen-core/src/domain/narrative/utils/*.ts`.
- Terrain constants: `packages/mapgen-core/src/core/terrain-constants.ts`.
- Plot tags: `packages/mapgen-core/src/core/plot-tags.ts`.
- Engine boundary policy: `docs/system/libs/mapgen/architecture.md`.
- Milestone notes: `docs/projects/engine-refactor-v1/milestones/M4-target-architecture-cutover-legacy-cleanup.md`.

Constraints/notes:
- No implicit engine-global dependency surfaces; failures must be explicit.
- Keep behavior stable; this is boundary cleanup, not algorithm change.
- Do not implement code; return the inventory and mapping as markdown tables/lists.

## Pre-work

Goal: enumerate every remaining engine-global dependency surface (`GameplayMap`, `GameInfo`, `PlotTags`, `LandmassRegion`) and define the intended replacement so cleanup is mechanical and failures are explicit.

### 1) Inventory (where engine globals are used today)

#### A) `GameplayMap` fallbacks (implicit engine reads)

| File | Global usage | Dependency role | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/domain/narrative/utils/dims.ts` | `GameplayMap.getGridWidth()/getGridHeight()` when `ctx` absent | Dimensions source | Should require `ctx.dimensions` in the target path; fallback hides missing context. |
| `packages/mapgen-core/src/domain/narrative/utils/water.ts` | `GameplayMap.isWater(x,y)` when `ctx` absent | Water queries | Should be adapter-only; fallback hides missing adapter/context. |
| `packages/mapgen-core/src/domain/narrative/orogeny/wind.ts` | `GameplayMap.getPlotLatitude(x,y)` fallback | Latitude queries | Should be adapter-only; fallback hides missing adapter/context. |
| `packages/mapgen-core/src/dev/introspection.ts` | reads `globalAny.GameplayMap` | Dev-only introspection | Acceptable if fenced as dev tooling; should not be part of default correctness paths. |

#### B) Module-load `GameInfo` lookups (implicit global dependency)

| File | Global usage | Dependency role | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/core/terrain-constants.ts` | `GameInfo.Terrains/Biomes/Features.*` at module load (with hard-coded fallbacks) | Mapping type-name → numeric indices | This is a correctness dependency surface; should move behind the adapter (or explicit initialization) so mapgen-core never reads `GameInfo` directly. |

#### C) `PlotTags` / `LandmassRegion` globals (engine enum values)

| File | Global usage | Dependency role | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/core/plot-tags.ts` | `typeof PlotTags !== "undefined"` with fallback constants | plot tag enum values used for start placement compatibility | Should be moved behind adapter-provided constants; fallback should be test-only (and explicit). |
| `packages/mapgen-core/src/core/plot-tags.ts` | `typeof LandmassRegion !== "undefined"` with fallback constants | landmass region enum values used by StartPositioner | Same: move behind adapter. |

### 2) Proposed replacements (global → explicit surface)

#### `GameplayMap` fallbacks

Replacement strategy:
- Require `ExtendedMapContext` for narrative utilities in the target path.
- Replace "ctx optional + fallback to GameplayMap" with:
  - `ctx` required, or
  - explicit parameters (`width/height`, `isWater` function) passed from callers.

This makes failures explicit: missing context/adapter should throw rather than silently reading globals.

#### `GameInfo` module-load lookups

Replacement strategy (preferred):
- Move type-name → index lookups behind the adapter boundary:
  - Add missing index lookup surfaces to `EngineAdapter` (e.g., `getTerrainTypeIndex(name)`), similar to existing `getBiomeGlobal`/`getFeatureTypeIndex`.
  - Cache resolved indices per-run on the context or adapter instance (not as module-level globals).
- Update `terrain-constants.ts` to either:
  - become adapter-backed query helpers (take `adapter`), or
  - be removed in favor of adapter-owned constants/lookups.

Goal: mapgen-core should not touch `GameInfo.*` directly in the default path.

#### `PlotTags` / `LandmassRegion` enum values

Replacement strategy:
- Extend `EngineAdapter` to expose the engine enum values explicitly (or expose a small "engine constants" bag):
  - `adapter.plotTags.{ NONE, LANDMASS, WATER, EAST_LANDMASS, WEST_LANDMASS, ... }`
  - `adapter.landmassRegion.{ NONE, WEST, EAST, ... }`
- `core/plot-tags.ts` becomes pure logic over adapter surfaces:
  - no `typeof PlotTags` / `typeof LandmassRegion` checks
  - no silent fallback except in MockAdapter/test fixtures

### 3) Tests / docs likely to update

Tests that currently mock globals (should be revisited once globals are removed/fenced):
- `packages/mapgen-core/test/setup.ts` (defines `globalThis.GameplayMap`/`globalThis.GameInfo`)
- Orchestrator tests that set globals per-test:
  - `packages/mapgen-core/test/orchestrator/foundation.smoke.test.ts`
  - `packages/mapgen-core/test/orchestrator/task-graph.smoke.test.ts`
  - `packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts`
  - `packages/mapgen-core/test/orchestrator/paleo-ordering.test.ts`
  - `packages/mapgen-core/test/orchestrator/worldmodel-config-wiring.test.ts`
  - `packages/mapgen-core/test/smoke.test.ts`

Docs/policy touchpoints:
- `docs/system/libs/mapgen/architecture.md` (engine boundary policy; ensure it reflects "no engine globals" in default path)
- `docs/projects/engine-refactor-v1/deferrals.md` (if any deferrals reference the legacy global surfaces)

## Implementation Decisions

### Initialize terrain constants from adapter at context creation
- **Context:** Need to remove module-load engine lookups while keeping terrain/biome/feature indices aligned with runtime values.
- **Options:** Hardcode constants only, resolve indices per call via adapter, or initialize once from adapter with fallback defaults.
- **Choice:** Initialize once in `createExtendedMapContext` using adapter lookups with fallback defaults + warnings.
- **Rationale:** Removes engine globals while preserving existing constant-based call sites and test defaults.
- **Risk:** Constants are process-wide; if a different adapter runs later in the same process, values may be stale.

### Rename plot tag/region helpers to avoid engine-global tokens in mapgen-core
- **Context:** Static guard requires no PlotTags/LandmassRegion references in `packages/mapgen-core/src` while still routing through adapter IDs.
- **Options:** Keep existing helper names and ignore the guard, keep names but hide globals, or rename helpers + add adapter ID methods.
- **Choice:** Rename helpers (`addPlotTagIds*`, `resolveLandmassIds`, `markLandmassId`) and add adapter ID methods.
- **Rationale:** Keeps mapgen-core free of engine-global tokens while keeping adapter-backed behavior explicit.
- **Risk:** Helper API renames may require downstream callers to update.

### Reinitialize terrain constants when adapter changes
- **Context:** Review noted that process-wide caching can leave terrain indices stale if multiple adapters run in the same process.
- **Options:** Keep one-time init, reinitialize per call, or reinitialize only when the adapter instance changes.
- **Choice:** Reinitialize only when the adapter instance changes (skip when the same adapter is reused).
- **Rationale:** Avoids cross-run staleness without repeating adapter lookups for the same instance.
- **Risk:** If the same adapter instance mutates its index mappings, constants could still drift.

## Needs Discussion

- Decide whether terrain constant fallbacks should throw outside tests instead of warning + defaulting.
