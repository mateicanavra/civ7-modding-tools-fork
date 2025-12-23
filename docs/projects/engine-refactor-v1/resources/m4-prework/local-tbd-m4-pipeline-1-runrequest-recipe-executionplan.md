# Prework — `LOCAL-TBD-M4-PIPELINE-1` (RunRequest / RecipeV1 / ExecutionPlan)

Sources:
- SPEC: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`
- SPIKE: `docs/projects/engine-refactor-v1/resources/SPIKE-target-architecture-draft.md` (§2.1 ordering, §2.2 enablement, §2.9 recipe schema)
- Current ordering bridge: `packages/mapgen-core/src/bootstrap/resolved.ts` (`STAGE_ORDER`, `resolveStageManifest()`)

## Schema Sketches

### `RunSettings` (proposed minimal V1)

From SPIKE §2.9 (“settings scope”): keep global settings to host-provided, context-allocation inputs.

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `seed` | `number` | yes | Deterministic RNG seed selection. |
| `dimensions` | `{ width: number; height: number }` | yes | Used for context allocation. |
| `latitudeBounds` | `{ topLatitude: number; bottomLatitude: number }` | yes | Engine/environment derived; used by climate-ish steps. |
| `wrap` | `{ wrapX: boolean; wrapY: boolean }` | yes | World wrap semantics. |
| `metadata` | `{ mapSizeId?: number }` | no | Logging only; no semantics. |

### `RecipeV1`

Top-level shape (SPIKE §2.9 accepted choice):

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `schemaVersion` | `1` | yes | Major integer (breaking bumps only). |
| `id` | `string` | no | Stable identifier for tooling; no semantics. |
| `metadata` | `Record<string, unknown>` | no | Human/tooling notes; no semantics. |
| `steps` | `RecipeStepV1[]` | yes | Ordered list; V1 authoring is linear. |
| `future` | `RecipeFuture` | no | Accepted by schema but must be absent/empty in V1. |
| `extensions` | `Record<string, unknown>` | no | Escape hatch for non-semantic tooling experiments. |

Per-occurrence step entry:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `id` | `string` | yes | Registry step ID. |
| `instanceId` | `string` | no | If the same `id` appears multiple times; default `instanceId = id`. |
| `enabled` | `boolean` | no | Default `true`; compile emits enabled nodes only. |
| `config` | `object` | no | Validated by the step’s own schema when available. |
| `labels` | `string[]` | no | Tooling-only; no semantics. |

Recommended TypeBox posture:
- Strict at recipe top-level and per-step entry (`additionalProperties: false`).
- For `config`, strictness is delegated to the step’s config schema when available.

### `RunRequest`

Boundary input is `RunRequest = { recipe, settings }` (SPEC §2.1 / §7).

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `recipe` | `RecipeV1` | yes | Validated versioned recipe. |
| `settings` | `RunSettings` | yes | Validated global run settings. |

### `ExecutionPlan`

Internal derived artifact: `ExecutionPlan = compile(RunRequest + Registry)` (SPEC §1.2 / SPIKE §2.9).

Minimum fields to support “explain scheduling” (SPEC):

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `recipeSchemaVersion` | `number` | yes | The input recipe schema version (e.g., `1`). |
| `recipeId` | `string \| undefined` | no | Copied from recipe `id` (if any). |
| `settings` | `RunSettings` | yes | Carried through; used for fingerprinting/observability. |
| `nodes` | `ExecutionPlanNode[]` | yes | Ordered list of enabled node instances. |
| `extensions` | `Record<string, unknown> \| undefined` | no | If carried, treat as opaque/pass-through (no semantics). |

Per-node sketch:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `nodeId` | `string` | yes | Unique execution node id; default `instanceId` (or derived). |
| `stepId` | `string` | yes | Registry step id. |
| `phase` | `string` | yes | Resolved from registry step metadata. |
| `requires` | `string[]` | yes | Resolved from the registry step. |
| `provides` | `string[]` | yes | Resolved from the registry step. |
| `config` | `unknown` | yes | Resolved per-node config after validation/defaulting. |

Note: runId/plan fingerprint are owned by observability prework (see `LOCAL-TBD-M4-SAFETY-1`) but the plan must carry enough normalized data to compute a stable fingerprint (`settings + node ids + config`).

## Compile + Validation Rules (V1)

From SPIKE §2.2 + §2.9 accepted choices:

1. Validate recipe schema (TypeBox; strict unknown keys at top-level + per-step entry).
2. Reject any non-empty `future.*` containers in V1 (must be absent/empty).
3. For each `steps[]` entry, normalize:
   - `instanceId = instanceId ?? id`
   - `enabled = enabled ?? true`
4. Resolve `id -> step` via registry:
   - Unknown step IDs are hard errors (fail-fast).
5. Validate per-step `config`:
   - If a step exposes a config schema: validate strictly (unknown keys fail).
   - If a step has no schema yet: accept `Record<string, unknown>` as a transitional “soft spot”; record it explicitly (plan warnings list or a returned report).
6. Enablement:
   - Compiler emits only enabled nodes; disabled entries are omitted from `nodes`.
7. Plan node emission:
   - For each enabled step occurrence, emit an `ExecutionPlanNode` with resolved `phase`, `requires`, `provides`, and the normalized config.

Recommended error/reporting shape (for actionable UX):
- Include `path` (e.g. `steps[7].config.foo`), `code`, and `message`.
- Separate “schema invalid” (recipe structure) vs “unknown step id” vs “step config invalid”.

## Parity Map — `STAGE_ORDER` / `resolveStageManifest()` → `RecipeV1.steps[]`

Goal: a default `RecipeV1` that matches current runtime ordering so cutover can be correctness-preserving.

Current truth sources:
- Ordering list: `packages/mapgen-core/src/bootstrap/resolved.ts` (`STAGE_ORDER`).
- Enablement bridge: `resolveStageManifest(stageConfig)` computes `StageManifest` with `order = STAGE_ORDER`.
- Standard recipe derivation: `packages/mapgen-core/src/pipeline/StepRegistry.ts#getStandardRecipe(stageManifest)` filters `StageManifest.order` by `stages[id].enabled !== false`.

V1 baseline mapping proposal:
- Keep step IDs equal to current stage ids for the V1 “standard recipe” during cutover (one-to-one parity with M3 stage wrappers).
- Granular step IDs like `core.morphology.buildHeightfield` remain a later refinement; not required to ship M4 cutover safely.

| Seq | Current stage id (M3) | Proposed `RecipeV1.steps[i].id` | Notes |
| --- | --- | --- | --- |
| 1 | `foundation` | `foundation` | |
| 2 | `landmassPlates` | `landmassPlates` | |
| 3 | `coastlines` | `coastlines` | |
| 4 | `storySeed` | `storySeed` | |
| 5 | `storyHotspots` | `storyHotspots` | |
| 6 | `storyRifts` | `storyRifts` | |
| 7 | `ruggedCoasts` | `ruggedCoasts` | Special-case enablement in `resolveStageManifest`: enabled if `ruggedCoasts === true` OR `coastlines === true`. |
| 8 | `storyOrogeny` | `storyOrogeny` | |
| 9 | `storyCorridorsPre` | `storyCorridorsPre` | |
| 10 | `islands` | `islands` | |
| 11 | `mountains` | `mountains` | |
| 12 | `volcanoes` | `volcanoes` | |
| 13 | `lakes` | `lakes` | |
| 14 | `climateBaseline` | `climateBaseline` | |
| 15 | `storySwatches` | `storySwatches` | |
| 16 | `rivers` | `rivers` | |
| 17 | `storyCorridorsPost` | `storyCorridorsPost` | |
| 18 | `climateRefine` | `climateRefine` | |
| 19 | `biomes` | `biomes` | |
| 20 | `features` | `features` | |
| 21 | `placement` | `placement` | |

Enablement parity note:
- Today: enablement comes from `stageConfig` → `stageManifest.stages[id].enabled`.
- Bridge strategy suggested in SPIKE §2.2/§2.9:
  - Generate `RecipeV1.steps[]` from `stageManifest.order` and copy enablement into each entry.
  - Then cut runtime over to compile + execute the recipe/plan and delete stage-based plumbing once parity is reached.

