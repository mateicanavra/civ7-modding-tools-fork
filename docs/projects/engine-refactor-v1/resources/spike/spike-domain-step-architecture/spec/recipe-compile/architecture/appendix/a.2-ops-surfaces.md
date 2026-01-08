### A.2 Ops: contracts, shared envelopes, and compile vs runtime surfaces (pinned)

Files:
- `packages/mapgen-core/src/authoring/op/contract.ts` (baseline; unchanged)
- `packages/mapgen-core/src/authoring/op/envelope.ts` (baseline; shared envelope derivation)
- `packages/mapgen-core/src/authoring/op/create.ts` (baseline; uses shared envelope derivation)
- `packages/mapgen-core/src/authoring/op/ref.ts` (baseline; convenience ref, not required by step authors)
- `packages/mapgen-core/src/authoring/bindings.ts` **NEW (planned)** (canonical binding helpers; structural runtime surface)

```ts
import type { TSchema } from "typebox";

import type { OpContract } from "../op/contract.js";
import type { DomainOp } from "../op/types.js";

type OpContractAny = OpContract<any, any, any, any, any>;
type DomainOpAny = DomainOp<TSchema, TSchema, Record<string, { config: TSchema }>>;

// Compile-visible op surface (includes normalize/defaultConfig/strategies access via DomainOp shape).
export type DomainOpCompileAny = DomainOpAny & Readonly<{ id: string; kind: string }>;

// Runtime-visible op surface (structurally stripped; cannot normalize).
export type DomainOpRuntimeAny = Pick<
  DomainOpCompileAny,
  "id" | "kind" | "run" | "validate" | "runValidated"
>;

export function runtimeOp(op: DomainOpCompileAny): DomainOpRuntimeAny {
  return {
    id: op.id,
    kind: op.kind,
    run: op.run,
    validate: op.validate,
    runValidated: op.runValidated,
  };
}

export type StepOpsDecl = Readonly<Record<string, OpContractAny>>;

export function bindCompileOps<const Decl extends Record<string, { id: string }>>(
  decl: Decl,
  registryById: Readonly<Record<string, DomainOpCompileAny>>
): { [K in keyof Decl]: DomainOpCompileAny } {
  const out: any = {};
  for (const k of Object.keys(decl)) {
    const id = (decl as any)[k].id;
    const op = registryById[id];
    if (!op) throw new Error(`bindCompileOps: missing op id "${id}" for key "${k}"`);
    out[k] = op;
  }
  return out;
}

export function bindRuntimeOps<const Decl extends Record<string, { id: string }>>(
  decl: Decl,
  registryById: Readonly<Record<string, DomainOpCompileAny>>
): { [K in keyof Decl]: DomainOpRuntimeAny } {
  const out: any = {};
  for (const k of Object.keys(decl)) {
    const id = (decl as any)[k].id;
    const op = registryById[id];
    if (!op) throw new Error(`bindRuntimeOps: missing op id "${id}" for key "${k}"`);
    out[k] = runtimeOp(op);
  }
  return out;
}
```

