---
id: LOCAL-TBD-5
title: Integrate Foundation Pipeline into Orchestrator
state: planned
priority: 1
estimate: 2
project: engine-refactor-v1
milestone: milestone-1-foundation
assignees: [codex]
labels: [Improvement, Architecture]
parent: LOCAL-TBD
children: []
blocked_by: [LOCAL-TBD-4]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Wire up the new Foundation Pipeline (Mesh -> Partition -> Physics) into the `MapOrchestrator`, replacing the legacy `computePlatesVoronoi` call.

## Deliverables
- Refactored `MapOrchestrator.ts` that initializes the `StepRegistry` and executes the configured pipeline.
- Updated `initializeFoundation` method to use the new `ExtendedMapContext`.
- Removal (or deprecation) of legacy code in `plates.ts`.
- Updated default configuration to include the new pipeline recipe.

## Acceptance Criteria
- [ ] `MapOrchestrator` successfully runs the full Foundation stage without errors.
- [ ] The resulting map contains valid plate data (verified via logs/ASCII).
- [ ] Legacy `computePlatesVoronoi` is no longer in the critical path.
- [ ] `civ7 map generate` command works with the new architecture.

## Testing / Verification
- Run the full CLI generation command: `civ7 map generate --json`.
- Verify the output JSON contains the expected `foundation` structure.
- Visually inspect the generated ASCII map for plate shapes.

## Dependencies / Notes
- Depends on all previous sub-issues (LOCAL-TBD-1 through LOCAL-TBD-4).
- This is the final step to make the refactor "live".
- Reference [Architecture Spec](../../../system/libs/mapgen/architecture.md) for pipeline orchestration details.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Integration Checklist
1. Initialize `StepRegistry` with all Foundation steps.
2. Load pipeline configuration from JSON config.
3. Execute steps in dependency order: Mesh → Partition → Physics.
4. Pass `ExtendedMapContext` through the entire pipeline.
5. Handle impedance mismatches between `FoundationContext` and legacy engine expectations.

### Migration Notes
- The `ExtendedMapContext` should be backward-compatible with existing code.
- Legacy `computePlatesVoronoi` can be kept as a fallback during transition.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
