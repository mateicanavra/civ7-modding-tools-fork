import type { TSchema } from "typebox";

import type { OpContract } from "./contract.js";
import { buildOpEnvelopeSchema, buildOpEnvelopeSchemaWithDefaultStrategy } from "./envelope.js";

export type OpRef = Readonly<{
  id: string;
  config: TSchema;
}>;

export function opRef<const C extends OpContract<any, any, any, any, any>>(contract: C): OpRef {
  const { schema } = buildOpEnvelopeSchema(contract.id, contract.strategies);
  return { id: contract.id, config: schema };
}

export function opRefWithDefaultStrategy<const C extends OpContract<any, any, any, any, any>>(
  contract: C,
  defaultStrategy: string
): OpRef {
  const { schema } = buildOpEnvelopeSchemaWithDefaultStrategy(
    contract.id,
    contract.strategies,
    defaultStrategy
  );
  return { id: contract.id, config: schema };
}
