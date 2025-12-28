---
id: LOCAL-TBD-M6-U05
title: "[M6] Re-author standard recipe as a mini-package"
state: planned
priority: 2
estimate: 16
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: [LOCAL-TBD-M6-U05-1, LOCAL-TBD-M6-U05-2]
blocked_by: [LOCAL-TBD-M6-U03, LOCAL-TBD-M6-U04]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Re-author the standard recipe as a mod-owned mini-package by completing the child issues.

## Deliverables
- Standard recipe is authored via the authoring SDK under `mods/mod-swooper-maps/src/recipes/standard/**`.
- Stages own steps on disk; recipe composes stages explicitly.
- Tag definitions are recipe-local and registered via `createRecipe`.

## Acceptance Criteria
- Child issues are complete and the standard recipe compiles via the authoring SDK.
- Steps are recipe-local wrappers with explicit `requires`/`provides` metadata.
- Narrative remains a normal stage slice (no redesign in M6).

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes
- Blocked by: [LOCAL-TBD-M6-U03](./LOCAL-TBD-M6-U03-scaffold-standard-content-package-skeleton-and-exports.md), [LOCAL-TBD-M6-U04](./LOCAL-TBD-M6-U04-move-domain-libraries-into-standard-content-package.md)
- Sub-issues:
  - [LOCAL-TBD-M6-U05-1](./LOCAL-TBD-M6-U05-1-translate-base-steps-into-recipe-local-stage-step-files.md)
  - [LOCAL-TBD-M6-U05-2](./LOCAL-TBD-M6-U05-2-compose-standard-recipe-and-tag-definitions-via-authoring-sdk.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Sequencing: translate step files first (`LOCAL-TBD-M6-U05-1`), then compose the recipe and tags (`LOCAL-TBD-M6-U05-2`).
- Child issue docs carry the detailed implementation steps.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Prework Prompts (run before implementation)

#### P1) Standard recipe baseline inventory (order + step ids)
- **Goal:** Capture the current “standard” ordering from the base mod so the new recipe composes the same structure (purist cutover, but deterministic).
- **Commands:**
  - `sed -n '1,200p' packages/mapgen-core/src/base/recipes/default.ts`
  - `find packages/mapgen-core/src/base/pipeline -maxdepth 2 -type f -name "*Step.ts" -print`
- **Output to capture:**
  - The ordered list of current step IDs (and any `instanceId` usage).
  - The list of step implementation files that must be translated into recipe-local stage/steps folders.

### Prework Findings (Pending)
_TODO (agent): append findings here; this becomes the authoritative “old → new” ordering checklist._
