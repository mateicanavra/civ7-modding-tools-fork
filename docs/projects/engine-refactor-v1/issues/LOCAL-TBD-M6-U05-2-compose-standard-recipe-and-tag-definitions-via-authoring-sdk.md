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

### Prework Prompts (run before implementation)

#### P1) Tag catalog extraction inventory (base → recipe-local)
- **Goal:** Build the exact tag list (ids + kind + satisfies/demo) that must be moved into `mods/mod-swooper-maps/src/recipes/standard/tags.ts`.
- **Commands:**
  - `rg -n "export const BASE_TAG_DEFINITIONS" -n packages/mapgen-core/src/base/tags.ts`
  - `sed -n '1,220p' packages/mapgen-core/src/base/tags.ts`
- **Output to capture:**
  - A categorized list: `artifact:*`, `field:*`, `effect:*` (with counts).
  - Which tags rely on `satisfies` and/or `validateDemo` (these must be preserved).

#### P2) Recipe composition shape audit (stages → flattened recipe)
- **Goal:** Decide how the new `recipe.ts` composes stages while remaining the only source of truth for `RunRequest.recipe.steps[]`.
- **Commands:**
  - `sed -n '1,200p' packages/mapgen-core/src/base/recipes/default.ts`
  - `sed -n '1,120p' packages/mapgen-core/src/base/pipeline/*/steps.ts`
- **Output to capture:**
  - The authoritative ordering and where stage boundaries currently exist (if any).
  - A proposed stage composition list for the new recipe mini-package.

### Prework Findings (Pending)
_TODO (agent): append findings here; include the extracted tag list and the proposed stage composition order._
