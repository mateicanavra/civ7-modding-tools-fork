# Structure + Module Shape (Reference)

This is the reference for **where code lives** and **how modules are shaped** when refactoring a domain to operation modules in this repo.

If any existing code (including ecology) conflicts with a hard rule in this workflow package or the linked ADRs/spec, treat the **docs as canonical** and fix the code during the refactor (do not weaken the rule).

Canonical spec:
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md`

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
  - Authoring contracts: `packages/mapgen-core/src/authoring/` (`createStep`, `createOp`)
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
- Steps import ops through the domain public surface (`@mapgen/domain/<domain>`, via `domain.ops.*`) unless there is a scoped, explicit reason not to.

## Op module shape (one op per module)

Each op is one module under `ops/**` (pick the smallest shape that keeps the op readable):
- Small op (single file):
  - `mods/mod-swooper-maps/src/domain/<domain>/ops/<op>.ts`
- Large op (directory module):
  - `mods/mod-swooper-maps/src/domain/<domain>/ops/<op>/index.ts` (exports exactly one op via `createOp`)
  - Optional: `mods/mod-swooper-maps/src/domain/<domain>/ops/<op>/schema.ts` (TypeBox schemas only; keep schema types inferred at use sites)

Internal helpers live under the op directory:
- `mods/mod-swooper-maps/src/domain/<domain>/ops/<op>/rules/**` (pure rules)
- `mods/mod-swooper-maps/src/domain/<domain>/ops/<op>/strategies/**` (strategy implementations)

Reference example:
- `mods/mod-swooper-maps/src/domain/ecology/ops/classify-biomes/index.ts`

## Step module shape (orchestration-only steps)

Refactored steps are promoted into a step directory module (ecology is the reference pattern):
- `mods/mod-swooper-maps/src/recipes/standard/stages/<stage>/steps/<step>/index.ts`

Fixed internal structure:
- `index.ts` (orchestration only)
- `inputs.ts` (runtime binding: artifacts/adapters → POJO inputs)
- `apply.ts` (runtime writes + artifact publication)

Step logic responsibilities:
- `inputs.ts` builds POJO inputs.
- `index.ts` calls `op.runValidated(input, config)` and coordinates sub-ops (if any).
- `apply.ts` applies/publishes outputs (engine/braid boundary).
- Step schemas import op `config`/`defaultConfig` directly from the domain module; steps do not re-author wrappers unless step-local options are genuinely step-owned.
- Use canonical dependency keys from the standard registry file; do not inline new key strings in refactored steps:
  - `mods/mod-swooper-maps/src/recipes/standard/tags.ts` (`M3_DEPENDENCY_TAGS`, `M4_EFFECT_TAGS`, `STANDARD_TAG_DEFINITIONS`)

Reference example:
- `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features/index.ts`

## Standard content config exports (avoid duplication)

Standard config schema exports live under:
- `mods/mod-swooper-maps/src/domain/**/config.ts`

Rule:
- When an op owns a config schema, the standard config schema module must **re-export** it from the domain op, not re-author it.

Reference example (thin re-export pattern):
- `mods/mod-swooper-maps/src/domain/ecology/config.ts`

Concrete expectation:
- Refactored steps import op config/defaults from the domain module (`@mapgen/domain/<domain>`, via `domain.ops.*`).
- The config schema bundle (`@mapgen/domain/config`) remains the canonical author-facing schema surface, but it is a thin barrel over domain-owned config modules and op schemas.
