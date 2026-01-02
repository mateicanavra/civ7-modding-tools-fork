---
id: CIV-35
title: "[M2] Add MapOrchestrator.generateMap smoke test for config + foundation slice"
state: planned
priority: 3
estimate: 3
project: engine-refactor-v1
milestone: M2-stable-engine-slice
assignees: []
labels: [Testing, Architecture]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [CIV-23, CIV-26, CIV-31]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Add at least one end-to-end `MapOrchestrator.generateMap` smoke test over the current M2 slice, using a minimal/default `MapGenConfig` and a stub adapter, to ensure foundation data products are populated and the stage flow does not regress.

## Deliverables

- A new Vitest test file under `packages/mapgen-core/test/` (or an appropriate subfolder) that:
  - Uses `default-config helper()` or an equivalent helper to construct a minimal `MapGenConfig`.
  - Wires a stub `EngineAdapter` sufficient to exercise the orchestrator without touching the real Civ7 runtime.
  - Calls `MapOrchestrator.generateMap()` with the validated config and stub adapter.
  - Asserts that:
    - The foundation-related data products (e.g., `FoundationContext`, plate tensors) are present and well-formed.
    - No unexpected errors are thrown and the stage flow completes.

## Acceptance Criteria

- [x] Test suite includes at least one end-to-end `MapOrchestrator.generateMap` smoke test for the M2 slice.
- [x] The test uses validated `MapGenConfig` and does not rely on global config stores.
- [x] The test asserts presence of foundation data products and fails loudly if a regression breaks the foundation slice.
- [x] Tests run as part of `pnpm test` and pass reliably.

## Testing / Verification

- Run `pnpm test` (or the scoped test command for `packages/mapgen-core`) and confirm the new smoke test passes.
- Temporarily break an obvious part of the foundation wiring (locally) to confirm the test fails in a useful way, then revert.

## Dependencies / Notes

- Complements CIV-23 (broader integration tests) by providing a focused, minimal safety net for the M2 config + foundation slice.
- This test should remain valid even as pipeline primitives are introduced in M3, as long as `MapOrchestrator` continues to expose a compatible entrypoint.

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Consider reusing any existing stub adapters or test helpers from other engine tests to avoid duplication.
- Keep the test narrow and smoke-level; detailed assertions about climate, overlays, or placement belong in later milestones.
