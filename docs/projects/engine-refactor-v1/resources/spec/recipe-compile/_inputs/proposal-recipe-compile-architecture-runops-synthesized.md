# Synthesis: recipe compile “runops” + domain knobs slicing

This document consolidates the final converged design for two coupled mechanics in the composition-first recipe compiler:

1) **Runtime op surfaces (“runops”)** — steps can call domain ops at runtime, but runtime must never have access to compile-time normalization/defaulting.
2) **Knobs threading + slicing** — `stageConfig.knobs` is the single author-facing knobs surface; step normalization sees the whole stage knob object; op normalization sees only its **domain knob slice**.

The goal is to be **standalone and canonical** (no conversation context required) while remaining grounded in:

- the pinned `recipe-compile` architecture package under `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/`
- the current baseline code in `packages/mapgen-core/src/**` (notably: existing envelope derivation + `resolveConfig`-based normalization in engine/op authoring)

---

## Core invariants (locked)

### I1 — Op envelopes are discovered only via step contracts (top-level only)

- The compiler discovers op envelopes **only** via `step.contract.ops`.
- Op envelopes are always **top-level** properties of the step config object: `stepConfig[opKey]`.
- No nested traversal; no alternate “op key discovery” mechanism.

This aligns with `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/10-op-envelopes.md`.

### I2 — O3: no “derive + implicit extras” hybrid

Step authoring supports exactly these shapes (one schema, no dual sources of truth):

- **Schema-only**: `defineStep({ ..., schema })`
- **Ops-only**: `defineStep({ ..., ops })` with schema omitted; schema is derived from op envelope schemas.
- **Ops + explicit schema**: `defineStep({ ..., ops, schema })`; schema is author-owned, but factories overwrite op-key property schemas from `ops` contracts so authors don’t duplicate envelope schemas.

This is the closed O3 in `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/open-questions.md`.

Practical DX guidance:
- Prefer **ops-only** steps when you can (stage knobs can usually cover “cross-op tuning”).
- Use **ops + explicit schema** only when the step truly needs bespoke step-local fields.

### I3 — Normalize is compile-time only (structural enforcement)

- `step.normalize` and op normalization hooks are callable **only** by the compiler pipeline.
- Runtime cannot normalize because runtime ops are **structurally stripped** and do not carry normalize/default/strategy metadata.

This is the single rule in `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/18-normalization-rule.md`.

---

## Baseline reality (today) vs target architecture (planned)

Baseline (today, repo-real):

- Engine plan compilation (`packages/mapgen-core/src/engine/execution-plan.ts`) performs:
  - strict schema normalization via TypeBox `Value.Default` + `Value.Clean` + unknown-key errors
  - calls `step.resolveConfig(...)` during plan compilation
- Ops normalize via `resolveConfig` (op-level) which dispatches to `strategy.resolveConfig` (inner config), in `packages/mapgen-core/src/authoring/op/create.ts`.
- Steps normalize via `resolveConfig` (step-level) in engine plan compilation.

Target (planned, per `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/12-file-reconciliation.md`):

- Move defaulting/cleaning + normalization out of engine runtime/plan compilation into a **recipe compiler pipeline**.
- Rename `resolveConfig` → `normalize` for compile-time-only hooks (steps + ops).
- Keep runtime execution validate+execute only; no defaulting/cleaning/normalization.

This doc describes the **target architecture behavior**, while referencing baseline filepaths for grounding.

---

## Canonical shapes and helpers (code-level)

### 1) `Env` + normalization context

`Env` is a shared runtime type extracted from baseline `RunSettingsSchema` (see `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/appendix/a.1-env-module.md`).

Normalization context:

```ts
export type NormalizeCtx<Env, Knobs> = Readonly<{ env: Env; knobs: Knobs }>;
```

Threading rule:
- Step normalize receives `NormalizeCtx<Env, StageKnobs>`
- Op normalize receives `NormalizeCtx<Env, DomainKnobs>`

### 2) Compile vs runtime op surfaces (“runops”)

Runtime steps must not see compile-time hooks. The enforcement is structural, not “by convention”.

**NEW (planned)** binding helpers are pinned in:

- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/14-binding-helpers.md`
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/appendix/a.2-ops-surfaces.md`

Canonical helper surface (summary):

```ts
export type DomainOpCompileAny = Readonly<{
  id: string;
  kind: string;
  // compile-only members (normalize/defaults/strategies) exist here
  normalize?: Function; // envelope-level, compile-time only
  run: Function;
  validate: Function;
  runValidated: Function;
}>;

export type DomainOpRuntimeAny = Pick<
  DomainOpCompileAny,
  "id" | "kind" | "run" | "validate" | "runValidated"
>;

export function runtimeOp(op: DomainOpCompileAny): DomainOpRuntimeAny;

export function bindCompileOps(decl, registryById): Record<string, DomainOpCompileAny>;
export function bindRuntimeOps(decl, registryById): Record<string, DomainOpRuntimeAny>;
```

Important: `runtimeOp(...)` **removes** compile-time hooks from the runtime surface.

### 3) Steps declare ops as contracts; schema is derived/overwritten

The pinned “canonical step module” pattern lives in:

- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/13-step-module-pattern.md`

Key properties:

- Step contracts declare ops as **op contracts** (not `OpRef`).
- `defineStep` derives:
  - `opRefs` from op contracts (id + envelope schema)
  - a single authoritative step `schema`:
    - derived (ops-only), or
    - explicit with op-key schema overwrites (hybrid)
- Step runtime `run(context, config)` stays a 2-arg signature; ops are module-owned via closure binding.

### 4) Compile op registry (how the compiler finds op implementations)

The compiler’s mechanical op normalization pass needs access to **compile ops by id**:

- binding uses `bindCompileOps(step.contract.ops, registryById)`
- `registryById` must map `op.id` → compile-surface op implementation (with normalize/defaults/strategy metadata)

Canonical source-of-truth: domain entrypoints export a deterministic registry (see `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/04-layering.md`).

```ts
// recipe or stage wiring (target pattern)
import * as ecology from "@mapgen/domain/ecology";
import * as hydrology from "@mapgen/domain/hydrology";

export const compileOpsById = {
  ...ecology.opsById,
  ...hydrology.opsById,
} as const;
```

Compiler behavior:
- `bindCompileOps` throws if a step references an op id that is missing from `compileOpsById`.
- Duplicate ids are treated as a wiring error (ids should be globally unique; domain-prefixed ids make this easy).

---

## Knobs model: single author surface + domain knob slicing

The base invariant is K1/K2 from `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/06-knobs-model.md`:

- Knobs live at `stageConfig.knobs` (single author surface per stage).
- Compiler extracts knobs once and threads them through normalization via ctx.

This synthesis pins an additional refinement for high-DX, type-safe op normalization:

### K5 — Op normalization receives a typed domain knob slice

- Step normalization is orchestration-level and receives **full stage knobs** (cross-op/cross-domain).
- Op normalization is contract-level and should receive only a **domain knob slice**.

#### Recommended concrete shape

Stages expose knobs as a namespaced object keyed by domain id:

```ts
stageConfig.knobs = {
  ecology: { /* ecology knobs */ },
  hydrology: { /* hydrology knobs */ },
};
```

Domains publish their knob schema slice:

```ts
// domain public surface (target shape)
export const id = "ecology" as const;
export const knobsSchema = Type.Object({ /* ... */ }, { additionalProperties: false, default: {} });
export type EcologyKnobs = Static<typeof knobsSchema>;
```

Stages compose `knobsSchema` from the domains they choose to expose:

```ts
export const knobsSchema = Type.Object(
  { ecology: ecology.knobsSchema, hydrology: hydrology.knobsSchema },
  { additionalProperties: false, default: {} }
);
export type StageKnobs = Static<typeof knobsSchema>;
```

#### How the compiler selects the correct domain slice

The compiler needs a deterministic mapping from an op envelope to the correct `StageKnobs[domainId]`.

Two options exist:

- **Option A (recommended): add `domainId` to op contracts** (explicit, refactor-safe)
- Option B: infer from op id prefix (magical; easy to break)

This doc assumes **Option A**.

Target op contract shape (illustrative):

```ts
export type OpContract = Readonly<{
  domainId: string;
  id: string; // e.g. "ecology/planTreeVegetation"
  kind: "plan" | "compute" | "score" | "select";
  input: TSchema;
  output: TSchema;
  strategies: Record<string, TSchema> & { default: TSchema };
}>;
```

Then the compiler can do:

```ts
const domainKnobs = stageKnobs[contract.domainId];
op.normalize(envelope, { env, knobs: domainKnobs });
```

---

## Normalize responsibility split (why both exist)

This is the crisp answer to “why keep op normalize if a step can normalize?”:

- **Step normalize** is orchestration-level:
  - cross-op coupling
  - cross-domain coupling
  - authoring-surface mapping (stage knobs → multiple envelopes)
- **Op normalize** is contract-level:
  - op-local invariants (clamps, derived defaults)
  - reusable normalization that should apply everywhere the op is used

Canonical rule:
- Keep `op.normalize` for op-local invariants/defaults.
- Use `step.normalize` for cross-op composition.

---

## Compiler mechanics (exact flow)

This matches the ordering pinned in `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/09-compilation-pipeline.md`, with the added knob slicing rule above.

### Phase A — Stage “public → internal” (optional)

For each stage:

1. Strict-normalize the stage config against `stage.surfaceSchema` (single author surface: knobs + fields).
2. `stage.toInternal({ env, stageConfig })` returns:
   - `knobs`
   - `rawSteps: Partial<Record<stepId, unknown>>`

For internal-as-public stages, `toInternal` is essentially:

```ts
const { knobs = {}, ...rawSteps } = stageConfig;
return { knobs, rawSteps };
```

After extraction, the compiler strict-normalizes knobs **once** against `stage.knobsSchema` to produce `stageKnobs` (defaults applied):

```ts
stageKnobs = normalizeStrict(stage.knobsSchema, knobs).value;
```

### Phase B — Step canonicalization (always)

For each step (deterministic order):

1. `rawStep = rawSteps[stepId] ?? undefined`
2. **Prefill op defaults** for any missing op envelope keys declared in `step.contract.ops`:
   - use the shared envelope derivation in `packages/mapgen-core/src/authoring/op/envelope.ts`
   - default envelope is `buildOpEnvelopeSchema(contract.id, contract.strategies).defaultConfig`
3. Strict-normalize the step config against the step schema (default + clean + unknown-key errors).
4. Apply `step.normalize(config, { env, knobs: stageKnobs })` (optional), then strict-normalize again.
5. Apply **mechanical op normalization pass** (top-level only):
   - bind compile ops by op id for the step: `compileOps = bindCompileOps(step.contract.ops, compileOpsById)`
   - for each `opKey`:
     - `contract = step.contract.ops[opKey]`
     - `op = compileOps[opKey]`
     - `domainKnobs = stageKnobs[contract.domainId]`
     - `config[opKey] = op.normalize(config[opKey], { env, knobs: domainKnobs })` (optional)
6. Strict-normalize once more.

Output: canonical internal step configs for the stage.

Knobs do not persist into compiled step configs.

---

## E2E example (ops-only step + domain knob slicing)

This is intentionally “single file per concept” and matches the pinned module patterns.

Import convention used below (matches the pinned examples in the `recipe-compile` architecture package):
- Core authoring exports come from `@swooper/mapgen-core/authoring`.
- Mod-local stable aliases (when present) use `@mapgen/domain/<domain>` (no authoring aliasing).

### Domain: ecology (public surface exports knobs + contracts + opsById)

```ts
// src/domain/ecology/index.ts
import { Type, type Static } from "typebox";

import { planTreeVegetationContract } from "./ops/plan-tree-vegetation/contract.js";
import { planTreeVegetationOp } from "./ops/plan-tree-vegetation/op.js";

export const id = "ecology" as const;

export const knobsSchema = Type.Object(
  {
    vegetationDensityScale: Type.Number({ default: 1, minimum: 0.25, maximum: 2 }),
  },
  { additionalProperties: false, default: {} }
);

export type EcologyKnobs = Static<typeof knobsSchema>;

export const contracts = {
  planTreeVegetation: planTreeVegetationContract,
} as const;

export const opsById = {
  [planTreeVegetationOp.id]: planTreeVegetationOp,
} as const;
```

### Op: plan-tree-vegetation (contract carries domainId; op normalizes via domain knobs)

```ts
// src/domain/ecology/ops/plan-tree-vegetation/contract.ts
import { Type } from "typebox";
import { defineOp } from "@swooper/mapgen-core/authoring";

export const planTreeVegetationContract = defineOp({
  domainId: "ecology",
  id: "ecology/planTreeVegetation",
  kind: "plan",

  input: Type.Object({ width: Type.Number(), height: Type.Number() }, { additionalProperties: false }),
  output: Type.Object({ placements: Type.Array(Type.Any()) }, { additionalProperties: false }),

  strategies: {
    default: Type.Object(
      {
        density: Type.Number({ minimum: 0, maximum: 1, default: 0.35 }),
      },
      { additionalProperties: false, default: {} }
    ),
  },
} as const);
```

```ts
// src/domain/ecology/ops/plan-tree-vegetation/op.ts
import { createOp } from "@swooper/mapgen-core/authoring";
import { planTreeVegetationContract } from "./contract.js";

export const planTreeVegetationOp = createOp(planTreeVegetationContract, {
  strategies: {
    default: {
      normalize: (cfg, ctx) => {
        const scale = ctx.knobs.vegetationDensityScale ?? 1;
        return { ...cfg, density: Math.max(0, Math.min(1, cfg.density * scale)) };
      },
      run: (input, cfg) => {
        void input;
        void cfg;
        return { placements: [] };
      },
    },
  },
});
```

Compiler-facing note (pinned behavior): the compiler calls **envelope-level** `op.normalize(envelope, ctx)`; `createOp(...)` typically synthesizes that by dispatching to the selected strategy’s `normalize` hook (mirrors today’s `resolveConfig` dispatching to `strategy.resolveConfig` in `packages/mapgen-core/src/authoring/op/create.ts`).

### Step: plot-vegetation (ops-only; schema derived from ops)

```ts
// src/recipes/standard/stages/ecology/steps/plot-vegetation/contract.ts
import { defineStep } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";

export const contract = defineStep({
  id: "plot-vegetation",
  phase: "ecology",
  requires: ["artifact:heightfield"],
  provides: ["artifact:vegetationIntents"],

  ops: {
    trees: ecology.contracts.planTreeVegetation,
  },
  // schema omitted => derived strict object schema: `{ trees: OpEnvelopeSchema(...) }`
} as const);
```

Runtime step module binds runtime ops in a closure (no third `run` arg; runtime ops have no normalize):

```ts
// src/recipes/standard/stages/ecology/steps/plot-vegetation/index.ts
import { bindRuntimeOps } from "@swooper/mapgen-core/authoring/bindings";
import { createStep } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";

import { contract } from "./contract.js";

const ops = bindRuntimeOps(contract.ops, ecology.opsById);

export const step = createStep(contract, {
  run: (ctx, cfg) => {
    const input = { width: ctx.env.dimensions.width, height: ctx.env.dimensions.height };
    const trees = ops.trees.runValidated(input, cfg.trees);
    ctx.artifacts.set("artifact:vegetationIntents", { trees });
  },
});
```

### Stage knobs are namespaced by domain id

```ts
// src/recipes/standard/stages/ecology/knobs.ts
import { Type, type Static } from "typebox";
import * as ecology from "@mapgen/domain/ecology";

export const knobsSchema = Type.Object(
  { ecology: ecology.knobsSchema },
  { additionalProperties: false, default: {} }
);

export type EcologyStageKnobs = Static<typeof knobsSchema>;
```

At compile time:
- step normalize receives `{ knobs: EcologyStageKnobs }`
- op normalize receives `{ knobs: EcologyStageKnobs["ecology"] }`

---

## What this synthesis implies for integration

This doc is intentionally scoped to “runops + knobs slicing”, but it implies the following concrete integration points (all already tracked in the canonical `recipe-compile` package):

- `packages/mapgen-core/src/authoring/bindings.ts` **NEW (planned)** for structural runtime ops surfaces.
- `packages/mapgen-core/src/authoring/op/*` rename `resolveConfig` → `normalize` and thread `{ env, knobs }` instead of engine `RunSettings`.
- `packages/mapgen-core/src/compiler/recipe-compile.ts` **NEW (planned)** owns Phase A + Phase B compilation ordering and calls step/op normalize hooks.
