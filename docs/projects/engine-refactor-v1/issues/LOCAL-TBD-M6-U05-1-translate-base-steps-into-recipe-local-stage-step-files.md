---
id: LOCAL-TBD-M6-U05-1
title: "[M6] Translate base steps into recipe-local stage/step files"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: LOCAL-TBD-M6-U05
children: []
blocked_by: [LOCAL-TBD-M6-U03, LOCAL-TBD-M6-U04]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Translate base mod step implementations into recipe-local stage and step files.

## Deliverables
- Step implementations moved from `@swooper/mapgen-core/base` into recipe-local files.
- Each stage owns a `steps/` directory with one file per step.
- Stage `steps/index.ts` uses named exports only.

## Acceptance Criteria
- Standard recipe steps compile from their new recipe-local locations.
- Stage and step layout follows the required skeleton.
- No `export *` usage in step index files.

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes
- Parent: [LOCAL-TBD-M6-U05](./LOCAL-TBD-M6-U05-re-author-standard-recipe-as-a-mini-package.md)
- Blocked by: [LOCAL-TBD-M6-U03](./LOCAL-TBD-M6-U03-scaffold-standard-content-package-skeleton-and-exports.md), [LOCAL-TBD-M6-U04](./LOCAL-TBD-M6-U04-move-domain-libraries-into-standard-content-package.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Translate current `@swooper/mapgen-core/base` step implementations into recipe-local step files.
- Ensure stages own steps on disk and expose explicit named exports.
- Keep step `requires`/`provides` metadata intact during the move.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
