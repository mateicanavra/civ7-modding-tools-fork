# Illustrative Examples

These examples show the full chain (domain → step → stage → recipe) using the current compile-first architecture.

---

## Example A — Stage public view (`knobs` + public fields) compiled to internal step ids

Author input (stage-id keyed; each stage config is a single object):

```ts
const config = {
  ecology: {
    knobs: {},

    // Public fields (not step ids)
    featuresPlan: {},
    plotEffects: {},
  },
};
```

Stage definition (public schema + compile mapping):

```ts
import { Type, createStage } from "@swooper/mapgen-core/authoring";
import { steps } from "./steps/index.js";

const publicSchema = Type.Object(
  {
    featuresPlan: Type.Optional(steps.featuresPlan.contract.schema),
    plotEffects: Type.Optional(steps.plotEffects.contract.schema),
  },
  { additionalProperties: false }
);

export default createStage({
  id: "ecology",
  knobsSchema: Type.Object({}, { additionalProperties: false }),
  public: publicSchema,
  compile: ({ config }) => ({
    "features-plan": config.featuresPlan,
    "plot-effects": config.plotEffects,
  }),
  steps: [steps.featuresPlan, steps.plotEffects],
});
```

Key points:
- The stage has one author-facing surface: a single object containing `knobs` plus either public fields or step ids.
- The compiler validates the stage surface against the computed `surfaceSchema` and then validates each step config against the step schema.

---

## Example B — Step orchestrating multiple ops (compile-time normalize + runtime run)

Step contract (schema reuses op envelope schemas derived from contracts):

```ts
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

Step implementation (bind compile/runtime op surfaces and keep normalization compile-only):

```ts
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

Key points:
- Steps never import op strategy/rule modules directly.
- Steps select strategies only via the op envelope config (`config.strategy`).
- Compile-time canonicalization is done via schema defaults + `normalize` hooks; runtime is pure execution.

---

## Example C — Recipe boundary: assemble compile ops registry

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

Key point:
- The recipe owns the set of domains it compiles and provides that registry to the compiler.

