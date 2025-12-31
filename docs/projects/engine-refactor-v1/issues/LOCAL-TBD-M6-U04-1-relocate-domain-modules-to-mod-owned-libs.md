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

### Prework Findings
#### P1) Domain dependency edge audit (base tag imports must be removed)
- Domain files importing `@mapgen/base/*` today:
  - `packages/mapgen-core/src/domain/narrative/queries.ts` (uses `M3_DEPENDENCY_TAGS`)
  - `packages/mapgen-core/src/domain/narrative/corridors/index.ts` (uses `M3_DEPENDENCY_TAGS`)
  - `packages/mapgen-core/src/domain/narrative/tagging/margins.ts` (uses `M3_DEPENDENCY_TAGS`)
  - `packages/mapgen-core/src/domain/narrative/tagging/hotspots.ts` (uses `M3_DEPENDENCY_TAGS`)
  - `packages/mapgen-core/src/domain/narrative/tagging/rifts.ts` (uses `M3_DEPENDENCY_TAGS`)
  - `packages/mapgen-core/src/domain/narrative/orogeny/belts.ts` (uses `M3_DEPENDENCY_TAGS`)
  - `packages/mapgen-core/src/domain/morphology/islands/placement.ts` (uses `M3_DEPENDENCY_TAGS`)
  - `packages/mapgen-core/src/domain/hydrology/climate/runtime.ts` (uses `M3_DEPENDENCY_TAGS`)
  - `packages/mapgen-core/src/domain/ecology/biomes/index.ts` (uses `@mapgen/base/pipeline/artifacts` accessors)
  - `packages/mapgen-core/src/domain/ecology/features/index.ts` (uses `@mapgen/base/pipeline/artifacts` accessors)
  - `packages/mapgen-core/src/domain/morphology/volcanoes/scoring.ts` (uses `@mapgen/base/foundation/constants` BOUNDARY_TYPE)
  - `packages/mapgen-core/src/domain/morphology/mountains/scoring.ts` (uses `@mapgen/base/foundation/constants` BOUNDARY_TYPE)
  - `packages/mapgen-core/src/domain/morphology/coastlines/plate-bias.ts` (uses `@mapgen/base/foundation/constants` BOUNDARY_TYPE)
  - `packages/mapgen-core/src/domain/morphology/coastlines/rugged-coasts.ts` (uses `@mapgen/base/foundation/constants` BOUNDARY_TYPE)
- Replacement guidance after move:
  - Replace `@mapgen/base/tags` with a mod-owned `recipes/standard/tags.ts` (or `domain/tags.ts`) that re-exports the same tag IDs.
  - Replace `@mapgen/base/pipeline/artifacts` accessors with mod-owned artifact helpers colocated with the recipe (`recipes/standard/artifacts.ts`) and re-export them to domain.
  - Move `BOUNDARY_TYPE` into a mod-owned foundation constants module (e.g., `domain/foundation/constants.ts`) and update imports accordingly.

## Implementation Decisions

### Preserve `@mapgen/domain/*` import paths via mod-local TS path mapping
- **Context:** Domain modules contain extensive `@mapgen/domain/*` self-references; rewriting all paths would be noisy and error-prone.
- **Options:** (A) rewrite to relative imports, (B) add a mod-local `paths` alias for `@mapgen/domain/*`.
- **Choice:** Option B — map `@mapgen/domain/*` → `mods/mod-swooper-maps/src/domain/*`.
- **Rationale:** Keeps file-level APIs stable while relocating domain logic into the mod package.
- **Risk:** Requires tsconfig path resolution during builds; if tooling ignores `paths`, imports will fail.

### Export engine lib utilities needed by domain modules
- **Context:** Domain code relies on `lib/plates/*` and `lib/heightfield/*`, which are not exported as package subpaths.
- **Options:** (A) copy helpers into the mod, (B) add package exports and indexes for the missing lib modules.
- **Choice:** Option B — add `lib/plates` and `lib/heightfield` indexes and export them from `@swooper/mapgen-core`.
- **Rationale:** Keeps domain logic depending on shared engine utilities rather than duplicating code.
- **Risk:** Expands the public surface of `@swooper/mapgen-core`; downstream docs/tests may need updates.

### Introduce mod-owned tag/artifact shims for domain access
- **Context:** Domain modules referenced `@mapgen/base/tags` and `@mapgen/base/pipeline/artifacts`.
- **Options:** (A) keep base dependencies, (B) move tags/artifacts into mod-owned modules and re-export to domain.
- **Choice:** Option B — create `recipes/standard/tags.ts` + `recipes/standard/artifacts.ts` and re-export from `domain/*`.
- **Rationale:** Removes base-mod coupling while keeping the tag identifiers and artifact accessors colocated with standard content.
- **Risk:** The artifact helper surface is minimal (climate + river adjacency); additional helpers may be needed when steps migrate.

### Re-export bootstrap types from the bootstrap entrypoint
- **Context:** Domain types reference `@mapgen/bootstrap/types`, but the public subpath is `@swooper/mapgen-core/bootstrap`.
- **Options:** (A) add a new bootstrap subpath export, (B) re-export types from the bootstrap entrypoint.
- **Choice:** Option B — re-export types from `bootstrap/entry.ts`.
- **Rationale:** Keeps imports on the existing bootstrap entry path without adding another public subpath.
- **Risk:** Type-only exports are now exposed via the bootstrap entry, which may affect API expectations.
