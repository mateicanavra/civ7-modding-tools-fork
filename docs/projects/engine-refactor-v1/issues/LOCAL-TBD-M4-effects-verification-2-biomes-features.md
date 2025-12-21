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

## Prework Prompt (Agent Brief)

Goal: map biomes/features reification so downstream migrations are mechanical and effect verification is minimal.

Deliverables:
- A reification plan: which `field:*` or `artifact:*` outputs biomes/features should publish (e.g., `field:biomes`, `field:features`, or more granular field names).
- A consumer map: downstream steps that currently depend on engine reads and must switch to the reified fields/artifacts.
- A minimal postcondition checklist for verifying `effect:engine.biomesApplied` and `effect:engine.featuresApplied`.

Where to look:
- Code: `packages/mapgen-core/src/pipeline/ecology/**`, `packages/mapgen-core/src/domain/ecology/**`,
  `packages/mapgen-core/src/pipeline/standard.ts`.
- Search for engine reads or `state:engine.*` usage tied to biomes/features.
- SPEC/SPIKE: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md` (fields/effects),
  `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.5).

Constraints/notes:
- Use reify-after-mutate; keep behavior stable.
- Prefer minimal, adapter-friendly postconditions (avoid full-map scans).
- Do not implement code; return the plan and maps as markdown tables/lists.
