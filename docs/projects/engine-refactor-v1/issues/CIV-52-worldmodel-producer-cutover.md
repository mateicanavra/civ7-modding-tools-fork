---
id: CIV-52
title: "[M4] Replace WorldModel Producer with Step-Owned Code"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: null
assignees: []
labels: [Improvement, Architecture, Technical Debt]
parent: CIV-48
children: []
blocked_by: [CIV-49, CIV-50, CIV-51]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Move producer logic into the foundation stage; stop calling `WorldModel.init()`; remove `ctx.worldModel`; update tests to assert `ctx.foundation` outputs; migrate remaining `WorldModel` readers.

## Deliverables

- `WorldModel.init()` no longer called by `MapOrchestrator.initializeFoundation()`.
- `ctx.worldModel` removed from `MapGenContext`.
- Foundation produced by step-owned code (not `WorldModel`).
- All tests asserting `WorldModel` updated to assert `ctx.foundation`.
- All internal consumers read from `ctx.foundation`, not `WorldModel`.

## Acceptance Criteria

- [x] `MapOrchestrator.initializeFoundation()` no longer calls `WorldModel.init()` or any equivalent producer path.
- [x] `ctx.worldModel` removed from `MapGenContext`.
- [x] Tests that asserted `WorldModel` now assert `ctx.foundation`.
- [x] Foundation is produced by step-owned code; no dual producer/sink path remains.
- [x] `ctx.foundation` continues to populate and satisfy `artifact:foundation` (types/shape preserved).
- [ ] All tests pass with the new producer path.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- `pnpm test:mapgen`
- Manual verification: foundation signals (plates, dynamics) are present and correctly shaped.
- Verify `WorldModel` is not referenced in production code paths.

## Dependencies / Notes

- **System area:** Foundation stage, orchestrator initialization, `MapGenContext`.
- **Why last:** Depends on explicit contracts (A1), standardized RNG (A2), and clean adapter boundaries (A3).
- **Outcome:** Global singleton removed from the production path; foundation ownership moves into steps; orchestrator becomes a thinner boundary.
- **Scope guardrail:** Do not keep `WorldModel` as a compatibility sink; do not leave dual producer paths in place.
- **Blocked by:** [CIV-49](CIV-49-contract-enforcement.md), [CIV-50](CIV-50-rng-standardization.md), [CIV-51](CIV-51-adapter-boundary-cleanup.md)
- **Parent:** [CIV-48: WorldModel Producer Cut (Phase A)](CIV-48-worldmodel-cut-phase-a.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Contract Enforcement Details

`ctx.foundation` is the only published foundation product; `WorldModel` is not initialized, not published, and not used as a sink.

### WorldModel Usage to Migrate

**Runtime:**
- `MapOrchestrator.ts`
- `core/types.ts`
- `world/model.ts`
- `world/plates.ts`

**Tests:**
- `foundation.smoke.test.ts`
- `paleo-ordering.test.ts`
- `task-graph.smoke.test.ts`
- `worldmodel-config-wiring.test.ts`
- `placement-config-wiring.test.ts`
- `world/config-provider.test.ts`

### Done Checks

**Mechanical:**
- `MapOrchestrator.initializeFoundation()` no longer calls `WorldModel.init()`.
- `ctx.worldModel` removed from `MapGenContext`.
- Tests that asserted `WorldModel` now assert `ctx.foundation`.

**Contextual:**
- Foundation is produced by step-owned code.
- No dual producer/sink path remains.

### Test Expectations

- Update WorldModel tests to assert `ctx.foundation` and fail if `WorldModel` is referenced.

### Do Not

- Keep `WorldModel` as a compatibility sink.
- Leave dual producer paths in place.

### Expected Impact

Global singleton removed from the production path; foundation ownership moves into steps; orchestrator becomes a thinner boundary.

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
