---
milestone: M7
id: M7-review
status: draft
reviewer: AI agent
---

# Engine Refactor v1 — Milestone M7 Review

## LOCAL-TBD-M6-U11 — Canonicalize ecology domain operation modules

### Quick take
Mostly yes: the ecology `ops/**` layer now matches the intended “pure ops + strict kinds + key-based plans” contract. The remaining gaps are primarily (1) runtime validation looseness for plot-effect keys and (2) continued adapter usage in non-op ecology exports (biome bindings), which conflicts with the issue’s “engine binding lives in steps” target outcome.
Note: the issue title/id says `[M6]`, but based on milestone context this should have been tracked as **M7**; the review is filed under M7 accordingly.

### Status
Resolved. Both high-leverage gaps are addressed.

### What’s strong
- `mods/mod-swooper-maps/src/domain/ecology/ops/**` is contract-pure (no adapter/TraceScope/devLogJson/Type.Any; typed-array schemas used).
- Strict op kinds/naming: single `compute` (`classifyBiomes`); placements/embellishments are verb-forward `plan*`.
- Key-based plans are applied at the step boundary with explicit key→engine-ID resolution and “throw on unknown key” guardrails.
- Legacy baseline strategy is gone from the `features` step (`addFeatures` / `useEngineBaseline` removed).

### High-leverage issues
- **Plot-effect key validation is effectively “any string” at the op boundary.**
  - `PlotEffectKey` is typed as `` `PLOTEFFECT_${string}` `` but the op schema is `Type.String()`, so `runValidated` doesn’t enforce prefix/shape; typos only fail later during apply-time adapter resolution.
  - Direction: add at least a schema-level `pattern: "^PLOTEFFECT_"` (or an explicit key set if the mod expects a bounded list) so invalid outputs/config fail at the op boundary.
- **Non-op ecology exports still perform engine binding.**
  - `mods/mod-swooper-maps/src/domain/ecology/biome-bindings.ts` exports `resolveEngineBiomeIds(adapter, ...)`, which conflicts with the issue’s “engine binding/logging lives strictly in the step layer” framing.
  - Direction: move adapter-dependent binding helpers into the `biomes` step (or an explicit step-scoped helper module) and keep `src/domain/ecology/**` engine-agnostic outside the step boundary.

### Implementation decisions review
- Logged decisions reviewed: 3 (D5 deterministic RNG via seed; D6 diagnostics/logging step-owned; D7 split embellishments into two plan ops).
- Unlogged decisions noticed: 1 (plot-effect key validation relies on apply-time engine lookup rather than op-boundary validation).
- Side-effect risks: D5 distribution changes are expected; plot-effect key validation gap delays failure to runtime apply stage.

### Recommended next moves
- Tighten plot-effect key schema validation to fail early at `runValidated`.
- Align biome engine binding placement with the intended step/domain boundary (move adapter-dependent helper out of `src/domain/ecology/**`).

### Follow-up (implemented)
- `PlotEffectKey` output schema now enforces the `PLOTEFFECT_` prefix (fails early at `runValidated`).
- Biome engine-ID binding is now step-scoped (`mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/biomes/helpers/engine-bindings.ts`); `src/domain/ecology/**` no longer imports `@civ7/adapter`.

## LOCAL-TBD-M7-U16 — Land converged contract-first op + step authoring (strategy envelopes + step binder)

### Quick take
Mostly yes: the core authoring surfaces landed and mod call sites now use envelope configs + bound step factories. The main gap is rules/type-boundary enforcement (Decision D8), where rule modules still import/emit types outside the op `types.ts` surface.

### Status
Resolved, with one nice-to-have still open.

### What’s strong
- Contract-first authoring APIs are in place for ops/steps (`defineOp`/`createOp`/`createStrategy`, `defineStep`/`createStep`/`createStepFor`).
- Recipe compilation forwards step `resolveConfig`, and execution-plan normalization re-validates resolver output.
- Mod step contracts are metadata-only; implementations use the bound `createStep` factory with envelope configs + defaults.

### High-leverage issues
- **Rules boundary violations undermine the centralized types contract.**
  - This conflicts with Decision D8 (rules import types from `types.ts` only; no type exports). It reintroduces contract coupling and makes refactors brittle.
  - Direction: move these types into the op’s `types.ts` (or a dedicated type module) and keep rules as type-only consumers.

### Implementation decisions review
- Logged decisions reviewed: D1–D8.
- Gaps: D8 (rules boundary) is not fully honored.
- Side-effect risks: rules-to-contract coupling can silently expand the op surface area and impede future authoring changes.

### Recommended next moves
- Normalize rules to import types from `types.ts` and remove type exports from rules modules.

### Nice-to-have
Resolved: removed legacy `defineOpSchema` export from `packages/mapgen-core/src/authoring/index.ts`.

## Fix Loop Update (M7)
- Review points: follow-ups landed and rules boundary violations now import types from each op’s `types.ts` surface (no rule exports).
- Additional fixes (to unblock full suite): op config schema typing now uses `TUnsafe` for strategy envelope `Static<>` inference, ecology ops use `@mapgen/domain` aliases for cross-module imports, and contract `as const` assertions were removed to match authoring spec.
- Validation: `bun run check`, `bun run build`, `bun run test`, `bun run lint`.
- A1 review follow-up: added `normalizeOpsTopLevel` tests for `op.missing` + `op.normalize.failed` in `packages/mapgen-core/test/compiler/normalize.test.ts`.
- A1 review follow-up: unknown-key detection now traverses array items for stable paths (test added in `packages/mapgen-core/test/compiler/normalize.test.ts`).

## PR Thread Status (Stack Review Follow-up)

### Resolved
- PR #432: `Static` import added for `plan-vegetated-feature-placements` strategy config typing.
- PR #430: recursive defaults + schema conventions preserve nested defaults.
- PR #409: object-level defaults no longer mask property defaults (schema conventions).
- PR #398: stage public config compile happens before recipe run.
- PR #397: map configs updated to new kebab-case step ids.
- PR #395: unknown-key detection now traverses array items with stable paths.
- PR #401: compile plan is validate-only; no step-level resolve/normalize in execution-plan compilation.
- Nice-to-have: removed legacy `defineOpSchema` export from `packages/mapgen-core/src/authoring/index.ts`.

### Superseded
- PR #428: `applySchemaDefaults` export removed; call sites updated to new conventions.

### Still open
- PR #445: update default-only export consumers (classify-biomes, plan-plot-effects tests).
- PR #435: lint glob should match `**/*.contract.ts`.
- PR #396: reject reserved step id `knobs`.
