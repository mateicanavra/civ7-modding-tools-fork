---
id: LOCAL-TBD-M6-U07
title: "[M6] Delete legacy base/bootstrap/config/orchestrator"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M6
assignees: []
labels: []
parent: null
children: []
blocked_by: [LOCAL-TBD-M6-U06, LOCAL-TBD-M6-U08]
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
Remove legacy base/bootstrap/config/orchestrator surfaces after the new pipeline is live.

## Deliverables
- Delete `packages/mapgen-core/src/base/**`.
- Delete `packages/mapgen-core/src/bootstrap/**` and `packages/mapgen-core/src/config/**`.
- Delete `packages/mapgen-core/src/orchestrator/task-graph.ts` and `PipelineModV1`.
- Remove `@swooper/mapgen-core/base` export surface and legacy re-exports.

## Acceptance Criteria
- Legacy modules are removed and no longer exported from `packages/mapgen-core/src/index.ts`.
- `runTaskGraphGeneration` and base mod contracts are no longer referenced.
- Engine and mod tests pass without legacy paths.

## Testing / Verification
- `pnpm -C packages/mapgen-core test`
- `pnpm -C mods/mod-swooper-maps test`

## Dependencies / Notes
- Blocked by: [LOCAL-TBD-M6-U06](./LOCAL-TBD-M6-U06-rewrite-maps-as-recipe-instances.md), [LOCAL-TBD-M6-U08](./LOCAL-TBD-M6-U08-realign-tests-and-ci-gates-to-ownership.md)

## Remediation (SPIKE alignment)
- [ ] Align with [SPIKE (M6)](../resources/SPIKE-m6-standard-mod-feature-sliced-content-ownership.md) by completing [R1](../plans/m6-spike-structure-remediation-plan.md#r1), [R2](../plans/m6-spike-structure-remediation-plan.md#r2), [R4](../plans/m6-spike-structure-remediation-plan.md#r4), and [R5](../plans/m6-spike-structure-remediation-plan.md#r5).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)
- Remove base/bootstrap/config/orchestrator modules only after map entrypoints and tests have cut over.
- Ensure `packages/mapgen-core/src/index.ts` and package exports drop legacy surfaces.

## Implementation Decisions

### Type stages/recipes over step tuples instead of using bivariant `run`
- **Context:** Authoring steps should default to `unknown` for config safety, but stages still need to hold steps with concrete config types.
- **Options:** Widen to `any`, keep a bivariant `run` callback, or make `Stage`/`RecipeDefinition` generic over the step tuple so variance stays sound.
- **Choice:** Keep `unknown` defaults for `Step`/`StepModule`, make `Stage` generic over step tuples, and specialize `RecipeModule` over the inferred config type.
- **Rationale:** Preserves type safety without `any` or bivariant hacks while keeping config inference for `RecipeConfigOf`.
- **Risk:** Touches public authoring types and requires callers to annotate `RecipeModule` with config type when needed.

### Drop storyRifts foundation override from recipe config
- **Context:** `storyTagRiftValleys` reads directionality from `ctx.config`, but the recipe step schema carried a redundant foundation override.
- **Options:** Expand `storyTagRiftValleys` to accept a foundation override, or rely on runtime config on the context.
- **Choice:** Remove the foundation override from the step config and rely on `ctx.config`.
- **Rationale:** Avoids duplicating foundation config surfaces in recipe steps.
- **Risk:** Directionality can no longer be overridden per-run via the recipe config.

### Make paleo climate config optional for rivers
- **Context:** Standard recipe compilation without explicit config failed because `climate.story.paleo` was required.
- **Options:** Require paleo config in every recipe config, or make it optional with defaults.
- **Choice:** Mark `climate.story.paleo` optional in the rivers step schema.
- **Rationale:** Allows `standardRecipe.compile()` to succeed with no explicit config.
- **Risk:** Paleo hydrology tweaks are skipped unless explicitly configured.

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### Prework Findings
#### P1) Legacy usage grep gates (define “expected zero hits”)
- Current in-repo consumers of legacy surfaces:
  - Maps: `mods/mod-swooper-maps/src/*.ts` still call `runTaskGraphGeneration` and (some) `baseMod`.
  - Core tests: `packages/mapgen-core/test/orchestrator/**`, `packages/mapgen-core/test/pipeline/**` reference `runTaskGraphGeneration`, `PipelineModV1`, and `baseMod`.
  - Core runtime: `packages/mapgen-core/src/orchestrator/task-graph.ts` + `packages/mapgen-core/src/base/mod.ts` use `MapGenConfig` and `PipelineModV1`.
  - Docs: `docs/system/mods/swooper-maps/architecture.md` and M5 review docs still reference baseMod + runTaskGraphGeneration.
- Expected zero-hit gates (post-cutover):
  - `rg -n "runTaskGraphGeneration|PipelineModV1|baseMod|@swooper/mapgen-core/base" -S`
  - `rg -n "@mapgen/bootstrap|@mapgen/config|@mapgen/orchestrator" -S`
  - `rg -n "MapGenConfig" -S packages mods`

#### P2) Export map deletion checklist
- `packages/mapgen-core/package.json` exports to remove:
  - `"./base"`, `"./bootstrap"`, `"./config"`, and any legacy orchestrator surface if still exported.
- `packages/mapgen-core/src/index.ts` re-exports to remove:
  - `bootstrap`
  - `applyMapInitData`, `resolveMapInitData`, `runTaskGraphGeneration`
  - `@mapgen/orchestrator/types` and any `@mapgen/pipeline` compatibility surface tied to `PipelineModV1`
