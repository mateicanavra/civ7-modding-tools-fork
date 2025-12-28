# SPIKE: Recipe-Local Mod Authoring (Domain Libraries + Recipe Mini-Packages)

Primary reference:
- Canonical target: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`

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
  DependencyTagDefinition,
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
// - Tag definitions are typically inferred from tag ids (artifact:/field:/effect:), but can be overridden.
export type Step<TContext = ExtendedMapContext, TConfig = unknown> = Readonly<{
  // Local id within the stage. Final runtime id is derived as:
  //   `${namespace?}.${recipeId}.${stageId}.${stepId}`
  id: string;
  phase: GenerationPhase;
  requires: readonly DependencyTag[];
  provides: readonly DependencyTag[];
  schema?: TSchema;
  run: (context: TContext, config: TConfig) => void | Promise<void>;

  // Optional: allow multiple occurrences of the same step behavior by pinning a stable node id.
  // If omitted, instanceId defaults to the computed full step id.
  instanceId?: string;

  // Advanced: explicit tag definitions (owner metadata, custom satisfiers, demos).
  // When omitted, tag kind is inferred from id prefix.
  tagDefinitions?: readonly DependencyTagDefinition[];
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
  tagDefinitions?: readonly DependencyTagDefinition[];
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
        tagDefinitions: authored.tagDefinitions,
      });
    }
  }

  return out;
}

function collectTagDefinitions(
  occurrences: readonly StepOccurrence<unknown>[]
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

  // Explicit tag definitions (advanced) override inferred ones.
  for (const occ of occurrences) {
    for (const def of occ.tagDefinitions ?? []) {
      defs.set(def.id, def);
    }
  }

  return Array.from(defs.values());
}

function buildRegistry<TContext extends ExtendedMapContext>(
  occurrences: readonly StepOccurrence<TContext>[]
) {
  const tags = new TagRegistry();
  tags.registerTags(collectTagDefinitions(occurrences));

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
  stages: readonly Stage<TContext>[];
}): RecipeModule<TContext> {
  const occurrences = finalizeOccurrences({
    namespace: input.namespace,
    recipeId: input.id,
    stages: input.stages,
  });
  const registry = buildRegistry(occurrences);
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

### 9.1 `packages/mapgen-core/**` (engine + authoring SDK)

#### 9.1.1 Domain logic (grouped; reviewed but not enumerated)

- `packages/mapgen-core/src/domain/**` → move to `mods/mod-swooper-maps/src/domain/**` (mod-owned domain libraries).
  - Required follow-up: remove any imports of `@mapgen/base/*` / base tags from domain modules; domain libraries must not depend on a privileged “base mod”.

#### 9.1.2 Engine runtime (pipeline → engine) and neutral utilities

Target intent:
- `packages/mapgen-core/src/engine/**` is the **runtime-only** SDK surface (current `pipeline/**` renamed).
- `packages/mapgen-core/src/lib/**`, `packages/mapgen-core/src/trace/**`, and `packages/mapgen-core/src/polyfills/**` remain engine-owned neutral utilities.

| Current file | Target location / disposition | Layer | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/AGENTS.md` | `packages/mapgen-core/src/AGENTS.md` | meta | Instructions only |
| `packages/mapgen-core/src/index.ts` | `packages/mapgen-core/src/index.ts` | meta | Becomes a thin compatibility re-export (prefer `@swooper/mapgen-core/engine` + `@swooper/mapgen-core/authoring`) |
| `packages/mapgen-core/src/polyfills/text-encoder.ts` | `packages/mapgen-core/src/polyfills/text-encoder.ts` | engine | Required runtime polyfill for Civ7 V8 |
| `packages/mapgen-core/src/shims/typebox-format.ts` | `packages/mapgen-core/src/shims/typebox-format.ts` | engine | Build-time shim used by bundlers; keep as-is |
| `packages/mapgen-core/src/trace/index.ts` | `packages/mapgen-core/src/trace/index.ts` | engine | Trace primitives + hashing (may be split later; not required for this refactor) |

Engine runtime (rename `pipeline/` → `engine/`):

| Current file | Target location / disposition | Layer | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/pipeline/PipelineExecutor.ts` | `packages/mapgen-core/src/engine/PipelineExecutor.ts` | engine | Move pipeline → engine (runtime SDK) |
| `packages/mapgen-core/src/pipeline/StepRegistry.ts` | `packages/mapgen-core/src/engine/StepRegistry.ts` | engine | Move pipeline → engine (runtime SDK) |
| `packages/mapgen-core/src/pipeline/errors.ts` | `packages/mapgen-core/src/engine/errors.ts` | engine | Move pipeline → engine (runtime SDK) |
| `packages/mapgen-core/src/pipeline/execution-plan.ts` | `packages/mapgen-core/src/engine/execution-plan.ts` | engine | Move pipeline → engine (runtime SDK) |
| `packages/mapgen-core/src/pipeline/index.ts` | `packages/mapgen-core/src/engine/index.ts` | engine | Move pipeline → engine (runtime SDK) |
| `packages/mapgen-core/src/pipeline/mod.ts` | `(delete)` | legacy | Remove `PipelineModV1` (registry-forward mod contract); replaced by recipe modules |
| `packages/mapgen-core/src/pipeline/observability.ts` | `packages/mapgen-core/src/engine/observability.ts` | engine | Move pipeline → engine (runtime SDK) |
| `packages/mapgen-core/src/pipeline/step-config.ts` | `packages/mapgen-core/src/engine/step-config.ts` | engine | Move pipeline → engine (runtime SDK) |
| `packages/mapgen-core/src/pipeline/tags.ts` | `packages/mapgen-core/src/engine/tags.ts` | engine | Move pipeline → engine (runtime SDK) |
| `packages/mapgen-core/src/pipeline/types.ts` | `packages/mapgen-core/src/engine/types.ts` | engine | Move pipeline → engine (runtime SDK) |

Neutral utilities (`lib/**`) (unchanged paths; engine-owned):

| Current file | Target location / disposition | Layer | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/lib/collections/freeze-clone.ts` | `packages/mapgen-core/src/lib/collections/freeze-clone.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/collections/index.ts` | `packages/mapgen-core/src/lib/collections/index.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/collections/record.ts` | `packages/mapgen-core/src/lib/collections/record.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/grid/bounds.ts` | `packages/mapgen-core/src/lib/grid/bounds.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/grid/distance/bfs.ts` | `packages/mapgen-core/src/lib/grid/distance/bfs.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/grid/index.ts` | `packages/mapgen-core/src/lib/grid/index.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/grid/indexing.ts` | `packages/mapgen-core/src/lib/grid/indexing.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/grid/neighborhood/hex-oddq.ts` | `packages/mapgen-core/src/lib/grid/neighborhood/hex-oddq.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/grid/neighborhood/square-3x3.ts` | `packages/mapgen-core/src/lib/grid/neighborhood/square-3x3.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/grid/wrap.ts` | `packages/mapgen-core/src/lib/grid/wrap.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/heightfield/base.ts` | `packages/mapgen-core/src/lib/heightfield/base.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/heightfield/sea-level.ts` | `packages/mapgen-core/src/lib/heightfield/sea-level.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/math/clamp.ts` | `packages/mapgen-core/src/lib/math/clamp.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/math/index.ts` | `packages/mapgen-core/src/lib/math/index.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/math/lerp.ts` | `packages/mapgen-core/src/lib/math/lerp.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/noise/fractal.ts` | `packages/mapgen-core/src/lib/noise/fractal.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/noise/index.ts` | `packages/mapgen-core/src/lib/noise/index.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/noise/perlin.ts` | `packages/mapgen-core/src/lib/noise/perlin.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/plates/crust.ts` | `packages/mapgen-core/src/lib/plates/crust.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/plates/topology.ts` | `packages/mapgen-core/src/lib/plates/topology.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/rng/index.ts` | `packages/mapgen-core/src/lib/rng/index.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/rng/pick.ts` | `packages/mapgen-core/src/lib/rng/pick.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/rng/unit.ts` | `packages/mapgen-core/src/lib/rng/unit.ts` | engine | Neutral utility (unchanged) |
| `packages/mapgen-core/src/lib/rng/weighted-choice.ts` | `packages/mapgen-core/src/lib/rng/weighted-choice.ts` | engine | Neutral utility (unchanged) |

Dev-only diagnostics (`dev/**`) (unchanged paths; not part of authoring surface):

| Current file | Target location / disposition | Layer | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/dev/ascii.ts` | `packages/mapgen-core/src/dev/ascii.ts` | engine (devtools) | Diagnostics-only helpers (keep; not part of authoring surface) |
| `packages/mapgen-core/src/dev/diagnostics-parity.ts` | `packages/mapgen-core/src/dev/diagnostics-parity.ts` | engine (devtools) | Diagnostics-only helpers (keep; not part of authoring surface) |
| `packages/mapgen-core/src/dev/flags.ts` | `packages/mapgen-core/src/dev/flags.ts` | engine (devtools) | Diagnostics-only helpers (keep; not part of authoring surface) |
| `packages/mapgen-core/src/dev/histograms.ts` | `packages/mapgen-core/src/dev/histograms.ts` | engine (devtools) | Diagnostics-only helpers (keep; not part of authoring surface) |
| `packages/mapgen-core/src/dev/index.ts` | `packages/mapgen-core/src/dev/index.ts` | engine (devtools) | Diagnostics-only helpers (keep; not part of authoring surface) |
| `packages/mapgen-core/src/dev/introspection.ts` | `packages/mapgen-core/src/dev/introspection.ts` | engine (devtools) | Diagnostics-only helpers (keep; not part of authoring surface) |
| `packages/mapgen-core/src/dev/logging.ts` | `packages/mapgen-core/src/dev/logging.ts` | engine (devtools) | Diagnostics-only helpers (keep; not part of authoring surface) |
| `packages/mapgen-core/src/dev/summaries.ts` | `packages/mapgen-core/src/dev/summaries.ts` | engine (devtools) | Diagnostics-only helpers (keep; not part of authoring surface) |
| `packages/mapgen-core/src/dev/timing.ts` | `packages/mapgen-core/src/dev/timing.ts` | engine (devtools) | Diagnostics-only helpers (keep; not part of authoring surface) |

#### 9.1.3 Engine context + Civ7-facing helpers (current `core/**`)

`packages/mapgen-core/src/core/**` currently mixes:
- engine-owned context/buffer/writer helpers, and
- content-owned artifacts/tags/types (especially foundation artifacts).

Target: split it cleanly.

| Current file | Target location / disposition | Layer | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/core/index.ts` | `(delete)` | legacy | Remove the “grab-bag” core barrel; replace with explicit exports from `engine/**` and `lib/**` |
| `packages/mapgen-core/src/core/terrain-constants.ts` | `packages/mapgen-core/src/engine/terrain-constants.ts` | engine | Civ7 adapter → terrain/biome/feature indices; keep engine-owned |
| `packages/mapgen-core/src/core/plot-tags.ts` | `packages/mapgen-core/src/engine/plot-tags.ts` | engine | Civ7 adapter plot tagging helpers; keep engine-owned |
| `packages/mapgen-core/src/core/types.ts` | `packages/mapgen-core/src/engine/context.ts` | engine + content split | Split: engine context + writers stay in `engine/context.ts`; foundation/story artifact types + validators move to mod domain libs (see base/content mapping) |
| `packages/mapgen-core/src/core/assertions.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/assertions.ts` | content | Foundation artifact assertions are base/standard content, not engine |

#### 9.1.4 Runner/orchestration helpers (current `orchestrator/**`)

These are not part of the engine runtime contract (SPEC entry is `RunRequest`), and they currently bake in legacy config + base-mod assumptions.

| Current file | Target location / disposition | Layer | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/orchestrator/helpers.ts` | `packages/mapgen-core/src/runner/helpers.ts` | runner (future) | Extract from engine/authoring; used by map entrypoints |
| `packages/mapgen-core/src/orchestrator/map-init.ts` | `packages/mapgen-core/src/runner/map-init.ts` | runner (future) | Map init resolution/apply; belongs in publishing/runner SDK, not engine |
| `packages/mapgen-core/src/orchestrator/types.ts` | `packages/mapgen-core/src/runner/types.ts` | runner (future) | Runner-only types (adapter creation, mapSizeDefaults, etc.) |
| `packages/mapgen-core/src/orchestrator/task-graph.ts` | `(delete)` | legacy | Legacy “run base mod with MapGenConfig/overrides”; replaced by map entrypoints calling `recipe.run(ctx, settings, config)` |

#### 9.1.5 Legacy config/bootstrap modules (remove; replace with recipe-local schemas + map-owned config instances)

SPEC 1.2 is explicit: boundary input is `RunRequest = { recipe, settings }` (not monolithic `MapGenConfig`).

| Current file | Target location / disposition | Layer | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/bootstrap/AGENTS.md` | `(delete)` | legacy | Bootstrap module removed |
| `packages/mapgen-core/src/bootstrap/entry.ts` | `(delete)` | legacy | Remove overrides/bootstrap; maps instantiate config directly and pass to recipe |
| `packages/mapgen-core/src/bootstrap/types.ts` | `(delete)` | legacy | Replace with recipe-local step schemas/types |
| `packages/mapgen-core/src/config/AGENTS.md` | `(delete)` | legacy | Config module removed from core package |
| `packages/mapgen-core/src/config/index.ts` | `(delete)` | legacy | Remove `MapGenConfig` surface; step schemas/types move to mod domain libs |
| `packages/mapgen-core/src/config/loader.ts` | `(delete)` | legacy | No global config parsing; per-step validation happens during compile via step schemas |
| `packages/mapgen-core/src/config/schema.ts` | `mods/mod-swooper-maps/src/domain/config/schema/index.ts` | content (domain) | Keep schema fragments as mod-owned library (imported by step schemas) |
| `packages/mapgen-core/src/config/schema/common.ts` | `mods/mod-swooper-maps/src/domain/config/schema/common.ts` | content (domain) | Move as-is |
| `packages/mapgen-core/src/config/schema/ecology.ts` | `mods/mod-swooper-maps/src/domain/config/schema/ecology.ts` | content (domain) | Move as-is |
| `packages/mapgen-core/src/config/schema/foundation.ts` | `mods/mod-swooper-maps/src/domain/config/schema/foundation.ts` | content (domain) | Move as-is |
| `packages/mapgen-core/src/config/schema/hydrology.ts` | `mods/mod-swooper-maps/src/domain/config/schema/hydrology.ts` | content (domain) | Move as-is |
| `packages/mapgen-core/src/config/schema/landmass.ts` | `mods/mod-swooper-maps/src/domain/config/schema/landmass.ts` | content (domain) | Move as-is |
| `packages/mapgen-core/src/config/schema/morphology.ts` | `mods/mod-swooper-maps/src/domain/config/schema/morphology.ts` | content (domain) | Move as-is |
| `packages/mapgen-core/src/config/schema/narrative.ts` | `mods/mod-swooper-maps/src/domain/config/schema/narrative.ts` | content (domain) | Move as-is |
| `packages/mapgen-core/src/config/schema/placement.ts` | `mods/mod-swooper-maps/src/domain/config/schema/placement.ts` | content (domain) | Move as-is |

#### 9.1.6 Base/standard content (current `base/**`) → `mods/mod-swooper-maps` (content package)

Target intent:
- Delete the privileged `@swooper/mapgen-core/base` export.
- Move the standard pipeline content into `mods/mod-swooper-maps/src/recipes/standard/**`.
- Move reusable *pure* algorithms into `mods/mod-swooper-maps/src/domain/**`.
- Remove legacy `MapGenConfig` translation (`buildRunRequest`) and all override plumbing.

| Current file | Target location / disposition | Layer | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/base/index.ts` | `(delete)` | legacy | Remove `@swooper/mapgen-core/base` surface; replaced by a real content package (`mods/mod-swooper-maps`) |
| `packages/mapgen-core/src/base/mod.ts` | `(delete)` | legacy | Remove `baseMod` (registry-forward mod contract); recipes are exported directly from the mod content package |
| `packages/mapgen-core/src/base/library.ts` | `(delete)` | legacy | Remove “register layer” indirection; recipe owns its steps directly |
| `packages/mapgen-core/src/base/run-request.ts` | `(delete)` | legacy | Remove `MapGenConfig → per-step config` translation; maps supply config instances directly |
| `packages/mapgen-core/src/base/phases.ts` | `(delete)` | legacy | Phase is now authored on each step definition (supports narrative cross-cutting) |
| `packages/mapgen-core/src/base/stage-spine.ts` | `(delete)` | legacy | Replace with explicit `requires`/`provides` on steps (enforced by compiler/executor) |
| `packages/mapgen-core/src/base/tags.ts` | `mods/mod-swooper-maps/src/recipes/standard/tags.ts` | content | Standard recipe’s tag catalog/definitions (artifact/effect/field); consumed when building the recipe registry |
| `packages/mapgen-core/src/base/recipes/default.ts` | `mods/mod-swooper-maps/src/recipes/standard/recipe.ts` | content | Becomes the “standard” structural recipe module (stages + steps) |

Foundation domain logic (pure; move into mod domain libraries):

| Current file | Target location / disposition | Layer | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/base/foundation/constants.ts` | `mods/mod-swooper-maps/src/domain/foundation/constants.ts` | content (domain) | Move as-is |
| `packages/mapgen-core/src/base/foundation/plate-seed.ts` | `mods/mod-swooper-maps/src/domain/foundation/plate-seed.ts` | content (domain) | Move as-is |
| `packages/mapgen-core/src/base/foundation/plates.ts` | `mods/mod-swooper-maps/src/domain/foundation/plates.ts` | content (domain) | Move as-is |
| `packages/mapgen-core/src/base/foundation/types.ts` | `mods/mod-swooper-maps/src/domain/foundation/types.ts` | content (domain) | Move as-is |
| `packages/mapgen-core/src/base/pipeline/foundation/producer.ts` | `mods/mod-swooper-maps/src/domain/foundation/producer.ts` | content (domain) | Pure foundation algorithm runner (currently mislocated under base pipeline) |

Recipe-local helpers (not pure; keep inside the recipe mini-package):

| Current file | Target location / disposition | Layer | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/base/orchestrator/foundation.ts` | `mods/mod-swooper-maps/src/maps/_runtime/foundation-diagnostics.ts` | content (maps) | Optional diagnostics wrapper used by map entrypoints (not part of recipe structure) |
| `packages/mapgen-core/src/base/pipeline/artifacts.ts` | `mods/mod-swooper-maps/src/recipes/standard/artifacts.ts` | content | Shared artifact publish/get helpers (mutates context; not a domain lib) |

Standard recipe stages and steps (step factory files → recipe-local step files; index/steps wiring simplified):

| Current file | Target location / disposition | Layer | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/src/base/pipeline/foundation/FoundationStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/foundation.ts` | content | Rewrite from `createFoundationStep(...)` factory to default-export `createStep({...})` |
| `packages/mapgen-core/src/base/pipeline/foundation/steps.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/steps/index.ts` | content | Replace with explicit named re-exports (no `export *`) |
| `packages/mapgen-core/src/base/pipeline/foundation/index.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/index.ts` | content | Replace `registerFoundationLayer` with a `createStage({ id, steps })` module |

| `packages/mapgen-core/src/base/pipeline/morphology/LandmassStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/morphology/steps/landmassPlates.ts` | content | Rewrite; step id remains `landmassPlates` |
| `packages/mapgen-core/src/base/pipeline/morphology/CoastlinesStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/morphology/steps/coastlines.ts` | content | Rewrite |
| `packages/mapgen-core/src/base/pipeline/morphology/RuggedCoastsStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/morphology/steps/ruggedCoasts.ts` | content | Rewrite |
| `packages/mapgen-core/src/base/pipeline/morphology/IslandsStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/morphology/steps/islands.ts` | content | Rewrite |
| `packages/mapgen-core/src/base/pipeline/morphology/MountainsStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/morphology/steps/mountains.ts` | content | Rewrite |
| `packages/mapgen-core/src/base/pipeline/morphology/VolcanoesStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/morphology/steps/volcanoes.ts` | content | Rewrite |
| `packages/mapgen-core/src/base/pipeline/morphology/steps.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/morphology/steps/index.ts` | content | Replace with explicit named re-exports (no `export *`) |
| `packages/mapgen-core/src/base/pipeline/morphology/index.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/morphology/index.ts` | content | Replace `registerMorphologyLayer` with `createStage({ id, steps })` |

| `packages/mapgen-core/src/base/pipeline/narrative/StorySeedStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/narrative/steps/storySeed.ts` | content | Rewrite |
| `packages/mapgen-core/src/base/pipeline/narrative/StoryHotspotsStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/narrative/steps/storyHotspots.ts` | content | Rewrite |
| `packages/mapgen-core/src/base/pipeline/narrative/StoryRiftsStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/narrative/steps/storyRifts.ts` | content | Rewrite |
| `packages/mapgen-core/src/base/pipeline/narrative/StoryOrogenyStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/narrative/steps/storyOrogeny.ts` | content | Rewrite |
| `packages/mapgen-core/src/base/pipeline/narrative/StorySwatchesStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/narrative/steps/storySwatches.ts` | content | Rewrite (step phase is `hydrology`, but stage grouping remains `narrative`) |
| `packages/mapgen-core/src/base/pipeline/narrative/StoryCorridorsStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/narrative/steps/storyCorridorsPre.ts` | content | Split: file becomes two steps (`storyCorridorsPre`, `storyCorridorsPost`) |
| `packages/mapgen-core/src/base/pipeline/narrative/StoryCorridorsStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/narrative/steps/storyCorridorsPost.ts` | content | Split: file becomes two steps (`storyCorridorsPre`, `storyCorridorsPost`) |
| `packages/mapgen-core/src/base/pipeline/narrative/index.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/narrative/index.ts` | content | Replace `registerNarrativeLayer` with `createStage({ id, steps })`; add `steps/index.ts` barrel (new) |

| `packages/mapgen-core/src/base/pipeline/hydrology/LakesStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology/steps/lakes.ts` | content | Rewrite |
| `packages/mapgen-core/src/base/pipeline/hydrology/ClimateBaselineStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology/steps/climateBaseline.ts` | content | Rewrite |
| `packages/mapgen-core/src/base/pipeline/hydrology/RiversStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology/steps/rivers.ts` | content | Rewrite |
| `packages/mapgen-core/src/base/pipeline/hydrology/ClimateRefineStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology/steps/climateRefine.ts` | content | Rewrite |
| `packages/mapgen-core/src/base/pipeline/hydrology/steps.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology/steps/index.ts` | content | Replace with explicit named re-exports (no `export *`) |
| `packages/mapgen-core/src/base/pipeline/hydrology/index.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology/index.ts` | content | Replace `registerHydrologyLayer` with `createStage({ id, steps })` |

| `packages/mapgen-core/src/base/pipeline/ecology/BiomesStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes.ts` | content | Rewrite |
| `packages/mapgen-core/src/base/pipeline/ecology/FeaturesStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features.ts` | content | Rewrite |
| `packages/mapgen-core/src/base/pipeline/ecology/steps.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/index.ts` | content | Replace with explicit named re-exports (no `export *`) |
| `packages/mapgen-core/src/base/pipeline/ecology/index.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/index.ts` | content | Replace `registerEcologyLayer` with `createStage({ id, steps })` |

| `packages/mapgen-core/src/base/pipeline/placement/placement-inputs.ts` | `mods/mod-swooper-maps/src/domain/placement/placement-inputs.ts` | content (domain) | Pure type guards/types reused by steps + tag validation |
| `packages/mapgen-core/src/base/pipeline/placement/placement-outputs.ts` | `mods/mod-swooper-maps/src/domain/placement/placement-outputs.ts` | content (domain) | Pure type guards/types reused by steps + tag validation |
| `packages/mapgen-core/src/base/pipeline/placement/DerivePlacementInputsStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/derivePlacementInputs.ts` | content | Rewrite |
| `packages/mapgen-core/src/base/pipeline/placement/PlacementStep.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement.ts` | content | Rewrite |
| `packages/mapgen-core/src/base/pipeline/placement/steps.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/index.ts` | content | Replace with explicit named re-exports (no `export *`) |
| `packages/mapgen-core/src/base/pipeline/placement/index.ts` | `mods/mod-swooper-maps/src/recipes/standard/stages/placement/index.ts` | content | Replace `registerPlacementLayer` with `createStage({ id, steps })` |

#### 9.1.7 Package/build/tooling files

| Current file | Target location / disposition | Layer | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/AGENTS.md` | `packages/mapgen-core/AGENTS.md` | meta | Instructions only |
| `packages/mapgen-core/bunfig.toml` | `packages/mapgen-core/bunfig.toml` | meta | Test runner configuration (keep) |
| `packages/mapgen-core/package.json` | `packages/mapgen-core/package.json` | build | Update exports: add `./engine` + `./authoring`; remove `./base`, `./domain`, `./config`, `./bootstrap` |
| `packages/mapgen-core/tsup.config.ts` | `packages/mapgen-core/tsup.config.ts` | build | Update entry list: drop base/domain/config/bootstrap; add `src/engine/index.ts` + `src/authoring/index.ts` |
| `packages/mapgen-core/tsconfig.json` | `packages/mapgen-core/tsconfig.json` | build | Keep; update references as needed for renamed modules |
| `packages/mapgen-core/tsconfig.paths.json` | `packages/mapgen-core/tsconfig.paths.json` | build | Keep; path aliases remain valid (still `@mapgen/* → src/*`) |
| `packages/mapgen-core/tsconfig.tsup.json` | `packages/mapgen-core/tsconfig.tsup.json` | build | Keep |
| `packages/mapgen-core/scripts/check-schema-defaults.ts` | `(delete)` | legacy | Script targets monolithic `MapGenConfigSchema`; replace later with step-schema-specific validation tooling (future) |

#### 9.1.8 Tests (move content tests out; keep engine tests)

Target: `packages/mapgen-core/test/**` should cover **engine + authoring SDK** only.
All standard content tests move to `mods/mod-swooper-maps` (or a dedicated content test package).

| Current file | Target location / disposition | Layer | Notes |
| --- | --- | --- | --- |
| `packages/mapgen-core/test/setup.ts` | `packages/mapgen-core/test/setup.ts` | test | Keep (shared bun setup) |
| `packages/mapgen-core/test/smoke.test.ts` | `packages/mapgen-core/test/smoke.test.ts` | test | Keep; update imports away from base/bootstrap/config |

Bootstrap/config tests (delete with modules):
| `packages/mapgen-core/test/bootstrap/entry.test.ts` | `(delete)` | legacy | Bootstrap removed |
| `packages/mapgen-core/test/config/loader.test.ts` | `(delete)` | legacy | Config module removed |

Engine tests (rename folder when pipeline → engine; update imports):
| `packages/mapgen-core/test/pipeline/execution-plan.test.ts` | `packages/mapgen-core/test/engine/execution-plan.test.ts` | test (engine) | Rewrite to stop depending on base tags/config; keep compile semantics coverage |
| `packages/mapgen-core/test/pipeline/tag-registry.test.ts` | `packages/mapgen-core/test/engine/tag-registry.test.ts` | test (engine) | Rewrite to stop depending on base tags |
| `packages/mapgen-core/test/pipeline/tracing.test.ts` | `packages/mapgen-core/test/engine/tracing.test.ts` | test (engine) | Keep; update import paths (`pipeline`→`engine`) |
| `packages/mapgen-core/test/pipeline/placement-gating.test.ts` | `packages/mapgen-core/test/engine/placement-gating.test.ts` | test (engine) | Rewrite to remove base artifacts/tags; keep provides/requires behavior coverage |
| `packages/mapgen-core/test/pipeline/hello-mod.smoke.test.ts` | `packages/mapgen-core/test/engine/hello-mod.smoke.test.ts` | test (engine) | Rewrite away from `PipelineModV1` (deleted) to use direct registry+recipe |
| `packages/mapgen-core/test/pipeline/artifacts.test.ts` | `packages/mapgen-core/test/engine/artifacts.test.ts` | test (engine) | Split: keep engine gating assertions; move base artifact helper tests to mod package |
| `packages/mapgen-core/test/pipeline/standard-recipe.test.ts` | `mods/mod-swooper-maps/test/standard-recipe.test.ts` | test (content) | Base recipe/spine is content; relocate and update to new recipe/stage structure |
| `packages/mapgen-core/test/pipeline/standard-smoke.test.ts` | `mods/mod-swooper-maps/test/standard-smoke.test.ts` | test (content) | Content smoke should live with the mod package |

Orchestrator tests (runner; move or delete with legacy runner):
| `packages/mapgen-core/test/orchestrator/requestMapData.test.ts` | `packages/mapgen-core/test/runner/requestMapData.test.ts` | test (runner) | If runner is kept; otherwise move to future publishing SDK |
| `packages/mapgen-core/test/orchestrator/generateMap.integration.test.ts` | `(delete)` | legacy | Depends on task-graph runner + base mod + MapGenConfig; replaced by mod maps integration tests |
| `packages/mapgen-core/test/orchestrator/task-graph.smoke.test.ts` | `(delete)` | legacy | Depends on legacy runner |
| `packages/mapgen-core/test/orchestrator/foundation.smoke.test.ts` | `mods/mod-swooper-maps/test/foundation.smoke.test.ts` | test (content) | Foundation behavior is content/domain; move alongside domain libs |
| `packages/mapgen-core/test/orchestrator/story-parity.smoke.test.ts` | `mods/mod-swooper-maps/test/story-parity.smoke.test.ts` | test (content) | Narrative behavior is content/domain; move |
| `packages/mapgen-core/test/orchestrator/paleo-ordering.test.ts` | `mods/mod-swooper-maps/test/paleo-ordering.test.ts` | test (content) | Narrative ordering is content-level and recipe-owned |
| `packages/mapgen-core/test/orchestrator/placement-config-wiring.test.ts` | `(delete)` | legacy | MapGenConfig wiring removed |
| `packages/mapgen-core/test/orchestrator/worldmodel-config-wiring.test.ts` | `(delete)` | legacy | MapGenConfig wiring removed |

Core/domain tests (move with domain libraries):
| `packages/mapgen-core/test/core/foundation-context.test.ts` | `mods/mod-swooper-maps/test/foundation-context.test.ts` | test (content) | Foundation artifact types/validators move to mod domain libs |
| `packages/mapgen-core/test/core/utils.test.ts` | `packages/mapgen-core/test/engine/context-utils.test.ts` | test (engine) | Split: keep engine context utilities coverage; move content-specific bits |
| `packages/mapgen-core/test/dev/crust-map.test.ts` | `mods/mod-swooper-maps/test/crust-map.test.ts` | test (content) | Content-specific diagnostics smoke |
| `packages/mapgen-core/test/foundation/plate-seed.test.ts` | `mods/mod-swooper-maps/test/foundation/plate-seed.test.ts` | test (content) | Foundation domain |
| `packages/mapgen-core/test/foundation/plates.test.ts` | `mods/mod-swooper-maps/test/foundation/plates.test.ts` | test (content) | Foundation domain |
| `packages/mapgen-core/test/foundation/voronoi.test.ts` | `mods/mod-swooper-maps/test/foundation/voronoi.test.ts` | test (content) | Foundation domain |
| `packages/mapgen-core/test/story/corridors.test.ts` | `mods/mod-swooper-maps/test/story/corridors.test.ts` | test (content) | Narrative domain |
| `packages/mapgen-core/test/story/orogeny.test.ts` | `mods/mod-swooper-maps/test/story/orogeny.test.ts` | test (content) | Narrative domain |
| `packages/mapgen-core/test/story/overlays.test.ts` | `mods/mod-swooper-maps/test/story/overlays.test.ts` | test (content) | Narrative domain |
| `packages/mapgen-core/test/story/paleo.test.ts` | `mods/mod-swooper-maps/test/story/paleo.test.ts` | test (content) | Narrative domain |
| `packages/mapgen-core/test/story/tags.test.ts` | `mods/mod-swooper-maps/test/story/tags.test.ts` | test (content) | Narrative domain |
| `packages/mapgen-core/test/layers/callsite-fixes.test.ts` | `mods/mod-swooper-maps/test/layers/callsite-fixes.test.ts` | test (content) | Exercises domain APIs (climate/biomes); move with domain libs |

### 9.2 `mods/mod-swooper-maps/**` (content package: domain libs + recipes + maps)

Target intent:
- This package becomes the canonical “standard mod” content package.
- It owns domain libraries (`src/domain/**`) and recipe mini-packages (`src/recipes/**`).
- It also owns map entrypoints (`src/maps/**`) that select a recipe and provide config instances.

| Current file | Target location / disposition | Layer | Notes |
| --- | --- | --- | --- |
| `mods/mod-swooper-maps/AGENTS.md` | `mods/mod-swooper-maps/AGENTS.md` | meta | Instructions only |
| `mods/mod-swooper-maps/package.json` | `mods/mod-swooper-maps/package.json` | build | Update usage: maps import local recipes; recipe code imports `@swooper/mapgen-core/authoring` only |
| `mods/mod-swooper-maps/tsconfig.json` | `mods/mod-swooper-maps/tsconfig.json` | build | Keep; update path aliases if added for domain imports |
| `mods/mod-swooper-maps/tsconfig.tsup.json` | `mods/mod-swooper-maps/tsconfig.tsup.json` | build | Keep |
| `mods/mod-swooper-maps/tsup.config.ts` | `mods/mod-swooper-maps/tsup.config.ts` | build | Update entries to `src/maps/*.ts` (and ensure recipe/domain modules are bundled via imports) |
| `mods/mod-swooper-maps/src/AGENTS.md` | `mods/mod-swooper-maps/src/AGENTS.md` | meta | Instructions only |

Mod metadata/assets (unchanged; Civ7 mod packaging):
| `mods/mod-swooper-maps/mod/swooper-maps.modinfo` | `mods/mod-swooper-maps/mod/swooper-maps.modinfo` | deploy | Keep |
| `mods/mod-swooper-maps/mod/config/config.xml` | `mods/mod-swooper-maps/mod/config/config.xml` | deploy | Keep (may be extended if we surface recipe selection/config via XML later) |
| `mods/mod-swooper-maps/mod/text/en_us/MapText.xml` | `mods/mod-swooper-maps/mod/text/en_us/MapText.xml` | deploy | Keep |
| `mods/mod-swooper-maps/mod/text/en_us/ModuleText.xml` | `mods/mod-swooper-maps/mod/text/en_us/ModuleText.xml` | deploy | Keep |

Map entrypoints (rewrite to the new model; config instances move here):
| `mods/mod-swooper-maps/src/swooper-earthlike.ts` | `mods/mod-swooper-maps/src/maps/swooper-earthlike.ts` | content (maps) | Rewrite: import `standard` recipe module, provide config instance, call `recipe.run(...)` |
| `mods/mod-swooper-maps/src/swooper-desert-mountains.ts` | `mods/mod-swooper-maps/src/maps/swooper-desert-mountains.ts` | content (maps) | Rewrite: same pattern with different config instance |
| `mods/mod-swooper-maps/src/gate-a-continents.ts` | `mods/mod-swooper-maps/src/maps/gate-a-continents.ts` | content (maps) | Rewrite: same pattern (gate scenario) |

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

2) **Per-step config schema enforcement**  
SPEC 1.2 says unknown config keys are errors. Today, `compileExecutionPlan` only validates config when `step.configSchema` is present. Decide one (implementation task):
- require all authored steps to provide a schema (even empty), or
- make engine treat missing schema as `EmptyStepConfigSchema` (preferred for author DX).

3) **Recipe-local tag definitions**  
`TagRegistry` supports rich tag definitions (`owner`, `satisfies`, `demo`). The standard recipe currently centralizes those in `base/tags.ts`. We need a clean recipe-local replacement:
- either pass `tagDefinitions` into `createRecipe(...)`, or
- attach `tagDefinitions` to steps (more duplication risk).

4) **Runner/publishing SDK extraction**  
We mapped `orchestrator/**` to `runner/**` and deleted `task-graph.ts`, but we still need a minimal, non-legacy map runner story for:
- resolving map init params,
- building the engine context,
- selecting a recipe + providing config,
- calling `recipe.run(...)`.
