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

### Prework Prompts (run before implementation)

#### P1) Domain dependency edge audit (base tag imports must be removed)
- **Goal:** Identify domain modules that currently import privileged base surfaces so we can remove those edges after moving (domain libs must not depend on `@mapgen/base/*`).
- **Commands:**
  - `rg -n "@mapgen/base" packages/mapgen-core/src/domain -S`
  - `rg -n "M3_DEPENDENCY_TAGS|BASE_TAG_DEFINITIONS" packages/mapgen-core/src/domain -S`
- **Output to capture:**
  - A list of domain files that import base tags/surfaces.
  - For each, a proposed replacement import path (new recipe-local `tags.ts` or local constants).

### Prework Findings (Pending)
_TODO (agent): append findings here and flag any cases where domain code currently “publishes artifacts” by importing tag IDs._
