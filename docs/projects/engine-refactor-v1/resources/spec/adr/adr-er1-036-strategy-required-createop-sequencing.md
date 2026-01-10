---
id: ADR-ER1-036
title: "Sequence strategy-required createOp cutover before remaining domain refactors"
status: proposed
date: 2026-01-04
project: engine-refactor-v1
risk: at_risk
system: mapgen
component: authoring-sdk
concern: domain-operation-modules
supersedes: []
superseded_by: null
sources:
  - "SPEC-step-domain-operation-modules"
  - "ADR-ER1-031"
  - "ADR-ER1-035"
  - "docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md"
  - "docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/op-and-config-design.md"
  - "docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md"
  - "scripts/lint/lint-domain-refactor-guardrails.sh"
---

# ADR-ER1-036: Sequence strategy-required `createOp` cutover before remaining domain refactors

## Context

U13 → U14 → U15 are assumed fully landed (adapter boundaries, config canonicalization, and the post-U10/U12 “ops as contracts” direction). We are about to refactor the remaining MapGen domains to the canonical “step ↔ domain contracts via operation modules” model.

Separately, there is a proposed authoring-sdk simplification:

- **All operations are strategy-centric** (an operation’s behavior always lives on a strategy).
- **Plan-truth operation config is always a uniform envelope**: `{ strategy: "<id>", config: <innerConfig> }`, including for single-strategy operations.
- No shorthand encodings (no omitted `strategy`, no `{ config: ... }` shorthand).

This touches the authoring SDK (`packages/mapgen-core/src/authoring/op/*`), as well as call sites across ops, steps, presets, and tests.

This ADR answers **when** we should land the cutover relative to the remaining domain-refactor wave.

## Decision under consideration

Should we land a “strategy-required `createOp` + uniform plan-truth envelope config” cutover:

1) **Before** refactoring the remaining domains, as a standalone cross-cutting slice, or
2) **After** refactoring the remaining domains, as a follow-on pass?

## Decision (proposed)

Land the “strategy-required `createOp` + uniform plan-truth envelope config” cutover **before** refactoring the remaining domains, as a **standalone foundational slice**.

Do **not** bundle this cutover into the first domain refactor. Instead:
- cut over the authoring SDK and bulk-update call sites repo-wide,
- make CI/guardrails enforce the new invariants,
- then refactor domains against the stabilized authoring model.

## Rationale

### Why “before remaining domain refactors” is preferred

- **Single repo-wide cutover (one churn event):** the authoring SDK change is cross-cutting by design. Landing it once before the wave avoids re-touching every domain refactor later.
- **Avoid “refactor twice”:** if we refactor domains now (to today’s authoring surface) and then change the authoring surface later, we effectively re-refactor the refactored domains (ops + steps + presets + tests).
- **Reduce churn/rebase risk:** domain refactors are large, multi-file changes. A later authoring-sdk signature cutover would collide across almost every active branch/stack in flight, increasing conflict risk and time-to-green.
- **Minimize subtle drift:** doing the authoring cutover after domain refactors tends to become “fix compile errors until green”. That mode invites silent contract drift (defaults, config shapes, strategy selection semantics) that is hard to audit.

### What changes if we do it after (and why that’s worse)

- **Mixed state lasts longer:** some domains would be refactored to a surface we intend to delete, while others remain legacy. That’s the worst of both worlds for agent guidance and guardrails.
- **Higher chance of “papering over” behavior changes:** later bulk changes across already-refactored code lead to local hacks (“unwrap here”, “cast there”) rather than a clean, uniform authoring model.
- **Documentation/workflow divergence:** the workflow packet must teach one model. If the model is “about to change”, agents will either (a) follow stale docs or (b) improvise.

### How much U13–U15 help (and what they don’t solve)

U13–U15 help by making the runtime boundary and config canonicalization more explicit and enforceable (the “plan is truth” posture is clearer), which reduces the number of “dual path” compatibility shapes that a strategy-required cutover would otherwise need to support.

However, the strategy-required cutover remains largely a separate concern:
- it changes the authoring SDK API surface and types,
- it changes the plan-truth config encoding for operations,
- and it forces bulk updates regardless of domain boundaries.

U13–U15 reduce incidental complexity around adapters and config normalization, but they do not eliminate the core migration surface of the authoring SDK and its call sites.

## Implications for SPEC and workflow docs

If we accept this ADR:
- `docs/projects/engine-refactor-v1/resources/spec/SPEC-step-domain-operation-modules.md` must reflect the uniform envelope shape as the canonical op-config encoding and align with the strategy semantics.
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/**` must:
  - treat the authoring model as a prerequisite “foundation slice”,
  - reference the uniform config envelope when discussing step schemas and plan-truth config,
  - and keep guardrails as the canonical gate (`scripts/lint/lint-domain-refactor-guardrails.sh`).

This ADR is also adjacent to `ADR-ER1-031` (strategy config encoding). If the projected outcome below becomes canonical, `ADR-ER1-031` should be amended or superseded to remove the “single-strategy omission” special case.

## Open questions (must be resolved as part of the cutover slice)

1) **Cutover strictness**
   - Hard-delete old `createOp` forms (preferred for clarity and guardrails), vs temporary backwards compatibility (higher complexity; reintroduces ambiguity).

2) **Guardrail enforcement scope**
   - Which checks become hard gates in `scripts/lint/lint-domain-refactor-guardrails.sh` for this cutover (e.g., forbid legacy `createOp` call shapes, forbid configs that omit `strategy`, forbid non-literal strategy ids).

## Projected outcome if accepted (draft canonical shape)

This section is a concrete target shape for the authoring SDK and op config envelopes, intended to be made real by the cutover slice. It is intentionally explicit to support agent implementation.

### Core invariants

- Every operation defines a **contract**:
  - `input` schema (shared across all strategies)
  - `output` schema (shared across all strategies)
  - `strategies` map of **config schemas** (required), keyed by strategy id
- Every strategy implementation is authored out of line:
  - `resolveConfig(innerConfig, settings) -> innerConfig` (optional; compile-time only)
  - `run(input, innerConfig) -> output`
- Plan-truth op config is always:
  - `{ strategy: "<strategyId>", config: <innerConfig> }`
- Strategy selection is always explicit; `strategy` is always present (no shorthand encodings).
- Every op has a mandatory `"default"` strategy id.
- `createOp(...)` derives and exposes:
  - `op.config` (the derived union schema for the envelope config),
  - `op.defaultConfig` (always `{ strategy: "default", config: <defaulted inner> }`),
  - `op.resolveConfig(envelope, settings)` (derived; dispatches to `strategy.resolveConfig` if present).

### Authoring SDK shape (illustrative TypeScript)

```ts
type OpConfigEnvelope<StrategyId extends string, InnerConfig> = Readonly<{
  strategy: StrategyId;
  config: InnerConfig;
}>;

type StrategyImpl<Input, InnerConfig, Output, Settings> = {
  resolveConfig?: (config: InnerConfig, settings: Settings) => InnerConfig;
  run: (input: Input, config: InnerConfig) => Output;
};

type OpContract<Input, Output, StrategyId extends string> = Readonly<{
  kind: "plan" | "compute" | "score" | "select";
  inputSchema: unknown;  // TypeBox TSchema in real code
  outputSchema: unknown; // TypeBox TSchema in real code
  strategies: Record<StrategyId, unknown>; // TypeBox schemas in real code
}>;
```

### Example: a “thick” plan op (plan feature placements) with rules beneath it

```ts
export const planFeaturePlacementsContract = defineOp({
  kind: "plan",
  input: PlanFeaturePlacementsInputSchema,
  output: PlanFeaturePlacementsOutputSchema,
  strategies: {
    default: PlanFeaturePlacementsDefaultStrategyConfigSchema,
  },
});

export const planFeaturePlacementsDefault = createStrategy(
  planFeaturePlacementsContract,
  "default",
  {
    resolveConfig: (cfg, settings) => deriveDefaults(cfg, settings),
    run: (input, cfg) => {
      // orchestration inside op is allowed; domain rules remain internal helpers
      // - build per-feature candidate sets
      // - invoke feature-specific rules
      // - return a POJO plan result (no adapter/context crossing)
      return computePlan(input, cfg);
    },
  }
);

export const planFeaturePlacements = createOp(planFeaturePlacementsContract, {
  strategies: {
    default: planFeaturePlacementsDefault,
  },
});
```

Plan-truth config shape for this op (including single strategy):

```ts
// stored in ExecutionPlan.nodes[].config (step config), nested per-step/op as appropriate
{
  strategy: "default",
  config: {
    /* inner knobs */
  }
}
```

### Step wiring (illustrative)

```ts
import { Type, type Static } from "@swooper/mapgen-core/authoring";

const stepSchema = Type.Object({
  planFeaturePlacements: Type.Optional(planFeaturePlacements.config, {
    default: planFeaturePlacements.defaultConfig,
  }),
});

export async function run(ctx: StepCtx, config: Static<typeof stepSchema>) {
  const plan = planFeaturePlacements.runValidated(
    buildInputFromDeps(ctx),
    config.planFeaturePlacements
  );

  // apply/publish remains step-owned (adapter boundary)
  applyPlanToRuntime(ctx, plan);
}
```

### Preset / recipe authoring (illustrative)

```ts
export const myRecipeConfig = {
  stages: {
    ecology: {
      steps: {
        planFeatures: {
          config: {
            planFeaturePlacements: {
              strategy: "default",
              config: {
                /* inner knobs */
              },
            },
          },
        },
      },
    },
  },
};
```

### Tests (illustrative)

```ts
it("plans features deterministically", () => {
  const input = makeInput();
  const out = planFeaturePlacements.runValidated(input, planFeaturePlacements.defaultConfig);
  expect(out).toMatchObject({ /* stable invariants */ });
});
```
