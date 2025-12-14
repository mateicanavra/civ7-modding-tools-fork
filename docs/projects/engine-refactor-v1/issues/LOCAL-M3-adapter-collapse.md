---
id: LOCAL-M3-ADAPTER-COLLAPSE
title: "[M3] Adapter Boundary Collapse (EngineAdapter absorbs OrchestratorAdapter)"
state: planned
priority: 3
estimate: 2
project: engine-refactor-v1
milestone: M3-core-engine-refactor-config-evolution
assignees: []
labels: [Improvement, Architecture, Adapter]
parent: null
children: []
blocked_by: [LOCAL-M3-CONFIG-EVOLUTION]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Collapse `MapOrchestrator`’s internal `OrchestratorAdapter` into the canonical `EngineAdapter` boundary so map-init + surface operations flow through one adapter as documented.

## Deliverables

- [ ] Extend `EngineAdapter` to cover map-init + map-info responsibilities currently owned by `MapOrchestrator`’s internal `OrchestratorAdapter` (map size/dimensions lookup, `SetMapInitData`, map-info lookup).
- [ ] Update `Civ7Adapter` to implement the extended API.
- [ ] Refactor `MapOrchestrator` to use only `EngineAdapter` (remove internal `OrchestratorAdapter` and engine-global calls outside the adapter boundary).
- [ ] Update docs as needed to match the single-adapter design.

## Acceptance Criteria

- [ ] Only one adapter boundary exists: `MapGenContext.adapter: EngineAdapter`
- [ ] `MapOrchestrator` and pipeline entry have no internal/secondary adapters
- [ ] Implementation matches the single-adapter design in `architecture.md`
- [ ] Adapter API is documented for potential extensibility
- [ ] No references to `OrchestratorAdapter` remain in codebase

## Testing / Verification

- `pnpm -C packages/civ7-adapter check`
- `pnpm -C packages/mapgen-core check`
- `pnpm test:mapgen`
- `pnpm lint:adapter-boundary`

## Dependencies / Notes

- **System area:** Adapter boundary (`@civ7/adapter`) + orchestrator map-init plumbing.
- **Change:** Remove the internal `OrchestratorAdapter` layer inside `MapOrchestrator` and flow map-init/map-info operations through `EngineAdapter`.
- **Outcome:** One adapter boundary, matching system docs; enables cleaner non-Civ7 adapters and test harnesses later.
- **Scope guardrail:** Consolidation only; no behavior changes beyond moving calls behind the adapter boundary.
- **Depends on:** `LOCAL-M3-CONFIG-EVOLUTION` (late-stage integration once pipeline + config are stable).
- **Open questions (track here):**
  - Civ7-specific init behaviors: do any `engine.call("SetMapInitData", ...)` semantics need to stay “outside” the adapter boundary for lifecycle reasons?
  - Minimum API: what is the smallest additional surface on `EngineAdapter` that unblocks removal of `OrchestratorAdapter` without overfitting to Civ7?
  - Test adapter: should we extend `@civ7/adapter/mock` in this issue to cover the new API, or defer to M4?

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

- `packages/civ7-adapter/src/types.ts` (modify: extend `EngineAdapter` interface)
- `packages/civ7-adapter/src/civ7-adapter.ts` (modify: implement extended API)
- `packages/mapgen-core/src/MapOrchestrator.ts` (modify: remove internal `OrchestratorAdapter` interface + usage)
- `packages/mapgen-core/src/MapOrchestrator.ts` (modify: use only EngineAdapter)
- `packages/mapgen-core/src/core/types.ts` (modify: context adapter type)

### Design Notes

- This is primarily a consolidation/cleanup task
- The adapter's responsibilities don't change, only where they live
- Consider documenting the adapter API for future non-Civ7 implementations
