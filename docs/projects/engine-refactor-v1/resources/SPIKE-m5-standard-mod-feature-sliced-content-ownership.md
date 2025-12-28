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

## 3) Mod content package structure (one recipe = one mini-package)

This is the canonical layout we want to converge on for `mods/mod-swooper-maps`:

Directory sketch (illustrative; not a file):
```text
mods/mod-swooper-maps/src/
├─ mod.ts
├─ recipes/
│  ├─ earthlike/
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
│  └─ desertMountains/
│     ├─ recipe.ts
│     ├─ stages/
│     │  └─ <stageId>/
│     │     ├─ index.ts
│     │     └─ steps/
│     │        ├─ index.ts
│     │        └─ *.ts
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

export type { Step, Stage, RecipeModule } from "./types";
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
} from "@mapgen/pipeline/index.js";
import type { TraceSession } from "@mapgen/trace/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";

// A recipe-local authored step occurrence.
// - It carries a per-occurrence config blob (the recipe will embed it into RecipeV1).
// - It may carry explicit tag definitions (advanced); most tags are derived from tag ids.
export type Step<TContext = ExtendedMapContext, TConfig = unknown> = {
  // Local id within the stage. Final runtime id is derived as:
  //   `${namespace?}.${recipeId}.${stageId}.${stepId}`
  readonly id: string;
  readonly requires: readonly DependencyTag[];
  readonly provides: readonly DependencyTag[];
  readonly configSchema?: TSchema;
  readonly config?: TConfig;
  readonly run: (context: TContext, config: TConfig) => void | Promise<void>;

  readonly instanceId?: string;
  readonly tagDefinitions?: readonly DependencyTagDefinition[];
};

export type Stage<TContext = ExtendedMapContext> = {
  readonly id: string;
  readonly phase: GenerationPhase;
  readonly steps: readonly Step<TContext, unknown>[];
};

// What the mod exports for a recipe.
// Registry is intentionally not exposed.
export type RecipeModule<TContext = ExtendedMapContext> = {
  readonly id: string;
  readonly recipe: RecipeV1;
  runRequest: (settings: RunSettings) => RunRequest;
  compile: (settings: RunSettings) => ExecutionPlan;
  run: (
    context: TContext,
    settings: RunSettings,
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
} from "@mapgen/pipeline/index.js";

import type { TraceSession } from "@mapgen/trace/index.js";
import type { ExtendedMapContext } from "@mapgen/core/types.js";
import type { RecipeModule, Stage, Step } from "./types";

type StepOccurrence<TContext> = {
  step: MapGenStep<TContext, unknown>;
  config: unknown;
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
      const fullId = computeFullStepId({
        namespace: input.namespace,
        recipeId: input.recipeId,
        stageId: stage.id,
        stepId: authored.id,
      });

      out.push({
        step: {
          id: fullId,
          phase: stage.phase,
          requires: authored.requires,
          provides: authored.provides,
          configSchema: authored.configSchema,
          run: authored.run as unknown as MapGenStep<TContext, unknown>["run"],
        },
        config: authored.config ?? {},
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

function toRecipeV1(id: string, occurrences: readonly StepOccurrence<unknown>[]): RecipeV1 {
  return {
    schemaVersion: 1,
    id,
    steps: occurrences.map((occ) => ({
      id: occ.step.id,
      instanceId: occ.instanceId,
      config: occ.config,
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
  const recipe = toRecipeV1(input.id, occurrences);

  function runRequest(settings: RunSettings): RunRequest {
    return { recipe, settings };
  }

  function compile(settings: RunSettings): ExecutionPlan {
    return compileExecutionPlan(runRequest(settings), registry);
  }

  function run(
    context: TContext,
    settings: RunSettings,
    options: { trace?: TraceSession | null; log?: (message: string) => void } = {}
  ): void {
    const plan = compile(settings);
    const executor = new PipelineExecutor(registry, {
      log: options.log,
      logPrefix: `[recipe:${input.id}]`,
    });
    executor.executePlan(context, plan, { trace: options.trace ?? null });
  }

  return { id: input.id, recipe, runRequest, compile, run };
}
```

### 4.6 Packaging overlay (ideal state)

This SPIKE assumes the authoring SDK is exported as a stable surface from `@swooper/mapgen-core`.

Concretely:
- Add an export in `packages/mapgen-core/package.json` for `./authoring` (and optionally promote `./pipeline` as `./engine`).
- Mod content packages (e.g., `mods/mod-swooper-maps`) import only from `@swooper/mapgen-core/authoring`.
  - They do not import `@swooper/mapgen-core/pipeline` directly in the common path.

Notes:
- Registry creation exists, but is **invisible** to mod authors and end users.
- `requires`/`provides` remain on steps; engine semantics are unchanged.
- Recipe output is a concrete `RecipeV1` (ordered `steps[]`); stages do not appear in runtime.
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
  - `export { buildHeightfield } from "./buildHeightfield";`
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

File: `mods/mod-swooper-maps/src/recipes/earthlike/stages/morphology/steps/buildHeightfield.ts` (whole file)
```ts
import { Type } from "typebox";
import { createStep } from "@swooper/mapgen-core/authoring";
import { buildTerrainMask } from "../../../../../domain/terrain/buildTerrainMask";

export const buildHeightfield = createStep({
  id: "buildHeightfield",
  requires: [],
  provides: ["artifact:terrainMask@v1"],
  configSchema: Type.Object(
    { roughness: Type.Number({ default: 0.5 }) },
    { additionalProperties: false }
  ),
  config: { roughness: 0.5 },
  run: (ctx, config: { roughness: number }) => {
    const mask = buildTerrainMask({ roughness: config.roughness });
    // (Illustrative) publish artifact
    ctx.artifacts.set("artifact:terrainMask@v1", mask);
  },
});
```

File: `mods/mod-swooper-maps/src/recipes/earthlike/stages/hydrology/steps/buildClimateField.ts` (whole file)
```ts
import { Type } from "typebox";
import { createStep } from "@swooper/mapgen-core/authoring";

export const buildClimateField = createStep({
  id: "buildClimateField",
  requires: ["artifact:terrainMask@v1"],
  provides: ["artifact:climateField@v1"],
  configSchema: Type.Object(
    { humidity: Type.Number({ default: 0.6 }) },
    { additionalProperties: false }
  ),
  config: { humidity: 0.6 },
  run: (_ctx, _config: { humidity: number }) => {
    // Domain logic omitted; step remains thin.
  },
});
```

### 6.3 Stages (authoring-only ordering)

File: `mods/mod-swooper-maps/src/recipes/earthlike/stages/morphology/steps/index.ts` (whole file)
```ts
export { buildHeightfield } from "./buildHeightfield";
```

File: `mods/mod-swooper-maps/src/recipes/earthlike/stages/hydrology/steps/index.ts` (whole file)
```ts
export { buildClimateField } from "./buildClimateField";
```

File: `mods/mod-swooper-maps/src/recipes/earthlike/stages/morphology/index.ts` (whole file)
```ts
import { createStage } from "@swooper/mapgen-core/authoring";
import { buildHeightfield } from "./steps";

export const morphology = createStage({
  id: "morphology",
  phase: "morphology",
  steps: [buildHeightfield],
} as const);
```

File: `mods/mod-swooper-maps/src/recipes/earthlike/stages/hydrology/index.ts` (whole file)
```ts
import { createStage } from "@swooper/mapgen-core/authoring";
import { buildClimateField } from "./steps";

export const hydrology = createStage({
  id: "hydrology",
  phase: "hydrology",
  steps: [buildClimateField],
} as const);
```

### 6.4 Recipe (canonical global order via stage composition)

File: `mods/mod-swooper-maps/src/recipes/earthlike/recipe.ts` (whole file)
```ts
import { createRecipe } from "@swooper/mapgen-core/authoring";
import { morphology } from "./stages/morphology";
import { hydrology } from "./stages/hydrology";

const NAMESPACE = "mod-swooper-maps";

export const earthlike = createRecipe({
  id: "earthlike",
  namespace: NAMESPACE,
  stages: [morphology, hydrology],
} as const);
```

---

## 7) Mod entrypoint (exports recipes; no shared step catalog)

File: `mods/mod-swooper-maps/src/mod.ts` (whole file)
```ts
import { earthlike } from "./recipes/earthlike/recipe";

export const mod = {
  id: "mod-swooper-maps",
  recipes: { earthlike },
} as const;
```

---

## 8) Narrative (explicitly deferred)

This model treats narrative the same way as any other content:
- it can be a recipe-local stage with recipe-local steps, and
- its cross-cutting nature is expressed only through artifacts + recipe placement.

We are **not** redesigning narrative structure in this refactor. Any deeper narrative architecture changes require a dedicated narrative SPIKE.
