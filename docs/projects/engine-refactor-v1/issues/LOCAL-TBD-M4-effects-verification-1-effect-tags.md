---
id: LOCAL-TBD-M4-EFFECTS-1
title: "[M4] Effects verification: define effect:* tags + adapter postcondition surfaces"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: LOCAL-TBD-M4-TARGET-ARCH-CUTOVER
assignees: []
labels: [Architecture, Validation]
parent: LOCAL-TBD-M4-EFFECTS-VERIFICATION
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

- **Parent:** [LOCAL-TBD-M4-EFFECTS-VERIFICATION](LOCAL-TBD-M4-EFFECTS-VERIFICATION.md)
- **Blocks:** LOCAL-TBD-M4-EFFECTS-2, LOCAL-TBD-M4-EFFECTS-3
- **Related:** CIV-47 (adapter consolidation)
- **Coordination:** Effect tags must be schedulable via the registry-instantiated catalog owned by LOCAL-TBD-M4-TAG-REGISTRY-CUTOVER.

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

## Prework Prompt (Agent Brief)

Goal: define the effect tag catalog and the minimal adapter postcondition surfaces needed for verification.

Deliverables:
- A catalog of `effect:*` tags for biomes, features, and placement (ID, owner, providing step).
- A minimal adapter postcondition API sketch for verifying each effect (what query is needed, and where it would live).
- A note on where these effects should be registered (registry entries vs global tags).

Where to look:
- SPEC: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (Tag registry, Effects).
- SPIKE: `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.5, §2.8).
- Code: `packages/mapgen-core/src/pipeline/tags.ts`, `packages/mapgen-core/src/pipeline/PipelineExecutor.ts`,
  `packages/mapgen-core/src/pipeline/ecology/**`, `packages/mapgen-core/src/pipeline/placement/**`.
- Adapter types: search for `EngineAdapter` or adapter interfaces under `packages/mapgen-core/src/**` and `packages/civ7-adapter/**`.

Constraints/notes:
- Effects must be verifiable (no "asserted but unverified" scheduling edges).
- Keep this additive; no scheduling changes in this prework.
- Do not implement code; return the catalog and API sketch as a markdown table/list.
- Coordinate with the tag registry cutover so effect tags land in the canonical registry surface.

## Prework Results / References

- Resource doc: `docs/projects/engine-refactor-v1/resources/m4-prework/local-tbd-m4-effects-1-effect-tags-postconditions.md`
- Includes: current `state:engine.*` usage + providing steps, a proposed `effect:*` seed catalog for biomes/features/placement, and a minimal postcondition verification sketch (including the open question for `effect:engine.placementApplied` verification).
