# SPIKE: Step ↔ Domain Contracts via Operation Modules

## 1) Problem

Map generation content needs a clean boundary between:

- **runtime orchestration** (engine/adapter calls, artifact I/O, ordering), and
- **domain logic** (deterministic computation over typed inputs with typed configuration).

Without an explicit contract, step code tends to accumulate domain rules, domains tend to reach into runtime context, configuration schemas drift away from the logic that uses them, and authoring new domains becomes inconsistent and harder to test.

This document defines a canonical model for **how steps and domains interact**:

- Steps remain the unit of execution in recipes/stages.
- Domains expose a small, predictable authoring surface composed of **operation modules**.
- Steps wire runtime → domain inputs, call operations, and publish/apply results.

## 2) Step System (Recipe → Stage → Step)

### Responsibilities

A **step** is the smallest executable unit in a recipe graph. Its responsibilities are:

- **Orchestration (boundary work):**
  - read runtime state (adapter, context buffers/fields),
  - read upstream artifacts/fields required by this step,
  - validate/configure execution from user-provided config (schema-backed),
  - call into domain logic with domain-shaped inputs,
  - apply results back into runtime (engine mutations, buffer writes),
  - publish artifacts/fields for downstream steps.
- **Ordering (graph contract):**
  - declare `requires`/`provides` so the recipe compiler can enforce correctness.

### What steps intentionally do *not* own

- domain rules and heuristics (those belong in domains),
- cross-step global configuration registries,
- ad-hoc “grab bag” utilities (shared utilities belong in shared libs).

## 3) Domain Architecture

### What a domain is

A **domain** is a cohesive unit of content logic (hydrology, morphology, ecology, narrative, placement, etc.) implemented as **pure TypeScript modules**.

Domains are built to be:

- **testable**: deterministic computation over plain inputs,
- **reusable**: can be invoked from any step that can supply the required inputs,
- **co-located**: schemas, typed outputs (“artifacts”), and logic live together under the domain directory.

### Domain responsibilities

Domains expose step-callable entrypoints as **operations**. An operation:

- has a **kind** (`plan`, `compute`, `score`, `select`) for consistent mental model,
- owns its **Inputs**, **ConfigSchema**, and **Result** types (per-operation, not per-domain),
- exports a pure `run(inputs, config) -> result`.

Domains may also contain internal:

- **rules** (smaller pure helpers used by ops),
- **domain artifact shapes** (TypeBox schemas + keys for publishing), where publishing remains step-owned.

### Shared utilities vs domain logic

- **generic utilities** (math, rng helpers, array ops) belong in shared libraries (e.g. `.../lib/**`).
- **domain-specific semantics** belong in the domain (e.g. “what constitutes an orographic shadow”).
- **runtime adapter helpers** (mapping symbolic kinds → engine IDs, applying overrides to the engine) belong in the step (or step-local libs).

## 4) Step ↔ Domain Interaction

### Interaction model

Steps and domains interact as a simple 3-phase boundary:

1. **Build Inputs (step):** adapt runtime (adapter + artifacts/fields) into plain, typed inputs for a domain operation.
2. **Compute (domain op):** run pure logic using operation config and inputs, returning a typed result.
3. **Apply/Publish (step):** apply results to runtime (engine writes, buffer writes) and publish artifacts/fields.

An “apply” phase is not a round-trip back into the domain; it is the step using the domain’s return value to mutate runtime.

### Diagram

```
          (runtime)                          (pure)                           (runtime)
┌─────────────────────────┐        ┌──────────────────────┐        ┌─────────────────────────┐
│ Step.run(ctx, config)   │        │ domain/ops/*.ts      │        │ engine + artifacts      │
│                         │        │                      │        │                         │
│ 1) build inputs         │  ───▶  │ op.run(inputs,cfg)   │  ───▶  │ 3) apply + publish      │
│    from ctx+adapter     │        │ => result            │        │                         │
└─────────────────────────┘        └──────────────────────┘        └─────────────────────────┘
```

### Minimal helper: ergonomic inference, not a framework

Operations are plain exports, but a tiny helper improves inference and standardizes shape.

```ts
// packages/mapgen-core/src/authoring/domain-op.ts
import type { TSchema, Static } from "@sinclair/typebox";

export type DomainOpKind = "plan" | "compute" | "score" | "select";

export type DomainOp<S extends TSchema, Inputs, Result> = {
  kind: DomainOpKind;
  id: string;
  configSchema: S;
  run: (inputs: Inputs, config: Static<S>) => Result;
};

export function defineOp<S extends TSchema, Inputs, Result>(
  op: DomainOp<S, Inputs, Result>
): DomainOp<S, Inputs, Result> {
  return op;
}
```

Recommended step-side import pattern:

```ts
import * as climate from "@mapgen/domain/hydrology/climate";

const result = climate.ops.baselineRainfall.run(inputs, config.baselineRainfall);
```

## 5) Concrete Pattern (End-to-End Example)

This example uses a hydrology/climate domain because it is “compute-heavy” (derived fields) and does not rely on overriding Civ engine behavior.

### Domain layout (one operation per file)

```txt
src/domain/hydrology/climate/
  index.ts
  ops/
    distance-to-water.ts
    baseline-rainfall.ts
  rules/
    lat-bands.ts
    coastal-bonus.ts
  artifacts.ts
```

### Operation: compute distance-to-water

```ts
// src/domain/hydrology/climate/ops/distance-to-water.ts
import { Type, type Static } from "typebox";
import { defineOp } from "@swooper/mapgen-core/authoring/domain-op";

export type Inputs = {
  width: number;
  height: number;
  isWater: Uint8Array; // 1=water, 0=land
};

export const ConfigSchema = Type.Object(
  {
    maxDistance: Type.Optional(Type.Number({ default: 12 })),
  },
  { additionalProperties: false, default: {} }
);
export type Config = Static<typeof ConfigSchema>;

export type Result = {
  dist: Uint8Array; // Manhattan-ish tile distance, clamped to maxDistance
};

export default defineOp({
  kind: "compute",
  id: "hydrology/climate/distanceToWater",
  configSchema: ConfigSchema,
  run: (inputs, cfg): Result => {
    const size = inputs.width * inputs.height;
    const maxD = Number.isFinite(cfg.maxDistance) ? cfg.maxDistance! : 12;
    const dist = new Uint8Array(size);

    // Placeholder: domain owns the algorithm, step owns no logic here.
    // Implement with BFS/scanline/etc. as appropriate.
    dist.fill(maxD);

    return { dist };
  },
} as const);
```

### Operation: compute baseline rainfall (uses a domain rule + another op’s output)

```ts
// src/domain/hydrology/climate/ops/baseline-rainfall.ts
import { Type, type Static } from "typebox";
import { defineOp } from "@swooper/mapgen-core/authoring/domain-op";
import { rainfallForLatitudeBand } from "../rules/lat-bands.js";

export type Inputs = {
  width: number;
  height: number;
  isWater: Uint8Array;
  latAbs: Float32Array;     // degrees
  elevation: Int16Array;    // meters
  distToWater: Uint8Array;  // tiles
  rng?: (label: string, max: number) => number;
};

export const ConfigSchema = Type.Object(
  {
    coastalBonus: Type.Optional(Type.Number({ default: 24 })),
    coastalSpread: Type.Optional(Type.Number({ default: 4 })),
  },
  { additionalProperties: false, default: {} }
);
export type Config = Static<typeof ConfigSchema>;

export type Result = {
  rainfall: Uint16Array;
};

export default defineOp({
  kind: "compute",
  id: "hydrology/climate/baselineRainfall",
  configSchema: ConfigSchema,
  run: (inputs, cfg): Result => {
    const size = inputs.width * inputs.height;
    const rainfall = new Uint16Array(size);

    const bonus = Number.isFinite(cfg.coastalBonus) ? cfg.coastalBonus! : 24;
    const spread = Number.isFinite(cfg.coastalSpread) ? cfg.coastalSpread! : 4;

    for (let i = 0; i < size; i++) {
      if (inputs.isWater[i] === 1) continue;
      const base = rainfallForLatitudeBand(inputs.latAbs[i]);

      const d = inputs.distToWater[i];
      const coastal = d > 0 && d <= spread ? Math.round(bonus * (1 - (d - 1) / spread)) : 0;
      rainfall[i] = Math.max(0, base + coastal);
    }

    return { rainfall };
  },
} as const);
```

### Domain index: aggregate operations (manual, explicit)

```ts
// src/domain/hydrology/climate/index.ts
import distanceToWater from "./ops/distance-to-water.js";
import baselineRainfall from "./ops/baseline-rainfall.js";

export const ops = {
  distanceToWater,
  baselineRainfall,
} as const;
```

### Step wiring: compose operations and publish outputs

```ts
// src/recipes/standard/stages/hydrology/steps/climate-baseline.ts
import { Type, type Static } from "typebox";
import { createStep } from "@swooper/mapgen-core/authoring";
import * as climate from "@mapgen/domain/hydrology/climate";

const StepSchema = Type.Object(
  {
    distanceToWater: climate.ops.distanceToWater.configSchema,
    baselineRainfall: climate.ops.baselineRainfall.configSchema,
  },
  { additionalProperties: false, default: { distanceToWater: {}, baselineRainfall: {} } }
);
type StepConfig = Static<typeof StepSchema>;

export default createStep({
  id: "climateBaseline",
  phase: "hydrology",
  schema: StepSchema,
  run: (ctx, cfg: StepConfig) => {
    const { width, height } = ctx.dimensions;
    const size = width * height;
    const adapter = ctx.adapter;

    // 1) Build op inputs (runtime → domain inputs)
    const isWater = new Uint8Array(size);
    const latAbs = new Float32Array(size);
    const elevation = new Int16Array(size);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        isWater[i] = adapter.isWater(x, y) ? 1 : 0;
        latAbs[i] = Math.abs(adapter.getLatitude(x, y));
        elevation[i] = adapter.getElevation(x, y) | 0;
      }
    }

    // 2) Compute (domain ops)
    const { dist } = climate.ops.distanceToWater.run({ width, height, isWater }, cfg.distanceToWater);
    const { rainfall } = climate.ops.baselineRainfall.run(
      { width, height, isWater, latAbs, elevation, distToWater: dist },
      cfg.baselineRainfall
    );

    // 3) Apply/Publish (domain results → runtime)
    ctx.buffers.climate.rainfall.set(rainfall);
    // ctx.artifacts.set("artifact:climateField", { rainfall, ... }) // step-owned publish
  },
} as const);
```

### Why this example is representative

- The domain owns the algorithms and config schemas.
- The step owns runtime interaction and composition of multiple ops.
- Multiple operations in one domain compose cleanly without codegen:
  - each op is one file (default export),
  - the domain `index.ts` aggregates them into `ops`,
  - steps import `* as climate` and wire through `climate.ops.*`.

## 6) Open Questions / Design Decisions

Each item below is an intentionally standalone decision packet. The goal is to make the downstream consequences explicit so we can converge without accidental drift.

### DD-001: Operation kind semantics (`plan` vs `compute` vs `score` vs `select`)

**Context:** The spike introduces `DomainOpKind = "plan" | "compute" | "score" | "select"` to make domain entrypoints easy to understand and to keep steps consistent in how they integrate domain logic.

**Why this decision exists:** Without crisp semantics, “kinds” become decorative labels and teams re-interpret them, which defeats their purpose as a shared authoring language.

**Meaningful impacts:**
- Authoring ergonomics: does a modder know what a function returns and how to use it?
- Step design: where do validation, application, publishing, and side effects live?
- Tooling/docs: can we auto-render a stable contract and enforce consistency?

**Options:**
- **A) Strict semantics (recommended):**
  - `plan`: produce *intents/edits/overrides* that a step applies to runtime.
  - `compute`: produce *derived data artifacts/fields* with no side effects.
  - `score`: produce *scores* (rankings) over candidates.
  - `select`: produce *choices* (a subset/pick) from candidates/scores.
- **B) Soft semantics (“kinds” are documentation only):** allow overlap; treat kinds as descriptive, not enforceable.
- **C) Reduce kinds further:** collapse `score/select` into one (e.g., `score`) and keep just `plan`/`compute`.

**Considerations:**
- Strict semantics enables shared patterns and later tooling (validation, docs, scaffolding), but requires clearer discipline.
- Soft semantics reduces up-front constraint but tends to drift into inconsistent step/domain responsibilities.
- Fewer kinds are easier to teach; too many kinds can feel frameworky.

**Rationale / leaning:** Prefer **A** with **minimal kinds** (keep 3–4 total). If `select` adds confusion, collapse into `score` (Option C) while keeping `plan` vs `compute` crisp.

### DD-002: Config responsibility and defaults (where validation happens)

**Context:** Ops expose `configSchema`, and steps use schemas for step config validation/defaulting.

**Why this decision exists:** If config validation/defaulting happens inconsistently (sometimes in steps, sometimes in ops), behavior becomes hard to reason about and difficult to test.

**Meaningful impacts:**
- Determinism: do ops see fully defaulted config or partial/unknown config?
- Runtime error quality: who produces error messages and at what boundary?
- Reuse: can the same op be safely used by multiple steps/recipes?

**Options:**
- **A) Step-owned validation/defaulting (recommended):**
  - Step validates and applies defaults once (schema-backed).
  - Op assumes config is already valid and defaulted.
- **B) Op-owned validation/defaulting:** op calls a validator/default applier internally.
- **C) Hybrid:** step validates shape, op applies fine-grained defaults/normalization.

**Considerations:**
- Step-owned validation centralizes runtime-facing errors and keeps ops pure/simple; it also matches the “step is the boundary” model.
- Op-owned validation can make ops more reusable outside steps, but risks duplicating error/reporting patterns and pulling runtime concerns into domain code.
- Hybrid is sometimes useful for “derived defaults” (values dependent on map size), but should be explicit (e.g., a `normalizeConfig` helper) rather than implicit schema-defaulting.

**Rationale / leaning:** Prefer **A**, with an explicit escape hatch: ops may export pure `normalizeConfig(config, inputs)` for derived/scale-aware defaults.

### DD-003: Operation input shape (buffers only vs allowing function adapters)

**Context:** The spike shows ops consuming arrays/buffers (e.g., `isWater: Uint8Array`), but it is possible to pass function-based “views” (e.g., `isWater(x,y)`).

**Why this decision exists:** Input shape strongly affects performance, testability, portability, and the amount of step boilerplate required to adapt runtime state into domain inputs.

**Meaningful impacts:**
- Performance/memory: precomputing buffers costs memory but enables cache-friendly loops; function callbacks can add overhead.
- Testability: buffers are easy to snapshot and fuzz; function-based views can hide state and make tests less explicit.
- Step complexity: building buffers is boilerplate; passing a function is quicker but can leak runtime dependencies.

**Options:**
- **A) Buffers/POJOs only (recommended default):** op inputs are serializable-ish data (typed arrays, plain objects), no runtime callbacks.
- **B) Allow callback views:** allow inputs to include readonly functions (e.g., `readElevation(x,y)`), with discipline to keep them pure.
- **C) Two-tier model:** core ops take buffers; optional helper ops accept callback views and can be used when memory is constrained.

**Considerations:**
- Buffers-only makes ops easiest to test and reason about, and enables a shared “apply/compute per tile” style.
- Callback views can be ergonomic for steps and avoid precomputing, but risk “domain code silently depends on engine behavior” unless the interface is intentionally minimal.
- A two-tier model adds surface area; it can be justified if memory pressure is real in Civ7 runtime constraints.

**Rationale / leaning:** Prefer **A** as the canonical contract for step-callable ops. If callbacks are needed, constrain them to tiny, explicitly named readonly interfaces and keep them pure.

### DD-004: Artifact keys / dependency tags ownership (domain vs recipe)

**Context:** Steps declare `requires`/`provides` (tags) and publish artifacts/fields for downstream steps. Domains may define artifact *shapes* (schemas/types) and sometimes want to “name” those artifacts.

**Why this decision exists:** Stable pipeline wiring depends on consistent dependency identifiers. If both domains and recipes invent keys freely, the graph becomes fragile and hard to refactor.

**Meaningful impacts:**
- Pipeline correctness: can the recipe compiler enforce dependencies reliably?
- Reuse/composability: can multiple recipes use the same domain op without key collisions?
- Docs/tooling: can we render a contract of “what this op needs/produces” that is stable?

**Options:**
- **A) Recipe/tag-catalog owns keys (recommended):**
  - Domains define artifact *schemas/types*.
  - Recipe-level tag catalogs define the canonical string keys for `requires/provides`.
  - Steps publish under tag-catalog keys.
- **B) Domain owns keys:** domains export canonical keys for their artifacts.
- **C) Split by layer:** engine/runner-owned keys live centrally; content-owned keys live with the content domain.

**Considerations:**
- Recipe-owned keys keep the execution graph explicit and avoid “hidden publications” inside domains; they also align with “steps are the boundary”.
- Domain-owned keys improve portability (“use this domain and you know the key”), but can conflict when recipes want to alias/duplicate artifacts or publish multiple versions.
- A split model can work if ownership boundaries are sharp (engine vs content), but must avoid reintroducing a global “registry” smell for artifacts.

**Rationale / leaning:** Prefer **A**: domains own shapes, recipes own dependency identifiers. If a domain wants stable naming, encode it in type names and schema `kind/version`, not necessarily in global keys.

### DD-005: TypeBox import consistency (`typebox` vs `@sinclair/typebox`)

**Context:** The spike currently mixes `import ... from "typebox"` and `import ... from "@sinclair/typebox"` in examples.

**Why this decision exists:** Documentation should model the canonical import path used in the repo to avoid confusion and copy/paste drift for mod authors.

**Meaningful impacts:**
- Authoring ergonomics: copy/paste correctness for modders.
- Tooling: type resolution and consistent dependency management.
- Repo conventions: aligning examples with actual package usage.

**Options:**
- **A) Standardize on one import path:** match the repo’s chosen dependency name and enforce in docs/examples.
- **B) Allow both:** treat as equivalent and let examples vary.

**Considerations:**
- Standardization reduces cognitive overhead and avoids “why does this compile in one place but not another?”.
- Allowing both is flexible but undermines the goal of a canonical spike.

**Rationale / leaning:** Prefer **A**: align all examples with the repo’s canonical import style for TypeBox and its `Static`/`TSchema` types.
