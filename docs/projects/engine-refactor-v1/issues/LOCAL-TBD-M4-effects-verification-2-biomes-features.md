---
id: LOCAL-TBD-M4-EFFECTS-2
title: "[M4] Effects verification (2/3): biomes + features reify fields and verify effects"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M4-tests-validation-cleanup
assignees: []
labels: [Architecture, Validation]
parent: M4-EFFECTS-VERIFICATION
children: []
blocked_by: [LOCAL-TBD-M4-EFFECTS-1]
blocked: [LOCAL-TBD-M4-EFFECTS-3]
related_to: [CIV-47]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Reify engine-derived biome/feature outputs into explicit fields and provide verified `effect:*` tags for biomes/features steps.

## Deliverables

- `field:biomeId` and `field:featureType` (or existing equivalents) are produced by the biomes/features steps.
- Biomes/features steps provide `effect:engine.biomesApplied` and `effect:engine.featuresApplied` with adapter-backed postcondition checks.
- Downstream steps consume the reified fields instead of “read engine later” dependencies.

## Acceptance Criteria

- Biomes/features steps no longer require/provide `state:engine.*` and instead provide verified `effect:*` tags plus reified `field:*` outputs.
- Any downstream step that depends on engine-derived biome/feature data reads from `ctx.fields.*` (or equivalent) rather than adapter reads.
- Failures in adapter-backed postconditions are loud (no silent skips).

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- One smoke test covers a biomes/features pass with effect verification enabled.

## Dependencies / Notes

- **Parent:** [M4-EFFECTS-VERIFICATION](M4-EFFECTS-VERIFICATION.md)
- **Blocked by:** LOCAL-TBD-M4-EFFECTS-1
- **Blocks:** LOCAL-TBD-M4-EFFECTS-3

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Keep behavior stable; focus on reification + verification only.
- Prefer reify-after-mutate patterns:
  - mutate via adapter
  - reify results immediately into fields
  - provide the effect tag once the postcondition passes

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
