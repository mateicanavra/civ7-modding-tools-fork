---
id: M10-U06
title: "[M10/U06] Tracing pass — Observability hardening"
state: planned
priority: 3
estimate: 0
project: engine-refactor-v1
milestone: M10
assignees: []
labels: [observability, tracing, refactor]
parent: null
children: []
blocked_by: [M10-U04]
blocked: [M10-U05]
related_to: [M10-U01, M10-U02, M10-U03]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Replace adapter-coupled tracing in Physics with truth-only traces and add Gameplay engine-surface dumps at `effect:map.*` boundaries.

## Deliverables
- Morphology Physics steps emit truth-based trace events (summary + ASCII grids) with no adapter coupling.
- Gameplay stamping steps emit engine-surface dumps after stamping/build operations.
- Trace smoke test asserts required trace event types.

## Acceptance Criteria
- No adapter-coupled tracing helpers remain in Morphology Physics steps.
- Truth-based trace events exist for required Morphology steps.
- Gameplay stamping steps emit engine-surface dumps at step end.
- Trace smoke test passes with `trace.steps.<id>=verbose` for Morphology steps.

## Testing / Verification
- `rg -n "logLandmassAscii\\(|logReliefAscii\\(|logFoundationAscii\\(|logMountainSummary\\(|logVolcanoSummary\\(" mods/mod-swooper-maps/src/recipes/standard/stages/morphology-*`
- Trace smoke test (new): run Morphology steps with verbose tracing and assert required event types.

## Dependencies / Notes
- Blocked by [M10-U04](./M10-U04-gameplay-stamping-cutover.md).
- Blocks [M10-U05](./M10-U05-truth-artifacts-and-map-projections.md).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Boundary posture (non-negotiable)
- Physics:
  - Traces derived from truth artifacts/buffers/indices only.
  - No `context.adapter.*`, no engine reads, no overlays, no `artifact:map.*` / `effect:map.*` inputs.
  - Heavy traces are `trace.isVerbose` gated.
- Gameplay:
  - Traces/dumps run after stamping/build work and before the step returns.
  - Engine surface dumps use adapter-wrapped reads/writes only.

### Required trace events (minimum set)
- Morphology Physics (truth-only):
  - `morphology-pre/landmass-plates`:
    - `morphology.landmassPlates.summary`
    - `morphology.landmassPlates.ascii.landMask`
  - `morphology-mid/routing`:
    - `morphology.routing.summary`
  - `morphology-mid/geomorphology`:
    - `morphology.geomorphology.summary`
  - `morphology-mid/rugged-coasts`:
    - `morphology.coastlines.summary`
    - `morphology.coastlines.ascii.coastMask`
  - `morphology-post/islands`:
    - `morphology.islands.summary`
    - `morphology.islands.ascii.edits`
  - `morphology-post/mountains`:
    - `morphology.mountains.summary`
    - `morphology.mountains.ascii.reliefMask`
  - `morphology-post/volcanoes`:
    - `morphology.volcanoes.summary`
    - `morphology.volcanoes.ascii.indices`
- Gameplay stamping / materialization:
  - `map-morphology/*`:
    - Engine-surface dumps at step end (terrain shares, elevation summary, ASCII masks as needed).
  - `map-hydrology/*` and `map-ecology/*` (Slice 4):
    - Same rule: dump engine surface at step end.

### Helper placement recommendation
- Physics tracing helpers in `packages/mapgen-core` (ASCII renderers + summaries + typed-array fingerprints).
- Gameplay dumps reuse centralized adapter-surface debug helpers (`packages/mapgen-core/src/dev/*`) where possible.

### Verification hooks
- Add trace smoke test that runs Morphology Physics steps with `trace.steps.<id>=verbose` and asserts required `morphology.*` event types exist.
- Add per-slice `rg` gates to ensure adapter-coupled tracing helpers are removed from Morphology Physics.

### Prework Findings (Complete)

**Decision (for M10-U06 minimum requirements):**
- Gameplay engine-surface dumps at `effect:map.*` boundaries can be satisfied with existing adapter reads + centralized TS helpers in `packages/mapgen-core/src/dev/*`.
- No new `EngineAdapter` “debug dump” methods are required for the minimum dump set in this issue (terrain shares, elevation summary, ASCII masks).

**What we can dump today (adapter-readable surfaces + existing helpers):**
- ASCII helpers (adapter reads):
  - `packages/mapgen-core/src/dev/ascii.ts` (`logLandmassAscii`, `logReliefAscii`, `logRainfallAscii`, `logBiomeAscii`, `logFoundationAscii`)
- Summary helpers (adapter reads):
  - `packages/mapgen-core/src/dev/summaries.ts` (`logElevationSummary`, `logMountainSummary`, `logVolcanoSummary`, plus other summaries)
- Runtime introspection (engine API inventory, once):
  - `packages/mapgen-core/src/dev/introspection.ts` (`logEngineSurfaceApisOnce`)

**Evidence (these helpers already appear in current steps, but must be re-homed):**
- Adapter-coupled dump helpers currently appear in Morphology Physics steps (must move to Gameplay per this issue):
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-pre/steps/landmassPlates.ts` (`logLandmassAscii`)
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/mountains.ts` (`logMountainSummary`, `logReliefAscii`)
  - `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-post/steps/volcanoes.ts` (`logVolcanoSummary`)

**Civ7 “official” dump helpers (present in repo, but not trace-friendly):**
- Base-standard module:
  - `apps/docs/public/civ7-official/resources/Base/modules/base-standard/maps/map-debug-helpers.js` (exports `dumpContinents`, `dumpTerrain`, `dumpElevation`, `dumpRainfall`, `dumpBiomes`, `dumpFeatures`, `dumpResources`, etc.)
- Recommendation:
  - Treat these as reference/parity checks (format + semantics), not as the primary observability mechanism, because they mostly `console.log(...)` and rely on engine globals (hard to capture/assert in trace smoke tests and awkward under `MockAdapter`).

**If we later need dumps that require engine globals not exposed by the adapter:**
- Prefer adding small, read-only adapter methods (e.g. `getContinentType(x,y)`, `getResourceType(x,y)`) rather than adding “call official dumpX()” methods.

**Trace smoke test approach (minimal, deterministic):**
- Add a test that runs the standard recipe with a trace sink and asserts required `step.event` payload types exist.
- Use the executor’s full step ID format when enabling verbose tracing:
  - The recipe computes full IDs like `mod-swooper-maps.standard.<stageId>.<stepId>` (see `packages/mapgen-core/src/authoring/recipe.ts` `computeFullStepId(...)`).

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
