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
  config: TSchema;
  defaultConfig: Readonly<{ strategy: "default"; config: unknown }>;
}>;

export type StepOpsDecl = Readonly<Record<string, OpContractAny>>;

type BivariantFn<Args extends unknown[], R> = {
  bivarianceHack(...args: Args): R;
}["bivarianceHack"];

export type RuntimeOpFromContract<C extends OpContractAny> = BivariantFn<
  [input: Static<C["input"]>, config: OpTypeBag<C>["envelope"]],
  Static<C["output"]>
> &
  Readonly<{
    id: C["id"];
    kind: C["kind"];
  }>;

export type StepRuntimeOps<Decl> = [Decl] extends [StepOpsDecl]
  ? { [K in keyof Decl]: RuntimeOpFromContract<Decl[K]> }
  : {};
