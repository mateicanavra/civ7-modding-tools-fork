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

type BivariantFn<Args extends unknown[], R> = {
  bivarianceHack(...args: Args): R;
}["bivarianceHack"];

export type DomainOpImplementationsFor<
  TContracts extends Record<string, { id: string }>,
  TOp extends DomainOpCompileAny = DomainOpCompileAny,
> = Readonly<{ [K in keyof TContracts]: TOp }>;

export type DomainOpRuntime<Op extends DomainOpCompileAny> = Op extends DomainOpCompileAny
  ? BivariantFn<
      [input: Parameters<Op["run"]>[0], config: Parameters<Op["run"]>[1]],
      ReturnType<Op["run"]>
    > &
      Readonly<{
        id: Op["id"];
        kind: Op["kind"];
      }>
  : never;

export type DomainOpRuntimeAny = DomainOpRuntime<DomainOpCompileAny>;

export type DomainOpsRouter<Op extends DomainOpCompileAny> = Readonly<{
  bind: <Decl extends Record<string, { id: string }>>(contracts: Decl) => {
    compile: BoundOps<Decl, OpsById<Op>>;
    runtime: BoundOps<Decl, OpsById<DomainOpRuntime<Op>>>;
  };
  _compileRegistry: OpsById<Op>;
  _runtimeRegistry: OpsById<DomainOpRuntime<Op>>;
}>;

export type DomainOpsSurface<TOps extends Record<string, DomainOpCompileAny>> = Readonly<
  TOps & DomainOpsRouter<TOps[keyof TOps]>
>;

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

function buildOpsById<const TOps extends Record<string, DomainOpCompileAny>>(
  input: TOps
): OpsById<TOps[keyof TOps]> {
  const out: Partial<OpsById<TOps[keyof TOps]>> = {};
  for (const op of Object.values(input) as Array<TOps[keyof TOps]>) {
    out[op.id as TOps[keyof TOps]["id"]] = op as OpsById<TOps[keyof TOps]>[TOps[keyof TOps]["id"]];
  }
  return out as OpsById<TOps[keyof TOps]>;
}

function buildRuntimeOpsById<const TOps extends Record<string, DomainOpCompileAny>>(
  input: TOps
): OpsById<DomainOpRuntime<TOps[keyof TOps]>> {
  const out: Partial<OpsById<DomainOpRuntime<TOps[keyof TOps]>>> = {};
  for (const op of Object.values(input) as Array<TOps[keyof TOps]>) {
    const runtime = runtimeOp(op);
    out[runtime.id as DomainOpRuntime<TOps[keyof TOps]>["id"]] =
      runtime as OpsById<DomainOpRuntime<TOps[keyof TOps]>>[DomainOpRuntime<TOps[keyof TOps]>["id"]];
  }
  return out as OpsById<DomainOpRuntime<TOps[keyof TOps]>>;
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

export function createDomainOpsSurface<const TOps extends Record<string, DomainOpCompileAny>>(
  input: TOps
): DomainOpsSurface<TOps> {
  const compileRegistry = buildOpsById(input);
  const runtimeRegistry = buildRuntimeOpsById(input);
  const router: DomainOpsRouter<TOps[keyof TOps]> = {
    bind: (contracts) => ({
      compile: bindCompileOps(contracts, compileRegistry),
      runtime: bindRuntimeOps(contracts, runtimeRegistry),
    }),
    _compileRegistry: compileRegistry,
    _runtimeRegistry: runtimeRegistry,
  };

  return {
    ...input,
    ...router,
  };
}

export function collectCompileOps(
  ...domains: Array<{ ops: DomainOpsRouter<DomainOpCompileAny> }>
): OpsById<DomainOpCompileAny> {
  const out: Record<string, DomainOpCompileAny> = {};
  for (const domain of domains) {
    Object.assign(out, domain.ops._compileRegistry);
  }
  return out as OpsById<DomainOpCompileAny>;
}

export function runtimeOp<Op extends DomainOpCompileAny>(op: Op): DomainOpRuntime<Op> {
  const fn = ((input: Parameters<Op["run"]>[0], config: Parameters<Op["run"]>[1]) => {
    return op.run(input, config);
  }) as DomainOpRuntime<Op>;

  Object.defineProperties(fn, {
    id: { value: op.id, enumerable: true },
    kind: { value: op.kind, enumerable: true },
  });

  return fn;
}
