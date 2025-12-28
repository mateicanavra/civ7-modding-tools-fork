---
id: LOCAL-TBD-M6-U04
title: "[M6] Move domain libraries into standard content package"
state: planned
priority: 2
estimate: 16
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: [LOCAL-TBD-M6-U04-1, LOCAL-TBD-M6-U04-2, LOCAL-TBD-M6-U04-3]
blocked_by: [LOCAL-TBD-M6-U02]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Move all domain logic out of core into the standard content package via sequenced child issues.

## Deliverables
- Domain libraries live under `mods/mod-swooper-maps/src/domain/**`.
- Recipe steps import domain logic from the content package.
- Core no longer exports or ships domain modules.

## Acceptance Criteria
- Child issues are complete and all domain logic is mod-owned.
- No imports from `packages/mapgen-core/src/domain/**` remain.
- Core build/test passes without domain exports.

## Testing / Verification
- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes
- Blocked by: [LOCAL-TBD-M6-U02](./LOCAL-TBD-M6-U02-ship-authoring-sdk-v1-factories.md)
- Sub-issues:
  - [LOCAL-TBD-M6-U04-1](./LOCAL-TBD-M6-U04-1-relocate-domain-modules-to-mod-owned-libs.md)
  - [LOCAL-TBD-M6-U04-2](./LOCAL-TBD-M6-U04-2-update-recipe-steps-to-use-mod-owned-domain-libs.md)
  - [LOCAL-TBD-M6-U04-3](./LOCAL-TBD-M6-U04-3-remove-core-domain-exports-and-clean-import-edges.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Sequencing: move modules first (`LOCAL-TBD-M6-U04-1`), update consumers (`LOCAL-TBD-M6-U04-2`), then delete core domain exports (`LOCAL-TBD-M6-U04-3`).
- Child issue docs carry the detailed implementation steps.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
