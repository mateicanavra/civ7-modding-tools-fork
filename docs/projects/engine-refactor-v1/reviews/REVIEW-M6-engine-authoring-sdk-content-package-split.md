---
milestone: M6
id: M6-review
status: draft
reviewer: AI agent
---

## REVIEW m6-u01-promote-runtime-pipeline-as-engine-sdk-surface

### Quick Take
Runtime pipeline is promoted to the engine surface with updated imports/tests and a minimal engine-owned context; acceptance criteria are met, with legacy exports left for later M6 cleanup.
Re-review: no additional issues found.

### High-Leverage Issues
- None noted.

### Fix Now (Recommended)
- None.

### Defer / Follow-up
- Track removal of legacy exports (base/config/bootstrap, PipelineModV1) in the later M6 legacy-cleanup slice.

### Needs Discussion
- None.

### Cross-cutting Risks
- None noted.

## REVIEW m6-u02-1-define-authoring-pojos-and-schema-requirements

### Quick Take
Authoring POJO shapes and schema enforcement are in place with tests, but `instanceId` lives on `StepModule`, which conflicts with the stated intent to keep it recipe-occurrence-only.
Re-review: no additional issues beyond the `instanceId` placement concern.

### High-Leverage Issues
- `packages/mapgen-core/src/authoring/types.ts`: `StepModule` includes `instanceId`, so step definitions now carry occurrence identity; this diverges from the decision to keep `instanceId` recipe-only and can complicate reusing steps across recipes.

### Fix Now (Recommended)
- Move `instanceId` off `StepModule` into a recipe-stage step wrapper (or a new `RecipeStep` type) and keep the uniqueness check on recipe steps.

### Defer / Follow-up
- If `StepModule` intentionally represents recipe occurrences, document that in the authoring SDK and in parent U02 docs to avoid misuse.

### Needs Discussion
- Should authoring treat steps as reusable definitions (no `instanceId`) vs. per-recipe occurrences (current shape)?

### Cross-cutting Risks
- Step reuse across recipes could silently carry `instanceId` semantics and undermine the intended authoring/recipe separation.

## REVIEW m6-u02-2-implement-createrecipe-registry-plumbing-and-api-surface

### Quick Take
`createRecipe` now builds registries internally, derives deterministic step IDs, and exposes compile/run helpers, but it silently infers tag definitions from step usage, which shifts the contract away from explicit tag ownership.
Re-review: no additional issues beyond the tag inference vs explicit catalog mismatch.

### High-Leverage Issues
- `packages/mapgen-core/src/authoring/recipe.ts`: tag definitions are inferred from `requires`/`provides`, so missing tags will never surface as errors even if the intent was to require explicit tag catalogs; this deviates from the acceptance criteria that mention missing tags causing compile errors.

### Fix Now (Recommended)
- Decide whether tag definitions must be explicit; if yes, add a guard that every required/provided tag is present in `tagDefinitions` (and drop inference), or update the issue doc/parent scope to reflect the inference contract.

### Defer / Follow-up
- If inference is intended, document it in the authoring SDK docs and update the parent U02 scope to reflect that tag catalogs are optional/augmentative.

### Needs Discussion
- Do we want authoring to require explicit tag ownership catalogs for observability/validation, or is inference acceptable for the standard content package?

### Cross-cutting Risks
- Tag ownership/observability may be weaker than the target architecture if explicit tag catalogs become optional in practice.
