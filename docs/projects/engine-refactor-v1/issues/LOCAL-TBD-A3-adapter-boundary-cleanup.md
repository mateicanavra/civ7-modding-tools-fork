---
id: LOCAL-TBD-A3
title: "[M4] Adapter Boundary Cleanup (TerrainBuilder Removal)"
state: planned
priority: 2
estimate: 1
project: engine-refactor-v1
milestone: null
assignees: []
labels: [Improvement, Architecture, Adapter]
parent: LOCAL-TBD
children: []
blocked_by: [LOCAL-TBD-A1, LOCAL-TBD-A2]
blocked: [LOCAL-TBD-A4]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Remove all direct `TerrainBuilder.*` usage in `packages/mapgen-core/**`; route rainfall writes through `ctx.adapter.setRainfall`; keep behavior intact.

## Deliverables

- All direct `TerrainBuilder.*` runtime usage removed from `packages/mapgen-core/**`.
- Rainfall writes routed through `ctx.adapter.setRainfall`.
- Tests that referenced `globalThis.TerrainBuilder` updated to stub adapter methods instead.
- `TerrainBuilder` used only inside `packages/civ7-adapter/**`.
- Non-RNG engine access is routed through the adapter; RNG call-site cleanup is owned by A2.

## Acceptance Criteria

- [ ] `rg "TerrainBuilder\\." packages/mapgen-core` returns no runtime hits.
- [ ] Rainfall writes go through `ctx.adapter.setRainfall`.
- [ ] Tests stub adapter methods instead of `globalThis.TerrainBuilder`.
- [ ] Behavior remains intact (no functional changes beyond boundary enforcement).

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- `pnpm test:mapgen`
- `pnpm lint:adapter-boundary`
- `rg "TerrainBuilder\\." packages/mapgen-core` (expect no runtime hits)

## Dependencies / Notes

- **System area:** Adapter boundary, engine global access.
- **Why third:** Cleans engine boundary before the producer cutover; removes hidden globals.
- **Outcome:** Engine boundary is explicit and auditable; mapgen-core no longer depends on engine globals.
- **Scope guardrail:** Do not keep any direct `TerrainBuilder` usage in mapgen-core; do not re-architect rainfall generation here (deferred to DEF-010).
- **Blocked by:** [LOCAL-TBD-A1](LOCAL-TBD-A1-contract-enforcement.md) (Contract Enforcement), [LOCAL-TBD-A2](LOCAL-TBD-A2-rng-standardization.md) (RNG Standardization)
- **Parent:** [WorldModel Producer Cut (Phase A)](LOCAL-TBD-worldmodel-cut-phase-a.md)
- **Related deferral:** [DEF-010: Rainfall Generation Ownership](../deferrals.md#def-010-rainfall-generation-ownership-engine-vs-ts)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Contract Enforcement Details

All engine reads/writes in mapgen-core are accessed via adapter methods; `TerrainBuilder` is used only inside `packages/civ7-adapter/**`.

### Known Call Sites

- `world/model.ts` (selects `TerrainBuilder.getRandomNumber` as RNG)
- `world/plates.ts` (`globalThis.TerrainBuilder.getRandomNumber`)
- `domain/narrative/utils/rng.ts` (direct `TerrainBuilder.getRandomNumber`)
- `domain/narrative/paleo/rainfall-artifacts.ts` (direct `TerrainBuilder.setRainfall`)

### Done Checks

**Mechanical:**
- `rg "TerrainBuilder\\." packages/mapgen-core` returns no runtime hits.
- Rainfall writes go through `ctx.adapter.setRainfall`.

**Contextual:**
- Engine boundary is explicit.
- mapgen-core has no implicit access to engine globals.

### Test Expectations

- Update tests that referenced `globalThis.TerrainBuilder` to stub adapter methods instead.

### Do Not

- Keep any direct `TerrainBuilder` usage in mapgen-core.
- Re-architect rainfall generation here (deferred to DEF-010).

### Expected Impact

Engine boundary is explicit and auditable; mapgen-core no longer depends on engine globals.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
