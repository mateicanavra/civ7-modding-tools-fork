# Domain Stage Smoke Test Template

Copy this file to:

`mods/mod-swooper-maps/test/pipeline/<domain>-stage-smoke.test.ts`

Then replace the placeholders and follow the steps below. This template is intentionally narrow: it proves that a refactored domain stage is wired correctly and that its key artifacts/effects are satisfied.

## Required invariants

- Use deterministic settings (`settings.seed = 0`, fixed dimensions).
- Use a deterministic adapter RNG: `createMockAdapter({ rng: () => 0 })`.
- Use canonical dependency keys from `mods/mod-swooper-maps/src/recipes/standard/tags.ts`.
- Assert artifacts/effects are satisfied via `STANDARD_TAG_DEFINITIONS` where applicable.

## Skeleton (copy into the `.test.ts` file)

```ts
import { describe, expect, it } from "bun:test";
import { createMockAdapter } from "@civ7/adapter";
import { createExtendedMapContext } from "@swooper/mapgen-core";
import { applySchemaDefaults } from "@swooper/mapgen-core/authoring";
import { FoundationDirectionalityConfigSchema } from "@mapgen/config";

import { M3_DEPENDENCY_TAGS, M4_EFFECT_TAGS } from "../../src/recipes/standard/tags.js";
import { initializeStandardRuntime } from "../../src/recipes/standard/runtime.js";
import standardRecipe from "../../src/recipes/standard/recipe.js";
import type { StandardRecipeConfig } from "../../src/recipes/standard/recipe.js";
import { __DOMAIN__Config } from "../../src/maps/__DOMAIN__-map.js";

const settings = {
  seed: 0,
  dimensions: { width: 4, height: 3 },
  latitudeBounds: { topLatitude: 0, bottomLatitude: 0 },
  wrap: { wrapX: false, wrapY: false },
  directionality: applySchemaDefaults(FoundationDirectionalityConfigSchema, {}),
};

describe("__DOMAIN__ stage smoke", () => {
  it("runs __STAGE__ and satisfies key artifacts/effects", () => {
    const adapter = createMockAdapter({ width: settings.dimensions.width, height: settings.dimensions.height, rng: () => 0 });
    const ctx = createExtendedMapContext(settings.dimensions, adapter, settings);
    initializeStandardRuntime(ctx, settings);

    const config = __DOMAIN__Config satisfies StandardRecipeConfig;
    expect(() => standardRecipe.run(ctx, settings, config, { log: () => {} })).not.toThrow();

    expect(ctx.artifacts.get(M3_DEPENDENCY_TAGS.artifact.__ARTIFACT_KEY__)).toBeTruthy();
    expect(ctx.effects.has(M4_EFFECT_TAGS.engine.__EFFECT_KEY__)).toBe(true);
  });
});
```

Notes:
- Use an existing map preset config (e.g. `mods/mod-swooper-maps/src/maps/swooper-earthlike.ts`) to avoid re-creating the full config inline.
- For a smaller test, you can construct a minimal config that only exercises your domain, but it must still satisfy the recipe schema.
- For a full reference, see `mods/mod-swooper-maps/test/standard-run.test.ts`.
