---
id: LOCAL-TBD-M6-U04-3
title: "[M6] Remove core domain exports and clean import edges"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: LOCAL-TBD-M6-U04
children: []
blocked_by: [LOCAL-TBD-M6-U02, LOCAL-TBD-M6-U04-2]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Remove core domain modules and clean up remaining imports after the move.

## Deliverables
- `packages/mapgen-core/src/domain/**` is deleted.
- Core export surfaces no longer reference domain modules.
- Residual imports are updated or removed.

## Acceptance Criteria
- `packages/mapgen-core/src/index.ts` has no domain exports.
- `rg "mapgen-core/src/domain"` returns no matches in the repo.

## Testing / Verification
- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes
- Parent: [LOCAL-TBD-M6-U04](./LOCAL-TBD-M6-U04-move-domain-libraries-into-standard-content-package.md)
- Blocked by: [LOCAL-TBD-M6-U02](./LOCAL-TBD-M6-U02-ship-authoring-sdk-v1-factories.md), [LOCAL-TBD-M6-U04-2](./LOCAL-TBD-M6-U04-2-update-recipe-steps-to-use-mod-owned-domain-libs.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Remove `packages/mapgen-core/src/domain/**` after all consumers are updated.
- Clean up exports and any lingering import edges referencing the old core domain paths.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
