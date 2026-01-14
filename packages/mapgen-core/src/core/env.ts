import { Type, type Static } from "typebox";

const UnknownRecord = Type.Record(Type.String(), Type.Unknown(), { default: {} });

export const TraceLevelSchema = Type.Union([
  Type.Literal("off"),
  Type.Literal("basic"),
  Type.Literal("verbose"),
]);

export const TraceConfigSchema = Type.Object(
  {
    enabled: Type.Optional(
      Type.Boolean({
        description: "Master tracing switch.",
      })
    ),
    steps: Type.Optional(
      Type.Record(Type.String(), TraceLevelSchema, {
        default: {},
        description: "Per-step trace verbosity (off/basic/verbose).",
      })
    ),
  },
  { additionalProperties: false, default: {} }
);

export const EnvSchema = Type.Object(
  {
    seed: Type.Number(),
    dimensions: Type.Object(
      {
        width: Type.Number(),
        height: Type.Number(),
      },
      { additionalProperties: false }
    ),
    latitudeBounds: Type.Object(
      {
        topLatitude: Type.Number(),
        bottomLatitude: Type.Number(),
      },
      { additionalProperties: false }
    ),
    wrap: Type.Object(
      {
        wrapX: Type.Boolean(),
        wrapY: Type.Boolean(),
      },
      { additionalProperties: false }
    ),
    metadata: Type.Optional(UnknownRecord),
    trace: Type.Optional(TraceConfigSchema),
  },
  { additionalProperties: false }
);

export type Env = Static<typeof EnvSchema>;
