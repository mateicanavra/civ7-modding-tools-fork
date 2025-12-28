# Plan: M6 SPIKE Structure Remediation (Canonical Worklist)

**Goal:** Bring the current codebase back into conformance with the M6 ownership model: engine runtime (`packages/mapgen-core/src/engine/**`) + authoring factories (`packages/mapgen-core/src/authoring/**`) + mod-owned content (`mods/mod-swooper-maps/**`) with feature-sliced/co-located structure.

**Source of truth:** `docs/projects/engine-refactor-v1/resources/SPIKE-m6-standard-mod-feature-sliced-content-ownership.md` (especially Sections **3.2**, **9**, **10**).

This plan is intentionally “agent-executable”: each item is concrete (paths + grep gates). Items are grouped as:
- **Move-first (mechanical):** mostly `git mv` + path rewrites.
- **Non-move remediation:** design-specified gaps that require actual refactors (not new design).

## Related M6 issue docs
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M6-U01-promote-runtime-pipeline-as-engine-sdk-surface.md` (engine surface + context boundary)
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M6-U05-2-compose-standard-recipe-and-tag-definitions-via-authoring-sdk.md` (tag ownership + validators)
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M6-U06-rewrite-maps-as-recipe-instances.md` (map runtime glue under `src/maps/_runtime/**`)
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M6-U07-delete-legacy-base-bootstrap-config-orchestrator.md` (delete config/bootstrap/core legacy)
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M6-U08-realign-tests-and-ci-gates-to-ownership.md` (tests relocation + CI gates)

## Current deltas (observed)
- `mods/mod-swooper-maps/src/config/**` exists and is imported via TS path aliases, but the SPIKE end-state has **no** `src/config/**` module.
- `packages/mapgen-core/src/core/**` exists, but the SPIKE end-state deletes it (engine helpers → `engine/**`; content types/validators → mod-owned).
- Some tests still live under `packages/mapgen-core/test/pipeline/**` and `packages/mapgen-core/test/core/**` instead of `test/engine/**` and `mods/mod-swooper-maps/test/**`.
- `mods/mod-swooper-maps/src/maps/_runtime/foundation-diagnostics.ts` is called out by the SPIKE but is missing in code.

## Move-first worklist (mechanical)

<a id="r1"></a>
### R1: Config schema fragments (move-only)

**SPIKE:** Section 9.1.5 (config schema fragments become mod-owned domain libs)

Moves:
- `mods/mod-swooper-maps/src/config/schema/` → `mods/mod-swooper-maps/src/domain/config/schema/`
- `mods/mod-swooper-maps/src/config/schema.ts` → `mods/mod-swooper-maps/src/domain/config/schema/index.ts`

After-move (required):
- [ ] Ensure `mods/mod-swooper-maps/src/domain/config/schema/index.ts` is the canonical import surface for schema fragments.
- [ ] Update `mods/mod-swooper-maps/tsconfig.json` to remove `@mapgen/config*` path aliases (or repoint them temporarily to `src/domain/config/schema/**` during cutover).
- [ ] Grep gate: `rg -n "@mapgen/config" mods/mod-swooper-maps/src` is **0 hits** in the end-state.


<a id="r2"></a>
### R2: Move core leaf modules (move-only)

**SPIKE:** Section 9.1.3 (core split)

Moves:
- `packages/mapgen-core/src/core/plot-tags.ts` → `packages/mapgen-core/src/engine/plot-tags.ts`
- `packages/mapgen-core/src/core/terrain-constants.ts` → `packages/mapgen-core/src/engine/terrain-constants.ts`
- `packages/mapgen-core/src/core/assertions.ts` → `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/assertions.ts`

After-move (required):
- [ ] Update import sites in `packages/mapgen-core/src/dev/**`, `packages/mapgen-core/src/authoring/**`, and any remaining `core/**` files that referenced these modules.
- [ ] Export `plot-tags` + `terrain-constants` from `packages/mapgen-core/src/engine/index.ts`.


<a id="r3"></a>
### R3: Move remaining tests (move-only)

**SPIKE:** tests mapping under Section 9.1 (`packages/mapgen-core/test/**` is engine+authoring only)

Moves:
- `packages/mapgen-core/test/pipeline/` → `packages/mapgen-core/test/engine/`
- `packages/mapgen-core/test/core/utils.test.ts` → `packages/mapgen-core/test/engine/context-utils.test.ts`
- `packages/mapgen-core/test/core/foundation-context.test.ts` → `mods/mod-swooper-maps/test/foundation-context.test.ts`

After-move (required):
- [ ] Update moved engine tests to import from `@mapgen/engine/*` (no `@mapgen/pipeline/*`).
- [ ] Update the moved content test to import mod-owned domain/types (no `@mapgen/core/*` and no `@swooper/mapgen-core` “core” imports).


<a id="r4"></a>
### R4: Remove mod config module (mechanical)

**SPIKE:** Section 9.1.5 (no global config module; schema fragments are domain-owned and step schemas are co-located with step modules)

Deletes (after R1):
- [ ] Delete `mods/mod-swooper-maps/src/config/index.ts`
- [ ] Delete `mods/mod-swooper-maps/src/config/loader.ts`
- [ ] Delete `mods/mod-swooper-maps/src/config/AGENTS.md`
- [ ] Delete any remaining `mods/mod-swooper-maps/src/config/**` files (the directory should not exist)

Required callsite updates:
- [ ] Replace imports of `@mapgen/config` / `@mapgen/config/*` across `mods/mod-swooper-maps/src/**` with:
  - `@mapgen/domain/config/schema/*` (schema fragments), and/or
  - recipe-local config types (exported from recipe modules), and/or
  - step-local config types/schemas (co-located with the step module).
- [ ] Remove `MapGenConfig` as a concept from mod-owned runtime glue (`mods/mod-swooper-maps/src/maps/_runtime/**`); maps should provide recipe config instances.

Grep gates:
- [ ] `rg -n "MapGenConfig" mods/mod-swooper-maps/src` is **0 hits** in the end-state.
- [ ] `rg -n "@mapgen/config" mods/mod-swooper-maps/src` is **0 hits** in the end-state.


## Non-move remediation (design-specified; implementation incomplete)

These are not “new design work”. They are explicitly called out by the SPIKE (and referenced in multiple M6 issue docs) but were not fully implemented.

<a id="r5"></a>
### R5: Engine context split; delete core module (refactor)

**SPIKE:** Section 9.1.3 + Section 10 (“Engine context split is mandatory”)

- [ ] Extract engine-owned context + writers into `packages/mapgen-core/src/engine/context.ts` (no content-owned tags/validators).
- [ ] Move foundation/story artifact tags + validators out of `packages/mapgen-core/src/core/types.ts` into mod-owned `mods/mod-swooper-maps/src/domain/**`.
- [ ] Update authoring SDK to reference the engine-owned context boundary (or become generic), so authoring does not import from a deleted `core/**` module.
- [ ] Delete `packages/mapgen-core/src/core/index.ts` and remove any re-export of `@mapgen/core/*` from `packages/mapgen-core/src/index.ts`.


<a id="r6"></a>
### R6: Tag catalog + validators are mod-owned (refactor)

**SPIKE:** Section 9.1.3 + M6-U05-2 prework (tag inventory + “mod-owned equivalents if moved”)

- [ ] Move `FOUNDATION_*_ARTIFACT_TAG` constants and associated validators/type guards out of core/types and into mod-owned `mods/mod-swooper-maps/src/domain/**` (or recipe-local files where appropriate).
- [ ] Update `mods/mod-swooper-maps/src/recipes/standard/tags.ts` to use only mod-owned validators.


<a id="r7"></a>
### R7: Add foundation diagnostics runtime helper (refactor)

**SPIKE:** Section 9.2 (map runtime mapping) + Section 10 (runner is mod-owned for M6)

- [ ] Add `mods/mod-swooper-maps/src/maps/_runtime/foundation-diagnostics.ts` (or rename an existing equivalent to match the SPIKE) and wire it into the map runtime.


<a id="r8"></a>
### R8: Authoring type soundness (refactor)

**SPIKE / Issues:** M6 issue docs discuss keeping default step config as `unknown` and avoiding `any`/bivariant escapes for soundness.

- [ ] Remove `any` usage from authoring `Stage` typing by making stage/recipe generics sound over step tuples.
- [ ] Ensure `RecipeConfigOf` inference remains correct without widening.


## Optional automation (move staging script)

```bash
set -euo pipefail

mkdir -p mods/mod-swooper-maps/src/domain/config/schema
mkdir -p packages/mapgen-core/test/engine

# R1: config schema fragments
git mv mods/mod-swooper-maps/src/config/schema mods/mod-swooper-maps/src/domain/config/
git mv mods/mod-swooper-maps/src/config/schema.ts mods/mod-swooper-maps/src/domain/config/schema/index.ts

# R2: core leaf modules → engine/content
git mv packages/mapgen-core/src/core/plot-tags.ts packages/mapgen-core/src/engine/plot-tags.ts
git mv packages/mapgen-core/src/core/terrain-constants.ts packages/mapgen-core/src/engine/terrain-constants.ts
git mv packages/mapgen-core/src/core/assertions.ts mods/mod-swooper-maps/src/recipes/standard/stages/foundation/assertions.ts

# R3: tests
git mv packages/mapgen-core/test/pipeline packages/mapgen-core/test/engine
git mv packages/mapgen-core/test/core/utils.test.ts packages/mapgen-core/test/engine/context-utils.test.ts
git mv packages/mapgen-core/test/core/foundation-context.test.ts mods/mod-swooper-maps/test/foundation-context.test.ts
```

## Verification
- `pnpm -C packages/mapgen-core test`
- `pnpm -C packages/mapgen-core check`
- `pnpm -C mods/mod-swooper-maps test`
