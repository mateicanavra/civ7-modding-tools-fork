import { Type, type TSchema } from "typebox";

import type { StrategyConfigSchemas } from "./contract.js";
import { buildDefaultConfigValue } from "./defaults.js";

export type OpEnvelopeBuildResult = Readonly<{
  schema: TSchema;
  defaultConfig: Readonly<{ strategy: "default"; config: Record<string, unknown> }>;
  strategyIds: readonly string[];
}>;

export function buildOpEnvelopeSchema(
  contractId: string,
  strategySchemas: StrategyConfigSchemas
): OpEnvelopeBuildResult {
  if (!Object.prototype.hasOwnProperty.call(strategySchemas, "default")) {
    throw new Error(`op(${contractId}) missing required "default" strategy schema`);
  }

  const strategyIds = Object.keys(strategySchemas);
  if (strategyIds.length === 0) {
    throw new Error(`op(${contractId}) received empty strategies`);
  }

  const defaultInnerConfig = buildDefaultConfigValue(strategySchemas.default) as Record<
    string,
    unknown
  >;
  const defaultConfig = { strategy: "default", config: defaultInnerConfig } as const;

  const cases = strategyIds.map((id) =>
    Type.Object(
      {
        strategy: Type.Literal(id),
        config: strategySchemas[id]!,
      },
      { additionalProperties: false }
    )
  );

  const schema = Type.Union(cases as any, { default: defaultConfig });
  return { schema, defaultConfig, strategyIds };
}
