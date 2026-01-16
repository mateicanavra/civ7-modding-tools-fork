import type { Static } from "typebox";

import type { OpContract } from "../op/contract.js";
import type { OpTypeBagOf } from "../op/types.js";

export type OpContractAny = OpContract<any, any, any, any, any>;

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
