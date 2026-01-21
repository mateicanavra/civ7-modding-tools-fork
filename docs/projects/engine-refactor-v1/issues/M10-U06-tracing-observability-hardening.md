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

### Prework Prompt (Agent Brief)
Delete this prompt section once the prework is completed.

- If “official” Civ7 surface dumps are required beyond adapter-readable grids:
  - Inventory what Civ7 runtime exposes and which base-standard modules provide dumps.
  - Decide whether to add new `EngineAdapter` debug methods (inside `packages/civ7-adapter`) or keep dumps as adapter-read ASCII/summaries in Gameplay steps.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
