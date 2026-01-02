---
id: LOCAL-TBD-M6-U08
title: "[M6] Finalize ecology domain ops (pedology/resources/features)"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Finish the ecology domain migration to the op/module architecture by adding pedology + resource basin ops and promoting feature tweaks to a plan/apply model that consumes the new biome artifact.

## Deliverables
- Pedology op publishes soils/fertility artifact (`artifact:ecology.soils@v1`) derived from bedrock age/type, slope, and climate fields.
- Resource basin op publishes clustered candidate maps for coal/iron/oil using pedology + tectonics + hydrology inputs.
- Feature planner op emits feature intents (reefs/vegetation density tweaks) from biome/soil/hydrology artifacts; step apply logic handles adapter writes.
- Standard ecology steps require the new artifacts and compose config directly from op schemas (`classifyBiomes.config`, pedology/resource/feature configs).
- Docs updated (ecology.md, recipe/tag references) and tests cover the new ops and step wiring.

## Acceptance Criteria
- All ecology domain entrypoints are operation modules with colocated schemas/types; steps only orchestrate inputs/publish/apply.
- Artifacts for soils, resource basins, and biome/feature plans are published under recipe-owned keys with validators registered in the tag registry.
- Feature placement uses biome vegetation density (and, where relevant, soil moisture/fertility) instead of engine-local heuristics.
- Config defaults and bindings are surfaced via op exports; no bespoke schema wrappers in steps.

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm lint` / `pnpm check` (workspace)

## Dependencies / Notes
- Architecture + op contracts: `docs/system/libs/mapgen/ecology.md`
- Step/domain interaction model: `docs/projects/engine-refactor-v1/resources/spec/SPEC-pending-step-domain-operation-modules.md`

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)
- Sequence: pedology artifact → resource basin planner → feature planner + step rewrites → tag/recipe wiring → tests/docs.
- Preserve recipe-owned keys; keep domain modules symbol-only (adapter bindings stay in steps).
- Pedology framing: CLORPT proxy (climate + relief + parent material + time) to emit soil type palette + fertility scalar.
- Resource framing: coal in wet low sedimentary basins, iron on ancient shields/hills, oil on shelves/marshy lowlands; cluster candidates into basins before culling.
- Feature framing: vegetation density + biome validity gates forests/jungle/taiga; marsh from moisture + low elevation; reefs from warm shallow water; ice from low temp/high elevation.
