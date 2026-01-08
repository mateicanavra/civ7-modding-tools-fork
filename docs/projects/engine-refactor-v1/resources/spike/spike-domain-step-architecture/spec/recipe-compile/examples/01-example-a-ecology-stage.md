### Example A — Ecology stage: single author-facing surface (`knobs` + config), optional stage `public`

This example uses ecology to illustrate the canonical “single surface” model:

- the stage author-facing config is one object
- `knobs` is always a field on that object
- the stage may optionally define a `public` view that compiles into an internal step-id keyed map

Author input (recipe config is stage-id keyed; each stage config is a single object):

```ts
const config = {
  ecology: {
    knobs: {
      // stage-scoped author controls that may influence step normalization,
      // but are not part of any step config shape:
      vegetationDensityBias: 0.15,
    },

    // If ecology defines a stage `public` view, these are *public fields* (not step ids).
    // (If ecology is internal-as-public, the non-knob portion would instead be step ids.)
    vegetation: { /* public vegetation-facing fields */ },
    wetlands: { /* public wetlands-facing fields */ },
  },

  // A second stage in the same recipe may be internal-as-public. The non-knob portion is
  // treated as a (partial) step-id keyed map at compile-time (no recipe-wide mode flag).
  placement: {
    knobs: { /* optional */ },
    derivePlacementInputs: { /* internal step config (shape unknown at Phase A) */ },
    placement: { /* internal step config */ },
  },
};
```

Phase A output for `ecology` (conceptual, after `surfaceSchema` validation and `toInternal(...)`):

```ts
{
  knobs: { vegetationDensityBias: 0.15 },
  rawSteps: {
    // NEW (planned): this is the intended domain-modeling shape:
    // ecology exposes multiple focused ops and composes them in a step named `plotVegetation`
    plotVegetation: {
      trees: { /* op envelope */ },
      shrubs: { /* op envelope */ },
      groundCover: { /* op envelope */ },
    },
    plotWetlands: { /* ... */ },
  }
}
```

Note:
- The stage `public` view (if present) is a compile-time authoring UX affordance; the engine only ever sees the compiled internal step map.
- This stage example intentionally avoids “mega-op” modeling (see Example B).

