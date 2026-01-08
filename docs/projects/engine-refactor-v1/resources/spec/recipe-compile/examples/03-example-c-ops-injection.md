### Example C — Ops injection into `plot-vegetation` (why “bind ops” is not just indirection)

Canonical pattern:
- step **contracts** depend only on op contracts (cheap; no op impl bundling)
- step **modules** bind op contracts to implementations from the domain registry (by id)
- runtime `step.run` uses injected ops; it does not import op implementations directly

One plausible (NEW (planned)) step module shape:

```ts
import { createStep } from "@swooper/mapgen-core/authoring";
import { bindRuntimeOps } from "@swooper/mapgen-core/authoring/bindings";

import { ecologyOpsById } from "@mapgen/domain/ecology/ops-by-id";

// Module-scope closure binding (canonical): ops are not passed through engine signatures.
const ops = bindRuntimeOps(PlotVegetationContract.ops, ecologyOpsById);

export default createStep(PlotVegetationContract, {
  // Compile-time only normalization hook; sees `{ env, knobs }`.
  normalize: (config, { env, knobs }) => {
    void env;
    if (knobs.vegetationDensityBias != null) {
      // value-only adjustment; must not add/remove keys
      return {
        ...config,
        trees: {
          ...config.trees,
          config: {
            ...config.trees.config,
            density: config.trees.config.density + knobs.vegetationDensityBias,
          },
        },
      };
    }
    return config;
  },

  // Runtime handler: uses injected ops and canonical config; no defaulting/cleaning here.
  run: (context, config) => {
    const treePlacements = ops.trees.runValidated(/* input */, config.trees);
    const shrubPlacements = ops.shrubs.runValidated(/* input */, config.shrubs);
    const coverPlacements = ops.groundCover.runValidated(/* input */, config.groundCover);
    // apply/publish effects (step boundary)
    void treePlacements;
    void shrubPlacements;
    void coverPlacements;
    void context;
  },
});
```

This example shows the *intended* reason ops are injected:
- steps orchestrate multiple focused ops and own effects
- ops remain pure, reusable, testable contracts
- contracts remain light and do not bundle implementations

---

