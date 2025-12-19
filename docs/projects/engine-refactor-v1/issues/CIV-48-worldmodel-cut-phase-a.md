---
id: CIV-48
title: "[M4] Move Foundation Production into Steps & Clean Boundaries"
state: planned
priority: 2
estimate: 5
project: engine-refactor-v1
milestone: null
assignees: []
labels: [Improvement, Architecture, Technical Debt]
parent: null
children: [CIV-49, CIV-50, CIV-51, CIV-52]
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Move foundation signal production from the `WorldModel` singleton into step-owned foundation code, standardize all RNG on the adapter boundary, and remove direct `TerrainBuilder` usage from `mapgen-core`—while preserving `ctx.foundation` as the stable consumer contract.

## Deliverables

- **RNG Boundary:** All randomness in `mapgen-core` routes through `ctxRandom` or injected `rngNextInt`; no `Math.random()` or direct `TerrainBuilder.getRandomNumber` calls.
- **Adapter Boundary:** No direct `TerrainBuilder.*` calls in `mapgen-core`; engine access flows through the adapter.
- **Foundation Contract:** `ctx.foundation` presence and required fields enforced at the producer boundary with fail-fast validation.
- **Producer Cutover:** `WorldModel` is no longer initialized or used as a producer; foundation signals originate from step-owned code.
- **Single Path:** No dual producer/sink paths remain; `ctx.worldModel` removed from `MapGenContext`.

**Guardrails (global):**
- No hidden optionality or silent fallbacks; defaults live in schema/contract, not in code.
- No dual paths; do not keep `WorldModel` as a compatibility sink.
- Engine access in mapgen-core must go through the adapter boundary.

**Sub-Issues:**
- [CIV-49](CIV-49-contract-enforcement.md): Contract Enforcement & Fail-Fast Gating
- [CIV-50](CIV-50-rng-standardization.md): RNG Standardization
- [CIV-51](CIV-51-adapter-boundary-cleanup.md): Adapter Boundary Cleanup (TerrainBuilder Removal)
- [CIV-52](CIV-52-worldmodel-producer-cutover.md): WorldModel Producer Cutover

## Acceptance Criteria

- [x] `MapOrchestrator.initializeFoundation()` no longer calls `WorldModel.init()` or any equivalent producer path.
- [x] Foundation stage is the only canonical producer of foundation signals.
- [x] `ctx.foundation` continues to populate and satisfy `artifact:foundation` (types/shape preserved).
- [x] All internal consumers read from `ctx.foundation`, not `WorldModel`.
- [x] `rg "Math\\.random"` returns no hits in `packages/mapgen-core/**`.
- [x] `rg "TerrainBuilder\\."` returns no runtime hits in `packages/mapgen-core/**`.
- [x] `ctx.worldModel` is removed from `MapGenContext`.
- [ ] All tests pass with the new producer path.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- `pnpm test:mapgen`
- `pnpm lint:adapter-boundary`
- Manual verification: foundation signals (plates, dynamics) are present and correctly shaped.

## Dependencies / Notes

- **System area:** Foundation stage, orchestrator initialization, adapter boundary.
- **Outcome:** Foundation ownership moves into steps; orchestrator becomes a thinner boundary; system is ready for Phase B artifact refactor.
- **Scope guardrail:** This is Phase A only—architectural ownership movement, not the full mesh/crust/plateGraph/tectonics refactor (Phase B, tracked separately).
- **Non-goal:** Output parity is not a deliverable; small deltas are acceptable unless separately gated.
- **Reference:** [SPIKE: MapOrchestrator Bloat Assessment](../resources/SPIKE-orchestrator-bloat-assessment.md)
- **Related PRD:** [Plate Generation PRD](../resources/PRD-plate-generation.md) (tracks Phase B work)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Why This Work Exists

`MapOrchestrator` currently acts as the "bridge boundary" between the target architecture (step-owned computation via `context.artifacts`/`context.fields`) and the current implementation (orchestrator-centric wiring with legacy contracts). The `WorldModel` singleton is initialized by the orchestrator and then snapshotted into `FoundationContext`, which obscures step contracts and keeps a hidden producer path alive.

Phase A moves ownership (math and sequencing) into foundation steps without forcing immediate downstream churn. The system will remain in a transitional state where `ctx.foundation` is the primary contract even though it does not match the target "multi-artifact / graph-based" foundation model. This must be revisited when Phase B begins.

### Locked Decisions

1. **RNG Standardization:** All mapgen randomness standardized on the adapter RNG surface.
   - `packages/civ7-adapter/src/civ7-adapter.ts` is the only place allowed to call `TerrainBuilder.getRandomNumber`.
   - `packages/mapgen-core/**` must not call `TerrainBuilder.*` directly or `Math.random()`.
   - Approved APIs: `ctxRandom(ctx, label, max)` for step/domain code; injected `rngNextInt(max, label)` for pure functions.

2. **WorldModel Cut:** Fast cut that avoids maintaining multiple algorithmic code paths.
   - Foundation step-owned code is the single producer.
   - `FoundationContext` is a derived/serialized compatibility view until consumers migrate.
   - `WorldModel` is not initialized, not published, and not used as a sink after Phase A.

### Explicitly Not Committed (Phase A)

- Orchestrator hygiene cleanups (dead imports/helpers removal) — see DEF-013.
- Recipe/enablement restructuring.
- Full "graph + multi-artifact foundation" target refactor (Phase B) — see DEF-014.
- Output parity guarantees (small deltas acceptable) — see DEF-015.

### Sub-Issue Sequencing

The four slices must land in order due to layered dependencies:

1. **A1 (Contract Enforcement)** lands first — establishes the contract we will preserve during the cutover; surfaces missing data early; prevents hidden behavior changes.
2. **A2 (RNG Standardization)** and **A3 (Adapter Boundary Cleanup)** can proceed in parallel after A1 — both stabilize boundaries before the producer cutover.
3. **A4 (WorldModel Producer Cutover)** lands last — depends on explicit contracts (A1), standardized RNG (A2), and clean adapter boundaries (A3).

### Integration Notes

All four sub-issues must land for Phase A to be complete. Partial landing creates intermediate states that are harder to reason about:

- **A1 alone:** Contract is enforced but `WorldModel` still produces; tests may start failing if fallbacks were previously masking issues.
- **A2 + A3 without A4:** Boundaries are clean but `WorldModel` is still the producer; dual paths remain.
- **A4 without A1/A2/A3:** Producer moves but contract isn't enforced and boundaries aren't clean; likely to introduce subtle bugs.

After all four land:
- `ctx.foundation` is the single source of truth for foundation signals.
- No dual producer/sink paths remain.
- Adapter is the single engine boundary.
- System is ready for Phase B artifact refactor.

### FoundationContext Consumers (Cross-Cutting Reference)

These consumers depend on `ctx.foundation` and must continue to work after Phase A. Full list maintained in [CIV-52](CIV-52-worldmodel-producer-cutover.md).

Key implication: `ctx.foundation` must preserve both plates tensors and `dynamics` (windU/windV/current/pressure).

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
