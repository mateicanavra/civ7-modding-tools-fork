import type { TSchema } from "typebox";

import type { OpContract } from "./contract.js";
import { buildOpEnvelopeSchema } from "./envelope.js";

export type OpRef = Readonly<{
  id: string;
  config: TSchema;
}>;

export function opRef<const C extends OpContract<any, any, any, any, any>>(contract: C): OpRef {
  const { schema } = buildOpEnvelopeSchema(contract.id, contract.strategies);
  return { id: contract.id, config: schema };
}
