import type { DomainOpCompileAny, DomainOpsSurface } from "./bindings.js";
import { createDomainOpsSurface } from "./bindings.js";
import type { StepOpsDecl } from "./step/ops.js";

export type DomainContract<Id extends string, Ops extends StepOpsDecl> = Readonly<{
  id: Id;
  ops: Ops;
}>;

export type DomainContractAny = DomainContract<string, StepOpsDecl>;

export function defineDomain<Id extends string, Ops extends StepOpsDecl>(
  def: DomainContract<Id, Ops>
): typeof def {
  return def;
}

export type DomainOpImplementationsForContracts<TContracts extends Record<string, { id: string }>> =
  Readonly<{
    [K in keyof TContracts]: DomainOpCompileAny & Readonly<{ id: TContracts[K]["id"] }>;
  }>;

export type DomainModule<
  C extends DomainContractAny,
  Implementations extends Readonly<Record<string, DomainOpCompileAny>>,
> = Readonly<{
  contract: C;
  ops: DomainOpsSurface<Implementations>;
}>;

export function createDomain<
  C extends DomainContractAny,
  Implementations extends DomainOpImplementationsForContracts<C["ops"]>,
>(contract: C, implementations: Implementations): DomainModule<C, Implementations> {
  return {
    contract,
    ops: createDomainOpsSurface(implementations),
  } as const;
}
