---
id: LOCAL-M3-TASK-GRAPH-MVP
title: "[M3] Task Graph MVP: Pipeline Primitives + Standard Entry"
state: planned
priority: 1
estimate: 5
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Architecture, Pipeline]
parent: null
children: []
blocked_by: []
blocked: [LOCAL-M3-HYDROLOGY-PRODUCTS, LOCAL-M3-STORY-SYSTEM, LOCAL-M3-BIOMES-FEATURES-WRAPPER, LOCAL-M3-PLACEMENT-WRAPPER, LOCAL-M3-CONFIG-EVOLUTION, LOCAL-M3-ADAPTER-COLLAPSE]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Implement Task Graph primitives (`MapGenStep`, `StepRegistry`, `PipelineExecutor`) plus a standard pipeline entry so mapgen can run end-to-end via explicit, runtime-enforced step contracts.

## Deliverables

- [ ] Define `MapGenStep` contract (id/phase/requires/provides + run hooks) aligned with `docs/system/libs/mapgen/architecture.md`.
- [ ] Implement `StepRegistry` (register/lookup steps by id; supports a “standard recipe”).
- [ ] Implement `PipelineExecutor` (execute recipe; runtime gate `requires/provides`; deterministic logs/trace).
- [ ] Define canonical dependency keys (the “spine”) used by `requires/provides` in M3 (e.g., `FoundationContext`, `Heightfield`, `ClimateField`, `StoryOverlays`, `Biomes`, `Features`).
- [ ] Register wrap-first steps for the current stage order (foundation → placement) using existing stage implementations so the executor can run an end-to-end mapgen without algorithm changes.
- [ ] Add a standard pipeline entry that runs mapgen via the executor (keep the current orchestrator entry available during migration).

## Acceptance Criteria

- [ ] The executor can run a “standard recipe” and produce a coherent map end-to-end (wrap-first; no algorithm changes).
- [ ] Missing `requires` fails fast at runtime with a clear error (e.g., `MissingDependencyError`).
- [ ] `requires/provides` keys are standardized and used consistently across subsequent M3 issues.
- [ ] The legacy orchestrator entry path remains runnable until the M3 stack lands.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- `pnpm test:mapgen`

## Dependencies / Notes

- **System area:** `@swooper/mapgen-core` pipeline/orchestration primitives.
- **Change:** Introduce Task Graph execution (`MapGenStep`/registry/executor) with runtime contract gating; add a standard executor entry path.
- **Outcome:** M3 steps can be introduced with strict `requires/provides` contracts, enabling composable execution without silent dependency drift.
- **Scope guardrail:** Wrap-first only; do not introduce new generation algorithms in this issue.
- **Related code:** `packages/mapgen-core/src/MapOrchestrator.ts`, `packages/mapgen-core/src/bootstrap/resolved.ts` (current stage order), `packages/mapgen-core/src/config/schema.ts` (`stageManifest` includes `requires/provides` today but is not enforced).
- **Open questions (track here):**
  - Do we evolve the existing `stageManifest`/`STAGE_ORDER` machinery into the executor recipe, or introduce a parallel “step recipe” abstraction (and later consolidate)?
  - What is the minimal validator that is safe to run at runtime in M3 (gating) vs what belongs to M4 (exhaustive validation + tests)?
  - JSON vs code-driven recipe surface: what is the minimal mod-facing shape needed in M3?

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

- `packages/mapgen-core/src/pipeline/` (new: executor + registry + step types; location TBD but keep cohesive)
- `packages/mapgen-core/src/MapOrchestrator.ts` (modify: add executor entry path during transition)

### Design Notes

- Prefer aligning with existing concepts:
  - `bootstrap/resolved.ts` (`STAGE_ORDER`)
  - `config/schema.ts` (`stageManifest` already has `requires/provides` fields)
  - `core/types.ts` (`ExtendedMapContext` already carries `foundation`, `buffers`, `overlays`, and preallocated `fields`)
