# SPIKE M6: Recipe-Local Mod Authoring (Domain Libraries + Recipe Mini-Packages)

Primary reference:
- Canonical target: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`

Milestone: M6

This SPIKE is an end-to-end structural rebuild of the “standard mod content” story with a single goal: make authoring clean and obvious.

It intentionally prioritizes:
- **Recipe-local ownership** (clear boundaries, low indirection)
- **Thin composition layers** (recipe → stages → steps)
- **Reuse through mod-local domain libraries** (pure logic), not through shared step catalogs

It does not include migration steps or task breakdowns.

---

## 0) Summary decisions (the model we are locking in)

1. **Shared domain logic lives in domain libraries (mod-owned).**
   - Domain libraries are pure logic/utilities reused across a mod.
   - The engine/authoring SDK does not prescribe their shape.

2. **Everything else is recipe-owned.**
   - A recipe is a **mini-package**: it owns its stages, steps, and ordering.
   - Steps are not treated as globally reusable primitives; reuse happens by sharing domain logic.
   - Every step defines a **config schema** (even if empty). Config **values** are supplied by the map that instantiates the recipe.

3. **Stages remain a first-class authoring concept (not runtime).**
   - A stage is a named, ordered list of steps used to keep recipes readable.
   - A stage is also the **ownership boundary** for its steps on disk.
   - The runtime does not “schedule stages”; the recipe flattens to an ordered step list.

4. **Registry remains fundamental, but is fully hidden from authors.**
   - The engine still compiles and executes using `StepRegistry + TagRegistry`.
   - The authoring SDK builds the registry internally from recipe-local steps.
   - Mod authors never touch registry plumbing in the common path.

5. **Recipe is the canonical ordering artifact (per SPEC 1.2).**
   - The concrete `RunRequest.recipe.steps[]` order is what the compiler uses.
   - Stages are an authoring convenience; they must not become a second source of truth.

6. **Recipe is not a “map variant”.**
   - A recipe defines **how** we generate a kind of map (the pipeline structure).
   - A map is an **instance** of a recipe: it selects a recipe and provides a config object (values).
   - Many different maps/presets can use the same recipe with different configs.
     - Extremely different outcomes (e.g., “water world” vs “massive desert”) may be achievable via config alone, or may require a different recipe if the pipeline structure must change.
   - This SPIKE does not bake “enable/disable stages” into config yet; leave room for it later without making it a requirement now.

---

## 1) Anchor in the existing runtime contract (what already exists)

This SPIKE assumes (and is designed around) the current runtime surfaces:

- `StepRegistry` + `TagRegistry` (`packages/mapgen-core/src/pipeline/StepRegistry.ts`, `packages/mapgen-core/src/pipeline/tags.ts`)
- `compileExecutionPlan(runRequest, registry)` (`packages/mapgen-core/src/pipeline/execution-plan.ts`)
- `PipelineExecutor.executePlan(context, plan)` (`packages/mapgen-core/src/pipeline/PipelineExecutor.ts`)

Key invariants we keep (SPEC 1.2):
- Boundary input is `RunRequest = { recipe, settings }`.
- Recipes compile into an `ExecutionPlan` (derived) which is what the executor runs.
- `requires` / `provides` remain strictly on steps; the engine validates and enforces them.

---

## 2) Layering (engine runtime vs authoring ergonomics vs mod content)

### 2.1 Engine SDK (runtime-only)

Today this is effectively the existing `@swooper/mapgen-core/pipeline` surface.

The “ideal state” packaging change is to **promote** that surface as the public runtime SDK
(e.g., `@swooper/mapgen-core/engine`) without changing behavior.

**Engine owns:**
- `StepRegistry`, `TagRegistry`
- `RunRequest`, `RecipeV1`, `RunSettings`
- `compileExecutionPlan`, `ExecutionPlan`
- `PipelineExecutor`
- errors + observability primitives

**Engine does not know about:**
- stages
- recipes-as-folders
- authoring helpers
- mod content layout

### 2.2 Authoring SDK (ergonomics-only, thin factories)

Authoring SDK is a layer that:
- imports engine runtime primitives
- provides **factory functions** for `step`, `stage`, `recipe`
- hides registry compilation/plumbing

Mod content packages depend on this authoring surface; they do not import engine primitives directly.

To keep registry fully hidden, the authoring layer may also provide tiny “convenience runtime” helpers (e.g., `recipe.compile()` / `recipe.run()`), but these are strictly wrappers over engine compile/execute — not new semantics.

### 2.3 Mod content package (pure content)

Mod content packages:
- contain domain libraries (pure logic)
- contain recipe mini-packages (steps/stages/recipe composition)
- export recipes (and optionally convenience “run” entrypoints)

---

## 3) Mod content package structure (many maps per recipe; one recipe = one mini-package)

This is the canonical layout we want to converge on for `mods/mod-swooper-maps`:

Directory sketch (illustrative; not a file):
```text
mods/mod-swooper-maps/src/
├─ mod.ts
├─ maps/
│  ├─ swooper-earthlike.ts
│  ├─ swooper-desert-mountains.ts
│  └─ *.ts
├─ recipes/
│  ├─ standard/
│  │  ├─ recipe.ts
│  │  ├─ stages/
│  │  │  ├─ foundation/
│  │  │  │  ├─ index.ts
│  │  │  │  └─ steps/
│  │  │  │     ├─ index.ts
│  │  │  │     └─ *.ts
│  │  │  ├─ morphology/
│  │  │  │  ├─ index.ts
│  │  │  │  └─ steps/
│  │  │  │     ├─ index.ts
│  │  │  │     └─ *.ts
│  │  │  └─ hydrology/
│  │  │     ├─ index.ts
│  │  │     └─ steps/
│  │  │        ├─ index.ts
│  │  │        └─ *.ts
│  └─ <recipeId>/
│     └─ **/**
└─ domain/
   └─ **/**
```

Rules:
- **No shared `steps/` catalog at the mod root.** Steps live inside the recipe that owns them.
- **Steps live under their stage** (`stages/<stageId>/steps/**`), so “what stage owns this step?” is structural, not conceptual.
- If two recipes need similar behavior, share the logic in `domain/**` and keep step wrappers thin.
- Domain libraries are **mod-owned**. The authoring SDK does not prescribe their internal layout.

### 3.1 Registry vs recipe (how this stays SPEC-aligned)

SPEC 1.2 says “mods ship registry + recipes”. In this model we satisfy that by packaging registry construction **inside each recipe module**:

- `mods/mod-swooper-maps/src/mod.ts` exports recipes (and mod metadata), not a global registry.
- Each `mods/mod-swooper-maps/src/recipes/<recipeId>/recipe.ts` builds a runtime `StepRegistry` internally from its recipe-local steps.
- The **only** canonical ordering artifact remains `RunRequest.recipe.steps[]` (a `RecipeV1` list). Stages are authoring-only groupings that flatten into that single list.

This keeps the engine contract intact while removing a mod-wide “catalog” folder that tends to become a grab bag.

### 3.2 Target directory structure (authoritative; collapsed view)

The directory sketch above is illustrative. This section is the intended end-state structure for M6 (derived from the exhaustive mapping in Section 9).

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
│  │  └─ context.ts                  # extracted from core/types.ts (engine-owned context + writers)
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

mods/mod-swooper-maps/
├─ src/
│  ├─ mod.ts                         # exports recipes; no global registry surface
│  ├─ maps/                          # map/preset entrypoints (config instances live here)
│  │  ├─ *.ts
│  │  └─ _runtime/                   # Civ7 runner glue (M6 keeps this mod-owned)
│  │     ├─ helpers.ts
│  │     ├─ map-init.ts
│  │     ├─ run-standard.ts
│  │     ├─ standard-config.ts
│  │     ├─ types.ts
│  │     └─ foundation-diagnostics.ts
│  ├─ recipes/
│  │  └─ standard/
│  │     ├─ recipe.ts
│  │     ├─ tags.ts
│  │     └─ stages/
│  │        ├─ <stageId>/
│  │        │  ├─ index.ts
│  │        │  └─ steps/
│  │        │     ├─ index.ts
│  │        │     └─ *.ts
│  │        └─ **/**
│  └─ domain/                        # pure logic (mod-owned)
│     ├─ config/
│     │  └─ schema/                  # schema fragments imported by step schemas
│     │     ├─ index.ts
│     │     ├─ common.ts
│     │     └─ *.ts
│     └─ **/**
└─ test/                             # content tests
   └─ **/**
```

End-state invariants:
- No `mods/mod-swooper-maps/src/config/**` module. Config schema fragments live under `src/domain/config/schema/**` and step schemas are co-located with step modules.
- No `packages/mapgen-core/src/core/**` module. Engine-owned context/helpers live under `src/engine/**`; content-owned artifacts/tags/validators live under the mod.
- No `packages/mapgen-core/src/config/**` or `packages/mapgen-core/src/bootstrap/**` modules. Config schemas live under `mods/mod-swooper-maps/src/domain/config/schema/**`; maps provide config instances directly.
- No `packages/mapgen-core/src/base/**` or `packages/mapgen-core/src/pipeline/mod.ts`. Standard content lives entirely in `mods/mod-swooper-maps/src/recipes/**` + `mods/mod-swooper-maps/src/domain/**`.
- `packages/mapgen-core/src/engine/context.ts` is the only engine-owned context surface; `MapGenConfig` is removed from core.

---

## 4) Authoring SDK: minimal factories (`createStep`, `createStage`, `createRecipe`)

The authoring surface is intentionally small and “POJO-first”.

### 4.1 Public surface

File: `packages/mapgen-core/src/authoring/index.ts` (whole file; new)
```ts
export { createStep } from "./step";
export { createStage } from "./stage";
export { createRecipe } from "./recipe";

export type { Step, Stage, RecipeConfig, RecipeConfigOf, RecipeModule } from "./types";
```

### 4.2 Types (authoring-only)

File: `packages/mapgen-core/src/authoring/types.ts` (whole file; new)
```ts
import type { TSchema } from "typebox";

import type {
  DependencyTag,
  ExecutionPlan,
  GenerationPhase,
  RecipeV1,
  RunRequest,
  RunSettings,
} from "@mapgen/engine/index.js";
import type { TraceSession } from "@mapgen/trace/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";

// An authored step definition (recipe-local; owned by a recipe stage).
// - Step-local config *values* do not live here.
// - Config *schema* lives here; values are supplied by the map that instantiates the recipe.
// - Tag kinds/metadata are inferred from dependency tag ids (artifact:/field:/effect:) and can be overridden
//   by the recipe-local tag catalog passed to `createRecipe({ tagDefinitions })`.
// - Tag definitions are runtime metadata only in this target (no per-tag TypeBox schemas in M6).
export type Step<TContext = ExtendedMapContext, TConfig = unknown> = Readonly<{
  // Local id within the stage. Final runtime id is derived as:
  //   `${namespace?}.${recipeId}.${stageId}.${stepId}`
  id: string;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  // Required: every step must provide a schema (even if it's an empty object).
  // This keeps “unknown config keys are errors” enforceable by the engine.
  schema: TSchema;
  run: (context: TContext, config: TConfig) => void | Promise<void>;

  // Optional: allow multiple occurrences of the same step behavior by pinning a stable node id.
  // If omitted, instanceId defaults to the computed full step id.
  instanceId?: string;
}>;

export type Stage<TContext = ExtendedMapContext> = {
  readonly id: string;
  readonly steps: readonly Step<TContext, unknown>[];
};

// Recipe config values provided by the end consumer (a map entrypoint).
// Shape mirrors the ownership tree: stageId → stepId → stepConfig.
export type RecipeConfig = Readonly<Record<string, Readonly<Record<string, unknown>>>>;

// Type helper: derive a strongly typed RecipeConfig shape from a `createRecipe({ stages })` input.
type UnionToIntersection<T> = (T extends unknown ? (x: T) => void : never) extends (
  x: infer I
) => void
  ? I
  : never;

type StepConfigById<
  TStage extends Stage<any>,
  TStepId extends string,
> = Extract<TStage["steps"][number], { id: TStepId }> extends Step<any, infer TConfig>
  ? TConfig
  : unknown;

export type RecipeConfigOf<TStages extends readonly Stage<any>[]> = UnionToIntersection<
  TStages[number] extends infer TStage
    ? TStage extends Stage<any>
      ? Readonly<
          Record<
            TStage["id"],
            Readonly<{
              [K in TStage["steps"][number]["id"]]: StepConfigById<TStage, K>;
            }>
          >
        >
      : never
    : never
>;

// What the mod exports for a recipe.
// Registry is intentionally not exposed.
export type RecipeModule<TContext = ExtendedMapContext> = {
  readonly id: string;
  // Structural recipe: step order + ids, but no per-step config values baked in.
  // Concrete config values are supplied by the map that instantiates the recipe.
  readonly recipe: RecipeV1;

  // Instantiate a concrete RecipeV1 by applying config values (stageId→stepId) onto the structural recipe.
  instantiate: (config?: RecipeConfig | null) => RecipeV1;

  runRequest: (settings: RunSettings, config?: RecipeConfig | null) => RunRequest;
  compile: (settings: RunSettings, config?: RecipeConfig | null) => ExecutionPlan;
  run: (
    context: TContext,
    settings: RunSettings,
    config?: RecipeConfig | null,
    options?: { trace?: TraceSession | null; log?: (message: string) => void }
  ) => void;
};
```

### 4.3 `createStep`

File: `packages/mapgen-core/src/authoring/step.ts` (whole file; new)
```ts
import type { Step } from "./types";

export function createStep<const TStep extends Step>(step: TStep): TStep {
  return step;
}
```

### 4.4 `createStage`

File: `packages/mapgen-core/src/authoring/stage.ts` (whole file; new)
```ts
import type { Stage } from "./types";

export function createStage<const TStage extends Stage>(stage: TStage): TStage {
  return stage;
}
```

### 4.5 `createRecipe` (builds registry internally; exposes only recipe/compile/run)

File: `packages/mapgen-core/src/authoring/recipe.ts` (whole file; new)
```ts
import {
  compileExecutionPlan,
  PipelineExecutor,
  StepRegistry,
  TagRegistry,
  type DependencyTagDefinition,
  type ExecutionPlan,
  type MapGenStep,
  type RecipeV1,
  type RunRequest,
  type RunSettings,
} from "@mapgen/engine/index.js";

import type { TraceSession } from "@mapgen/trace/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { RecipeConfig, RecipeModule, Stage, Step } from "./types";

type StepOccurrence<TContext> = {
  stageId: string;
  stepId: string;
  step: MapGenStep<TContext, unknown>;
  instanceId?: string;
};

function inferTagKind(id: string): DependencyTagDefinition["kind"] {
  if (id.startsWith("artifact:")) return "artifact";
  if (id.startsWith("field:")) return "field";
  if (id.startsWith("effect:")) return "effect";
  throw new Error(`Invalid dependency tag "${id}" (expected artifact:/field:/effect:)`);
}

function computeFullStepId(input: {
  namespace?: string;
  recipeId: string;
  stageId: string;
  stepId: string;
}): string {
  const base = input.namespace ? `${input.namespace}.${input.recipeId}` : input.recipeId;
  return `${base}.${input.stageId}.${input.stepId}`;
}

function finalizeOccurrences<TContext extends ExtendedMapContext>(input: {
  namespace?: string;
  recipeId: string;
  stages: readonly Stage<TContext>[];
}): StepOccurrence<TContext>[] {
  const out: StepOccurrence<TContext>[] = [];

  for (const stage of input.stages) {
    for (const authored of stage.steps) {
      const stepId = authored.id;
      const fullId = computeFullStepId({
        namespace: input.namespace,
        recipeId: input.recipeId,
        stageId: stage.id,
        stepId,
      });

      out.push({
        stageId: stage.id,
        stepId,
        step: {
          id: fullId,
          phase: authored.phase,
          requires: authored.requires,
          provides: authored.provides,
          configSchema: authored.schema,
          run: authored.run as unknown as MapGenStep<TContext, unknown>["run"],
        },
        instanceId: authored.instanceId,
      });
    }
  }

  return out;
}

function collectTagDefinitions(
  occurrences: readonly StepOccurrence<unknown>[],
  explicit: readonly DependencyTagDefinition[]
): DependencyTagDefinition[] {
  const defs = new Map<string, DependencyTagDefinition>();

  const tagIds = new Set<string>();
  for (const occ of occurrences) {
    for (const tag of occ.step.requires) tagIds.add(tag);
    for (const tag of occ.step.provides) tagIds.add(tag);
  }
  for (const id of tagIds) {
    defs.set(id, { id, kind: inferTagKind(id) });
  }

  // Explicit recipe-local tag definitions override inferred ones.
  for (const def of explicit) {
    defs.set(def.id, def);
  }

  return Array.from(defs.values());
}

function buildRegistry<TContext extends ExtendedMapContext>(
  occurrences: readonly StepOccurrence<TContext>[],
  tagDefinitions: readonly DependencyTagDefinition[]
) {
  const tags = new TagRegistry();
  tags.registerTags(collectTagDefinitions(occurrences, tagDefinitions));

  const registry = new StepRegistry<TContext>({ tags });
  for (const occ of occurrences) registry.register(occ.step);
  return registry;
}

function toStructuralRecipeV1(id: string, occurrences: readonly StepOccurrence<unknown>[]): RecipeV1 {
  return {
    schemaVersion: 1,
    id,
    steps: occurrences.map((occ) => ({
      id: occ.step.id,
      instanceId: occ.instanceId,
    })),
  };
}

export function createRecipe<TContext extends ExtendedMapContext>(input: {
  id: string;
  namespace?: string;
  // Recipe-local tag catalog/definitions (may be empty, but always provided).
  // This is the replacement for `base/tags.ts`.
  tagDefinitions: readonly DependencyTagDefinition[];
  stages: readonly Stage<TContext>[];
}): RecipeModule<TContext> {
  const occurrences = finalizeOccurrences({
    namespace: input.namespace,
    recipeId: input.id,
    stages: input.stages,
  });
  const registry = buildRegistry(occurrences, input.tagDefinitions);
  const recipe = toStructuralRecipeV1(input.id, occurrences);

  function instantiate(config?: RecipeConfig | null): RecipeV1 {
    const cfg = config ?? null;
    return {
      ...recipe,
      steps: occurrences.map((occ) => ({
        id: occ.step.id,
        instanceId: occ.instanceId,
        config: cfg ? cfg[occ.stageId]?.[occ.stepId] : undefined,
      })),
    };
  }

  function runRequest(settings: RunSettings, config?: RecipeConfig | null): RunRequest {
    return { recipe: instantiate(config), settings };
  }

  function compile(settings: RunSettings, config?: RecipeConfig | null): ExecutionPlan {
    return compileExecutionPlan(runRequest(settings, config), registry);
  }

  function run(
    context: TContext,
    settings: RunSettings,
    config?: RecipeConfig | null,
    options: { trace?: TraceSession | null; log?: (message: string) => void } = {}
  ): void {
    const plan = compile(settings, config);
    const executor = new PipelineExecutor(registry, {
      log: options.log,
      logPrefix: `[recipe:${input.id}]`,
    });
    executor.executePlan(context, plan, { trace: options.trace ?? null });
  }

  return { id: input.id, recipe, instantiate, runRequest, compile, run };
}
```

### 4.6 Packaging overlay (ideal state)

This SPIKE assumes the authoring SDK is exported as a stable surface from `@swooper/mapgen-core`.

Concretely:
- Add exports in `packages/mapgen-core/package.json` for `./engine` (runtime) and `./authoring` (ergonomics).
- Mod content packages (e.g., `mods/mod-swooper-maps`) import only from `@swooper/mapgen-core/authoring`.
  - They do not import `@swooper/mapgen-core/engine` directly in the common path.

Notes:
- Registry creation exists, but is **invisible** to mod authors and end users.
- `requires`/`provides` remain on steps; engine semantics are unchanged.
- Recipe definition exports a **structural** `RecipeV1` (ordered `steps[]`, no config values); stages do not appear in runtime.
- The end consumer (a map entrypoint) supplies config values; `RecipeModule.instantiate(config)` produces the concrete `RecipeV1` that is compiled/executed.
- Field tags (`field:*`) are part of the target architecture, but runtime satisfaction seeding is an engine concern (e.g., via `computeInitialSatisfiedTags`). Until that exists, prefer `artifact:*` products for cross-step contracts.

---

## 5) Recipe mini-package template (one file per step/stage/recipe)

For every recipe:

- Each step is a file exporting a single `createStep(...)` POJO.
- Each stage is a folder with:
  - `stages/<stageId>/index.ts` exporting a single `createStage(...)` POJO (ordered step list), and
  - `stages/<stageId>/steps/index.ts` exporting explicit named step exports.
- The recipe is a file exporting a single `createRecipe(...)` POJO that composes stages.

Directory sketch (illustrative; not a file):
```text
mods/mod-swooper-maps/src/recipes/<recipeId>/
├─ recipe.ts
├─ stages/
│  └─ <stageId>/
│     ├─ index.ts
│     └─ steps/
│        ├─ index.ts
│        └─ <stepId>.ts
```

Stage step barrel rules (required):
- `stages/<stageId>/steps/index.ts` must use **explicit named exports only**:
  - `export { default as buildHeightfield } from "./buildHeightfield";`
  - No `export *`.
- Dependency direction is strictly one-way:
  - `stages/<stageId>/index.ts` may import from `./steps`.
  - Step files must never import `../index.ts` or `./index.ts` to avoid cycles.

---

## 6) Concrete example (non-narrative, linear)

This example deliberately avoids narrative; narrative is deferred (Section 8).

### 6.1 Shared domain logic (pure)

File: `mods/mod-swooper-maps/src/domain/terrain/buildTerrainMask.ts` (whole file)
```ts
export function buildTerrainMask(_params: { roughness: number }): Uint8Array {
  // Domain logic lives here (pure; reusable across recipes).
  return new Uint8Array();
}
```

### 6.2 Steps (recipe-local wrappers over domain logic)

File: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology/steps/buildHeightfield.ts` (whole file)
```ts
import { Type } from "typebox";
import { createStep } from "@swooper/mapgen-core/authoring";
import { buildTerrainMask } from "../../../../../domain/terrain/buildTerrainMask";

export type BuildHeightfieldConfig = { roughness: number };

export default createStep({
  id: "buildHeightfield",
  phase: "morphology",
  requires: [],
  provides: ["artifact:terrainMask@v1"],
  schema: Type.Object(
    { roughness: Type.Number({ default: 0.5 }) },
    { additionalProperties: false }
  ),
  run: (ctx, config: BuildHeightfieldConfig) => {
    const mask = buildTerrainMask({ roughness: config.roughness });
    // (Illustrative) publish artifact
    ctx.artifacts.set("artifact:terrainMask@v1", mask);
  },
});
```

File: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology/steps/buildClimateField.ts` (whole file)
```ts
import { Type } from "typebox";
import { createStep } from "@swooper/mapgen-core/authoring";

export type BuildClimateFieldConfig = { humidity: number };

export default createStep({
  id: "buildClimateField",
  phase: "hydrology",
  requires: ["artifact:terrainMask@v1"],
  provides: ["artifact:climateField@v1"],
  schema: Type.Object(
    { humidity: Type.Number({ default: 0.6 }) },
    { additionalProperties: false }
  ),
  run: (_ctx, _config: BuildClimateFieldConfig) => {
    // Domain logic omitted; step remains thin.
  },
});
```

### 6.3 Stages (authoring-only ordering)

File: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology/steps/index.ts` (whole file)
```ts
export { default as buildHeightfield } from "./buildHeightfield";
export type { BuildHeightfieldConfig } from "./buildHeightfield";
```

File: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology/steps/index.ts` (whole file)
```ts
export { default as buildClimateField } from "./buildClimateField";
export type { BuildClimateFieldConfig } from "./buildClimateField";
```

File: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology/index.ts` (whole file)
```ts
import { createStage } from "@swooper/mapgen-core/authoring";
import { buildHeightfield } from "./steps";

export default createStage({
  id: "morphology",
  steps: [buildHeightfield],
} as const);
```

File: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology/index.ts` (whole file)
```ts
import { createStage } from "@swooper/mapgen-core/authoring";
import { buildClimateField } from "./steps";

export default createStage({
  id: "hydrology",
  steps: [buildClimateField],
} as const);
```

### 6.4 Recipe (canonical global order via stage composition)

File: `mods/mod-swooper-maps/src/recipes/standard/recipe.ts` (whole file)
```ts
import { createRecipe } from "@swooper/mapgen-core/authoring";
import type { RecipeConfigOf } from "@swooper/mapgen-core/authoring";
import morphology from "./stages/morphology";
import hydrology from "./stages/hydrology";

const NAMESPACE = "mod-swooper-maps";
const stages = [morphology, hydrology] as const;

export type StandardRecipeConfig = RecipeConfigOf<typeof stages>;

export default createRecipe({
  id: "standard",
  namespace: NAMESPACE,
  tagDefinitions: [],
  stages,
} as const);
```

### 6.5 Map entrypoint (config instance lives here)

This is the key separation:
- The recipe module exports **structure** (order + step definitions + schemas).
- The map entrypoint supplies the **config instance** (values) and run settings.

File: `mods/mod-swooper-maps/src/maps/swooper-earthlike.ts` (excerpt; illustrative)
```ts
import standard, { type StandardRecipeConfig } from "../recipes/standard/recipe";

// RunSettings comes from map init + seed selection (details owned by the map runner / future publishing SDK).
const settings = /* RunSettings */ {} as any;
const ctx = /* MapGenContext */ {} as any;

// Config instance is owned by the map (values), not by steps or the recipe definition.
const config: StandardRecipeConfig = {
  morphology: {
    buildHeightfield: { roughness: 0.55 },
  },
  hydrology: {
    buildClimateField: { humidity: 0.62 },
  },
};

standard.run(ctx, settings, config);
```

Multiple maps/presets can import the same recipe module (e.g., `standard`) and supply different config instances to produce different outcomes.

---

## 7) Mod entrypoint (exports recipes; no shared step catalog)

File: `mods/mod-swooper-maps/src/mod.ts` (whole file)
```ts
import standard from "./recipes/standard/recipe";

export const mod = {
  id: "mod-swooper-maps",
  recipes: { standard },
} as const;
```

---

## 8) Narrative (explicitly deferred)

This model treats narrative the same way as any other content:
- it can be a recipe-local stage with recipe-local steps, and
- its cross-cutting nature is expressed only through artifacts + recipe placement.

We are **not** redesigning narrative structure in this refactor. Any deeper narrative architecture changes require a dedicated narrative SPIKE.

---

## 9) Current code → target architecture mapping (exhaustive)

Scope:
- `packages/mapgen-core/**` (the “map-gen” package)
- `mods/mod-swooper-maps/**` (the target content package)

Rule for this mapping:
- **Domain logic** (pure algorithms) is grouped and not enumerated file-by-file.
- Every other file is mapped one-to-one to a target location/role, including deletions.
- File move lists are recorded as YAML blocks for parseability.

### 9.1 `packages/mapgen-core/**` (engine + authoring SDK)

#### 9.1.1 Domain logic (grouped; reviewed but not enumerated)

- `packages/mapgen-core/src/domain/**` → move to `mods/mod-swooper-maps/src/domain/**` (mod-owned domain libraries).
  - Required follow-up: remove any imports of `@mapgen/base/*` / base tags from domain modules; domain libraries must not depend on a privileged “base mod”.

#### 9.1.2 Engine runtime (pipeline → engine) and neutral utilities

Target intent:
- `packages/mapgen-core/src/engine/**` is the **runtime-only** SDK surface (current `pipeline/**` renamed).
- `packages/mapgen-core/src/lib/**`, `packages/mapgen-core/src/trace/**`, and `packages/mapgen-core/src/polyfills/**` remain engine-owned neutral utilities.

```yaml
moves:
  - current: "packages/mapgen-core/src/AGENTS.md"
    target: "packages/mapgen-core/src/AGENTS.md"
    layer: "meta"
    notes: "Instructions only"
  - current: "packages/mapgen-core/src/index.ts"
    target: "packages/mapgen-core/src/index.ts"
    layer: "meta"
    notes: "Becomes a thin compatibility re-export (prefer `@swooper/mapgen-core/engine` + `@swooper/mapgen-core/authoring`)"
  - current: "packages/mapgen-core/src/polyfills/text-encoder.ts"
    target: "packages/mapgen-core/src/polyfills/text-encoder.ts"
    layer: "engine"
    notes: "Required runtime polyfill for Civ7 V8"
  - current: "packages/mapgen-core/src/shims/typebox-format.ts"
    target: "packages/mapgen-core/src/shims/typebox-format.ts"
    layer: "engine"
    notes: "Build-time shim used by bundlers; keep as-is"
  - current: "packages/mapgen-core/src/trace/index.ts"
    target: "packages/mapgen-core/src/trace/index.ts"
    layer: "engine"
    notes: "Trace primitives + hashing (may be split later; not required for this refactor)"
```


Engine runtime (rename `pipeline/` → `engine/`):

```yaml
moves:
  - current: "packages/mapgen-core/src/pipeline/PipelineExecutor.ts"
    target: "packages/mapgen-core/src/engine/PipelineExecutor.ts"
    layer: "engine"
    notes: "Move pipeline → engine (runtime SDK)"
  - current: "packages/mapgen-core/src/pipeline/StepRegistry.ts"
    target: "packages/mapgen-core/src/engine/StepRegistry.ts"
    layer: "engine"
    notes: "Move pipeline → engine (runtime SDK)"
  - current: "packages/mapgen-core/src/pipeline/errors.ts"
    target: "packages/mapgen-core/src/engine/errors.ts"
    layer: "engine"
    notes: "Move pipeline → engine (runtime SDK)"
  - current: "packages/mapgen-core/src/pipeline/execution-plan.ts"
    target: "packages/mapgen-core/src/engine/execution-plan.ts"
    layer: "engine"
    notes: "Move pipeline → engine (runtime SDK)"
  - current: "packages/mapgen-core/src/pipeline/index.ts"
    target: "packages/mapgen-core/src/engine/index.ts"
    layer: "engine"
    notes: "Move pipeline → engine (runtime SDK)"
  - current: "packages/mapgen-core/src/pipeline/mod.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "Remove `PipelineModV1` (registry-forward mod contract); replaced by recipe modules"
  - current: "packages/mapgen-core/src/pipeline/observability.ts"
    target: "packages/mapgen-core/src/engine/observability.ts"
    layer: "engine"
    notes: "Move pipeline → engine (runtime SDK)"
  - current: "packages/mapgen-core/src/pipeline/step-config.ts"
    target: "packages/mapgen-core/src/engine/step-config.ts"
    layer: "engine"
    notes: "Move pipeline → engine (runtime SDK)"
  - current: "packages/mapgen-core/src/pipeline/tags.ts"
    target: "packages/mapgen-core/src/engine/tags.ts"
    layer: "engine"
    notes: "Move pipeline → engine (runtime SDK)"
  - current: "packages/mapgen-core/src/pipeline/types.ts"
    target: "packages/mapgen-core/src/engine/types.ts"
    layer: "engine"
    notes: "Move pipeline → engine (runtime SDK)"
```


Neutral utilities (`lib/**`) (unchanged paths; engine-owned):

```yaml
moves:
  - current: "packages/mapgen-core/src/lib/collections/freeze-clone.ts"
    target: "packages/mapgen-core/src/lib/collections/freeze-clone.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/collections/index.ts"
    target: "packages/mapgen-core/src/lib/collections/index.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/collections/record.ts"
    target: "packages/mapgen-core/src/lib/collections/record.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/grid/bounds.ts"
    target: "packages/mapgen-core/src/lib/grid/bounds.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/grid/distance/bfs.ts"
    target: "packages/mapgen-core/src/lib/grid/distance/bfs.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/grid/index.ts"
    target: "packages/mapgen-core/src/lib/grid/index.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/grid/indexing.ts"
    target: "packages/mapgen-core/src/lib/grid/indexing.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/grid/neighborhood/hex-oddq.ts"
    target: "packages/mapgen-core/src/lib/grid/neighborhood/hex-oddq.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/grid/neighborhood/square-3x3.ts"
    target: "packages/mapgen-core/src/lib/grid/neighborhood/square-3x3.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/grid/wrap.ts"
    target: "packages/mapgen-core/src/lib/grid/wrap.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/heightfield/base.ts"
    target: "packages/mapgen-core/src/lib/heightfield/base.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/heightfield/sea-level.ts"
    target: "packages/mapgen-core/src/lib/heightfield/sea-level.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/math/clamp.ts"
    target: "packages/mapgen-core/src/lib/math/clamp.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/math/index.ts"
    target: "packages/mapgen-core/src/lib/math/index.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/math/lerp.ts"
    target: "packages/mapgen-core/src/lib/math/lerp.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/noise/fractal.ts"
    target: "packages/mapgen-core/src/lib/noise/fractal.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/noise/index.ts"
    target: "packages/mapgen-core/src/lib/noise/index.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/noise/perlin.ts"
    target: "packages/mapgen-core/src/lib/noise/perlin.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/plates/crust.ts"
    target: "packages/mapgen-core/src/lib/plates/crust.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/plates/topology.ts"
    target: "packages/mapgen-core/src/lib/plates/topology.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/rng/index.ts"
    target: "packages/mapgen-core/src/lib/rng/index.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/rng/pick.ts"
    target: "packages/mapgen-core/src/lib/rng/pick.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/rng/unit.ts"
    target: "packages/mapgen-core/src/lib/rng/unit.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
  - current: "packages/mapgen-core/src/lib/rng/weighted-choice.ts"
    target: "packages/mapgen-core/src/lib/rng/weighted-choice.ts"
    layer: "engine"
    notes: "Neutral utility (unchanged)"
```


Dev-only diagnostics (`dev/**`) (unchanged paths; not part of authoring surface):

```yaml
moves:
  - current: "packages/mapgen-core/src/dev/ascii.ts"
    target: "packages/mapgen-core/src/dev/ascii.ts"
    layer: "engine (devtools)"
    notes: "Diagnostics-only helpers (keep; not part of authoring surface)"
  - current: "packages/mapgen-core/src/dev/diagnostics-parity.ts"
    target: "packages/mapgen-core/src/dev/diagnostics-parity.ts"
    layer: "engine (devtools)"
    notes: "Diagnostics-only helpers (keep; not part of authoring surface)"
  - current: "packages/mapgen-core/src/dev/flags.ts"
    target: "packages/mapgen-core/src/dev/flags.ts"
    layer: "engine (devtools)"
    notes: "Diagnostics-only helpers (keep; not part of authoring surface)"
  - current: "packages/mapgen-core/src/dev/histograms.ts"
    target: "packages/mapgen-core/src/dev/histograms.ts"
    layer: "engine (devtools)"
    notes: "Diagnostics-only helpers (keep; not part of authoring surface)"
  - current: "packages/mapgen-core/src/dev/index.ts"
    target: "packages/mapgen-core/src/dev/index.ts"
    layer: "engine (devtools)"
    notes: "Diagnostics-only helpers (keep; not part of authoring surface)"
  - current: "packages/mapgen-core/src/dev/introspection.ts"
    target: "packages/mapgen-core/src/dev/introspection.ts"
    layer: "engine (devtools)"
    notes: "Diagnostics-only helpers (keep; not part of authoring surface)"
  - current: "packages/mapgen-core/src/dev/logging.ts"
    target: "packages/mapgen-core/src/dev/logging.ts"
    layer: "engine (devtools)"
    notes: "Diagnostics-only helpers (keep; not part of authoring surface)"
  - current: "packages/mapgen-core/src/dev/summaries.ts"
    target: "packages/mapgen-core/src/dev/summaries.ts"
    layer: "engine (devtools)"
    notes: "Diagnostics-only helpers (keep; not part of authoring surface)"
  - current: "packages/mapgen-core/src/dev/timing.ts"
    target: "packages/mapgen-core/src/dev/timing.ts"
    layer: "engine (devtools)"
    notes: "Diagnostics-only helpers (keep; not part of authoring surface)"
```


#### 9.1.3 Engine context + Civ7-facing helpers (current `core/**`)

`packages/mapgen-core/src/core/**` currently mixes:
- engine-owned context/buffer/writer helpers, and
- content-owned artifacts/tags/types (especially foundation artifacts).

Target: split it cleanly.

```yaml
moves:
  - current: "packages/mapgen-core/src/core/index.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "Remove the “grab-bag” core barrel; replace with explicit exports from `engine/**` and `lib/**`"
  - current: "packages/mapgen-core/src/core/terrain-constants.ts"
    target: "packages/mapgen-core/src/engine/terrain-constants.ts"
    layer: "engine"
    notes: "Civ7 adapter → terrain/biome/feature indices; keep engine-owned"
  - current: "packages/mapgen-core/src/core/plot-tags.ts"
    target: "packages/mapgen-core/src/engine/plot-tags.ts"
    layer: "engine"
    notes: "Civ7 adapter plot tagging helpers; keep engine-owned"
  - current: "packages/mapgen-core/src/core/types.ts"
    target: "packages/mapgen-core/src/engine/context.ts"
    layer: "engine + content split"
    notes: "Split: engine context + writers stay in `engine/context.ts`; foundation/story artifact types + validators move to mod domain libs (see base/content mapping)"
  - current: "packages/mapgen-core/src/core/assertions.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/foundation/assertions.ts"
    layer: "content"
    notes: "Foundation artifact assertions are base/standard content, not engine"
```


#### 9.1.4 Runner/orchestration helpers (current `orchestrator/**`)

These are not part of the engine runtime contract (SPEC entry is `RunRequest`), and they currently bake in legacy config + base-mod assumptions.

```yaml
moves:
  - current: "packages/mapgen-core/src/orchestrator/helpers.ts"
    target: "mods/mod-swooper-maps/src/maps/_runtime/helpers.ts"
    layer: "content (maps)"
    notes: "Mod-owned runtime glue for map entrypoints"
  - current: "packages/mapgen-core/src/orchestrator/map-init.ts"
    target: "mods/mod-swooper-maps/src/maps/_runtime/map-init.ts"
    layer: "content (maps)"
    notes: "Map init resolution/apply; mod-owned runtime glue"
  - current: "packages/mapgen-core/src/orchestrator/types.ts"
    target: "mods/mod-swooper-maps/src/maps/_runtime/types.ts"
    layer: "content (maps)"
    notes: "Runner-only types (adapter creation, mapSizeDefaults, etc.)"
  - current: "packages/mapgen-core/src/orchestrator/task-graph.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "Legacy “run base mod with MapGenConfig/overrides”; replaced by map entrypoints calling `recipe.run(ctx, settings, config)`"
```


#### 9.1.5 Legacy config/bootstrap modules (remove; replace with recipe-local schemas + map-owned config instances)

SPEC 1.2 is explicit: boundary input is `RunRequest = { recipe, settings }` (not monolithic `MapGenConfig`).

```yaml
moves:
  - current: "packages/mapgen-core/src/bootstrap/AGENTS.md"
    target: "(delete)"
    layer: "legacy"
    notes: "Bootstrap module removed"
  - current: "packages/mapgen-core/src/bootstrap/entry.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "Remove overrides/bootstrap; maps instantiate config directly and pass to recipe"
  - current: "packages/mapgen-core/src/bootstrap/types.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "Replace with recipe-local step schemas/types"
  - current: "packages/mapgen-core/src/config/AGENTS.md"
    target: "(delete)"
    layer: "legacy"
    notes: "Config module removed from core package"
  - current: "packages/mapgen-core/src/config/index.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "Remove `MapGenConfig` surface; step schemas/types move to mod domain libs"
  - current: "packages/mapgen-core/src/config/loader.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "No global config parsing; per-step validation happens during compile via step schemas"
  - current: "packages/mapgen-core/src/config/schema.ts"
    target: "mods/mod-swooper-maps/src/domain/config/schema/index.ts"
    layer: "content (domain)"
    notes: "Keep schema fragments as mod-owned library (imported by step schemas)"
  - current: "packages/mapgen-core/src/config/schema/common.ts"
    target: "mods/mod-swooper-maps/src/domain/config/schema/common.ts"
    layer: "content (domain)"
    notes: "Move as-is"
  - current: "packages/mapgen-core/src/config/schema/ecology.ts"
    target: "mods/mod-swooper-maps/src/domain/config/schema/ecology.ts"
    layer: "content (domain)"
    notes: "Move as-is"
  - current: "packages/mapgen-core/src/config/schema/foundation.ts"
    target: "mods/mod-swooper-maps/src/domain/config/schema/foundation.ts"
    layer: "content (domain)"
    notes: "Move as-is"
  - current: "packages/mapgen-core/src/config/schema/hydrology.ts"
    target: "mods/mod-swooper-maps/src/domain/config/schema/hydrology.ts"
    layer: "content (domain)"
    notes: "Move as-is"
  - current: "packages/mapgen-core/src/config/schema/landmass.ts"
    target: "mods/mod-swooper-maps/src/domain/config/schema/landmass.ts"
    layer: "content (domain)"
    notes: "Move as-is"
  - current: "packages/mapgen-core/src/config/schema/morphology.ts"
    target: "mods/mod-swooper-maps/src/domain/config/schema/morphology.ts"
    layer: "content (domain)"
    notes: "Move as-is"
  - current: "packages/mapgen-core/src/config/schema/narrative.ts"
    target: "mods/mod-swooper-maps/src/domain/config/schema/narrative.ts"
    layer: "content (domain)"
    notes: "Move as-is"
  - current: "packages/mapgen-core/src/config/schema/placement.ts"
    target: "mods/mod-swooper-maps/src/domain/config/schema/placement.ts"
    layer: "content (domain)"
    notes: "Move as-is"
```


#### 9.1.6 Base/standard content (current `base/**`) → `mods/mod-swooper-maps` (content package)

Target intent:
- Delete the privileged `@swooper/mapgen-core/base` export.
- Move the standard pipeline content into `mods/mod-swooper-maps/src/recipes/standard/**`.
- Move reusable *pure* algorithms into `mods/mod-swooper-maps/src/domain/**`.
- Remove legacy `MapGenConfig` translation (`buildRunRequest`) and all override plumbing.

```yaml
moves:
  - current: "packages/mapgen-core/src/base/index.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "Remove `@swooper/mapgen-core/base` surface; replaced by a real content package (`mods/mod-swooper-maps`)"
  - current: "packages/mapgen-core/src/base/mod.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "Remove `baseMod` (registry-forward mod contract); recipes are exported directly from the mod content package"
  - current: "packages/mapgen-core/src/base/library.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "Remove “register layer” indirection; recipe owns its steps directly"
  - current: "packages/mapgen-core/src/base/run-request.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "Remove `MapGenConfig → per-step config` translation; maps supply config instances directly"
  - current: "packages/mapgen-core/src/base/phases.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "Phase is now authored on each step definition (supports narrative cross-cutting)"
  - current: "packages/mapgen-core/src/base/stage-spine.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "Replace with explicit `requires`/`provides` on steps (enforced by compiler/executor)"
  - current: "packages/mapgen-core/src/base/tags.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/tags.ts"
    layer: "content"
    notes: "Standard recipe’s tag catalog/definitions (artifact/effect/field); consumed when building the recipe registry"
  - current: "packages/mapgen-core/src/base/recipes/default.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/recipe.ts"
    layer: "content"
    notes: "Becomes the “standard” structural recipe module (stages + steps)"
```


Foundation domain logic (pure; move into mod domain libraries):

```yaml
moves:
  - current: "packages/mapgen-core/src/base/foundation/constants.ts"
    target: "mods/mod-swooper-maps/src/domain/foundation/constants.ts"
    layer: "content (domain)"
    notes: "Move as-is"
  - current: "packages/mapgen-core/src/base/foundation/plate-seed.ts"
    target: "mods/mod-swooper-maps/src/domain/foundation/plate-seed.ts"
    layer: "content (domain)"
    notes: "Move as-is"
  - current: "packages/mapgen-core/src/base/foundation/plates.ts"
    target: "mods/mod-swooper-maps/src/domain/foundation/plates.ts"
    layer: "content (domain)"
    notes: "Move as-is"
  - current: "packages/mapgen-core/src/base/foundation/types.ts"
    target: "mods/mod-swooper-maps/src/domain/foundation/types.ts"
    layer: "content (domain)"
    notes: "Move as-is"
  - current: "packages/mapgen-core/src/base/pipeline/foundation/producer.ts"
    target: "mods/mod-swooper-maps/src/domain/foundation/producer.ts"
    layer: "content (domain)"
    notes: "Pure foundation algorithm runner (currently mislocated under base pipeline)"
```


Recipe-local helpers (not pure; keep inside the recipe mini-package):

```yaml
moves:
  - current: "packages/mapgen-core/src/base/orchestrator/foundation.ts"
    target: "mods/mod-swooper-maps/src/maps/_runtime/foundation-diagnostics.ts"
    layer: "content (maps)"
    notes: "Optional diagnostics wrapper used by map entrypoints (not part of recipe structure)"
  - current: "packages/mapgen-core/src/base/pipeline/artifacts.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/artifacts.ts"
    layer: "content"
    notes: "Shared artifact publish/get helpers (mutates context; not a domain lib)"
```


Standard recipe stages and steps (step factory files → recipe-local step files; index/steps wiring simplified):

Foundation stage:

```yaml
moves:
  - current: "packages/mapgen-core/src/base/pipeline/foundation/FoundationStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/foundation.ts"
    layer: "content"
    notes: "Rewrite from `createFoundationStep(...)` factory to default-export `createStep({...})`"
  - current: "packages/mapgen-core/src/base/pipeline/foundation/steps.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/index.ts"
    layer: "content"
    notes: "Replace with explicit named re-exports (no `export *`)"
  - current: "packages/mapgen-core/src/base/pipeline/foundation/index.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/foundation/index.ts"
    layer: "content"
    notes: "Replace `registerFoundationLayer` with a `createStage({ id, steps })` module"
```

Morphology stage:

```yaml
moves:
  - current: "packages/mapgen-core/src/base/pipeline/morphology/LandmassStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/morphology/steps/landmassPlates.ts"
    layer: "content"
    notes: "Rewrite; step id remains `landmassPlates`"
  - current: "packages/mapgen-core/src/base/pipeline/morphology/CoastlinesStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/morphology/steps/coastlines.ts"
    layer: "content"
    notes: "Rewrite"
  - current: "packages/mapgen-core/src/base/pipeline/morphology/RuggedCoastsStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/morphology/steps/ruggedCoasts.ts"
    layer: "content"
    notes: "Rewrite"
  - current: "packages/mapgen-core/src/base/pipeline/morphology/IslandsStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/morphology/steps/islands.ts"
    layer: "content"
    notes: "Rewrite"
  - current: "packages/mapgen-core/src/base/pipeline/morphology/MountainsStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/morphology/steps/mountains.ts"
    layer: "content"
    notes: "Rewrite"
  - current: "packages/mapgen-core/src/base/pipeline/morphology/VolcanoesStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/morphology/steps/volcanoes.ts"
    layer: "content"
    notes: "Rewrite"
  - current: "packages/mapgen-core/src/base/pipeline/morphology/steps.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/morphology/steps/index.ts"
    layer: "content"
    notes: "Replace with explicit named re-exports (no `export *`)"
  - current: "packages/mapgen-core/src/base/pipeline/morphology/index.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/morphology/index.ts"
    layer: "content"
    notes: "Replace `registerMorphologyLayer` with `createStage({ id, steps })`"
```

Narrative stage:

```yaml
moves:
  - current: "packages/mapgen-core/src/base/pipeline/narrative/StorySeedStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/narrative/steps/storySeed.ts"
    layer: "content"
    notes: "Rewrite"
  - current: "packages/mapgen-core/src/base/pipeline/narrative/StoryHotspotsStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/narrative/steps/storyHotspots.ts"
    layer: "content"
    notes: "Rewrite"
  - current: "packages/mapgen-core/src/base/pipeline/narrative/StoryRiftsStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/narrative/steps/storyRifts.ts"
    layer: "content"
    notes: "Rewrite"
  - current: "packages/mapgen-core/src/base/pipeline/narrative/StoryOrogenyStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/narrative/steps/storyOrogeny.ts"
    layer: "content"
    notes: "Rewrite"
  - current: "packages/mapgen-core/src/base/pipeline/narrative/StorySwatchesStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/narrative/steps/storySwatches.ts"
    layer: "content"
    notes: "Rewrite (step phase is `hydrology`, but stage grouping remains `narrative`)"
  - current: "packages/mapgen-core/src/base/pipeline/narrative/StoryCorridorsStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/narrative/steps/storyCorridorsPre.ts"
    layer: "content"
    notes: "Split: file becomes two steps (`storyCorridorsPre`, `storyCorridorsPost`)"
  - current: "packages/mapgen-core/src/base/pipeline/narrative/StoryCorridorsStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/narrative/steps/storyCorridorsPost.ts"
    layer: "content"
    notes: "Split: file becomes two steps (`storyCorridorsPre`, `storyCorridorsPost`)"
  - current: "packages/mapgen-core/src/base/pipeline/narrative/index.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/narrative/index.ts"
    layer: "content"
    notes: "Replace `registerNarrativeLayer` with `createStage({ id, steps })`; add `steps/index.ts` barrel (new)"
```

Hydrology stage:

```yaml
moves:
  - current: "packages/mapgen-core/src/base/pipeline/hydrology/LakesStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/hydrology/steps/lakes.ts"
    layer: "content"
    notes: "Rewrite"
  - current: "packages/mapgen-core/src/base/pipeline/hydrology/ClimateBaselineStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/hydrology/steps/climateBaseline.ts"
    layer: "content"
    notes: "Rewrite"
  - current: "packages/mapgen-core/src/base/pipeline/hydrology/RiversStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/hydrology/steps/rivers.ts"
    layer: "content"
    notes: "Rewrite"
  - current: "packages/mapgen-core/src/base/pipeline/hydrology/ClimateRefineStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/hydrology/steps/climateRefine.ts"
    layer: "content"
    notes: "Rewrite"
  - current: "packages/mapgen-core/src/base/pipeline/hydrology/steps.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/hydrology/steps/index.ts"
    layer: "content"
    notes: "Replace with explicit named re-exports (no `export *`)"
  - current: "packages/mapgen-core/src/base/pipeline/hydrology/index.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/hydrology/index.ts"
    layer: "content"
    notes: "Replace `registerHydrologyLayer` with `createStage({ id, steps })`"
```

Ecology stage:

```yaml
moves:
  - current: "packages/mapgen-core/src/base/pipeline/ecology/BiomesStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes.ts"
    layer: "content"
    notes: "Rewrite"
  - current: "packages/mapgen-core/src/base/pipeline/ecology/FeaturesStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features.ts"
    layer: "content"
    notes: "Rewrite"
  - current: "packages/mapgen-core/src/base/pipeline/ecology/steps.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/index.ts"
    layer: "content"
    notes: "Replace with explicit named re-exports (no `export *`)"
  - current: "packages/mapgen-core/src/base/pipeline/ecology/index.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/ecology/index.ts"
    layer: "content"
    notes: "Replace `registerEcologyLayer` with `createStage({ id, steps })`"
```

Placement stage:

```yaml
moves:
  - current: "packages/mapgen-core/src/base/pipeline/placement/placement-inputs.ts"
    target: "mods/mod-swooper-maps/src/domain/placement/placement-inputs.ts"
    layer: "content (domain)"
    notes: "Pure type guards/types reused by steps + tag validation"
  - current: "packages/mapgen-core/src/base/pipeline/placement/placement-outputs.ts"
    target: "mods/mod-swooper-maps/src/domain/placement/placement-outputs.ts"
    layer: "content (domain)"
    notes: "Pure type guards/types reused by steps + tag validation"
  - current: "packages/mapgen-core/src/base/pipeline/placement/DerivePlacementInputsStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derivePlacementInputs.ts"
    layer: "content"
    notes: "Rewrite"
  - current: "packages/mapgen-core/src/base/pipeline/placement/PlacementStep.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement.ts"
    layer: "content"
    notes: "Rewrite"
  - current: "packages/mapgen-core/src/base/pipeline/placement/steps.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/index.ts"
    layer: "content"
    notes: "Replace with explicit named re-exports (no `export *`)"
  - current: "packages/mapgen-core/src/base/pipeline/placement/index.ts"
    target: "mods/mod-swooper-maps/src/recipes/standard/stages/placement/index.ts"
    layer: "content"
    notes: "Replace `registerPlacementLayer` with `createStage({ id, steps })`"
```


#### 9.1.7 Package/build/tooling files

```yaml
moves:
  - current: "packages/mapgen-core/AGENTS.md"
    target: "packages/mapgen-core/AGENTS.md"
    layer: "meta"
    notes: "Instructions only"
  - current: "packages/mapgen-core/bunfig.toml"
    target: "packages/mapgen-core/bunfig.toml"
    layer: "meta"
    notes: "Test runner configuration (keep)"
  - current: "packages/mapgen-core/package.json"
    target: "packages/mapgen-core/package.json"
    layer: "build"
    notes: "Update exports: add `./engine` + `./authoring`; remove `./base`, `./domain`, `./config`, `./bootstrap`"
  - current: "packages/mapgen-core/tsup.config.ts"
    target: "packages/mapgen-core/tsup.config.ts"
    layer: "build"
    notes: "Update entry list: drop base/domain/config/bootstrap; add `src/engine/index.ts` + `src/authoring/index.ts`"
  - current: "packages/mapgen-core/tsconfig.json"
    target: "packages/mapgen-core/tsconfig.json"
    layer: "build"
    notes: "Keep; update references as needed for renamed modules"
  - current: "packages/mapgen-core/tsconfig.paths.json"
    target: "packages/mapgen-core/tsconfig.paths.json"
    layer: "build"
    notes: "Keep; path aliases remain valid (still `@mapgen/* → src/*`)"
  - current: "packages/mapgen-core/tsconfig.tsup.json"
    target: "packages/mapgen-core/tsconfig.tsup.json"
    layer: "build"
    notes: "Keep"
  - current: "packages/mapgen-core/scripts/check-schema-defaults.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "Script targets monolithic `MapGenConfigSchema`; replace later with step-schema-specific validation tooling (future)"
```


#### 9.1.8 Tests (move content tests out; keep engine tests)

Target: `packages/mapgen-core/test/**` should cover **engine + authoring SDK** only.
All standard content tests move to `mods/mod-swooper-maps` (or a dedicated content test package).

```yaml
moves:
  - current: "packages/mapgen-core/test/setup.ts"
    target: "packages/mapgen-core/test/setup.ts"
    layer: "test"
    notes: "Keep (shared bun setup)"
  - current: "packages/mapgen-core/test/smoke.test.ts"
    target: "packages/mapgen-core/test/smoke.test.ts"
    layer: "test"
    notes: "Keep; update imports away from base/bootstrap/config"
```


Bootstrap/config tests (delete with modules):

```yaml
moves:
  - current: "packages/mapgen-core/test/bootstrap/entry.test.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "Bootstrap removed"
  - current: "packages/mapgen-core/test/config/loader.test.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "Config module removed"
```


Engine tests (rename folder when pipeline → engine; update imports):

```yaml
moves:
  - current: "packages/mapgen-core/test/pipeline/execution-plan.test.ts"
    target: "packages/mapgen-core/test/engine/execution-plan.test.ts"
    layer: "test (engine)"
    notes: "Rewrite to stop depending on base tags/config; keep compile semantics coverage"
  - current: "packages/mapgen-core/test/pipeline/tag-registry.test.ts"
    target: "packages/mapgen-core/test/engine/tag-registry.test.ts"
    layer: "test (engine)"
    notes: "Rewrite to stop depending on base tags"
  - current: "packages/mapgen-core/test/pipeline/tracing.test.ts"
    target: "packages/mapgen-core/test/engine/tracing.test.ts"
    layer: "test (engine)"
    notes: "Keep; update import paths (`pipeline`→`engine`)"
  - current: "packages/mapgen-core/test/pipeline/placement-gating.test.ts"
    target: "packages/mapgen-core/test/engine/placement-gating.test.ts"
    layer: "test (engine)"
    notes: "Rewrite to remove base artifacts/tags; keep provides/requires behavior coverage"
  - current: "packages/mapgen-core/test/pipeline/hello-mod.smoke.test.ts"
    target: "packages/mapgen-core/test/engine/hello-mod.smoke.test.ts"
    layer: "test (engine)"
    notes: "Rewrite away from `PipelineModV1` (deleted) to use direct registry+recipe"
  - current: "packages/mapgen-core/test/pipeline/artifacts.test.ts"
    target: "packages/mapgen-core/test/engine/artifacts.test.ts"
    layer: "test (engine)"
    notes: "Split: keep engine gating assertions; move base artifact helper tests to mod package"
  - current: "packages/mapgen-core/test/pipeline/standard-recipe.test.ts"
    target: "mods/mod-swooper-maps/test/standard-recipe.test.ts"
    layer: "test (content)"
    notes: "Base recipe/spine is content; relocate and update to new recipe/stage structure"
  - current: "packages/mapgen-core/test/pipeline/standard-smoke.test.ts"
    target: "mods/mod-swooper-maps/test/standard-smoke.test.ts"
    layer: "test (content)"
    notes: "Content smoke should live with the mod package"
```


Orchestrator tests (runner; move or delete with legacy runner):

```yaml
moves:
  - current: "packages/mapgen-core/test/orchestrator/requestMapData.test.ts"
    target: "packages/mapgen-core/test/runner/requestMapData.test.ts"
    layer: "test (runner)"
    notes: "If runner is kept; otherwise move to future publishing SDK"
  - current: "packages/mapgen-core/test/orchestrator/generateMap.integration.test.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "Depends on task-graph runner + base mod + MapGenConfig; replaced by mod maps integration tests"
  - current: "packages/mapgen-core/test/orchestrator/task-graph.smoke.test.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "Depends on legacy runner"
  - current: "packages/mapgen-core/test/orchestrator/foundation.smoke.test.ts"
    target: "mods/mod-swooper-maps/test/foundation.smoke.test.ts"
    layer: "test (content)"
    notes: "Foundation behavior is content/domain; move alongside domain libs"
  - current: "packages/mapgen-core/test/orchestrator/story-parity.smoke.test.ts"
    target: "mods/mod-swooper-maps/test/story-parity.smoke.test.ts"
    layer: "test (content)"
    notes: "Narrative behavior is content/domain; move"
  - current: "packages/mapgen-core/test/orchestrator/paleo-ordering.test.ts"
    target: "mods/mod-swooper-maps/test/paleo-ordering.test.ts"
    layer: "test (content)"
    notes: "Narrative ordering is content-level and recipe-owned"
  - current: "packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "MapGenConfig wiring removed"
  - current: "packages/mapgen-core/test/orchestrator/worldmodel-config-wiring.test.ts"
    target: "(delete)"
    layer: "legacy"
    notes: "MapGenConfig wiring removed"
```


Core/domain tests (move with domain libraries):

```yaml
moves:
  - current: "packages/mapgen-core/test/core/foundation-context.test.ts"
    target: "mods/mod-swooper-maps/test/foundation-context.test.ts"
    layer: "test (content)"
    notes: "Foundation artifact types/validators move to mod domain libs"
  - current: "packages/mapgen-core/test/core/utils.test.ts"
    target: "packages/mapgen-core/test/engine/context-utils.test.ts"
    layer: "test (engine)"
    notes: "Split: keep engine context utilities coverage; move content-specific bits"
  - current: "packages/mapgen-core/test/dev/crust-map.test.ts"
    target: "mods/mod-swooper-maps/test/crust-map.test.ts"
    layer: "test (content)"
    notes: "Content-specific diagnostics smoke"
  - current: "packages/mapgen-core/test/foundation/plate-seed.test.ts"
    target: "mods/mod-swooper-maps/test/foundation/plate-seed.test.ts"
    layer: "test (content)"
    notes: "Foundation domain"
  - current: "packages/mapgen-core/test/foundation/plates.test.ts"
    target: "mods/mod-swooper-maps/test/foundation/plates.test.ts"
    layer: "test (content)"
    notes: "Foundation domain"
  - current: "packages/mapgen-core/test/foundation/voronoi.test.ts"
    target: "mods/mod-swooper-maps/test/foundation/voronoi.test.ts"
    layer: "test (content)"
    notes: "Foundation domain"
  - current: "packages/mapgen-core/test/story/corridors.test.ts"
    target: "mods/mod-swooper-maps/test/story/corridors.test.ts"
    layer: "test (content)"
    notes: "Narrative domain"
  - current: "packages/mapgen-core/test/story/orogeny.test.ts"
    target: "mods/mod-swooper-maps/test/story/orogeny.test.ts"
    layer: "test (content)"
    notes: "Narrative domain"
  - current: "packages/mapgen-core/test/story/overlays.test.ts"
    target: "mods/mod-swooper-maps/test/story/overlays.test.ts"
    layer: "test (content)"
    notes: "Narrative domain"
  - current: "packages/mapgen-core/test/story/paleo.test.ts"
    target: "mods/mod-swooper-maps/test/story/paleo.test.ts"
    layer: "test (content)"
    notes: "Narrative domain"
  - current: "packages/mapgen-core/test/story/tags.test.ts"
    target: "mods/mod-swooper-maps/test/story/tags.test.ts"
    layer: "test (content)"
    notes: "Narrative domain"
  - current: "packages/mapgen-core/test/layers/callsite-fixes.test.ts"
    target: "mods/mod-swooper-maps/test/layers/callsite-fixes.test.ts"
    layer: "test (content)"
    notes: "Exercises domain APIs (climate/biomes); move with domain libs"
```


### 9.2 `mods/mod-swooper-maps/**` (content package: domain libs + recipes + maps)

Target intent:
- This package becomes the canonical “standard mod” content package.
- It owns domain libraries (`src/domain/**`) and recipe mini-packages (`src/recipes/**`).
- It also owns map entrypoints (`src/maps/**`) that select a recipe and provide config instances.

```yaml
moves:
  - current: "mods/mod-swooper-maps/AGENTS.md"
    target: "mods/mod-swooper-maps/AGENTS.md"
    layer: "meta"
    notes: "Instructions only"
  - current: "mods/mod-swooper-maps/package.json"
    target: "mods/mod-swooper-maps/package.json"
    layer: "build"
    notes: "Update usage: maps import local recipes; recipe code imports `@swooper/mapgen-core/authoring` only"
  - current: "mods/mod-swooper-maps/tsconfig.json"
    target: "mods/mod-swooper-maps/tsconfig.json"
    layer: "build"
    notes: "Keep; update path aliases if added for domain imports"
  - current: "mods/mod-swooper-maps/tsconfig.tsup.json"
    target: "mods/mod-swooper-maps/tsconfig.tsup.json"
    layer: "build"
    notes: "Keep"
  - current: "mods/mod-swooper-maps/tsup.config.ts"
    target: "mods/mod-swooper-maps/tsup.config.ts"
    layer: "build"
    notes: "Update entries to `src/maps/*.ts` (and ensure recipe/domain modules are bundled via imports)"
  - current: "mods/mod-swooper-maps/src/AGENTS.md"
    target: "mods/mod-swooper-maps/src/AGENTS.md"
    layer: "meta"
    notes: "Instructions only"
```


Mod metadata/assets (unchanged; Civ7 mod packaging):

```yaml
moves:
  - current: "mods/mod-swooper-maps/mod/swooper-maps.modinfo"
    target: "mods/mod-swooper-maps/mod/swooper-maps.modinfo"
    layer: "deploy"
    notes: "Keep"
  - current: "mods/mod-swooper-maps/mod/config/config.xml"
    target: "mods/mod-swooper-maps/mod/config/config.xml"
    layer: "deploy"
    notes: "Keep (may be extended if we surface recipe selection/config via XML later)"
  - current: "mods/mod-swooper-maps/mod/text/en_us/MapText.xml"
    target: "mods/mod-swooper-maps/mod/text/en_us/MapText.xml"
    layer: "deploy"
    notes: "Keep"
  - current: "mods/mod-swooper-maps/mod/text/en_us/ModuleText.xml"
    target: "mods/mod-swooper-maps/mod/text/en_us/ModuleText.xml"
    layer: "deploy"
    notes: "Keep"
```


Map entrypoints (rewrite to the new model; config instances move here):

```yaml
moves:
  - current: "mods/mod-swooper-maps/src/swooper-earthlike.ts"
    target: "mods/mod-swooper-maps/src/maps/swooper-earthlike.ts"
    layer: "content (maps)"
    notes: "Rewrite: import `standard` recipe module, provide config instance, call `recipe.run(...)`"
  - current: "mods/mod-swooper-maps/src/swooper-desert-mountains.ts"
    target: "mods/mod-swooper-maps/src/maps/swooper-desert-mountains.ts"
    layer: "content (maps)"
    notes: "Rewrite: same pattern with different config instance"
  - current: "mods/mod-swooper-maps/src/gate-a-continents.ts"
    target: "mods/mod-swooper-maps/src/maps/gate-a-continents.ts"
    layer: "content (maps)"
    notes: "Rewrite: same pattern (gate scenario)"
```


New required content files (added; not currently present):
- `mods/mod-swooper-maps/src/mod.ts` (exports recipes; no registry plumbing exposed)
- `mods/mod-swooper-maps/src/domain/**` (domain libraries moved from `packages/mapgen-core/src/domain/**` + `packages/mapgen-core/src/base/foundation/**`)
- `mods/mod-swooper-maps/src/recipes/standard/**` (standard recipe mini-package; steps nested under stages)

---

## 10) Open issues / pre-work (structural, not “design debates”)

1) **Engine context split is mandatory**  
`packages/mapgen-core/src/core/types.ts` currently mixes engine context, monolithic config (`MapGenConfig`), and base/standard content artifacts. This must be split into:
- `packages/mapgen-core/src/engine/context.ts` (engine-owned context + writers; no `MapGenConfig`), and
- mod-owned foundation/story artifact types + validators under `mods/mod-swooper-maps/src/domain/**`.

2) **Civ7 map runner (decision: mod-owned runtime glue)**  
For M6, keep a minimal Civ7 runner in the content package under `mods/mod-swooper-maps/src/maps/_runtime/**`:
- resolves map init params / map info,
- constructs `RunSettings`,
- builds the engine context (engine-owned; no monolithic `MapGenConfig`),
- calls `recipe.run(...)` (authoring SDK wrapper over engine compile/execute).

A future “publishing SDK” extraction is explicitly deferred; extract only if/when multiple mods need a shared Civ7 runner surface.
