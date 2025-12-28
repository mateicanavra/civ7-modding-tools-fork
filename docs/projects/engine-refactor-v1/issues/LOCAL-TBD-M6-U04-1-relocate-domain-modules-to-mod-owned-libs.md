---
id: LOCAL-TBD-M6-U04-1
title: "[M6] Relocate domain modules to mod-owned libs"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: LOCAL-TBD-M6-U04
children: []
blocked_by: [LOCAL-TBD-M6-U02]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Move domain modules from core into `mods/mod-swooper-maps/src/domain/**` without behavior changes.

## Deliverables
- Domain modules relocated under `mods/mod-swooper-maps/src/domain/**`.
- Module boundaries and public APIs preserved during the move.
- Temporary compatibility shims identified (if needed) for downstream updates.

## Acceptance Criteria
- Domain logic is present under the mod domain root with the same exported APIs.
- The move follows the authoritative file mapping in the SPIKE (section 9).

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes
- Parent: [LOCAL-TBD-M6-U04](./LOCAL-TBD-M6-U04-move-domain-libraries-into-standard-content-package.md)
- Blocked by: [LOCAL-TBD-M6-U02](./LOCAL-TBD-M6-U02-ship-authoring-sdk-v1-factories.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Relocate `packages/mapgen-core/src/domain/**` modules into `mods/mod-swooper-maps/src/domain/**`.
- Preserve file names and exports to minimize churn for downstream import updates.
- Use the SPIKE file mapping (section 9) as the source of truth.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
