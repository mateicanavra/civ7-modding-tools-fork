import type { TSchema } from "typebox";

import type { DomainOp } from "./op/types.js";

export type OpId = string;
export type OpsById<Op extends { id: OpId }> = Readonly<{
  [K in Op["id"]]: Extract<Op, { id: K }>;
}>;

export type DomainOpCompileAny = DomainOp<
  TSchema,
  TSchema,
  Record<string, { config: TSchema }>,
  string
>;

export type DomainOpRuntime<Op extends DomainOpCompileAny> = Op extends DomainOpCompileAny
  ? Readonly<{
      id: Op["id"];
      kind: Op["kind"];
      run: Op["run"];
      validate: Op["validate"];
      runValidated: Op["runValidated"];
    }>
  : never;

export type DomainOpRuntimeAny = DomainOpRuntime<DomainOpCompileAny>;

export class OpBindingError extends Error {
  readonly opKey: string;
  readonly opId: string;

  constructor(opKey: string, opId: string) {
    super(`Missing op implementation for key "${opKey}" (id: "${opId}")`);
    this.name = "OpBindingError";
    this.opKey = opKey;
    this.opId = opId;
  }
}

type BoundOps<
  Decl extends Record<string, { id: string }>,
  Registry extends Record<string, unknown>,
> = {
  [K in keyof Decl]: Registry[Decl[K]["id"] & keyof Registry];
};

function bindOps<Decl extends Record<string, { id: string }>, Registry extends Record<string, unknown>>(
  decl: Decl,
  registryById: Registry
): BoundOps<Decl, Registry> {
  const out = {} as BoundOps<Decl, Registry>;
  for (const key of Object.keys(decl) as Array<keyof Decl>) {
    const opId = decl[key].id;
    const op = registryById[opId as keyof Registry];
    if (!op) throw new OpBindingError(String(key), opId);
    out[key] = op as BoundOps<Decl, Registry>[typeof key];
  }
  return out;
}

export function bindCompileOps<
  const Decl extends Record<string, { id: string }>,
  const Registry extends Readonly<Record<string, DomainOpCompileAny>>,
>(
  decl: Decl,
  registryById: Registry
): BoundOps<Decl, Registry> {
  return bindOps(decl, registryById);
}

export function bindRuntimeOps<
  const Decl extends Record<string, { id: string }>,
  const Registry extends Readonly<Record<string, DomainOpRuntimeAny>>,
>(
  decl: Decl,
  registryById: Registry
): BoundOps<Decl, Registry> {
  return bindOps(decl, registryById);
}

export function runtimeOp<Op extends DomainOpCompileAny>(op: Op): DomainOpRuntime<Op> {
  return {
    id: op.id,
    kind: op.kind,
    run: op.run,
    validate: op.validate,
    runValidated: op.runValidated,
  } as DomainOpRuntime<Op>;
}
