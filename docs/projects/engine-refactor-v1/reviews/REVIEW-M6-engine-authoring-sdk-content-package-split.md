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

## REVIEW m6-u08-realign-tests-and-ci-gates-to-ownership

### Quick Take
Engine-only tests now live in mapgen-core, content tests moved into the mod package, and a standard recipe execution smoke test was added for the mock adapter path.

### High-Leverage Issues
- None noted.

### Fix Now (Recommended)
- None noted.

### Defer / Follow-up
- None noted.

### Needs Discussion
- None noted.

### Cross-cutting Risks
- None noted.

## REVIEW m6-u06-rewrite-maps-as-recipe-instances

### Quick Take
Map entrypoints now run the standard recipe with runtime helpers and no legacy task-graph calls, but the new runtime still depends on legacy config types from `@swooper/mapgen-core/config`, which U07 intends to delete.

### High-Leverage Issues
- `mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts` and `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts`: import `MapGenConfig` from `@swooper/mapgen-core/config`, so the map runtime will break once U07 removes the core config package.

### Fix Now (Recommended)
- Move the config type surface into the mod package (or a new shared config module) and update the runtime imports before U07 deletes `packages/mapgen-core/src/config`.

### Defer / Follow-up
- None noted.

### Needs Discussion
- None noted.

### Cross-cutting Risks
- None noted.

## REVIEW m6-u05-2-compose-standard-recipe-and-tag-definitions-via-authoring-sdk

### Quick Take
Standard recipe composition now uses `createRecipe` with an explicit tag catalog and split stages, and a mod-level test was added, but the test depends on `@swooper/mapgen-core/base` fixtures that are slated for deletion in U07.

### High-Leverage Issues
- `mods/mod-swooper-maps/test/standard-recipe.test.ts`: relies on `@swooper/mapgen-core/base` for `BASE_TAG_DEFINITIONS` and `BASE_RECIPE_STEP_IDS`, so the test will break once U07 removes the base surface.

### Fix Now (Recommended)
- Copy the legacy tag/step inventories into a mod-owned fixture (or snapshot them in the test) so the test stays valid after base removal.

### Defer / Follow-up
- None noted.

### Needs Discussion
- None noted.

### Cross-cutting Risks
- None noted.

## REVIEW m6-u05-1-translate-base-steps-into-recipe-local-stage-step-files

### Quick Take
Base step implementations now live in recipe-local stage/step files with explicit named exports, but the acceptance test command still fails because the mod package lacks a `test` script.

### High-Leverage Issues
- `mods/mod-swooper-maps/package.json`: no `test` script, so `pnpm -C mods/mod-swooper-maps test` fails.

### Fix Now (Recommended)
- Add a `test` script (even if it aliases `pnpm run check`) or update the issue doc to remove the `pnpm -C mods/mod-swooper-maps test` requirement until tests exist.

### Defer / Follow-up
- None noted.

### Needs Discussion
- None noted.

### Cross-cutting Risks
- None noted.

## REVIEW m6-u04-1-relocate-domain-modules-to-mod-owned-libs

### Quick Take
Domain modules are now mirrored under the mod-owned `src/domain/**` with tag/artifact shims and new lib exports, but the mod package still lacks a `test` script even though the acceptance criteria call for `pnpm -C mods/mod-swooper-maps test`.

### High-Leverage Issues
- `mods/mod-swooper-maps/package.json`: no `test` script, so the documented verification command fails.

### Fix Now (Recommended)
- Add a `test` script (even if it aliases `pnpm run check`) or update the issue doc to remove `pnpm -C mods/mod-swooper-maps test` until tests exist.

### Defer / Follow-up
- Add mod-level tests once domain migration stabilizes to keep U04 validation from relying on manual checks.

### Needs Discussion
- None noted.

### Cross-cutting Risks
- None noted.

## REVIEW m6-u04-2-update-recipe-steps-to-use-mod-owned-domain-libs

### Quick Take
Domain imports now resolve to the mod via a tsconfig alias redirect, which keeps step files untouched but couples mapgen-core builds to mod source; the mod package still lacks a `test` script even though the acceptance criteria call for `pnpm -C mods/mod-swooper-maps test`.

### High-Leverage Issues
- `packages/mapgen-core/tsconfig.paths.json`: `@mapgen/domain/*` now points at `mods/mod-swooper-maps`, so mapgen-core builds pull mod code and will fail outside the monorepo layout.
- `mods/mod-swooper-maps/package.json`: no `test` script, so the documented verification command fails.

### Fix Now (Recommended)
- Either move the base pipeline steps into the mod (so mapgen-core no longer resolves domain) or add a build-time guard/doc note making the alias redirect explicitly monorepo-only until U04-3 lands.
- Add a `test` script (even if it aliases `pnpm run check`) or update the issue doc to remove `pnpm -C mods/mod-swooper-maps test` until tests exist.

### Defer / Follow-up
- Remove the alias redirect once steps migrate into the mod and core domain exports are removed (U04-3).

### Needs Discussion
- Is it acceptable for `@swooper/mapgen-core` builds to depend on `mods/mod-swooper-maps` source in the short term?

### Cross-cutting Risks
- Publishing mapgen-core before U04-3 may ship mod-owned domain code or fail outside the monorepo layout.

## REVIEW m6-u04-3-remove-core-domain-exports-and-clean-import-edges

### Quick Take
Core domain files are removed and imports rerouted to `@mapgen-content`, but the base pipeline sources still contain unresolved merge markers and `tsup` still lists deleted domain entrypoints, so builds will fail as-is.

### High-Leverage Issues
- `packages/mapgen-core/src/base/pipeline/**`: multiple files contain conflict markers (e.g., `<<<<<<<< HEAD` in `packages/mapgen-core/src/base/pipeline/morphology/LandmassStep.ts`, plus similar markers in hydrology/narrative/placement indexes and steps), which makes the code invalid.
- `packages/mapgen-core/tsup.config.ts`: still lists `src/domain/**` entry points after deleting those files, so `pnpm -C packages/mapgen-core build` will fail.
- `mods/mod-swooper-maps/package.json`: no `test` script, so the documented verification command fails.

### Fix Now (Recommended)
- Resolve and remove the conflict markers in the base pipeline step files; pick the intended post-move versions and ensure they compile.
- Drop the deleted `src/domain/**` entries from `packages/mapgen-core/tsup.config.ts` (or replace with the new intended entrypoints).
- Add a `test` script (even if it aliases `pnpm run check`) or update the issue doc to remove `pnpm -C mods/mod-swooper-maps test` until tests exist.

### Defer / Follow-up
- Document the temporary `@mapgen-content` alias and remove it once base steps fully relocate into the mod package.

### Needs Discussion
- Is it acceptable for mapgen-core to depend on `@mapgen-content` (mod source) in the interim, or should we fast-track step relocation to avoid this coupling?

### Cross-cutting Risks
- Mapgen-core builds/publishing are currently fragile due to deleted entrypoints and alias coupling to the mod tree.

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

## REVIEW m6-u03-scaffold-standard-content-package-skeleton-and-exports

### Quick Take
Standard recipe skeleton and stage layout are in place and use the authoring SDK, but the mod package still lacks a `test` script even though the acceptance criteria call for `pnpm -C mods/mod-swooper-maps test`.

### High-Leverage Issues
- `mods/mod-swooper-maps/package.json`: no `test` script, so the documented verification command fails.

### Fix Now (Recommended)
- Add a `test` script (even a placeholder pointing to `pnpm run check`) or update the issue doc to remove `pnpm -C mods/mod-swooper-maps test` until tests exist.

### Defer / Follow-up
- Add real mod-level tests once step content is migrated to replace the placeholder steps.

### Needs Discussion
- None noted.

### Cross-cutting Risks
- None noted.
