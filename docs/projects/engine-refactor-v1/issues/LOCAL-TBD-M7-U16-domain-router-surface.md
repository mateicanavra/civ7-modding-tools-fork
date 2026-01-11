---
id: LOCAL-TBD-M7-U16
title: "[M7] Domain router surface for ops and stage step routing"
state: planned
priority: 2
estimate: 3
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [architecture]
parent: null
children: []
blocked_by: []
blocked: []
related_to:
  - LOCAL-TBD-M7-B3
  - docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/03-authoring-patterns.md
  - docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/06-enforcement.md
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Standardize domain modules as the canonical router surface (`domain.ops` + `domain.contracts`) and update steps and recipes to bind through that surface, keeping op authoring unchanged while hiding `*OpsById` internals.

## Deliverables
- Domain router helper in `@swooper/mapgen-core/authoring` that exposes a compact surface (`domain.ops.bind(...)`) while keeping compile/runtime registries internal.
- Ecology and placement domain entrypoints updated to export `ops` and `contracts` as the primary surface (retain named exports as needed).
- Step modules updated to bind ops via the domain router surface (no direct `compileOpsById` or `runtimeOpsById` usage in steps).
- Recipe compilation updated to build compile registries via a single helper (no direct `compileOpsById` import).
- Import guardrails to prevent deep op imports outside domain modules, with documented exceptions for tests if needed.

## Acceptance Criteria
- [ ] Steps in `mods/mod-swooper-maps/src/recipes/**` bind ops via `domain.ops.bind(domain.contracts)` and do not import `compileOpsById` or `runtimeOpsById`.
- [ ] `mods/mod-swooper-maps/src/recipes/standard/recipe.ts` no longer imports `compileOpsById` directly; compile registries are collected through a helper.
- [ ] Domain entrypoints expose `ops` and `contracts` as the primary surface without requiring deep imports.
- [ ] Lint or path restrictions prevent `@mapgen/domain/*/ops/*` imports outside domain modules (tests can be exempted explicitly).
- [ ] Existing op authoring and strategy layout remain unchanged.

## Testing / Verification
- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`
- `pnpm -C mods/mod-swooper-maps check`

## Dependencies / Notes
- Related: [LOCAL-TBD-M7-B3](./LOCAL-TBD-M7-B3-domain-ops-registries.md)
- Reference: `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/03-authoring-patterns.md`
- Reference: `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/06-enforcement.md`

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Proposed public surface (author and step usage)

```ts
import * as ecology from "@mapgen/domain/ecology";

const { compile, runtime } = ecology.ops.bind(ecology.contracts);

// compile.* for normalize and config compilation
// runtime.* for run/runValidated in step execution
```

```ts
import { collectCompileOps } from "@swooper/mapgen-core/authoring";
import * as ecology from "@mapgen/domain/ecology";
import * as placement from "@mapgen/domain/placement";

const compileOpsById = collectCompileOps(ecology, placement);
```

### Domain router helper shape

Keep the internal registries explicit but scoped to the router surface, not the public API:

```ts
type DomainOpsRouter = {
  bind: <Decl extends Record<string, { id: string }>>(
    contracts: Decl
  ) => {
    compile: BoundCompileOps<Decl>;
    runtime: BoundRuntimeOps<Decl>;
  };
  _compileRegistry: CompileOpsById;
};
```

This preserves the compile/runtime split but keeps "by id" details out of the default surface.

### Stage and step routing

Stages already use a local `steps` index. Codify this as the only import path for steps outside their own directory:
- `stages/<stage>/index.ts` should import from `./steps/index.ts`
- avoid importing `./steps/<step>` directly outside the step directory

### Guardrails

Add a focused lint rule in `eslint.config.js` to forbid deep imports:
- Disallow `@mapgen/domain/*/ops/*` outside `mods/mod-swooper-maps/src/domain/**`
- Allow `@mapgen/domain/<domain>` and `@mapgen/domain/<domain>/contracts` until all usages are migrated

### Implementation guidance

| File | Notes |
| --- | --- |
| `packages/mapgen-core/src/authoring/bindings.ts` | Add helper to build domain router surface; reuse existing bind helpers. |
| `packages/mapgen-core/src/authoring/index.ts` | Export the new helper for recipe and step callers. |
| `mods/mod-swooper-maps/src/domain/ecology/index.ts` | Replace `compileOpsById`/`runtimeOpsById` exports with `ops` router surface. |
| `mods/mod-swooper-maps/src/domain/placement/index.ts` | Mirror ecology changes. |
| `mods/mod-swooper-maps/src/recipes/standard/recipe.ts` | Use `collectCompileOps` helper instead of direct registries. |
| `mods/mod-swooper-maps/src/recipes/standard/stages/**/steps/**/index.ts` | Bind via `domain.ops.bind(domain.contracts)`. |
| `eslint.config.js` | Add import restrictions with scoped allowlist. |

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
