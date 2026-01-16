/// <reference types="@civ7/types" />

import type { OpTypeBagOf, RecipeModule, Static, StepRuntimeOps } from "@swooper/mapgen-core/authoring";
import { Type, createRecipe, createStage, createStep, defineOp, defineStep } from "@swooper/mapgen-core/authoring";

// This file exists purely to lock in critical authoring type paths:
// - defineOp strategies stay narrow (not widened to string)
// - multi-strategy op envelopes remain discriminated unions
// - defineStep merges op envelope schemas into the step schema
// - createStep / createStage / createRecipe preserve literal ids so config surfaces are keyed (no index signatures)

// --- Op contract: multi-strategy discrimination must remain intact.

const MultiStrategyOp = defineOp({
  kind: "compute",
  id: "test/compute-multi-strategy",
  input: Type.Object({}, { additionalProperties: false }),
  output: Type.Object({}, { additionalProperties: false }),
  strategies: {
    default: Type.Object(
      {
        // Distinct property name so we can test discriminated narrowing.
        plateauCount: Type.Integer({ default: 3, minimum: 1 }),
      },
      { additionalProperties: false }
    ),
    fast: Type.Object(
      {
        // Distinct property name so we can test discriminated narrowing.
        turbo: Type.Boolean({ default: true }),
      },
      { additionalProperties: false }
    ),
  },
});

type _StrategyIds = keyof (typeof MultiStrategyOp)["strategies"] & string;
// If strategies are constrained via an index signature, keyof will widen to `string`.
// This MUST remain narrow or IntelliSense degenerates.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _StrategyIdsAreNarrow = string extends _StrategyIds ? false : true;
const _strategyIdsAreNarrow: _StrategyIdsAreNarrow = true;

// The op envelope type should be a discriminated union over `strategy`.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _Envelope = Static<(typeof MultiStrategyOp)["config"]>;

type _EnvelopeStrategy = _Envelope["strategy"];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _EnvelopeStrategyIsNarrow = string extends _EnvelopeStrategy ? false : true;
const _envelopeStrategyIsNarrow: _EnvelopeStrategyIsNarrow = true;

// OpTypeBagOf is the canonical authoring surface for runtime ops;
// it MUST preserve the envelope union (strategy + config shapes).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _BagEnvelope = OpTypeBagOf<typeof MultiStrategyOp>["envelope"];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _BagEnvelopeStrategy = _BagEnvelope["strategy"];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _BagEnvelopeStrategyIsNarrow = string extends _BagEnvelopeStrategy ? false : true;
const _bagEnvelopeStrategyIsNarrow: _BagEnvelopeStrategyIsNarrow = true;

type _DefaultConfig = Extract<_Envelope, { strategy: "default" }>["config"];
type _FastConfig = Extract<_Envelope, { strategy: "fast" }>["config"];

// Discriminated branches must preserve their own config shapes.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _DefaultHasPlateauCount = "plateauCount" extends keyof _DefaultConfig ? true : false;
const _defaultHasPlateauCount: _DefaultHasPlateauCount = true;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _FastHasTurbo = "turbo" extends keyof _FastConfig ? true : false;
const _fastHasTurbo: _FastHasTurbo = true;

// And MUST NOT pick up each other's keys.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _DefaultHasTurbo = "turbo" extends keyof _DefaultConfig ? true : false;
const _defaultHasTurbo: _DefaultHasTurbo = false;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _FastHasPlateauCount = "plateauCount" extends keyof _FastConfig ? true : false;
const _fastHasPlateauCount: _FastHasPlateauCount = false;

function _acceptsEnvelopeStrategy(_s: _EnvelopeStrategy): void {
  // type-only
}

// @ts-expect-error - strategy must be one of the declared strategy ids.
_acceptsEnvelopeStrategy("nope");

defineOp({
  kind: "compute",
  id: "test/missing-default-strategy",
  input: Type.Object({}, { additionalProperties: false }),
  output: Type.Object({}, { additionalProperties: false }),
  strategies: {
    // @ts-expect-error - defineOp requires a default strategy.
    fast: Type.Object({}, { additionalProperties: false }),
  },
});

// --- Step contract: op envelope schemas must be merged into step schema.

const MultiOpStepContract = defineStep({
  id: "multi-op-step",
  phase: "foundation",
  requires: [],
  provides: [],
  schema: Type.Object({}, { additionalProperties: false }),
  ops: {
    multi: MultiStrategyOp,
  },
});

type _StepRuntimeConfig = Static<(typeof MultiOpStepContract)["schema"]>;

// Step schema should include the op envelope property.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _StepHasMulti = "multi" extends keyof _StepRuntimeConfig ? true : false;
const _stepHasMulti: _StepHasMulti = true;

// And it should match the op's envelope type (i.e. be discriminated, not `unknown`).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _StepMultiEnvelope = _StepRuntimeConfig["multi"];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _StepMultiEnvelopeIsNotUnknown = unknown extends _StepMultiEnvelope ? false : true;
const _stepMultiEnvelopeIsNotUnknown: _StepMultiEnvelopeIsNotUnknown = true;

// Step runtime ops must receive the typed envelope (not unknown/any).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _RuntimeOps = StepRuntimeOps<{ multi: typeof MultiStrategyOp }>;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _RuntimeOpConfigParam = Parameters<_RuntimeOps["multi"]>[1];
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _RuntimeOpConfigHasStrategy = "strategy" extends keyof _RuntimeOpConfigParam ? true : false;
const _runtimeOpConfigHasStrategy: _RuntimeOpConfigHasStrategy = true;

// --- Stage + Recipe config authoring: keys must remain literal and indexed by known ids.

const MultiOpStep = createStep(MultiOpStepContract, { run: () => {} });

const KnobsSchema = Type.Object({}, { additionalProperties: false, default: {} });

const TypeTestStage = createStage({
  id: "type-test",
  knobsSchema: KnobsSchema,
  steps: [MultiOpStep] as const,
});

const TypeTestRecipe = createRecipe({
  id: "test.type-recipe",
  tagDefinitions: [],
  stages: [TypeTestStage] as const,
  compileOpsById: {},
});

type _ConfigInput = typeof TypeTestRecipe extends RecipeModule<any, infer TConfigInput, any>
  ? TConfigInput
  : never;

// Accessing unknown stage ids should be a type error (no index signature).
// @ts-expect-error - unknown stage id should not be indexable.
type _NoBogusStage = _ConfigInput["bogus-stage"]; // eslint-disable-line @typescript-eslint/no-unused-vars

type _TypeTestStageConfig = NonNullable<_ConfigInput["type-test"]>;

// @ts-expect-error - unknown step id should not be indexable.
type _NoBogusStep = _TypeTestStageConfig["bogus-step"]; // eslint-disable-line @typescript-eslint/no-unused-vars

type _TypeTestStepConfig = NonNullable<_TypeTestStageConfig["multi-op-step"]>;

// Step config should include the op envelope authoring surface.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _StepConfigHasMulti = "multi" extends keyof _TypeTestStepConfig ? true : false;
const _stepConfigHasMulti: _StepConfigHasMulti = true;

type _AuthoredMultiEnvelope = NonNullable<_TypeTestStepConfig["multi"]>;

// The authored envelope should still keep strategy ids narrow.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _AuthoredStrategy = _AuthoredMultiEnvelope extends { strategy?: infer S } ? S : never;
// eslint-disable-next-line @typescript-eslint/no-unused-vars
type _AuthoredStrategyIsNarrow = string extends Exclude<_AuthoredStrategy, undefined> ? false : true;
const _authoredStrategyIsNarrow: _AuthoredStrategyIsNarrow = true;

const _okConfig: _ConfigInput = {
  "type-test": {
    "multi-op-step": {
      multi: {
        strategy: "fast",
        config: {
          turbo: true,
        },
      },
    },
  },
};

const _badStrategyConfig: _ConfigInput = {
  "type-test": {
    "multi-op-step": {
      multi: {
        // @ts-expect-error - invalid strategy string should fail.
        strategy: "nope",
      },
    },
  },
};

const _badConfigValueType: _ConfigInput = {
  "type-test": {
    "multi-op-step": {
      multi: {
        strategy: "fast",
        config: {
          // @ts-expect-error - turbo must be boolean.
          turbo: 123,
        },
      },
    },
  },
};

export {};
