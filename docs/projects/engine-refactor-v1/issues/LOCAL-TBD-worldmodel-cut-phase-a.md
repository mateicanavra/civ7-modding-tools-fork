---
id: LOCAL-TBD
title: "[M4] WorldModel Producer Cut (Phase A)"
state: planned
priority: 2
estimate: 5
project: engine-refactor-v1
milestone: null
assignees: []
labels: [Improvement, Architecture, Technical Debt]
parent: null
children: [LOCAL-TBD-A1, LOCAL-TBD-A2, LOCAL-TBD-A3, LOCAL-TBD-A4]
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

**Sub-Issues (to be created):**
- LOCAL-TBD-A1: Contract Enforcement & Fail-Fast Gating
- LOCAL-TBD-A2: RNG Standardization
- LOCAL-TBD-A3: Adapter Boundary Cleanup (TerrainBuilder Removal)
- LOCAL-TBD-A4: WorldModel Producer Cutover

## Acceptance Criteria

- [ ] `MapOrchestrator.initializeFoundation()` no longer calls `WorldModel.init()` or any equivalent producer path.
- [ ] Foundation stage is the only canonical producer of foundation signals.
- [ ] `ctx.foundation` continues to populate and satisfy `artifact:foundation` (types/shape preserved).
- [ ] All internal consumers read from `ctx.foundation`, not `WorldModel`.
- [ ] `rg "Math\\.random"` returns no hits in `packages/mapgen-core/**`.
- [ ] `rg "TerrainBuilder\\."` returns no runtime hits in `packages/mapgen-core/**`.
- [ ] `ctx.worldModel` is removed from `MapGenContext`.
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

- Orchestrator hygiene cleanups (dead imports/helpers removal).
- Recipe/enablement restructuring.
- Full "graph + multi-artifact foundation" target refactor (Phase B).
- Output parity guarantees (small deltas acceptable).

### Sub-Issue Breakdown

#### Slice 1: Contract Enforcement & Fail-Fast Gating (LOCAL-TBD-A1)

**Work:** Enforce `ctx.foundation` presence and required fields at stage boundaries; remove silent fallbacks; ensure `foundation.dynamics` is always present via schema defaults or required fields; add fail-fast validation on publish.

**Why first:** Establishes the contract we will preserve during the cutover; surfaces missing data early; prevents hidden behavior changes.

**Contract enforcement details:**
- Use schema defaults or required fields for `foundation.dynamics` (no runtime creation).
- Validate `ctx.foundation` at publish time (producer boundary): non-null arrays and expected dimensions for plates + dynamics tensors.

**Done checks (mechanical):**
- No code-level fallbacks for missing `ctx.foundation` or `foundation.dynamics`.
- `foundation.dynamics` always present via schema defaults or required fields.
- `ctx.foundation` publish path validates array presence and expected sizes.

**Done checks (contextual):** Foundation contract is explicit and enforced; downstream stages either receive guaranteed data or fail fast at the boundary.

**Test expectations:**
- Update any tests that relied on implicit fallbacks to expect failure when `ctx.foundation`/`dynamics` is missing.
- Add/adjust a focused validation test that fails on missing/incorrectly sized foundation tensors.

**Do not:**
- Add new code-level defaults or hidden fallbacks.
- Defer validation to downstream stages only (enforce at publish).

**Expected impact / what changes:** Foundation contract becomes explicit and enforceable; missing data surfaces immediately; downstream behavior is deterministic w.r.t. contract presence.

#### Slice 2: RNG Standardization (LOCAL-TBD-A2)

**Work:** Eliminate `Math.random()` usage in `packages/mapgen-core/**`; route all randomness through `ctxRandom` / `ctx.adapter.getRandomNumber`; update tests to stub adapter RNG.

**Why second:** Stabilizes randomness semantics before moving producer logic; reduces churn during later refactors.

**Contract enforcement details:** RNG is only accessed through `ctxRandom` or injected `rngNextInt` wired from `ctxRandom`; adapter is the single RNG surface.

**Done checks (mechanical):**
- `rg "Math\\.random"` returns no hits in `packages/mapgen-core/**`.
- `rg "TerrainBuilder\\.getRandomNumber"` returns no hits in `packages/mapgen-core/**`.
- All RNG call sites use `ctxRandom` or injected `rngNextInt`.

**Done checks (contextual):** All randomness flows through the adapter boundary; determinism and call labeling are centralized.

**Known call sites:**
- `domain/morphology/coastlines/rugged-coasts.ts` (fallback in `getRandom`)
- `domain/morphology/islands/placement.ts` (fallback in `getRandom`)
- `domain/morphology/landmass/crust-first-landmask.ts` (fallback RNG)
- `domain/narrative/utils/rng.ts` (fallback to `Math.random`)
- `world/plates.ts` (fallback RNG and direct `Math.random()`)
- `world/model.ts` (fallback RNG to `Math.random`)
- Test files: `test/setup.ts`, `test/layers/callsite-fixes.test.ts`

**Test expectations:**
- Update test RNG stubs to use adapter RNG (no `Math.random` fallback).
- Ensure RNG-dependent tests pass with adapter-based RNG only.

**Do not:**
- Introduce alternate RNG providers or new fallbacks.
- Use `Math.random` in tests to bypass adapter RNG.

**Expected impact / what changes:** RNG boundary becomes explicit and testable; adapter is the single source of randomness; hidden nondeterminism is removed.

#### Slice 3: Adapter Boundary Cleanup (LOCAL-TBD-A3)

**Work:** Remove all direct `TerrainBuilder.*` usage in `packages/mapgen-core/**`; route rainfall writes through `ctx.adapter.setRainfall`; keep behavior intact.

**Why third:** Cleans engine boundary before the producer cutover; removes hidden globals.

**Contract enforcement details:** All engine reads/writes in mapgen-core are accessed via adapter methods; `TerrainBuilder` is used only inside `packages/civ7-adapter/**`.

**Done checks (mechanical):**
- `rg "TerrainBuilder\\." packages/mapgen-core` returns no runtime hits.
- Rainfall writes go through `ctx.adapter.setRainfall`.

**Done checks (contextual):** Engine boundary is explicit; mapgen-core has no implicit access to engine globals.

**Known call sites:**
- `world/model.ts` (selects `TerrainBuilder.getRandomNumber` as RNG)
- `world/plates.ts` (`globalThis.TerrainBuilder.getRandomNumber`)
- `domain/narrative/utils/rng.ts` (direct `TerrainBuilder.getRandomNumber`)
- `domain/narrative/paleo/rainfall-artifacts.ts` (direct `TerrainBuilder.setRainfall`)

**Test expectations:**
- Update tests that referenced `globalThis.TerrainBuilder` to stub adapter methods instead.

**Do not:**
- Keep any direct `TerrainBuilder` usage in mapgen-core.
- Re-architect rainfall generation here (deferred).

**Expected impact / what changes:** Engine boundary is explicit and auditable; mapgen-core no longer depends on engine globals.

#### Slice 4: WorldModel Producer Cutover (LOCAL-TBD-A4)

**Work:** Move producer logic into the foundation stage; stop calling `WorldModel.init()`; remove `ctx.worldModel`; update tests to assert `ctx.foundation` outputs; migrate remaining `WorldModel` readers.

**Why last:** Depends on explicit contracts, standardized RNG, and clean adapter boundaries.

**Contract enforcement details:** `ctx.foundation` is the only published foundation product; `WorldModel` is not initialized, not published, and not used as a sink.

**Done checks (mechanical):**
- `MapOrchestrator.initializeFoundation()` no longer calls `WorldModel.init()`.
- `ctx.worldModel` removed from `MapGenContext`.
- Tests that asserted `WorldModel` now assert `ctx.foundation`.

**Done checks (contextual):** Foundation is produced by step-owned code; no dual producer/sink path remains.

**WorldModel usage to migrate:**
- Runtime: `MapOrchestrator.ts`, `core/types.ts`, `world/model.ts`, `world/plates.ts`
- Tests: `foundation.smoke.test.ts`, `paleo-ordering.test.ts`, `task-graph.smoke.test.ts`, `worldmodel-config-wiring.test.ts`, `placement-config-wiring.test.ts`, `world/config-provider.test.ts`

**Test expectations:**
- Update WorldModel tests to assert `ctx.foundation` and fail if `WorldModel` is referenced.

**Do not:**
- Keep `WorldModel` as a compatibility sink.
- Leave dual producer paths in place.

**Expected impact / what changes:** Global singleton removed from the production path; foundation ownership moves into steps; orchestrator becomes a thinner boundary.

### FoundationContext Consumers (Must Preserve)

These consumers depend on `ctx.foundation` and must continue to work after the cutover:

**Morphology:**
- `domain/morphology/landmass/index.ts`
- `domain/morphology/landmass/ocean-separation/apply.ts`
- `domain/morphology/coastlines/rugged-coasts.ts`
- `domain/morphology/mountains/apply.ts`
- `domain/morphology/volcanoes/apply.ts`

**Narrative:**
- `domain/narrative/orogeny/belts.ts`

**Climate/Hydrology (dynamics):**
- `domain/hydrology/climate/swatches/monsoon-bias.ts`
- `domain/hydrology/climate/refine/orographic-shadow.ts`
- `domain/hydrology/climate/orographic-shadow.ts`

**Implication:** `ctx.foundation` must preserve both plates tensors and `dynamics` (windU/windV/current/pressure).

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
