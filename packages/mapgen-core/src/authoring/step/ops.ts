import type { Static } from "typebox";

import type { OpContract } from "../op/contract.js";
import type { OpTypeBagOf } from "../op/types.js";

export type OpContractAny = OpContract<any, any, any, any, any>;

export type StepOpUse<C extends OpContractAny = OpContractAny> = Readonly<{
  contract: C;
  /**
   * Optional per-step default strategy. This only affects the default config used when the author
   * omits this op envelope entirely; the author can still override `strategy` via advanced config.
   */
  defaultStrategy?: keyof C["strategies"] & string;
}>;

export type StepOpsDeclInput = Readonly<Record<string, OpContractAny | StepOpUse<OpContractAny>>>;

export type StepOpsDecl = Readonly<Record<string, OpContractAny>>;

type BivariantFn<Args extends unknown[], R> = {
  bivarianceHack(...args: Args): R;
}["bivarianceHack"];

export type RuntimeOpFromContract<C extends OpContractAny> = BivariantFn<
  [input: Static<C["input"]>, config: OpTypeBagOf<C>["envelope"]],
  Static<C["output"]>
> &
  Readonly<{
    id: C["id"];
    kind: C["kind"];
  }>;

export type StepRuntimeOps<Decl> = [Decl] extends [StepOpsDecl]
  ? { [K in keyof Decl]: RuntimeOpFromContract<Decl[K]> }
  : {};
