# Plan: M6 Spike Structure Remediation (Canonical)

**Goal:** Restore M6 ownership boundaries and file structure so engine runtime + authoring SDK remain pure, and all content (steps, schemas, tags, artifacts, domain logic) is mod-owned and colocated.

**Scope:**
- Canonical remediation decisions and target architecture for M6.
- Implementation tasks should follow this plan; the SPIKE is reference-only.

**Baseline references:**
- `docs/projects/engine-refactor-v1/resources/SPIKE-m6-standard-mod-feature-sliced-content-ownership.md`
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M6-U01-promote-runtime-pipeline-as-engine-sdk-surface.md`
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M6-U05-2-compose-standard-recipe-and-tag-definitions-via-authoring-sdk.md`
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M6-U06-rewrite-maps-as-recipe-instances.md`
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M6-U07-delete-legacy-base-bootstrap-config-orchestrator.md`
- `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M6-U08-realign-tests-and-ci-gates-to-ownership.md`

## Decision Packets

### DP1: Colocate step models/schemas/tags/artifacts
- **Context:** The mod content package still centralizes tags/artifacts/config in recipe- or domain-root files, which conflicts with step ownership and makes catalogs grow without clear ownership.
- **Options:**
  - **A:** Keep recipe-level catalogs (e.g., `recipes/<recipe>/tags.ts`, `recipes/<recipe>/artifacts.ts`) as the definition source of truth.
  - **B:** Colocate definitions with steps, allow stage-level shared modules, and use domain modules only for truly cross-stage shared items.
  - **C:** Move everything into `domain/**` and make steps thin wrappers.
- **Decision:** **B.** Step-level colocation is the default; stage-level shared modules are allowed; domain modules are only for cross-stage shared items.
- **Rationale:** Aligns ownership with responsibility, reduces centralized grab-bags, and keeps recipe assembly explicit and reviewable.
- **Risks:** More files and imports; requires consistent collection of tag definitions. Mitigate with explicit stage/step exports and small recipe assembly helpers.

### DP2: Core SDK boundary and context split
- **Context:** M6 target is engine runtime + authoring factories only; legacy core/config/base/bootstrap surfaces should not remain.
- **Options:**
  - **A:** Keep `core/**` with shared content types and compatibility helpers.
  - **B:** Remove `core/**` entirely; keep engine-only context + runtime types under `engine/**`, authoring under `authoring/**`.
- **Decision:** **B.** Delete `core/**`, `config/**`, `bootstrap/**`, and `base/**`. Engine-only context lives in `engine/context.ts`.
- **Rationale:** Enforces strict ownership boundaries and prevents content leakage back into the SDK.
- **Risks:** Requires refactors of content imports and authoring types; mitigated by explicit engine exports and mod-owned replacements.

### DP3: Mod-owned runtime glue for Civ7
- **Context:** Civ7 runner/orchestrator helpers are currently mixed across core modules.
- **Options:**
  - **A:** Keep runner glue in `packages/mapgen-core/src/runner/**`.
  - **B:** Move runner glue to mod-owned `mods/mod-swooper-maps/src/maps/_runtime/**`.
- **Decision:** **B.** Runner glue is mod-owned for M6.
- **Rationale:** Keeps runtime assembly with the mod that owns recipes and config values.
- **Risks:** Reduced reuse across mods; acceptable for M6.

### DP4: Config schema ownership
- **Context:** Config schemas must be authored by steps, while maps own config values.
- **Options:**
  - **A:** Maintain a centralized config module that defines the full schema surface.
  - **B:** Step-level schemas and config types, with only shared fragments in `domain/config/schema/**`.
- **Decision:** **B.** Step schemas and types are step-owned; domain schema is shared fragments only; maps provide config instances.
- **Rationale:** Preserves ownership and keeps config evolution tied to the step that consumes it.
- **Risks:** Requires consistent export discipline; mitigated by explicit step/stage exports.

## Target Architecture (Canonical for Remediation)

### Core SDK (engine + authoring)

```text
packages/mapgen-core/
├─ src/
│  ├─ engine/                        # runtime-only SDK
│  │  ├─ PipelineExecutor.ts
│  │  ├─ StepRegistry.ts
│  │  ├─ errors.ts
│  │  ├─ execution-plan.ts
│  │  ├─ index.ts
│  │  ├─ observability.ts
│  │  ├─ plot-tags.ts                # moved out of core/**
│  │  ├─ step-config.ts
│  │  ├─ tags.ts
│  │  ├─ terrain-constants.ts        # moved out of core/**
│  │  ├─ types.ts
│  │  └─ context.ts                  # engine-owned context + writers
│  ├─ authoring/                     # ergonomics-only SDK (factories)
│  ├─ dev/                           # dev-only diagnostics (not part of SDK surface)
│  ├─ lib/                           # neutral utilities (engine-owned)
│  ├─ polyfills/
│  ├─ shims/
│  ├─ trace/
│  └─ index.ts                       # thin compatibility re-export; prefer /engine + /authoring
└─ test/
   ├─ engine/                        # engine tests (no content ownership)
   └─ authoring/                     # authoring tests (no content ownership)
```

**Core SDK invariants:**
- No `packages/mapgen-core/src/core/**` module.
- No `packages/mapgen-core/src/config/**` or `packages/mapgen-core/src/bootstrap/**` modules.
- No `packages/mapgen-core/src/base/**` or `packages/mapgen-core/src/pipeline/mod.ts`.
- `packages/mapgen-core/src/engine/context.ts` is the only engine-owned context surface; `MapGenConfig` is removed.

### Mod content package (standard recipe as a mini-package)

```text
mods/mod-swooper-maps/src/
├─ mod.ts
├─ maps/
│  ├─ *.ts
│  └─ _runtime/                      # Civ7 runner glue (mod-owned for M6)
│     ├─ helpers.ts
│     ├─ map-init.ts
│     ├─ run-standard.ts
│     ├─ standard-config.ts
│     ├─ types.ts
│     └─ foundation-diagnostics.ts
├─ recipes/
│  └─ standard/
│     ├─ recipe.ts
│     └─ stages/
│        ├─ <stageId>/
│        │  ├─ index.ts
│        │  ├─ shared/               # stage-only shared definitions
│        │  │  ├─ artifacts.ts
│        │  │  ├─ tags.ts
│        │  │  └─ models.ts
│        │  └─ steps/
│        │     ├─ index.ts
│        │     ├─ <stepId>.ts
│        │     ├─ <stepId>.schema.ts
│        │     ├─ <stepId>.models.ts
│        │     ├─ <stepId>.tags.ts
│        │     └─ <stepId>.artifacts.ts
│        └─ **/**
└─ domain/
   ├─ config/
   │  └─ schema/                      # shared fragments only
   │     ├─ index.ts
   │     └─ *.ts
   └─ <domain>/
      ├─ models.ts
      ├─ types.ts
      └─ *.ts
```

**Colocation rules:**
- Step-level schemas, config types, tag definitions, and artifact helpers live with the step (`steps/<stepId>*`).
- Stage-level `shared/**` is only for items used by more than one step in the same stage.
- Domain modules are only for truly cross-stage or cross-recipe shared logic or types.
- Recipe-level files may re-export stage/step items but must not define tag/artifact catalogs.
- Map entrypoints provide config values; there is no global `MapGenConfig` surface.

## Draft SPIKE Target-Architecture Edits (Reference)

- Replace the mod content package tree in Section 3.2 with the colocated step/stage structure above.
- Remove `recipes/<recipe>/tags.ts` and `recipes/<recipe>/artifacts.ts` as definition sources; allow re-export-only barrels if needed.
- Clarify `domain/config/schema/**` as shared fragments only; step schemas remain step-owned.
- Add invariants disallowing centralized tag/artifact catalogs and any mod-wide `config/**` module.
- Update mapping notes for `base/tags.ts` and `base/pipeline/artifacts.ts` to land in step/stage local modules.

## Remediation Worklist

<a id="r1"></a>
### R1: Config schema fragments (move-only)

Moves:
- `mods/mod-swooper-maps/src/config/schema/` -> `mods/mod-swooper-maps/src/domain/config/schema/`
- `mods/mod-swooper-maps/src/config/schema.ts` -> `mods/mod-swooper-maps/src/domain/config/schema/index.ts`

After-move (required):
- [ ] Ensure `mods/mod-swooper-maps/src/domain/config/schema/index.ts` is the canonical import surface for shared fragments only.
- [ ] Update `mods/mod-swooper-maps/tsconfig.json` to remove `@mapgen/config*` path aliases (or repoint them temporarily to `src/domain/config/schema/**` during cutover).
- [ ] Grep gate: `rg -n "@mapgen/config" mods/mod-swooper-maps/src` is 0 hits in the end-state.

<a id="r2"></a>
### R2: Move core leaf modules (move-only)

Moves:
- `packages/mapgen-core/src/core/plot-tags.ts` -> `packages/mapgen-core/src/engine/plot-tags.ts`
- `packages/mapgen-core/src/core/terrain-constants.ts` -> `packages/mapgen-core/src/engine/terrain-constants.ts`
- `packages/mapgen-core/src/core/assertions.ts` -> `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/assertions.ts`

After-move (required):
- [ ] Update import sites in `packages/mapgen-core/src/dev/**`, `packages/mapgen-core/src/authoring/**`, and any remaining `core/**` files that referenced these modules.
- [ ] Export `plot-tags` + `terrain-constants` from `packages/mapgen-core/src/engine/index.ts`.

<a id="r3"></a>
### R3: Move remaining tests (move-only)

Moves:
- `packages/mapgen-core/test/pipeline/` -> `packages/mapgen-core/test/engine/`
- `packages/mapgen-core/test/core/utils.test.ts` -> `packages/mapgen-core/test/engine/context-utils.test.ts`
- `packages/mapgen-core/test/core/foundation-context.test.ts` -> `mods/mod-swooper-maps/test/foundation-context.test.ts`

After-move (required):
- [ ] Update moved engine tests to import from `@mapgen/engine/*` (no `@mapgen/pipeline/*`).
- [ ] Update the moved content test to import mod-owned domain/types (no `@mapgen/core/*` and no `@swooper/mapgen-core` core imports).

<a id="r4"></a>
### R4: Remove mod config module (mechanical)

Deletes (after R1):
- [ ] Delete `mods/mod-swooper-maps/src/config/index.ts`
- [ ] Delete `mods/mod-swooper-maps/src/config/loader.ts`
- [ ] Delete `mods/mod-swooper-maps/src/config/AGENTS.md`
- [ ] Delete any remaining `mods/mod-swooper-maps/src/config/**` files (the directory should not exist)

Required callsite updates:
- [ ] Replace imports of `@mapgen/config` / `@mapgen/config/*` across `mods/mod-swooper-maps/src/**` with step-local schemas/types or domain schema fragments.
- [ ] Remove `MapGenConfig` usage from mod-owned runtime glue (`mods/mod-swooper-maps/src/maps/_runtime/**`).

Grep gates:
- [ ] `rg -n "MapGenConfig" mods/mod-swooper-maps/src` is 0 hits in the end-state.
- [ ] `rg -n "@mapgen/config" mods/mod-swooper-maps/src` is 0 hits in the end-state.

<a id="r5"></a>
### R5: Engine context split; delete core module (refactor)

- [ ] Extract engine-owned context + writers into `packages/mapgen-core/src/engine/context.ts` (no content-owned tags/validators).
- [ ] Move content-owned tags/validators out of `packages/mapgen-core/src/core/types.ts` into mod-owned `mods/mod-swooper-maps/src/domain/**`.
- [ ] Update authoring SDK to reference the engine-owned context boundary (or become generic), so authoring does not import from a deleted `core/**` module.
- [ ] Delete `packages/mapgen-core/src/core/index.ts` and remove any re-export of `@mapgen/core/*` from `packages/mapgen-core/src/index.ts`.

<a id="r6"></a>
### R6: Colocate tags/artifacts/models with steps (refactor)

- [ ] Replace `mods/mod-swooper-maps/src/recipes/standard/tags.ts` with step- or stage-local tag definitions (or keep as a re-export-only barrel).
- [ ] Replace `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts` with step- or stage-local artifact helpers (or keep as a re-export-only barrel).
- [ ] For each step, add local schema/types/tags/artifacts modules (`<stepId>.schema.ts`, `<stepId>.models.ts`, `<stepId>.tags.ts`, `<stepId>.artifacts.ts`) or consolidate into the step file if it remains readable.
- [ ] Update `createRecipe` assembly to collect tag definitions from stage/step exports rather than from a centralized catalog.

<a id="r7"></a>
### R7: Add foundation diagnostics runtime helper (refactor)

- [ ] Add `mods/mod-swooper-maps/src/maps/_runtime/foundation-diagnostics.ts` (or rename an existing equivalent to match the target tree) and wire it into the map runtime.

<a id="r8"></a>
### R8: Authoring type soundness (refactor)

- [ ] Remove `any` usage from authoring `Stage` typing by making stage/recipe generics sound over step tuples.
- [ ] Ensure `RecipeConfigOf` inference remains correct without widening.

## Verification
- `pnpm -C packages/mapgen-core test`
- `pnpm -C packages/mapgen-core check`
- `pnpm -C mods/mod-swooper-maps test`
