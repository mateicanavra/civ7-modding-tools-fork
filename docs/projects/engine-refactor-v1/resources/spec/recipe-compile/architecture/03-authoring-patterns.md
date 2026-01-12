# Authoring Patterns

This document defines the canonical patterns for authoring stages, steps, and domains under the compile-first recipe compiler architecture.

---

## Canonical domain pattern (contracts + ops router)

A domain exports:
- `contracts`: op contracts only (cheap to import; safe for step contracts)
- `ops`: a `createDomainOpsSurface(...)` router that can bind contracts to `compile` + `runtime` surfaces

Example shape:

```ts
// mods/mod-swooper-maps/src/domain/<domain>/index.ts
import someOp from "./ops/some-op/index.js";
import SomeOpContract from "./ops/some-op/contract.js";
import { createDomainOpsSurface } from "@swooper/mapgen-core/authoring";

export const contracts = { someOp: SomeOpContract } as const;
export const ops = createDomainOpsSurface({ someOp } as const);

export * from "./contracts.js";
export default ops;
```

Constraints:
- Step contracts import domains via `@mapgen/domain/<domain>` (contract entrypoint; single import surface).
- Recipe compilation imports domains via `@mapgen/domain/<domain>/ops` (runtime entrypoint for `collectCompileOps(...)`).
- No deep imports into `@mapgen/domain/<domain>/ops/**` from steps/recipes/tests.

---

## Canonical step pattern (contract file + implementation file)

### Step contract file

Step contracts:
- are metadata-only (`id`, `phase`, `requires`, `provides`, `schema`)
- own the step config schema
- may reuse op envelope schemas derived from op contracts (recommended: `opRef(contract).config`)

```ts
// mods/.../steps/features-plan/contract.ts
import { Type, defineStep, opRef } from "@swooper/mapgen-core/authoring";
import { contracts as ecologyContracts } from "@mapgen/domain/ecology";
import { M3_DEPENDENCY_TAGS } from "../../../../tags.js";

const vegetation = opRef(ecologyContracts.planVegetation);
const wetlands = opRef(ecologyContracts.planWetlands);

export default defineStep({
  id: "features-plan",
  phase: "ecology",
  requires: [M3_DEPENDENCY_TAGS.artifact.heightfield],
  provides: [M3_DEPENDENCY_TAGS.artifact.featureIntentsV1],
  schema: Type.Object({
    vegetation: vegetation.config,
    wetlands: wetlands.config,
  }),
});
```

### Step implementation file

Step implementations:
- bind ops from the domain router using op contracts (by id)
- use `compile.<opKey>.normalize(...)` in `step.normalize` (compile-time)
- use `runtime.<opKey>.run(...)` in `step.run` (runtime)

```ts
// mods/.../steps/features-plan/index.ts
import { createStep } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import FeaturesPlanStepContract from "./contract.js";

const opContracts = {
  planVegetation: ecology.contracts.planVegetation,
  planWetlands: ecology.contracts.planWetlands,
} as const;

const { compile, runtime } = ecology.ops.bind(opContracts);

export default createStep(FeaturesPlanStepContract, {
  normalize: (config, ctx) => ({
    vegetation: compile.planVegetation.normalize(config.vegetation, ctx),
    wetlands: compile.planWetlands.normalize(config.wetlands, ctx),
  }),
  run: (context, config) => {
    const vegetation = runtime.planVegetation.run(/* input */, config.vegetation);
    const wetlands = runtime.planWetlands.run(/* input */, config.wetlands);
    void context;
    void vegetation;
    void wetlands;
  },
});
```

---

## Canonical stage pattern (single author-facing surface)

Stages are authored via `createStage({ id, knobsSchema, public?, compile?, steps })`:
- `knobs` is always a field on the stage config object.
- If `public` is present, `compile` maps public fields → internal step-id keyed configs.
- If `public` is omitted, the stage is internal-as-public (the non-knob portion is step-id keyed).

Example (public schema that forwards directly to step schemas):

```ts
import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { steps } from "./steps/index.js";

const publicSchema = Type.Object(
  {
    featuresPlan: Type.Optional(steps.featuresPlan.contract.schema),
  },
  { additionalProperties: false }
);

export default createStage({
  id: "ecology",
  knobsSchema: Type.Object({}, { additionalProperties: false }),
  public: publicSchema,
  compile: ({ config }) => ({
    "features-plan": config.featuresPlan,
  }),
  steps: [steps.featuresPlan],
});
```

---

## Canonical recipe boundary pattern (compile ops registry)

The recipe compiler requires a recipe-owned `compileOpsById` registry so it can compile configurations (and so steps can run compile-time normalization via `op.normalize`).

Canonical assembly is via `collectCompileOps`:

```ts
import { collectCompileOps, createRecipe } from "@swooper/mapgen-core/authoring";
import * as ecologyDomain from "@mapgen/domain/ecology";
import * as placementDomain from "@mapgen/domain/placement";

export const compileOpsById = collectCompileOps(ecologyDomain, placementDomain);

export default createRecipe({
  id: "standard",
  stages: [/* ... */],
  tagDefinitions: [/* ... */],
  compileOpsById,
});
```
