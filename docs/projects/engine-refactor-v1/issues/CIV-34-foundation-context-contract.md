---
id: CIV-34
title: "[M2] Document FoundationContext contract and config → tunables → world-model flow"
state: planned
priority: 3
estimate: 3
project: engine-refactor-v1
milestone: M2-stable-engine-slice
assignees: []
labels: [Documentation, Architecture]
parent: null
children: []
blocked_by: []
blocked: []
related_to: [CIV-26, CIV-30, CIV-31]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Make the `FoundationContext` contract explicit and document the end-to-end flow from config through tunables to the world model, so downstream work in M3+ can rely on a clear, stable definition of what the M2 slice guarantees.

## Deliverables

- A concise contract doc at `docs/projects/engine-refactor-v1/resources/CONTRACT-foundation-context.md` that:
  - Defines the `FoundationContext` structure and semantics at the end of the M2 slice.
  - Lists the key data products available after foundation runs (e.g., plate IDs/tensors, uplift/rift fields, heightfield linkage).
  - Describes the `config → tunables → MapOrchestrator → FoundationContext → world model` flow in one place.
- Clarified language in the M2 milestone / review docs that:
  - Treats tunables as a derived, read-only view over `MapGenConfig`.
  - Makes clear that tunables are not the primary config store for future work.

## Acceptance Criteria

- [x] `FoundationContext` fields and guarantees are documented in `resources/CONTRACT-foundation-context.md` and linked from the engine-refactor project docs.
- [x] The config → tunables → world-model flow is described as the canonical M2 slice and matches the actual implementation.
- [x] M2 docs and review explicitly describe tunables as a view over validated `MapGenConfig`, not as a separate config store.
- [x] Future M3+ issues can reference this contract instead of re-deriving the behavior from code/reviews.

## Testing / Verification

- Cross-check the documented `FoundationContext` contract against:
  - `packages/mapgen-core/src/core/types.ts`
  - `packages/mapgen-core/src/MapOrchestrator.ts`
  - `packages/mapgen-core/src/world/*` consumers
- Confirm that the described flow matches the current `bootstrap()` / tunables / orchestrator wiring.

## Dependencies / Notes

- Builds directly on CIV-26–CIV-31; no new engine behavior is introduced here.
- This is intended as a reference for upcoming data-product and pipeline work in M3+, so it should be kept evergreen (updated if the contract changes).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Use `resources/CONTRACT-foundation-context.md` as the focused “FoundationContext & config flow” contract doc for this milestone; keep it small and tightly scoped to the M2 slice.
- Keep this at the “what is guaranteed” level; detailed stage-by-stage behavior belongs in system docs and PRDs.
