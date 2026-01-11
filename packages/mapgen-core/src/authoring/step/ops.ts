import type { Static, TSchema } from "typebox";

import type { OpTypeBag } from "../op/types.js";
import type { StrategyConfigSchemas } from "../op/contract.js";
import type { DomainOpKind } from "../op/types.js";

export type OpContractAny = Readonly<{
  kind: DomainOpKind;
  id: string;
  input: TSchema;
  output: TSchema;
  strategies: StrategyConfigSchemas & { default: TSchema };
}>;

export type StepOpsDecl = Readonly<Record<string, OpContractAny>>;

export type RuntimeOpFromContract<C extends OpContractAny> = Readonly<{
  id: C["id"];
  kind: C["kind"];
  run: (input: Static<C["input"]>, config: OpTypeBag<C>["envelope"]) => Static<C["output"]>;
}>;

export type StepRuntimeOps<Decl> = [Decl] extends [StepOpsDecl]
  ? { [K in keyof Decl]: RuntimeOpFromContract<Decl[K]> }
  : {};
