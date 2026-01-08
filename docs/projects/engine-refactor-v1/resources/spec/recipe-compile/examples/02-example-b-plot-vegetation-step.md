### Example B — Ecology “plot-vegetation” step: multiple focused ops (not a mega-op) + top-level envelope normalization

Why this example exists:
- If each step only wraps one giant “plan vegetation” op, ops injection and envelope normalization look like indirection “for no reason”.
- The domain modeling guidelines explicitly prefer **multiple focused ops** + a step that orchestrates them (e.g. `plot-vegetation`).
- Baseline note (repo reality): ecology currently includes composite ops such as `mods/mod-swooper-maps/src/domain/ecology/ops/features-plan-vegetation/index.ts` (`planVegetation`). That shape is treated as a legacy “mega-op” smell in the target modeling.

Contract (NEW (planned) step; op contracts may already exist in split form or may be introduced during domain refactors):

```ts
import { defineStepContract } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";

// NEW (planned): export `contracts` from the domain entrypoint alongside `ops`.
// Baseline today: `ecology.ops` exists; individual op modules export contracts, but there is no
// consolidated `ecology.contracts` yet.

export const PlotVegetationContract = defineStepContract({
  id: "plotVegetation",
  phase: "ecology",
  // Ops are declared as contracts (DX); `defineStepContract` derives `OpRef`s internally.
  ops: {
    // Example “focused ops” (preferred):
    // - plan-tree-vegetation
    // - plan-shrub-vegetation
    // - plan-ground-cover
    //
    // Repo note: the precise contracts are a domain-refactor deliverable. Today, ecology already has
    // several focused op contracts under `mods/mod-swooper-maps/src/domain/ecology/ops/**`, but the
    // canonical target is to keep splitting toward these focused “plan-*” ops.
    //
    // DX model: domains export contracts separately from implementations:
    // - `ecology.contracts.*` are contract-only (safe to import in step contracts)
    // - `ecology.ops.*` are runtime implementations (used only in step modules)
    trees: ecology.contracts.planTreeVegetation,
    shrubs: ecology.contracts.planShrubVegetation,
    groundCover: ecology.contracts.planGroundCover,
  },
  // If schema is omitted here, an ops-derived schema is allowed (I7) and will be strict:
  // - required: `trees`, `shrubs`, `groundCover` (prefilled before schema normalization)
  // - no extra top-level keys (O3: no “extras” hybrid for v1)
});
```

Note on keys:
- The `ops` keys (`trees`, `shrubs`, `groundCover`) are the authoritative **top-level envelope keys** in the step config (I6).
- The compiler discovers envelopes from `step.contract.ops` keys only; it does not scan nested config objects.

Raw internal step config input (what Phase A produces for `plotVegetation`; op envelopes are **top-level keys** only):

```ts
const rawStepConfig = {
  trees: { strategy: "default", config: { density: 0.40 } },
  // shrubs omitted entirely (allowed in author input; will be prefilled)
  groundCover: { strategy: "default", config: { density: 0.15 } },
};
```

Compiler execution (Phase B excerpt; with stage knobs threaded via ctx):
- `prefillOpDefaults` injects missing `shrubs` envelope from op contract defaults (via `buildOpEnvelopeSchema(contract.id, contract.strategies).defaultConfig`), before strict schema validation.
- `normalizeStrict(step.schema, prefilled)` default/cleans the step fields and rejects unknown keys.
- `step.normalize(cfg, { env, knobs })` may bias envelope values using `knobs` (value-only, shape-preserving).
  - Example: apply `knobs.vegetationDensityBias` by adjusting `trees.config.density` and `groundCover.config.density`.
- `normalizeOpsTopLevel(...)` normalizes envelopes for `trees`, `shrubs`, `groundCover` by contract ops keys only (no nested traversal).
  - Op normalization consults the op’s compile-time normalization hook (baseline today: `DomainOp.resolveConfig(cfg, settings)`; planned rename to `normalize`).

