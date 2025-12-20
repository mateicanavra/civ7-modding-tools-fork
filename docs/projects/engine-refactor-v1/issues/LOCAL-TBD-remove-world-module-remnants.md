---
id: LOCAL-TBD
title: "[M4] Remove World Module Remnants"
state: planned
priority: 3
estimate: 3
project: engine-refactor-v1
milestone: M4
assignees: [codex]
labels: [Cleanup]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Remove the `world` module surface from `@swooper/mapgen-core`, migrate remaining dependencies to the foundation pipeline, and delete world-only tests/docs.

## Deliverables

- [x] `packages/mapgen-core/src/world` removed or relocated into foundation-scoped modules.
- [x] `@swooper/mapgen-core` public exports no longer include `./world`.
- [x] All remaining `world` imports updated (foundation pipeline + morphology callers).
- [x] World-only tests/docs updated or removed.

## Acceptance Criteria

- [x] `packages/mapgen-core/src/world` no longer exists.
- [x] No production imports reference `../world/*`.
- [x] `@swooper/mapgen-core` builds without a `./world` export.
- [x] Tests and docs no longer reference the old world module.

## Testing / Verification

- `pnpm -C packages/mapgen-core check`
- `pnpm -C packages/mapgen-core test`
- `pnpm -C packages/mapgen-core build`

## Dependencies / Notes

- **Scope:** Mapgen foundation plate generation + morphology boundary constants/types.
- **Risk:** Removing the public `./world` export is a breaking change; ensure internal consumers are migrated.
- **Related:** [CIV-52](CIV-52-worldmodel-producer-cutover.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

- Replace `world/*` imports in foundation + morphology with a new foundation-scoped module.
- Move `BOUNDARY_TYPE`, `PlateConfig`, `SeedSnapshot`, and `PlateSeedManager` to the new module or inline where needed.
- Remove `packages/mapgen-core/test/world` tests or relocate coverage into foundation tests.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
