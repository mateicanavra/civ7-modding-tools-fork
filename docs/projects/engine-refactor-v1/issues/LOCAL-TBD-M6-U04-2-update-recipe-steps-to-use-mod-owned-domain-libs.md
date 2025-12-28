---
id: LOCAL-TBD-M6-U04-2
title: "[M6] Update recipe steps to use mod-owned domain libs"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: LOCAL-TBD-M6-U04
children: []
blocked_by: [LOCAL-TBD-M6-U02, LOCAL-TBD-M6-U04-1]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Update recipe steps and stages to import domain logic from the standard content package.

## Deliverables
- Step and stage modules reference `mods/mod-swooper-maps/src/domain/**` for domain logic.
- No recipe or step imports from `packages/mapgen-core/src/domain/**` remain.

## Acceptance Criteria
- Recipe-local steps compile while importing only mod-owned domain modules.
- All domain import edges point into the content package.

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes
- Parent: [LOCAL-TBD-M6-U04](./LOCAL-TBD-M6-U04-move-domain-libraries-into-standard-content-package.md)
- Blocked by: [LOCAL-TBD-M6-U02](./LOCAL-TBD-M6-U02-ship-authoring-sdk-v1-factories.md), [LOCAL-TBD-M6-U04-1](./LOCAL-TBD-M6-U04-1-relocate-domain-modules-to-mod-owned-libs.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Update all recipe-local steps/stages to import domain helpers from the mod-owned domain library.
- Remove any remaining import edges that cross back into core domain paths.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
