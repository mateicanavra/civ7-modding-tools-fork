---
id: LOCAL-TBD-M6-U03
title: "[M6] Scaffold standard content package skeleton and exports"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: []
blocked_by: [LOCAL-TBD-M6-U02]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Create the standard content package skeleton under `mods/mod-swooper-maps` with the required exports and layout.

## Deliverables
- `mods/mod-swooper-maps/src/mod.ts` exports standard recipes.
- `mods/mod-swooper-maps/src/recipes/standard/**` skeleton exists with stage and step layout.
- `mods/mod-swooper-maps/src/domain/**` exists as the mod-local domain root.

## Acceptance Criteria
- Stage layout follows the required template:
  - `stages/<stageId>/index.ts`
  - `stages/<stageId>/steps/index.ts` (named exports only; no `export *`)
  - `stages/<stageId>/steps/*.ts` (one file per step)
- Recipe code imports the authoring SDK (no engine registry access).

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes
- Blocked by: [LOCAL-TBD-M6-U02](./LOCAL-TBD-M6-U02-ship-authoring-sdk-v1-factories.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Establish the standard recipe skeleton under `mods/mod-swooper-maps/src/recipes/standard/` with stage folders and explicit step exports.
- Add `mods/mod-swooper-maps/src/mod.ts` as the recipe export surface.
- Create `mods/mod-swooper-maps/src/domain/` as the root for mod-owned domain logic.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
