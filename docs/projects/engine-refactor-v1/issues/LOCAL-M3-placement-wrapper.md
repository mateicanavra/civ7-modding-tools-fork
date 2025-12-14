---
id: LOCAL-M3-PLACEMENT-WRAPPER
title: "[M3] Placement Step Wrapper (Consume Canonical Artifacts)"
state: planned
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Placement, Architecture]
parent: null
children: []
blocked_by: [LOCAL-M3-BIOMES-FEATURES-WRAPPER]
blocked: [LOCAL-M3-CONFIG-EVOLUTION]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Wrap placement as a Task Graph step with explicit, runtime-gated dependencies so the full pipeline can be executed end-to-end under `PipelineExecutor` (wrap-first; preserve current behavior).

## Deliverables

- [ ] Implement `LegacyPlacementStep` wrapper as a `MapGenStep` that runs the existing placement pipeline (`runPlacement`) under the executor.
- [ ] Declare a correct cross-cutting `requires/provides` contract for placement (dependency gating must reflect what placement assumes is already applied to the engine surface).
- [ ] Preserve existing placement outputs (starts/wonders/floodplains/resources/discoveries) and map quality (no algorithm changes).

## Acceptance Criteria

- [ ] Placement stage runs as a step via `PipelineExecutor` with explicit contracts
- [ ] All placement outputs (starts, wonders, floodplains) match current orchestrator behavior
- [ ] Step fails fast if any required dependency tags are missing
- [ ] No silent degradation of placement quality due to missing dependencies
- [ ] Step declares `requires`/`provides` that accurately reflect its cross-cutting dependencies

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- `pnpm test:mapgen`

## Dependencies / Notes

- **System area:** Late-stage placement pipeline (`packages/mapgen-core/src/layers/placement.ts`) and map-init inputs it consumes.
- **Change:** Execute placement under the Task Graph with explicit dependency gating; migrate config reads off tunables as part of M3 config cutover.
- **Outcome:** Placement becomes an explicit, contract-checked step in the standard pipeline, enabling composition without fragile implicit ordering.
- **Scope guardrail:** Wrap-first only; preserve placement behavior and tuning.
- **Depends on:** `LOCAL-M3-BIOMES-FEATURES-WRAPPER`.
- **Blocks:** `LOCAL-M3-CONFIG-EVOLUTION`.
- **Historical:** `CIV-20` and `CIV-22` are archived/complete; do not redo adapter wiring or map-size awareness.
- **Locked decisions for M3 (remove ambiguity):**
  - **Contract keys:** Placement’s prerequisites are primarily engine-surface guarantees; model them as **state tags** (e.g., `state:engine.biomesApplied`, `state:engine.featuresApplied`, `state:engine.riversModeled`) rather than pretending placement consumes artifact-only inputs.
  - **Rivers dependency:** In M3, “rivers modeled on the engine surface” (`state:engine.riversModeled`) is sufficient for placement; placement does not require a full in-memory river graph.
  - **Post‑M3 optionality:** `artifact:placementInputs` is a post‑M3 candidate only (engine-less placement testing / refactors); not required to land M3 (tracked as `docs/projects/engine-refactor-v1/deferrals.md` DEF-006).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Key Files (Expected)

- `packages/mapgen-core/src/steps/` (new: wrapper step; exact location TBD)
- `packages/mapgen-core/src/layers/placement.ts` (modify: move config reads off tunables; keep behavior stable)

### Design Notes

- Most cross-cutting step in the pipeline—validate dependency list carefully
- Start with wrapper, then incrementally migrate internal reads
- Placement touches many subsystems—be thorough about identifying all implicit dependencies
