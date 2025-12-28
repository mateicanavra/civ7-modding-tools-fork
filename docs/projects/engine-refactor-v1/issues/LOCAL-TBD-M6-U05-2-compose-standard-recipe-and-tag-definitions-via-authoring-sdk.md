---
id: LOCAL-TBD-M6-U05-2
title: "[M6] Compose standard recipe and tag definitions via authoring SDK"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: LOCAL-TBD-M6-U05
children: []
blocked_by: [LOCAL-TBD-M6-U03, LOCAL-TBD-M6-U04, LOCAL-TBD-M6-U05-1]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Compose the standard recipe and tag catalog via the authoring SDK.

## Deliverables
- `mods/mod-swooper-maps/src/recipes/standard/recipe.ts` uses `createRecipe`.
- `mods/mod-swooper-maps/src/recipes/standard/tags.ts` defines the recipe tag catalog.
- Stages are composed explicitly in the recipe.

## Acceptance Criteria
- `createRecipe({ tagDefinitions })` registers the standard tag catalog.
- The recipe composes stages with explicit `requires`/`provides` ordering.
- The recipe can compile an `ExecutionPlan` from a config instance.

## Testing / Verification
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes
- Parent: [LOCAL-TBD-M6-U05](./LOCAL-TBD-M6-U05-re-author-standard-recipe-as-a-mini-package.md)
- Blocked by: [LOCAL-TBD-M6-U03](./LOCAL-TBD-M6-U03-scaffold-standard-content-package-skeleton-and-exports.md), [LOCAL-TBD-M6-U04](./LOCAL-TBD-M6-U04-move-domain-libraries-into-standard-content-package.md), [LOCAL-TBD-M6-U05-1](./LOCAL-TBD-M6-U05-1-translate-base-steps-into-recipe-local-stage-step-files.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Implement `recipe.ts` to compose stages and derive step ids via the authoring SDK.
- Define `tags.ts` with the standard tag catalog and pass it into `createRecipe`.
- Ensure stage composition mirrors the existing standard ordering.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
