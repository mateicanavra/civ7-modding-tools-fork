# SPIKE: Standard Mod as a Feature-Sliced “App” (Everything Content is Mod-Owned)

Primary references:
- Canonical target: `docs/projects/engine-refactor-v1/resources/SPEC-target-architecture-draft.md`
- Boundary skeleton decision record: `docs/projects/engine-refactor-v1/issues/M5-U02-standard-mod-boundary-skeleton.md`

This SPIKE is structural only: it defines ownership boundaries, directory layout, and contracts. It does not include migration steps or implementation tasks.

---

## 0) Locked high-level architecture (engine runtime + authoring SDK + mods)

### Engine SDK (`packages/mapgen-core/src/engine/**`) is runtime-only

The engine is content-agnostic and owns only the generic pipeline runtime:

- **One registry concept (engine-owned):** step registry + tag registry.
- **One compile/execute model (engine-owned):** `RunRequest -> ExecutionPlan -> execution`.
- **RunRequest is engine-owned only** and is the sole boundary input shape: `RunRequest = { recipe, settings }` (SPEC §1.2, §2.1).
- **No stage/authoring concepts exist in the engine** (they live in authoring only).

### Authoring SDK (`packages/mapgen-core/src/authoring/**`) is ergonomics-only

The authoring SDK is the sole surface for mod authors. It is a thin wrapper around engine types:

- **Defines authoring contracts and helpers** (e.g., `Stage`, `defineStage`, `defineRecipe`).
- **Re-exports engine contracts** needed by mods (e.g., `Step`, `Recipe`, `Registry`).
- **Does not contain runtime logic** and is not used by the executor.

### Standard mod (`packages/mapgen-core/src/mods/standard/**`) is pure content

The standard mod is a “feature-sliced app” composed of stage mini-packages:

- **Stages are mini-packages** and own:
  - step definitions
  - stage-local model (schema + types)
  - stage-local artifacts + helpers
  - stage-local domain logic (`lib/**`)
- **Stages are the primary authoring unit** for content authors:
  - a stage owns its **local default ordering** via its `steps` list (see §3).
  - a stage does not define global pipeline semantics; it is a packaging boundary + local defaults.
- **Recipes are the only cross-stage sequencing surface**:
  - recipes are authored by composing stage `steps` lists (concatenate).
  - narrative ordering/interleaving remains recipe-driven and is explicitly de-scoped from this refactor (see §1, §4.5).
- **`mod.ts` is a thin manifest**: it ties stage registration + recipes into an engine `PipelineMod`.

### Layering invariants (non-negotiable)

- `engine/**` never imports from `authoring/**` or `mods/**`.
- `authoring/**` may import from `engine/index.ts` only.
- `mods/**` import from `authoring/index.ts` only; mods do not import `engine/**` directly.
- “Stage” is a mod-authoring concept; the engine has no first-class stage runtime concept.

---

## 1) Conceptual model (registry vs stage vs recipe vs mod)

This proposal intentionally separates **catalog**, **local bundles**, and **global orchestration**:

- **Registry (engine):** “what exists”.
  - step definitions and tag definitions are registered here.
  - registry defines validity (no collisions; unknown IDs are errors) but has no ordering.
- **Stage (mod mini-package):** “local cluster + content ownership (+ local defaults)”.
  - a stage exports its step modules (a mini-package boundary for reuse).
  - a stage registers its own steps/tags into the engine registry.
  - a stage provides its **local default ordering** as a `steps` list (mod-owned; used as recipe fragments).
- **Recipe (mod):** “global plan”.
  - the recipe is the only place that defines cross-stage sequencing.
  - the default recipe is authored by composing stage `steps` lists (SPEC §2.1 V1 still compiles from a linear `steps[]` list).
  - recipes may interleave steps from different stages; stage boundaries are packaging, not execution segments.
- **Mod (engine contract object):** “the deliverable package”.
  - the mod provides a `register(registry)` function and a `recipes` map.
  - the engine compiles and executes using `RunRequest` that references one of those recipes.

This matches SPEC intent:
- “Recipe is the single source of truth for step ordering and enablement” (SPEC §1.1, §1.2).
- “Vanilla ships as a standard mod package (registry + default recipe), not a privileged internal order” (SPEC §2.1).

### Narrative is explicitly de-scoped (structure is conservative; semantics stay recipe-driven)

Narrative/playability is not a privileged pipeline phase; it is an **optional bundle of normal steps**
selected and ordered by the recipe (SPEC §1.6; `PRD-target-narrative-and-playability.md`).

For this refactor SPIKE:
- **Structurally:** narrative remains a single `stages/narrative/` slice with the same on-disk template as other stages.
- **Semantically:** narrative remains cross-cutting via typed artifacts consumed by other steps.
- **Ordering:** narrative placement/interleaving remains recipe-driven (as it is today) and is **out of scope** to redesign here.

This SPIKE’s stage/recipe authoring model must not depend on having narrative “solved”.

---

## 2) Target directory layout (required, no optional files)

### 2.1 Engine layout (generic runtime SDK)

```text
packages/mapgen-core/src/engine/
├─ index.ts
├─ types.ts
├─ errors.ts
├─ mod.ts
├─ registry/
│  ├─ index.ts
│  ├─ StepRegistry.ts
│  └─ TagRegistry.ts
├─ runtime/
│  ├─ ExecutionPlan.ts
│  └─ PipelineExecutor.ts
├─ observability/
│  ├─ index.ts
│  ├─ fingerprint.ts
│  └─ trace.ts
└─ lib/
   └─ **/**
```

**`engine/index.ts` (public engine surface; runtime only)**
- Re-exports the public engine API:
  - registry creation (`createRegistry`, registry public types)
  - compile (`compileExecutionPlan`) and runtime (`PipelineExecutor`)
  - shared types (`RunRequest`, `Recipe`, `ExecutionPlan`, `MapGenStep`, tag types)
  - error types and observability types (stable contracts)
  - mod contract types (`PipelineMod`)
- Does not re-export engine-internal implementation classes (`StepRegistry`, `TagRegistry`).

**`engine/types.ts` (public runtime contracts)**
- Defines engine-owned boundary shapes and contracts:
  - `RunRequest = { recipe, settings }` (SPEC §1.2)
  - `Recipe` (linear in V1; supports future non-breaking extension containers)
  - `MapGenStep` contract (`id`, `phase: string`, `requires`, `provides`, `run`)
  - `ExecutionPlan` data model shape (may be re-exported from `runtime/ExecutionPlan.ts`)
- Declares only generic engine concepts; no standard-mod tags or artifacts appear here.

**`engine/errors.ts` (public error contracts)**
- Defines stable, structured error types for:
  - compile-time failures (unknown IDs, invalid schema/config, unknown tags, collisions)
  - runtime failures (missing deps, effect verification failures, precondition failures)

**`engine/mod.ts` (mod contract types)**
- Defines the engine contract a mod must satisfy (`PipelineMod`).
- Does not contain standard-mod content or helpers.

**`engine/registry/index.ts` (public registry API; engine-owned)**
- Exposes the supported registry construction surface:
  - `createRegistry()` (constructs an empty registry)
  - `Registry` public interface for registration and lookup
- Guarantees fail-fast collision checks (SPEC §3).

**`engine/registry/StepRegistry.ts` and `engine/registry/TagRegistry.ts` (engine-internal implementation)**
- Concrete backing stores used by the registry runtime.
- Imported by `engine/registry/index.ts` only.

**`engine/runtime/ExecutionPlan.ts` (compile types + compile function)**
- Defines `ExecutionPlan` and the compile function that derives it:
  - `compileExecutionPlan(registry, runRequest, options?)`

**`engine/runtime/PipelineExecutor.ts` (execution runtime)**
- Implements execution of a compiled plan:
  - `execute(plan, context, options?)`

**`engine/observability/index.ts` (public observability surface)**
- Re-exports only stable observability contracts:
  - trace event model and sinks
  - fingerprint utilities (runId + plan fingerprint)

**`engine/observability/fingerprint.ts` (required outputs)**
- Implements deterministic `runId` and plan fingerprint derivation from:
  - `settings + recipe + step IDs + per-occurrence config`

**`engine/observability/trace.ts` (trace event model)**
- Defines the event model for compile-time and runtime events.

**`engine/lib/**` (neutral utilities)**
- Contains only content-agnostic utilities plausibly shared across mods (math, RNG, noise, geometry, grid helpers).
- Never imports from `mods/**`.

### 2.2 Authoring SDK layout (mod-authoring ergonomics)

```text
packages/mapgen-core/src/authoring/
├─ index.ts
├─ stage.ts
└─ recipe.ts
```

**`authoring/index.ts` (public authoring surface; only supported mod import path)**
- Re-exports authoring contracts and helpers:
  - `Stage`, `Step`, `defineStage`, `defineRecipe`
- Re-exports required engine types for mod authors:
  - `Recipe`, `Registry`, `PipelineMod`, tag types
- Does not embed runtime logic; it is a thin authoring layer.

**`authoring/stage.ts` (stage authoring contract + minimal helper)**
- Defines `Step` (alias to `MapGenStep`) and `Stage`.
- Provides `defineStage` to produce a `Stage` with a generated `register`.

**`authoring/recipe.ts` (recipe construction helper)**
- Provides `defineRecipe` for building a `Recipe` from an ordered list of steps.
- No patching or list-editing helpers in the core authoring model.

### 2.3 Standard mod layout (feature-sliced content mod)

```text
packages/mapgen-core/src/mods/standard/
├─ mod.ts
├─ index.ts
├─ recipes/
│  └─ default.ts
├─ shared/
│  ├─ runtime.ts
│  ├─ tags.ts
│  └─ artifacts.ts
└─ stages/
   ├─ index.ts
   ├─ foundation/
   │  ├─ index.ts
   │  ├─ model.ts
   │  ├─ artifacts.ts
   │  ├─ steps/
   │  │  ├─ index.ts
   │  │  └─ *.ts
   │  └─ lib/
   │     └─ **/**
   ├─ morphology/
   │  ├─ index.ts
   │  ├─ model.ts
   │  ├─ artifacts.ts
   │  ├─ steps/
   │  │  ├─ index.ts
   │  │  └─ *.ts
   │  └─ lib/
   │     └─ **/**
   ├─ hydrology/
   │  ├─ index.ts
   │  ├─ model.ts
   │  ├─ artifacts.ts
   │  ├─ steps/
   │  │  ├─ index.ts
   │  │  └─ *.ts
   │  └─ lib/
   │     └─ **/**
   ├─ ecology/
   │  ├─ index.ts
   │  ├─ model.ts
   │  ├─ artifacts.ts
   │  ├─ steps/
   │  │  ├─ index.ts
   │  │  └─ *.ts
   │  └─ lib/
   │     └─ **/**
   ├─ narrative/
   │  ├─ index.ts
   │  ├─ model.ts
   │  ├─ artifacts.ts
   │  ├─ steps/
   │  │  ├─ index.ts
   │  │  └─ *.ts
   │  └─ lib/
   │     └─ **/**
   └─ placement/
      ├─ index.ts
      ├─ model.ts
      ├─ artifacts.ts
      ├─ steps/
      │  ├─ index.ts
      │  └─ *.ts
      └─ lib/
         └─ **/**
```

**`mods/standard/mod.ts` (thin mod manifest; canonical mod contract export)**
- Exports `standardMod: PipelineMod` (engine contract object).
- Delegates registration to `mods/standard/stages/index.ts`.
- Exposes recipes from `mods/standard/recipes/*`.
- Contains no step implementations, no tag definitions, and no ordering logic.

**`mods/standard/index.ts` (consumer barrel; stable export surface)**
- Re-exports:
  - `standardMod`
  - stage modules for selective import/reuse (`stages/*`)
  - recipes (as authoring/reuse inputs)
- Does not re-export deep internal stage helpers; those remain addressable via direct file paths.

**`mods/standard/recipes/default.ts` (the canonical cross-stage order)**
- Defines the standard mod’s default recipe.
- Is authored by composing stage-local `steps` lists (concatenate).
- May interleave steps from different stages (especially narrative); stage boundaries do not imply contiguous execution.

**`mods/standard/shared/runtime.ts` (standard-mod runtime contract)**
- Declares the runtime adapter surface that standard steps expect to exist.
- Content-only: `engine/**` does not import this.

**`mods/standard/shared/tags.ts` (standard-mod canonical tag inventory)**
- Defines and exports the tag IDs + tag definitions for the standard mod.
- Imports and re-exports stage tag definitions from `stages/<stage>/artifacts.ts`.

**`mods/standard/shared/artifacts.ts` (standard-mod cross-stage artifact catalog + helpers)**
- Aggregates and re-exports stage artifact helpers (stage-owned source of truth remains `stages/<stage>/artifacts.ts`).
- Defines any mod-global artifact helpers that are not stage-local.

**`mods/standard/stages/index.ts` (registry entrypoint; explicit import list)**
- Defines `STAGE_LIST`: every stage module shipped by this mod (auditable import list; SPEC §3).
- Exports `registerStandardStages(registry)` that loops `STAGE_LIST` and calls `stage.register(registry)`.
- Contains no recipe/order logic; list order here is not pipeline execution order.

**`mods/standard/stages/<stage>/index.ts` (stage mini-package boundary)**
- Required exports:
  - `stage: Stage` (from the authoring SDK)
- Re-exports:
  - stage `model`
  - stage step exports for consumers (via `./steps` barrel)

**`mods/standard/stages/<stage>/steps/index.ts` (step barrel; required)**
- Re-exports step modules using explicit named exports only.
- `export *` is not allowed.
- Step files must never import `../index.ts` or `./index.ts` (one-way dependency rule).

**`mods/standard/stages/<stage>/model.ts` (stage-local model)**
- Defines stage-local schema + types shared by the stage’s steps.

**`mods/standard/stages/<stage>/artifacts.ts` (stage-local artifacts and tag definitions)**
- Defines stage-owned tag definitions and artifact helpers.
- Exported for stage-local usage and mod-level aggregation via `shared/*`.

**`mods/standard/stages/<stage>/steps/*.ts` (step modules)**
- Each file defines one step (or one step factory) and its config schema.

**`mods/standard/stages/<stage>/lib/**` (stage-local domain logic)**
- Stage-local algorithms and helpers used by stage steps.

---

## 3) Authoring SDK contracts (minimal, authoring-first)

Stages are an authoring abstraction that supports “little packages” without introducing an engine-level stage runtime concept.

### 3.1 `Stage` (authoring contract; engine-agnostic)

Each `mods/standard/stages/<stage>/index.ts` exports exactly one `Stage` value:

```ts
import type { MapGenStep, Registry } from "@swooper/mapgen-core/engine";
import type { Recipe } from "@swooper/mapgen-core/authoring";

export type Step = MapGenStep;

export interface Stage {
  id: string; // stable stage id (package boundary); no engine semantics
  steps: readonly Step[]; // canonical stage-local ordering (authoring-time)
  register(registry: Registry): void; // registers steps + tags referenced by this stage
}
```

**Why no step wrapper?**
- `MapGenStep` already represents the authored unit.
- Stage ordering is just an ordered list of steps; no extra wrapper needed.
- Per-occurrence config belongs to the recipe (see §3.3).

### 3.2 `defineStage` (the only required helper)

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

No builder DSL is part of the core authoring model.

### 3.3 `defineRecipe` (minimal composition)

`authoring/recipe.ts` provides a single helper to build a `Recipe` from an ordered list of steps.
Config lives at the recipe level, not in stages.

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

### 3.4 Ordering responsibilities (avoid drift)

- **Stage** is canonical for *intra-stage order* (via `stage.steps`).
- **Recipe** is canonical for *global order* (the final `Recipe.steps[]`).
- The default recipe is authored by concatenating stage `steps` lists.
- Interleaving is still possible by explicitly composing the list (no DSL required).

There is no duplication of step IDs: recipes use step references (and optional config), not re-spelled IDs.

### 3.5 Where `requires` / `provides` live (no semantic regression)

This structure does not change dependency semantics:

- `requires` / `provides` remain properties on the **step definitions** (registered in the engine registry).
- The recipe contributes only **an ordered list of step occurrences** (plus optional config).
- The engine compiler validates dependency tags and step presence against the registry and authored order, producing an `ExecutionPlan`.

In other words: stages/recipes decide ordering; steps decide contracts; the engine enforces them.

---

## 4) Standard-mod authoring examples (stage + recipe)

### 4.1 Stage example (non-narrative)

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

### 4.2 Step barrel example (explicit exports only)

```ts
export { landmassPlatesStep } from "./landmassPlates";
export { coastlinesStep } from "./coastlines";
```

### 4.3 Step example (requires/provides remain on the step)

```ts
import type { Step } from "@swooper/mapgen-core/authoring";
import { MorphologyTags } from "../artifacts";

export const coastlinesStep: Step = {
  id: "morphology.coastlines",
  phase: "morphology",
  requires: [MorphologyTags.landmassPlates],
  provides: [MorphologyTags.coastlines],
  async run(context) {
    // ...
  },
};
```

### 4.4 Recipe example (canonical global order)

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

### 4.5 Narrative (exploratory; out of scope)

Narrative remains a normal stage slice structurally, but its cross-cutting placement is still recipe-driven.
Any narrative interleaving examples are deferred to a dedicated narrative SPIKE and are not part of the required template.

---

## 5) Barrels and import ergonomics (fixed rules)

### Allowed barrels

- **Engine barrel:** `engine/index.ts` is the only supported runtime import path.
- **Authoring barrel:** `authoring/index.ts` is the only supported mod import path.
- **Mod barrel:** `mods/standard/index.ts` is the consumer barrel for the standard mod.
- **Stage barrel:** `mods/standard/stages/<stage>/index.ts` is the only stage barrel.
- **Step barrel:** `mods/standard/stages/<stage>/steps/index.ts` is required, explicit exports only.

### Disallowed barrels

- No `lib/index.ts` barrels at any depth (avoid circular imports and opaque re-export ladders).
- No `export *` from step barrels.
- Step files must never import `../index.ts` or `./index.ts` (one-way dependency rule).

### Example imports (what this enables)

- Load the whole standard mod (engine consumes a mod contract):
  - `import { standardMod } from "@swooper/mapgen-core/base"`
- Import a whole stage (reuse/test as a mini-package):
  - `import { stage as morphologyStage } from "@swooper/mapgen-core/base/stages/morphology"`
- Import a single step directly (no extra barrels):
  - `import { landmassPlatesStep } from "@swooper/mapgen-core/base/stages/morphology/steps/landmassPlates"`
- Authoring helpers for mods:
  - `import { defineStage, defineRecipe } from "@swooper/mapgen-core/authoring"`

### Packaging note (subpath exports)

This structure assumes the existing “standard mod as subpath export” packaging remains:
- `@swooper/mapgen-core/base` resolves to `packages/mapgen-core/src/mods/standard/mod.ts`
- `@swooper/mapgen-core/base/stages/<stage>` resolves to `packages/mapgen-core/src/mods/standard/stages/<stage>/index.ts`
- `@swooper/mapgen-core/engine` resolves to `packages/mapgen-core/src/engine/index.ts`
- `@swooper/mapgen-core/authoring` resolves to `packages/mapgen-core/src/authoring/index.ts`

---

## 6) SPEC alignment and deltas (explicit)

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
- **RunRequest is strictly engine-owned**:
  - mods never ship RunRequest translators; “presets” are expressed as named recipes or app/CLI helpers.

### SPEC text likely to update (if we adopt this as canonical)

If the SPEC currently implies “stage manifests” as a runtime concept or suggests multiple possible on-disk shapes, it should be sharpened to:
- treat stage only as mod-internal packaging and recipe fragments
- standardize the stage slice template as the canonical mod authoring layout
- introduce `authoring/**` as the only supported mod authoring surface

---

## 7) Why this reduces friction (without new runtime abstractions)

- A mod author adds a stage by creating one directory and exporting one `Stage`; step ownership is co-located with domain logic.
- Cross-stage order lives in one place: the recipe, composed from stage lists.
- `mod.ts` stays stable and boring; it becomes the least-touched file in normal development.
- Stage importability is explicit and ergonomic: other mods can import a stage as a unit (mini-package boundary) without depending on a central “planner” map of every step.
- Authoring ergonomics are centralized in `authoring/**` so mods do not recreate scaffolding.

---

## 8) Future ideas (explicitly out of scope for this SPIKE)

### 8.1 Codegen / file-based routing

Auto-discovery is not part of this target design. Future options could include:
- generating `steps/index.ts` or `stages/index.ts` from the filesystem
- using bundler features (e.g., `import.meta.glob`) to auto-register steps

Any auto-discovery must remain **opt-in** and produce **human-auditable outputs** (generated files committed or diffable).

### 8.2 Recipe patch helpers

List-edit helpers (`insertAfter`, `replaceStep`, `removeStep`) are explicitly deferred. They may be useful later but are not part of the core authoring model.

### 8.3 Stage builder DSL

A fluent builder (`defineStage("morphology").step(...).build()`) is out of scope for this SPIKE and should be evaluated only if the minimal `defineStage` proves insufficient.
