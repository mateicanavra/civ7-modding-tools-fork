# SPIKE: Standard Mod as a Feature-Sliced “App” (Everything Content is Mod-Owned)

Primary references:
- Canonical target: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`
- Boundary skeleton decision record: `docs/projects/engine-refactor-v1/issues/M5-U02-standard-mod-boundary-skeleton.md`

This SPIKE is structural only: it defines ownership boundaries, directory layout, and contracts. It does not include migration steps or implementation tasks.

---

## 0) Key shift: standard content lives in the mod package, not the core SDK

We are moving the **standard pipeline content** out of `@swooper/mapgen-core` and into the **Swooper Maps mod package** (`mods/mod-swooper-maps`).

- `@swooper/mapgen-core` becomes **engine runtime + authoring SDK only**.
- `mods/mod-swooper-maps` becomes the **canonical standard content package**.
- Maps (entry scripts) import recipes/config from the mod package and run the engine with those concrete inputs.

This aligns with the intended separation:
- **Core SDK** = runtime/authoring surfaces only.
- **Content/mods** = stages/steps/recipes/config.

---

## 1) Current state signals (what exists today)

These are the existing pieces we are re-homing:

- **Standard mod content currently lives in** `packages/mapgen-core/src/base/**` (recipes, stages, tags, run-request mapping).
- **Per-map config is already authored in the mod package** (`mods/mod-swooper-maps/src/*.ts`) via `bootstrap(...)` overrides.
- **Step config mapping currently lives in** `packages/mapgen-core/src/base/run-request.ts` (`buildRunRequest(recipe, config, ctx, mapInfo)`).
- **Maps already import the base mod** from `@swooper/mapgen-core/base` and pass `mapGenConfig` into `runTaskGraphGeneration`.

This SPIKE formalizes the direction those signals already point to: the “base mod” belongs in the mod package, not the core SDK.

---

## 2) Locked high-level architecture (engine runtime + authoring SDK + mods)

### Engine SDK (`packages/mapgen-core/src/engine/**`) is runtime-only

The engine is content-agnostic and owns only the generic pipeline runtime:

- **One registry concept (engine-owned):** step registry + tag registry.
- **One compile/execute model (engine-owned):** `RunRequest -> ExecutionPlan -> execution`.
- **RunRequest is engine-owned only** and is the sole boundary input shape: `RunRequest = { recipe, settings }` (SPEC §1.2, §2.1).
- **No stage/authoring concepts exist in the engine** (they live in authoring only).

### Authoring SDK (`packages/mapgen-core/src/authoring/**`) is ergonomics-only

The authoring SDK is the sole surface for mod authors. It is a thin wrapper around engine types:

- **Defines authoring contracts and helpers** (e.g., `Stage`, `defineStage`, `defineRecipe`).
- **Re-exports engine contracts** needed by mods (e.g., `Step` as an alias of `MapGenStep`, `Recipe`, `Registry`).
- **Does not contain runtime logic** and is not used by the executor.

### Standard mod content (`mods/mod-swooper-maps/src/standard/**`) is pure content

The standard mod is a “feature-sliced app” composed of stage mini-packages:

- **Stages are mini-packages** and own:
  - step definitions
  - stage-local model (schema + types)
  - stage-local artifacts + helpers
  - stage-local domain logic (`lib/**`)
- **Stages are the primary authoring unit** for content authors:
  - a stage owns its **local default ordering** via its `steps` list (see §4).
  - a stage does not define global pipeline semantics; it is a packaging boundary + local defaults.
- **Recipes are the only cross-stage sequencing surface**:
  - recipes are authored by composing stage `steps` lists (concatenate).
  - narrative ordering/interleaving remains recipe-driven and is explicitly de-scoped from this refactor (see §1, §5.5).
- **`mod.ts` is a thin manifest**: it ties stage registration + recipes into the engine `PipelineMod`.

### Layering invariants (non-negotiable)

- `engine/**` never imports from `authoring/**` or `mods/**`.
- `authoring/**` may import from `engine/index.ts` only.
- `mods/**` import from `authoring/index.ts` only; mods do not import `engine/**` directly.
- “Stage” is a mod-authoring concept; the engine has no first-class stage runtime concept.

---

## 3) Target package split and directory layouts

### 3.1 `@swooper/mapgen-core` (engine + authoring only)

```text
packages/mapgen-core/src/
├─ engine/
│  ├─ index.ts
│  ├─ types.ts
│  ├─ errors.ts
│  ├─ mod.ts
│  ├─ registry/
│  │  ├─ index.ts
│  │  ├─ StepRegistry.ts
│  │  └─ TagRegistry.ts
│  ├─ runtime/
│  │  ├─ ExecutionPlan.ts
│  │  └─ PipelineExecutor.ts
│  ├─ observability/
│  │  ├─ index.ts
│  │  ├─ fingerprint.ts
│  │  └─ trace.ts
│  └─ lib/
│     └─ **/**
└─ authoring/
   ├─ index.ts
   ├─ stage.ts
   └─ recipe.ts
```

**Engine** remains runtime-only (no standard mod content). **Authoring** is the only mod-facing surface.

### 3.2 `mod-swooper-maps` (standard content + map entrypoints)

```text
mods/mod-swooper-maps/src/
├─ standard/
│  ├─ mod.ts
│  ├─ index.ts
│  ├─ recipes/
│  │  └─ default.ts
│  ├─ shared/
│  │  ├─ runtime.ts
│  │  ├─ tags.ts
│  │  └─ artifacts.ts
│  ├─ stages/
│  │  ├─ index.ts
│  │  ├─ foundation/
│  │  │  ├─ index.ts
│  │  │  ├─ model.ts
│  │  │  ├─ artifacts.ts
│  │  │  ├─ steps/
│  │  │  │  ├─ index.ts
│  │  │  │  └─ *.ts
│  │  │  └─ lib/
│  │  │     └─ **/**
│  │  ├─ morphology/...
│  │  ├─ hydrology/...
│  │  ├─ ecology/...
│  │  ├─ narrative/...
│  │  └─ placement/...
│  ├─ config/
│  │  ├─ schema/**
│  │  └─ index.ts
│  ├─ bootstrap/
│  │  └─ index.ts
│  └─ run-request.ts
├─ swooper-earthlike.ts
├─ swooper-desert-mountains.ts
└─ gate-a-continents.ts
```

Notes:
- `standard/` contains **all standard content** that currently lives in `@swooper/mapgen-core/base`.
- `config/` and `bootstrap/` move with the standard content (see §6).
- `run-request.ts` (config → per-step config mapping) moves with the standard content (see §6).
- Map entrypoints remain small and declarative, per `mods/mod-swooper-maps/src/AGENTS.md`.

---

## 4) Authoring SDK (minimal; step, stage, recipe only)

### 4.1 `Stage` (authoring contract; engine-agnostic)

Each `mods/mod-swooper-maps/src/standard/stages/<stage>/index.ts` exports exactly one `Stage` value:

```ts
import type { Step, Registry } from "@swooper/mapgen-core/authoring";

export interface Stage {
  id: string; // stable stage id (package boundary); no engine semantics
  steps: readonly Step[]; // canonical stage-local ordering (authoring-time)
  register(registry: Registry): void; // registers steps + tags referenced by this stage
}
```

### 4.2 `defineStage` (the only required helper)

`authoring/stage.ts` provides a minimal helper that reduces manual wiring:

```ts
export function defineStage(input: {
  id: string;
  steps: readonly Step[];
  registerTags: (registry: Registry) => void;
}): Stage {
  // …implementation would:
  // - registerTags(registry)
  // - registry.register(step) for each step (deduped)
  // - return { id, steps, register }
  throw new Error("SPIKE: structure only");
}
```

### 4.3 `defineRecipe` (minimal composition)

`authoring/recipe.ts` provides a single helper to build a `Recipe` from an ordered list of steps.
Config lives at the consumer/recipe level, not in stages.

```ts
type RecipeStepInput =
  | Step
  | {
      step: Step;
      config?: Recipe["steps"][number]["config"];
    };

export function defineRecipe(input: {
  schemaVersion: number;
  steps: readonly RecipeStepInput[];
}): Recipe {
  // …implementation would map step inputs to Recipe.steps entries
  throw new Error("SPIKE: structure only");
}
```

### 4.4 Ordering responsibilities (avoid drift)

- **Stage** is canonical for *intra-stage order* (via `stage.steps`).
- **Recipe** is canonical for *global order* (the final `Recipe.steps[]`).
- The default recipe is authored by concatenating stage `steps` lists.
- Interleaving is still possible by explicitly composing the list (no DSL required).

There is no duplication of step IDs: recipes use step references (and optional config), not re-spelled IDs.

### 4.5 Where `requires` / `provides` live (no semantic regression)

This structure does not change dependency semantics:

- `requires` / `provides` remain properties on the **step definitions** (registered in the engine registry).
- The recipe contributes only **an ordered list of step occurrences** (plus optional config).
- The engine compiler validates dependency tags and step presence against the registry and authored order, producing an `ExecutionPlan`.

In other words: stages/recipes decide ordering; steps decide contracts; the engine enforces them.

---

## 5) Standard-mod authoring examples (mod package)

### 5.1 Stage example (non-narrative)

```ts
import { defineStage } from "@swooper/mapgen-core/authoring";
import { registerMorphologyTags } from "./artifacts";
import { landmassPlatesStep, coastlinesStep } from "./steps";

export const stage = defineStage({
  id: "standard.morphology",
  steps: [landmassPlatesStep, coastlinesStep],
  registerTags: registerMorphologyTags,
});

export { landmassPlatesStep, coastlinesStep };
```

### 5.2 Step barrel example (explicit exports only)

```ts
export { landmassPlatesStep } from "./landmassPlates";
export { coastlinesStep } from "./coastlines";
```

### 5.3 Recipe example (canonical global order)

```ts
import { defineRecipe } from "@swooper/mapgen-core/authoring";

import { stage as foundation } from "../stages/foundation";
import { stage as morphology } from "../stages/morphology";
import { stage as hydrology } from "../stages/hydrology";

export const defaultRecipe = defineRecipe({
  schemaVersion: 1,
  steps: [
    ...foundation.steps,
    ...morphology.steps,
    ...hydrology.steps,
  ],
});
```

### 5.4 Map entrypoint example (consumer config + recipe)

```ts
import { bootstrap } from "./standard/bootstrap";
import { standardMod } from "./standard";
import { runTaskGraphGeneration } from "@swooper/mapgen-core";

const config = bootstrap({ overrides: {/* per-map overrides */} });

runTaskGraphGeneration({
  mod: standardMod,
  mapGenConfig: config,
  orchestratorOptions: { logPrefix: "[SWOOPER_MOD]" },
});
```

### 5.5 Narrative (exploratory; out of scope)

Narrative remains a normal stage slice structurally, but its cross-cutting placement is still recipe-driven.
Any narrative interleaving examples are deferred to a dedicated narrative SPIKE and are not part of the required template.

---

## 6) Config and recipe responsibilities (mod content vs map entry)

**Structural recipe (mod package)**
- Lives in `mods/mod-swooper-maps/src/standard/recipes/*`.
- Defines the default ordering only (no per-map overrides baked in).

**Concrete config (map entry)**
- Lives in `mods/mod-swooper-maps/src/*.ts`.
- Uses `bootstrap(...)` to build a `MapGenConfig` for the run.

**Config → step config mapping**
- Lives with the standard mod content (current `packages/mapgen-core/src/base/run-request.ts`).
- Moves to `mods/mod-swooper-maps/src/standard/run-request.ts`.
- Combines `Recipe` + `MapGenConfig` into a concrete `RunRequest` used by the engine.

This keeps the engine generic and keeps content-specific config logic co-located with content.

---

## 7) Barrels and import ergonomics (fixed rules)

### Allowed barrels

- **Engine barrel:** `engine/index.ts` is the only supported runtime import path.
- **Authoring barrel:** `authoring/index.ts` is the only supported mod import path.
- **Standard mod barrel:** `mods/mod-swooper-maps/src/standard/index.ts` is the consumer barrel for the standard mod.
- **Stage barrel:** `mods/mod-swooper-maps/src/standard/stages/<stage>/index.ts` is the only stage barrel.
- **Step barrel:** `mods/mod-swooper-maps/src/standard/stages/<stage>/steps/index.ts` is required, explicit exports only.

### Disallowed barrels

- No `lib/index.ts` barrels at any depth (avoid circular imports and opaque re-export ladders).
- No `export *` from step barrels.
- Step files must never import `../index.ts` or `./index.ts` (one-way dependency rule).

---

## 8) Dependency direction and cycle avoidance

To avoid cycles:

- `@swooper/mapgen-core` never imports from `mods/mod-swooper-maps`.
- `mods/mod-swooper-maps` imports:
  - `@swooper/mapgen-core/authoring` for stage/recipe authoring
  - `@swooper/mapgen-core` runtime entrypoints for execution
- Map entrypoints import **only**:
  - `standardMod` and recipes from `./standard`
  - runtime entrypoints from `@swooper/mapgen-core`

This direction keeps the graph acyclic and keeps the engine package reusable.

---

## 9) SPEC alignment and deltas (explicit)

### Direct alignment with SPEC intent

- **Mods are content; engine is content-agnostic** (SPEC §1.1, §1.2).
- **Standard pipeline ships as a standard mod package** (SPEC §2.1).
- **Recipe is the single source of truth for global ordering and enablement** (SPEC §1.2).
- **Registry is explicit and fail-fast** (SPEC §3).
- **Observability baseline includes runId/fingerprint and structured failures** (SPEC §1.2 observability baseline).

### Sharpened/clarified points this SPIKE makes concrete

- **Three-layer split is explicit:**
  - engine = runtime
  - authoring = ergonomics
  - mods = content
- **Standard mod content moves out of core** and lives in `mods/mod-swooper-maps/src/standard/**`.
- **Fixed on-disk template for stages** (file-based routing readiness):
  - every stage has the same required shape and exports a `Stage`.
  - `steps/index.ts` is required with explicit exports only.
  - empty directories/files are allowed, but the shape is invariant across stages and mods.
- **Stage is a mod-authoring unit**:
  - a stage is a packaging boundary (registration + exports), not an engine runtime concept.
- **Stage-local ordering defaults are stage-owned; recipe is global order**:
  - the default recipe is authored by concatenating stage `steps` lists (aligns with SPEC’s “recipe ordering” because the compiled `Recipe.steps[]` remains the canonical runtime input).
- **Narrative stays conservative and deferred**:
  - narrative remains an optional bundle of steps (SPEC §1.6) published/consumed via typed narrative artifacts, and narrative ordering/interleaving remains recipe-driven and is explicitly deferred to a dedicated narrative design SPIKE.
- **RunRequest is engine-owned**:
  - the type lives in the engine; content packages may ship helpers that *build* a RunRequest from recipe + config.

### SPEC text likely to update (if we adopt this as canonical)

If the SPEC currently implies the standard mod lives inside the engine package, it should be sharpened to:
- state that standard content lives in the mod package
- treat the engine as runtime-only
- treat authoring as a separate surface consumed by mods

---

## 10) Future ideas (explicitly out of scope for this SPIKE)

### 10.1 Codegen / file-based routing

Auto-discovery is not part of this target design. Future options could include:
- generating `steps/index.ts` or `stages/index.ts` from the filesystem
- using bundler features (e.g., `import.meta.glob`) to auto-register steps

Any auto-discovery must remain **opt-in** and produce **human-auditable outputs** (generated files committed or diffable).

### 10.2 Recipe patch helpers

List-edit helpers (`insertAfter`, `replaceStep`, `removeStep`) are explicitly deferred. They may be useful later but are not part of the core authoring model.

### 10.3 Stage builder DSL

A fluent builder (`defineStage("morphology").step(...).build()`) is out of scope for this SPIKE and should be evaluated only if the minimal `defineStage` proves insufficient.
