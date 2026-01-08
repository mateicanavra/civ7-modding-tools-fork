### 1.14 Binding helpers

#### Purpose

Provide one canonical binding API that:

- Maps from contract-declared ops (contracts) to implementation registries by id.
- Produces **two** surfaces:
  - compile surface (includes normalize/defaultConfig/schema access)
  - runtime surface (structurally stripped; cannot normalize)

This is structural enforcement (not TS-only).

#### Canonical location

`packages/mapgen-core/src/authoring/bindings.ts`

(Exports are used by both steps and compiler; must not import engine plan compiler internals.)

#### Canonical types

Op registry shape:

```ts
export type OpId = string;
export type OpsById<Op> = Readonly<Record<OpId, Op>>;
```

Domain packages should export a deterministic registry (built, not hand-maintained), e.g.:

- `opsById` from the domain public surface (e.g. `import * as ecology from "@mapgen/domain/ecology"; ecology.opsById`)

DX rule (pinned): step modules / recipes / tests must not deep-import domain internals (e.g. no `@mapgen/domain/ecology/ops-by-id` import). The domain entrypoint is the only allowed cross-module import path.

#### Canonical APIs

`bindCompileOps` — used only by compiler pipeline helpers that need access to normalize/defaultConfig:

```ts
export function bindCompileOps<const Decl extends Record<string, { id: string }>>(
  decl: Decl,
  registryById: Record<string, DomainOpCompileAny>
): { [K in keyof Decl]: DomainOpCompileAny };
```

`bindRuntimeOps` — used inside step module closure:

```ts
export function bindRuntimeOps<const Decl extends Record<string, { id: string }>>(
  decl: Decl,
  registryById: Record<string, DomainOpCompileAny>
): { [K in keyof Decl]: DomainOpRuntimeAny };
```

Structural stripping (compile → runtime):

```ts
export function runtimeOp(op: DomainOpCompileAny): DomainOpRuntimeAny {
  return {
    id: op.id,
    kind: op.kind,
    run: op.run,
    validate: op.validate,
    runValidated: op.runValidated,
  } as const;
}
```

Binding behavior and constraints:

- Throw if a contract references an op id not present in the registry.
- Preserve decl keys for IDE completion (`as const` + const generics).

Testing usage (no per-step factories as primitives):

```ts
const fakeOpsById = {
  "ecology/planTreeVegetation": makeFakeOp(),
  "ecology/planShrubVegetation": makeFakeOp(),
};

const ops = bindRuntimeOps(contract.ops, fakeOpsById);
// step.run uses ops closure binding; you can invoke it under a mocked ctx/config
```

No bespoke `createPlotVegetationStep` factory is introduced as an architectural primitive.

---
