# Structure + Module Shape (Reference)

This is the reference for **where code lives** and **how modules are shaped** when refactoring a domain to operation modules in this repo.

If any existing code (including ecology) conflicts with a hard rule in this workflow package or the linked ADRs/spec, treat the **docs as canonical** and fix the code during the refactor (do not weaken the rule).

Canonical spec:
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md`

Canonical architecture:
- `docs/projects/engine-refactor-v1/resources/repomix/gpt-config-architecture-converged.md`

Canonical example:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/examples/VOLCANO.md`

## Repo map (this repo)

Use these as the **literal roots** when executing the workflow in `civ7-modding-tools`.

- Standard content package:
  - Package root: `mods/mod-swooper-maps/` (see `mods/mod-swooper-maps/AGENTS.md`)
  - Code root: `mods/mod-swooper-maps/src/`
  - Generated artifacts: `mods/mod-swooper-maps/mod/` (read-only; never hand-edit)
- Core SDK:
  - Package root: `packages/mapgen-core/`
  - Authoring contracts: `packages/mapgen-core/src/authoring/` (`defineStepContract`, `createStepFor`, `defineOpContract`, `createOp`)
  - Plan compilation (config canonicalization boundary): `packages/mapgen-core/src/engine/execution-plan.ts`
- Standard recipe (stage braid reality):
  - Recipe root: `mods/mod-swooper-maps/src/recipes/standard/`
  - Stage order source of truth: `mods/mod-swooper-maps/src/recipes/standard/recipe.ts`
- Domains:
  - Domain root: `mods/mod-swooper-maps/src/domain/<domain>/`
  - Domain ops: `mods/mod-swooper-maps/src/domain/<domain>/ops/**`
- Tracking docs:
  - Domain issue docs: `docs/projects/engine-refactor-v1/issues/**`
  - Cross-cutting decision log: `docs/projects/engine-refactor-v1/triage.md`

## Domain layout (target shape)

Domain root:
- `mods/mod-swooper-maps/src/domain/<domain>/`

Domain ops:
- `mods/mod-swooper-maps/src/domain/<domain>/ops/**` (one op per module)

Domain public surface:
- Domain index re-exports step-callable ops and any domain-owned config/schema surfaces.
- Steps import ops through the domain public surface (`@mapgen/domain/<domain>`, via `domain.ops.*`).

## Op module shape (one op per module)

Each op is a directory module under `ops/**` (no exceptions):
- `mods/mod-swooper-maps/src/domain/<domain>/ops/<op>/contract.ts` (op contract via `defineOpContract`)
- `mods/mod-swooper-maps/src/domain/<domain>/ops/<op>/types.ts` (type-only exports via `OpTypeBag`)
- `mods/mod-swooper-maps/src/domain/<domain>/ops/<op>/rules/` (pure rule helpers)
- `mods/mod-swooper-maps/src/domain/<domain>/ops/<op>/rules/index.ts` (runtime barrel)
- `mods/mod-swooper-maps/src/domain/<domain>/ops/<op>/strategies/` (strategy implementations)
- `mods/mod-swooper-maps/src/domain/<domain>/ops/<op>/strategies/index.ts` (runtime barrel)
- `mods/mod-swooper-maps/src/domain/<domain>/ops/<op>/index.ts` (exports exactly one op via `createOp`)

Directory discipline (canonical):
- Always create `rules/` and `strategies/` directories for an op, even if one of them remains empty for now.
- Do not introduce single-file ops or alternate layouts.

Import direction rules (hard):
- `contract.ts` never imports from `rules/**` or `strategies/**`.
- `rules/**` must not import `../contract.js` (type-only or runtime). Use `../types.js` for types and core SDK packages for utilities.
- `rules/index.ts` is runtime-only; it exports helpers, not types.
- `strategies/**` import `../contract.js`, `../rules/index.js`, and optionally `../types.js` for type annotations.
- `index.ts` imports the contract and the strategies barrel, calls `createOp`, then re-exports `*` from `./contract.js` and `type *` from `./types.js`.

Reference example:
- `mods/mod-swooper-maps/src/domain/ecology/ops/classify-biomes/index.ts`

## Step module shape (orchestration-only steps)

Steps are contract-first and orchestration-only:
- `contract.ts` contains metadata only (`id`, `phase`, `requires`, `provides`, `schema`).
- `index.ts` attaches `resolveConfig` and `run` using a bound `createStep` from `createStepFor<TContext>()`.

Recommended structure:
- `mods/mod-swooper-maps/src/recipes/standard/stages/<stage>/steps/<step>/contract.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/<stage>/steps/<step>/index.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/<stage>/steps/<step>/lib/**` (helpers; optional)

Step logic responsibilities:
- `contract.ts` defines the schema and dependency metadata only.
- `index.ts` builds inputs, calls ops, and publishes artifacts.
- `lib/**` contains pure helpers (e.g., `inputs.ts`, `apply.ts`) with no registry awareness.
- Step schemas import op `config`/`defaultConfig` directly from the **implemented op** (via the domain module); steps do not re-author wrappers unless step-local options are genuinely step-owned.
- Use canonical dependency keys from the standard registry file; do not inline new key strings in refactored steps:
  - `mods/mod-swooper-maps/src/recipes/standard/tags.ts` (`M3_DEPENDENCY_TAGS`, `M4_EFFECT_TAGS`, `STANDARD_TAG_DEFINITIONS`)

Reference example:
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts`

## Standard content config exports (avoid duplication)

Standard config schema exports live under:
- `mods/mod-swooper-maps/src/domain/**/config.ts`

Rule:
- When an op owns a config schema, the standard config schema module must **re-export** it from the op contract, not re-author it.

Reference example (thin re-export pattern):
- `mods/mod-swooper-maps/src/domain/ecology/config.ts`

Concrete expectation:
- Refactored steps import op config/defaults from the domain module (`@mapgen/domain/<domain>`, via `domain.ops.*`).
- The config schema bundle (`@mapgen/domain/config`) remains the canonical author-facing schema surface, but it is a thin barrel over domain-owned op contracts.
