---
id: CIV-49
title: "[M4] Enforce Foundation Contracts with Fail-Fast Validation"
state: planned
priority: 2
estimate: 1
project: engine-refactor-v1
milestone: null
assignees: []
labels: [Improvement, Architecture]
parent: CIV-48
children: []
blocked_by: []
blocked: [CIV-50, CIV-51, CIV-52]
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Enforce `ctx.foundation` presence and required fields at stage boundaries; remove silent fallbacks; ensure `foundation.dynamics` is always present via schema defaults or required fields; add fail-fast validation on publish.

## Deliverables

- `ctx.foundation` validated at publish time with fail-fast checks for required fields.
- `foundation.dynamics` always present via schema defaults or required fields (no runtime creation).
- All code-level fallbacks for missing `ctx.foundation` or `foundation.dynamics` removed.
- Foundation publish path validates array presence and expected sizes for plates + dynamics tensors.

## Acceptance Criteria

- [x] No code-level fallbacks for missing `ctx.foundation` or `foundation.dynamics` in `packages/mapgen-core/**`.
- [x] `foundation.dynamics` always present via schema defaults or required fields.
- [x] `ctx.foundation` publish path validates array presence and expected sizes.
- [x] Tests that relied on implicit fallbacks updated to expect failure when `ctx.foundation`/`dynamics` is missing.
- [x] Focused validation test exists that fails on missing/incorrectly sized foundation tensors.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- `pnpm test:mapgen`
- Verify tests expecting missing `ctx.foundation`/`dynamics` fail fast at the boundary.

## Dependencies / Notes

- **System area:** Foundation stage, producer boundary validation.
- **Why first:** Establishes the contract we will preserve during the cutover; surfaces missing data early; prevents hidden behavior changes.
- **Outcome:** Foundation contract is explicit and enforced; downstream stages either receive guaranteed data or fail fast at the boundary.
- **Scope guardrail:** Do not add new code-level defaults or hidden fallbacks; do not defer validation to downstream stages only (enforce at publish).
- **Parent:** [CIV-48: WorldModel Producer Cut (Phase A)](CIV-48-worldmodel-cut-phase-a.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Contract Enforcement Details

- Use schema defaults or required fields for `foundation.dynamics` (no runtime creation).
- Validate `ctx.foundation` at publish time (producer boundary): non-null arrays and expected dimensions for plates + dynamics tensors.

### Done Checks

**Mechanical:**
- No code-level fallbacks for missing `ctx.foundation` or `foundation.dynamics`.
- `foundation.dynamics` always present via schema defaults or required fields.
- `ctx.foundation` publish path validates array presence and expected sizes.

**Contextual:**
- Foundation contract is explicit and enforced.
- Downstream stages either receive guaranteed data or fail fast at the boundary.

### Test Expectations

- Update any tests that relied on implicit fallbacks to expect failure when `ctx.foundation`/`dynamics` is missing.
- Add/adjust a focused validation test that fails on missing/incorrectly sized foundation tensors.

### Do Not

- Add new code-level defaults or hidden fallbacks.
- Defer validation to downstream stages only (enforce at publish).

### Expected Impact

Foundation contract becomes explicit and enforceable; missing data surfaces immediately; downstream behavior is deterministic w.r.t. contract presence.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
