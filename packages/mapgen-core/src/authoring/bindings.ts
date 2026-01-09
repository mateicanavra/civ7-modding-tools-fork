import type { TSchema } from "typebox";

import type { DomainOp } from "./op/types.js";

export type OpId = string;
export type OpsById<Op> = Readonly<Record<OpId, Op>>;

export type DomainOpCompileAny = DomainOp<TSchema, TSchema, Record<string, { config: TSchema }>> & {
  normalize?: (envelope: unknown, ctx: { env: unknown; knobs: unknown }) => unknown;
};

export type DomainOpRuntimeAny = Readonly<{
  id: DomainOpCompileAny["id"];
  kind: DomainOpCompileAny["kind"];
  run: DomainOpCompileAny["run"];
  validate: DomainOpCompileAny["validate"];
  runValidated: DomainOpCompileAny["runValidated"];
}>;

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

function bindOps<Op, Decl extends Record<string, { id: string }>>(
  decl: Decl,
  registryById: OpsById<Op>
): { [K in keyof Decl]: Op } {
  const out = {} as { [K in keyof Decl]: Op };
  for (const key of Object.keys(decl) as Array<keyof Decl>) {
    const opId = decl[key].id;
    const op = registryById[opId];
    if (!op) throw new OpBindingError(String(key), opId);
    out[key] = op;
  }
  return out;
}

export function bindCompileOps<const Decl extends Record<string, { id: string }>>(
  decl: Decl,
  registryById: OpsById<DomainOpCompileAny>
): { [K in keyof Decl]: DomainOpCompileAny } {
  return bindOps(decl, registryById);
}

export function bindRuntimeOps<const Decl extends Record<string, { id: string }>>(
  decl: Decl,
  registryById: OpsById<DomainOpRuntimeAny>
): { [K in keyof Decl]: DomainOpRuntimeAny } {
  return bindOps(decl, registryById);
}

export function runtimeOp(op: DomainOpCompileAny): DomainOpRuntimeAny {
  return {
    id: op.id,
    kind: op.kind,
    run: op.run,
    validate: op.validate,
    runValidated: op.runValidated,
  };
}
