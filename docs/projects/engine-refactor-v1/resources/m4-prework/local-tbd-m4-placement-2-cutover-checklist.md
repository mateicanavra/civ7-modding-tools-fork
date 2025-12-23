# Prework — `LOCAL-TBD-M4-PLACEMENT-2` (Cut placement to `artifact:placementInputs@v1`)

Goal: make the placement cutover mechanical by listing every current input assembly site, mapping each input to the new artifact fields, and outlining a minimal (verifiable) plan for `effect:engine.placementApplied` plus tests to update.

## 1) Placement input assembly sites (current)

1) Orchestrator runtime assembly (engine reads + defaults)
- `packages/mapgen-core/src/orchestrator/task-graph.ts`
  - `mapInfo` lookup via adapter (`lookupMapInfo`)
  - derives `playersLandmass1/2`, `startSectorRows/Cols` from `mapInfo` (with defaults)
  - `startSectors` via `ctx.adapter.chooseStartSectors(...)`
  - allocates `westContinent` / `eastContinent` bounds objects (mutated later by landmass)
  - passes `placementStartsOverrides: config.placement?.starts` into the standard library runtime

2) Placement layer wiring (runtime → step closure)
- `packages/mapgen-core/src/pipeline/placement/index.ts` (`registerPlacementLayer`)
  - builds `baseStarts` from runtime
  - merges `placementStartsOverrides` onto starts
  - registers `createPlacementStep({ mapInfo, starts, startPositions }, ...)`

3) Placement step reads implicit inputs at runtime
- `packages/mapgen-core/src/pipeline/placement/PlacementStep.ts`
  - reads `context.config.placement ?? {}` (implicit config input)
  - consumes `runtime.mapInfo` + `runtime.starts` via closure (implicit non-context inputs)
  - calls `runPlacement(adapter, width, height, { mapInfo, starts, placementConfig })`

4) Placement domain assembles options from mixed inputs
- `packages/mapgen-core/src/domain/placement/index.ts` (`runPlacement`)
  - reads `options.placementConfig` (which currently comes from `ctx.config.placement`)
  - reads `options.mapInfo` and `options.starts`

## 2) Mapping: old input source → new artifact field

| Current input | Current source | New source (PlacementInputs@v1) |
| --- | --- | --- |
| MapInfo subset (wonders/starts defaults) | `task-graph.ts` + adapter lookup | `placementInputs.map.mapInfo` |
| StartsConfig (players/continents/sectors) | `task-graph.ts` + `landmassPlates` runtime mutation + `placementStartsOverrides` merge | `placementInputs.starts` (resolved + effective) |
| PlacementConfig (wondersPlusOne/floodplains/starts overrides) | `ctx.config.placement` | `placementInputs.placementConfig` (copied from config, or pre-resolved in derive step) |
| StartPositions output sink | `PlacementStepRuntime.startPositions` array | (Optionally) `artifact:placementOutputs@v1` if we need outputs for verification/debugging |

## 3) Effect verification plan: `effect:engine.placementApplied`

Constraint: adapter has many placement **writes** but few placement **reads**, so we need a verification story that works for both Civ adapter and MockAdapter.

Minimum viable options (align with Effects‑1 prework):
1) **Verify via outputs** (recommended for M4):
   - Placement publishes a small TS-owned output artifact (e.g., `artifact:placementOutputs@v1`) containing:
     - `startPositions?: number[]` (when starts config present)
     - lightweight diagnostics (counts/booleans) derived from already-available values
   - Verifier checks artifact shape and (if starts present) player-count expectations.
2) **Verify via adapter call postconditions** (tests-first, less strict in production):
   - For MockAdapter, assert calls occurred (`adapter.calls.assignStartPositions`, `calls.generateResources`, etc).
   - For Civ adapter, add a minimal read surface (engine boundary) if we truly need engine-read verification.

**Decision (ADR-ER1-020):** implement option (1) for M4 — publish `artifact:placementOutputs@v1` and verify `effect:engine.placementApplied` via the artifact. Treat option (2) as a follow-up path if stronger engine-state verification is needed (see DEF-017).

## 4) Tests to update/add

Existing tests that will need updates once placement no longer reads from `ctx.config.placement` and runtime closures:
- `packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts`
  - Update to construct and publish `artifact:placementInputs@v1` (or invoke the derive step) rather than relying on `ctx.config.placement` directly inside `PlacementStep`.
  - Continue asserting placement uses those inputs via `MockAdapter.calls.*`.
- `packages/mapgen-core/test/pipeline/placement-gating.test.ts`
  - Update expected missing dependency from `state:engine.featuresApplied` → the new prereq (likely `effect:engine.featuresApplied` and/or `artifact:placementInputs@v1`).

Suggested new test coverage (if needed):
- A stub-adapter placement run that:
  - publishes a demo `placementInputs@v1`,
  - executes placement step,
  - and verifies the `effect:engine.placementApplied` verifier behavior (success + failure cases).

## 5) Cutover checklist (implementation sequence)

1) Derive step publishes `artifact:placementInputs@v1` from explicit prereqs (PLACEMENT‑1).
2) Update placement step wiring:
   - `requires: ["artifact:placementInputs@v1"]`
   - read inputs exclusively from the artifact (no `ctx.config.placement` reads; no runtime-only start assembly)
3) Add `effect:engine.placementApplied` provide + verifier hookup (Effects‑1 coordination).
4) Remove any compatibility shims and update DEF‑006 once the target path is clean.
