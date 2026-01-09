---
id: LOCAL-TBD-M7-A1
title: "[M7] Compiler module skeleton + strict normalization"
state: planned
priority: 2
estimate: 4
project: engine-refactor-v1
milestone: M7
assignees: []
labels: [architecture]
parent: LOCAL-TBD-M7-A
children: []
blocked_by: []
blocked:
  - LOCAL-TBD-M7-A2
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Land compiler primitives (strict schema normalization + op envelope prefill + error aggregation) behind a compiler module boundary. This is the "DX-first win" slice: landable before any recipe/engine wiring changes.

## Deliverables

- `normalizeStrict(schema, raw, path)` and its error surface
- `prefillOpDefaults(step, rawStepConfig, path)` driven by step.contract.ops
- `normalizeOpsTopLevel(step, stepConfig, ctx, compileOpsById, path)` contract-driven
- `RecipeCompileError` with structured `CompileErrorItem[]`

## Acceptance Criteria

- [ ] New compiler helpers exist as modules under `/packages/mapgen-core/src/compiler/**` and are exported for tests to import.
- [ ] `normalizeStrict(schema, raw, path)` (or equivalent) reports unknown-key errors deterministically and in a stable path format.
- [ ] `prefillOpDefaults(stepContract, rawStepConfig, path)` installs missing op envelopes **only** based on contract-declared ops (no nested scanning).
- [ ] Unit tests cover: unknown keys, null/undefined behavior, and error path formatting; tests are deterministic.

## Scope Boundaries

**In scope:**
- Strict normalization helpers and error surface for the compiler.
- Default envelope construction for ops based on contracts/strategies.
- Unit tests for the helpers (no runtime wiring).

**Out of scope:**
- Any changes to `/packages/mapgen-core/src/authoring/recipe.ts` or mod runtime wiring.
- Any changes to engine planner/executor behavior (that is D1/D2).

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- `pnpm -C packages/mapgen-core check`

## Dependencies / Notes

- **Reference disclaimer:** DO NOT consult non-target MapGen architecture/spec docs outside `spec_package`; they conflict with the target spec and will cause confusion.
- See `non_target_arch_docs_off_limits` in the milestone doc for off-limits paths.
- **Blocked:** [LOCAL-TBD-M7-A2](./LOCAL-TBD-M7-A2-compile-recipe-config-wiring.md)

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Implementation Notes

- Normalize strictly using TypeBox Value.Default + Value.Clean, and report unknown keys separately (additionalProperties:false).
- Prefill op defaults by reading step.contract.ops (contract-driven discovery) and installing default envelope values built from op contract strategies.
- Normalize op envelopes top-level only by iterating contract-declared op keys; never scan nested config.

### Test Notes

- Include tests for unknown-key errors, null/undefined behavior, and error path formatting.

### New Files Planned

- `packages/mapgen-core/src/compiler/normalize.ts`
- `packages/mapgen-core/src/compiler/recipe-compile.ts`

### Implementation Guidance

| File | Notes |
|---|---|
| `/packages/mapgen-core/src/compiler/normalize.ts` | New: strict normalization utilities + unknown key error surface + stable error path formatting. |
| `/packages/mapgen-core/src/compiler/recipe-compile.ts` | New: compiler entrypoints will live here; for A1 focus on helper exports, not full wiring. |
| `/packages/mapgen-core/src/engine/execution-plan.ts` | Baseline prior art for unknown-key detection + Value.Errors formatting (findUnknownKeyErrors + formatErrors). |
| `/packages/mapgen-core/src/authoring/op/defaults.ts` | Baseline prior art for defaulting/convert/clean pipeline when constructing default envelope configs. |

### Paper Trail

- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/02-compilation.md` (§1.10, §1.20)
- `docs/projects/engine-refactor-v1/resources/spec/recipe-compile/architecture/00-fundamentals.md` (I2, I6, I7)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Scope Boundaries](#scope-boundaries)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)
