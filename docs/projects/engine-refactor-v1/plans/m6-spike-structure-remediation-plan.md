# Plan: M6 Spike Structure Remediation (Move-Only)

**Scope:** Align the current M6 implementation to `docs/projects/engine-refactor-v1/resources/SPIKE-m6-standard-mod-feature-sliced-content-ownership.md` via file moves and path updates. Non-move gaps are listed separately.

## Inputs
- SPIKE: `docs/projects/engine-refactor-v1/resources/SPIKE-m6-standard-mod-feature-sliced-content-ownership.md`
- Worktree: `/Users/mateicanavra/Documents/.nosync/DEV/wt-m6-milestone-engine-authoring-sdk-split-standard-content-package-cutover`
- Branch: `m6-tbd-02-spike-m6-docs`

## Delta Summary (M6 vs SPIKE)
- Config schemas live under `mods/mod-swooper-maps/src/config/**` instead of `mods/mod-swooper-maps/src/domain/config/schema/**`.
- `packages/mapgen-core/src/core/**` still exists; the engine/context split and core removal are not complete.
- Engine tests still live under `packages/mapgen-core/test/pipeline/**` and `packages/mapgen-core/test/core/**`.

## Move-Only Remediation Plan

### 1) Relocate mod config schema into domain-owned structure

Moves:
- `mods/mod-swooper-maps/src/config/schema/` -> `mods/mod-swooper-maps/src/domain/config/schema/`
- `mods/mod-swooper-maps/src/config/schema.ts` -> `mods/mod-swooper-maps/src/domain/config/schema/index.ts`

Follow-up path updates (required to compile after moves):
- Update `mods/mod-swooper-maps/tsconfig.json` path aliases to point at `src/domain/config/schema` (or remove the `@mapgen/config` alias entirely).
- Update imports in:
  - `mods/mod-swooper-maps/src/maps/_runtime/standard-config.ts`
  - `mods/mod-swooper-maps/src/maps/_runtime/run-standard.ts`
  - `mods/mod-swooper-maps/src/domain/narrative/tagging/rifts.ts`
  - `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts`

### 2) Move core helpers into engine or recipe scope

Moves:
- `packages/mapgen-core/src/core/plot-tags.ts` -> `packages/mapgen-core/src/engine/plot-tags.ts`
- `packages/mapgen-core/src/core/terrain-constants.ts` -> `packages/mapgen-core/src/engine/terrain-constants.ts`
- `packages/mapgen-core/src/core/assertions.ts` -> `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/assertions.ts`

Follow-up path updates:
- Replace `@swooper/mapgen-core` and `@mapgen/core/*` imports in mod code with `@swooper/mapgen-core/engine` or mod-owned paths.
- Update `packages/mapgen-core/src/engine/index.ts` to export `plot-tags` and `terrain-constants`.

### 3) Relocate engine and content tests

Moves:
- `packages/mapgen-core/test/pipeline/` -> `packages/mapgen-core/test/engine/`
- `packages/mapgen-core/test/core/foundation-context.test.ts` -> `mods/mod-swooper-maps/test/foundation-context.test.ts`
- `packages/mapgen-core/test/core/utils.test.ts` -> `packages/mapgen-core/test/engine/context-utils.test.ts`

Follow-up path updates:
- Update engine test imports from `@mapgen/pipeline/*` to `@mapgen/engine/*`.
- Update any moved test imports to use mod-owned tag and artifact helpers.

### 4) Optional automation (git mv staging)

```bash
mkdir -p mods/mod-swooper-maps/src/domain/config
mkdir -p mods/mod-swooper-maps/src/domain/config/schema
mkdir -p packages/mapgen-core/test/engine

# Config schema relocation
git mv mods/mod-swooper-maps/src/config/schema mods/mod-swooper-maps/src/domain/config/
git mv mods/mod-swooper-maps/src/config/schema.ts mods/mod-swooper-maps/src/domain/config/schema/index.ts

# Core -> engine or mod recipe
git mv packages/mapgen-core/src/core/plot-tags.ts packages/mapgen-core/src/engine/plot-tags.ts
git mv packages/mapgen-core/src/core/terrain-constants.ts packages/mapgen-core/src/engine/terrain-constants.ts
git mv packages/mapgen-core/src/core/assertions.ts mods/mod-swooper-maps/src/recipes/standard/stages/foundation/assertions.ts

# Test relocation
git mv packages/mapgen-core/test/pipeline packages/mapgen-core/test/engine
git mv packages/mapgen-core/test/core/foundation-context.test.ts mods/mod-swooper-maps/test/foundation-context.test.ts
git mv packages/mapgen-core/test/core/utils.test.ts packages/mapgen-core/test/engine/context-utils.test.ts
```

## Non-move gaps / implementation remediation

These are specified in the SPIKE and M6 issues, but they require refactors beyond file moves.

- `packages/mapgen-core/src/core/types.ts` still mixes engine context and content-owned artifacts. SPIKE requires splitting into `packages/mapgen-core/src/engine/context.ts` plus mod-owned artifact types and validators under `mods/mod-swooper-maps/src/domain/**`.
- `mods/mod-swooper-maps/src/config/index.ts` and `mods/mod-swooper-maps/src/config/loader.ts` still implement a monolithic `MapGenConfig` parser. SPIKE removes the global config module entirely in favor of step-local schemas and map-owned config objects.
- `mods/mod-swooper-maps/src/recipes/standard/tags.ts` imports foundation artifact tags and validators from `@swooper/mapgen-core`. Those tags and validators should be mod-owned after the core split.
- `packages/mapgen-core/src/core/index.ts` and the `packages/mapgen-core/src/index.ts` re-export of `@mapgen/core` conflict with the SPIKE removal of the core module.
- `mods/mod-swooper-maps/src/maps/_runtime` lacks `foundation-diagnostics.ts` (or an equivalent move) called out in the SPIKE mapping.

## Verification
- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm -C packages/mapgen-core check-types`
