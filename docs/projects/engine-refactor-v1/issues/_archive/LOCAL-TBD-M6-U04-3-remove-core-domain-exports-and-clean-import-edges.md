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

### Prework Findings
#### P1) Core domain export surface inventory
- Direct domain re-export:
  - `packages/mapgen-core/src/index.ts` → `export * from "@mapgen/domain/index.js";`
- Core module references that will break once `src/domain/**` is removed:
  - `packages/mapgen-core/src/orchestrator/task-graph.ts` imports `@mapgen/domain/narrative/queries.js`.
  - `packages/mapgen-core/src/base/tags.ts` imports `@mapgen/domain/narrative/artifacts.js`.
- Package export map currently exposes domain subpaths (from `packages/mapgen-core/package.json`):
  - `"./domain"`, `"./domain/morphology"`, `"./domain/hydrology"`, `"./domain/ecology"`, `"./domain/narrative"`, `"./domain/placement"`
- Post-delete verification queries (expected zero hits):
  - `rg -n "@mapgen/domain" packages/mapgen-core/src -S`
  - `rg -n "packages/mapgen-core/src/domain" -S`

## Implementation Decisions

### Introduce `@mapgen-content/*` for mod-owned domain imports
- **Context:** Core code still needs domain helpers while `packages/mapgen-core/src/domain/**` is deleted.
- **Options:** (A) depend on the mod package directly, (B) use an internal TS path alias to the mod domain.
- **Choice:** Option B — add `@mapgen-content/*` mapping to the mod domain in `packages/mapgen-core/tsconfig.paths.json`.
- **Rationale:** Avoids a circular workspace dependency between mapgen-core and mod-swooper-maps while keeping imports explicit.
- **Risk:** Tooling must respect TS path aliases; verify bundling behavior before publishing.

### Remove domain exports from mapgen-core package surfaces
- **Context:** Core package should no longer expose domain APIs after the move.
- **Options:** (A) keep temporary re-exports, (B) delete domain exports immediately.
- **Choice:** Option B — remove domain exports from `packages/mapgen-core/src/index.ts` and `packages/mapgen-core/package.json`.
- **Rationale:** Enforces the boundary that domain logic lives in the mod package.
- **Risk:** Downstream imports relying on mapgen-core domain exports will break until migrated.
