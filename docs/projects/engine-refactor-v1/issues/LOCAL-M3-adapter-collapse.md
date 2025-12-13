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

Collapse the two adapter boundaries (`EngineAdapter` + `OrchestratorAdapter`) into a single `EngineAdapter` boundary, aligning implementation with the documented architecture. This reduces complexity and unblocks cleaner adapter extension for non-Civ7 targets.

## Context & Motivation

The target architecture has a single adapter boundary at `EngineAdapter`, but the current implementation retains a second `OrchestratorAdapter` for map-init concerns:

- `SetMapInitData` or equivalent initialization
- `GameplayMap`/`GameInfo` wiring
- Map size/dimensions lookup

This tech debt:

- Complicates the adapter API with two abstraction layers
- Prevents clean extension for non-Civ7 targets
- Creates confusion about which adapter handles which responsibility
- Doesn't match the design documented in `architecture.md`

Collapsing to one boundary:

- Simplifies the adapter surface
- Aligns implementation with documented architecture
- Unblocks cleaner adapter design for future non-Civ7 adapters

## Capability Unlocks

- Single adapter boundary makes it clear where engine/platform coupling lives
- Cleaner extension path for non-Civ7 targets (testing adapters, other games)
- Implementation matches documentation

## Deliverables

- [ ] **Extend `EngineAdapter` interface**
  - Map size/dimensions lookup methods
  - `SetMapInitData` or equivalent initialization
  - `GameplayMap`/`GameInfo` access methods

- [ ] **Update `Civ7Adapter`**
  - Implement the extended API
  - Absorb responsibilities from `OrchestratorAdapter`

- [ ] **Refactor `MapOrchestrator` (or pipeline entry)**
  - Use only `MapGenContext.adapter: EngineAdapter`
  - Remove internal adapter references

- [ ] **Delete `OrchestratorAdapter`**
  - Remove class and all references
  - Clean up any orphaned adapter-related code

- [ ] **Documentation**
  - Document the adapter API for potential non-Civ7 implementations
  - Update architecture docs if needed

## Acceptance Criteria

- [ ] Only one adapter boundary exists: `MapGenContext.adapter: EngineAdapter`
- [ ] `MapOrchestrator` and pipeline entry have no internal/secondary adapters
- [ ] Implementation matches the single-adapter design in `architecture.md`
- [ ] Adapter API is documented for potential extensibility
- [ ] No references to `OrchestratorAdapter` remain in codebase

## Out of Scope

- Implementing non-Civ7 adapters (just enabling the path)
- Changing adapter behavior (only consolidating the boundary)
- Adapter-level testing infrastructure (deferred to M4)

## Open Questions & Considerations

- **Civ7-specific behaviors:** Are there any Civ7-specific init behaviors that should stay outside the engine boundary?
- **Minimum API:** What's the minimum API to support non-Civ7 adapters later?
- **Testing adapter:** Should we define a `TestAdapter` interface/stub as part of this work, or defer to M4?

## Dependencies & Relationships

**Depends on:**
- `LOCAL-M3-CONFIG-EVOLUTION` (Stack 6): Config and pipeline should be stable before adapter cleanup

**Blocks:**
- (None directly—this is the last M3 stack)

**Related:**
- Adapter boundary note in `M2-stable-engine-slice.md` (deferred from M2)
- `../../system/libs/mapgen/architecture.md` (documents target architecture)

## Risk Controls

- **Late-phase work:** Treat as a late-milestone integration cut
- **Branch safety:** Keep a single, coherent "one adapter boundary" model by the time M3 merges
- **No behavior changes:** Only consolidating the boundary, not changing what adapters do

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

### Key Files (Expected)

- `packages/mapgen-core/src/adapter/engine-adapter.ts` (modify: extend interface)
- `packages/mapgen-core/src/adapter/civ7-adapter.ts` (modify: implement extended API)
- `packages/mapgen-core/src/adapter/orchestrator-adapter.ts` (delete)
- `packages/mapgen-core/src/MapOrchestrator.ts` (modify: use only EngineAdapter)
- `packages/mapgen-core/src/core/types.ts` (modify: context adapter type)

### Design Notes

- This is primarily a consolidation/cleanup task
- The adapter's responsibilities don't change, only where they live
- Consider documenting the adapter API for future non-Civ7 implementations
