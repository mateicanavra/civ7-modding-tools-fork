---
id: LOCAL-TBD-M4-EFFECTS-1
title: "[M4] Effects verification (1/3): define effect:* tags + adapter postcondition surfaces"
state: planned
priority: 2
estimate: 2
project: engine-refactor-v1
milestone: M4-tests-validation-cleanup
assignees: []
labels: [Architecture, Validation]
parent: M4-EFFECTS-VERIFICATION
children: []
blocked_by: []
blocked: [LOCAL-TBD-M4-EFFECTS-2, LOCAL-TBD-M4-EFFECTS-3]
related_to: [CIV-47]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Introduce canonical `effect:*` tags for engine-surface mutations and add minimal adapter-backed postcondition surfaces, without changing step scheduling yet.

## Deliverables

- Canonical `effect:*` tags for high-risk engine mutations (biomes/features/placement) in the registry surface.
- Minimal adapter-backed postcondition queries needed to verify those effects (stub + real adapter hooks).
- Documentation updates for DEF-008 / engine boundary policy references where these effects are defined.

## Acceptance Criteria

- `effect:engine.biomesApplied`, `effect:engine.featuresApplied`, and `effect:engine.placementApplied` are registered in the target registry surface with clear ownership metadata.
- Adapter surface exposes the minimal postcondition checks needed to validate those effects (stubbed where necessary for tests).
- No changes to step `requires`/`provides` yet (this is additive/scaffolding only).

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- Any new adapter stubs compile and pass existing test suites.

## Dependencies / Notes

- **Parent:** [M4-EFFECTS-VERIFICATION](M4-EFFECTS-VERIFICATION.md)
- **Blocks:** LOCAL-TBD-M4-EFFECTS-2, LOCAL-TBD-M4-EFFECTS-3
- **Related:** CIV-47 (adapter consolidation)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep this additive: do not alter step scheduling or remove `state:engine.*` in this issue.
- Define effects alongside existing tag registries or registry entries; do not introduce new global registries.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
