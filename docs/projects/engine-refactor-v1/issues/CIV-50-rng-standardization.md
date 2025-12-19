---
id: CIV-50
title: "[M4] Route All RNG Through Adapter Boundary"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: null
assignees: []
labels: [Improvement, Architecture]
parent: CIV-48
children: []
blocked_by: [CIV-49]
blocked: [CIV-52]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Eliminate `Math.random()` usage in `packages/mapgen-core/**`; route all randomness through `ctxRandom` / `ctx.adapter.getRandomNumber`; update tests to stub adapter RNG.

## Deliverables

- All `Math.random()` calls removed from `packages/mapgen-core/**`.
- All `TerrainBuilder.getRandomNumber` calls removed from `packages/mapgen-core/**`.
- All RNG call sites use `ctxRandom` or injected `rngNextInt` wired from `ctxRandom`.
- Test RNG stubs updated to use adapter RNG (no `Math.random` fallback).

## Acceptance Criteria

- [x] `rg "Math\\.random"` returns no hits in `packages/mapgen-core/**`.
- [x] `rg "TerrainBuilder\\.getRandomNumber"` returns no hits in `packages/mapgen-core/**`.
- [x] All RNG call sites use `ctxRandom` or injected `rngNextInt`.
- [x] Test RNG stubs use adapter RNG only.
- [ ] RNG-dependent tests pass with adapter-based RNG only.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- `pnpm test:mapgen`
- `rg "Math\\.random" packages/mapgen-core` (expect no hits)
- `rg "TerrainBuilder\\.getRandomNumber" packages/mapgen-core` (expect no hits)

## Dependencies / Notes

- **System area:** RNG boundary, adapter surface.
- **Why second:** Stabilizes randomness semantics before moving producer logic; reduces churn during later refactors.
- **Outcome:** RNG boundary becomes explicit and testable; adapter is the single source of randomness; hidden nondeterminism is removed.
- **Scope guardrail:** Do not introduce alternate RNG providers or new fallbacks; do not use `Math.random` in tests to bypass adapter RNG.
- **Blocked by:** [CIV-49](CIV-49-contract-enforcement.md) (Contract Enforcement)
- **Parent:** [CIV-48: WorldModel Producer Cut (Phase A)](CIV-48-worldmodel-cut-phase-a.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Contract Enforcement Details

RNG is only accessed through `ctxRandom` or injected `rngNextInt` wired from `ctxRandom`; adapter is the single RNG surface.

### Known Call Sites

**Runtime files:**
- `domain/morphology/coastlines/rugged-coasts.ts` (fallback in `getRandom`)
- `domain/morphology/islands/placement.ts` (fallback in `getRandom`)
- `domain/morphology/landmass/crust-first-landmask.ts` (fallback RNG)
- `domain/narrative/utils/rng.ts` (fallback to `Math.random`)
- `world/plates.ts` (fallback RNG and direct `Math.random()`)
- `world/model.ts` (fallback RNG to `Math.random`)

**Test files:**
- `test/setup.ts`
- `test/layers/callsite-fixes.test.ts`

### Done Checks

**Mechanical:**
- `rg "Math\\.random"` returns no hits in `packages/mapgen-core/**`.
- `rg "TerrainBuilder\\.getRandomNumber"` returns no hits in `packages/mapgen-core/**`.
- All RNG call sites use `ctxRandom` or injected `rngNextInt`.

**Contextual:**
- All randomness flows through the adapter boundary.
- Determinism and call labeling are centralized.

### Test Expectations

- Update test RNG stubs to use adapter RNG (no `Math.random` fallback).
- Ensure RNG-dependent tests pass with adapter-based RNG only.

### Do Not

- Introduce alternate RNG providers or new fallbacks.
- Use `Math.random` in tests to bypass adapter RNG.

### Expected Impact

RNG boundary becomes explicit and testable; adapter is the single source of randomness; hidden nondeterminism is removed.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
