### 1.13 Canonical Step Module Pattern

#### Purpose

Define the single recommended, repo-realistic authoring pattern for a step module that:

- Lists ops once in the contract as **op contracts** (not `OpRef`) and derives refs/envelopes internally.
- Binds ops **inside the step module closure**, not in the stage factory.
- Ensures runtime cannot call compile-time normalization hooks (structural separation, not “policy by convention”).
- Supports `StepConfigInputOf` (author can omit op envelopes; compiler prefills).

#### Canonical exports for a step module

A step module should export:

- `contract`: `StepContract<...>`
- `step`: the engine-facing step module created by `createStep(contract, impl)`
- Optionally: `type ConfigInput = StepConfigInputOf<typeof contract>` and `type Config = StepConfigOf<typeof contract>` (local clarity only)

#### Canonical imports for a step module

A step module should import:

- `defineStepContract` from core authoring
- `createStep` from the mod’s stable authoring alias (`@mapgen/authoring/steps`) so the mod’s `ExtendedMapContext` typing is centralized
- `bindRuntimeOps` (and sometimes `bindCompileOps` in compiler-only code; not used by runtime `run`)
- Domain **contracts** for op declarations (IDs + schemas), imported only via the domain public surface (`@mapgen/domain/<domain>`)
- Domain **opsById** registry for runtime binding (by id), imported only via the domain public surface (`@mapgen/domain/<domain>`)
- No compiler helpers and no TypeBox `Value.*` inside runtime `run`

#### Canonical step module shape

```ts
// mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/plot-vegetation/index.ts

import { Type } from "typebox";

import { defineStepContract } from "@swooper/mapgen-core/authoring";
import { bindRuntimeOps } from "@swooper/mapgen-core/authoring/bindings";
import { createStep } from "@mapgen/authoring/steps";

// Domain public surface (canonical): step modules never deep-import op files.
import * as ecology from "@mapgen/domain/ecology";

export const contract = defineStepContract({
  id: "plot-vegetation",
  phase: "ecology",
  requires: ["artifact:biomes", "artifact:heightfield"],
  provides: ["artifact:vegetationIntents"],

  // Ops declared as contracts (single source of truth)
  ops: {
    trees: ecology.contracts.planTreeVegetation,
    shrubs: ecology.contracts.planShrubVegetation,
  },

  // O3: if you need non-op fields, you MUST provide an explicit schema.
  // Here we have `densityBias`, so we author the schema explicitly.
  //
  // `defineStepContract` overwrites the op keys (`trees`, `shrubs`) with their derived
  // envelope schemas (see §1.15 + Appendix A), so authors do not duplicate envelope schemas.
  schema: Type.Object(
    {
      densityBias: Type.Number({ minimum: -1, maximum: 1, default: 0 }),
      trees: Type.Any(), // overwritten by derived envelope schema
      shrubs: Type.Any(), // overwritten by derived envelope schema
    },
    { additionalProperties: false, default: {} }
  ),
} as const);

// Runtime ops are structurally stripped (no normalize/defaultConfig/strategies).
// Note: binding is by op id via the domain registry; decl keys are preserved for IDE completion.
const ops = bindRuntimeOps(contract.ops, ecology.opsById);

export const step = createStep(contract, {
  // Compile-time step normalize hook (optional).
  // NOTE: This runs only in the compiler pipeline, not at runtime.
  normalize: (cfg, ctx) => {
    // e.g. apply knobs-derived bias into envelopes in a shape-preserving way
    const bias = cfg.densityBias;
    return {
      ...cfg,
      trees: applyDensityBias(cfg.trees, bias),
      shrubs: applyDensityBias(cfg.shrubs, bias),
    };
  },

  run: async (ctx, cfg) => {
    // Runtime: can only call runtime ops surface (run/runValidated), cannot call normalize.
    const input = buildVegetationInput(ctx);
    const trees = ops.trees.runValidated(input, cfg.trees);
    const shrubs = ops.shrubs.runValidated(input, cfg.shrubs);

    ctx.artifacts.set("artifact:vegetationIntents", { trees, shrubs });
  },
});
```

Key invariants enforced by this pattern:

- `run(ctx, cfg)` has no access to compiler utilities and no access to compile-only op hooks.
- Ops are listed once (contracts) and bound once (runtime binder).
- `normalize` exists but is not callable at runtime because `createStep` does not expose it to the engine runtime surface, and `bindRuntimeOps` strips normalize hooks structurally.

---
