---
milestone: M5
id: M5-review
status: draft
reviewer: AI agent
---

## REVIEW m5-u01-def-011-delete-crust-mode

### Quick Take
The legacy crust-mode fork is fully removed and configs no longer accept `crustMode`, but the change leaves legacy-only tuning knobs in the schema that now do nothing and drops coverage for stage-failure reporting.

### High-Leverage Issues
- `packages/mapgen-core/test/orchestrator/task-graph.smoke.test.ts`: the failure-mode coverage was replaced with a success assertion, so we no longer verify structured stage failure reporting.
- `packages/mapgen-core/src/config/schema.ts` + `packages/mapgen-core/src/domain/morphology/landmass/crust-first-landmask.ts` + `packages/mapgen-core/src/domain/morphology/landmass/ocean-separation/*`: legacy-only knobs (e.g., continentalFraction/crustClusteringBias/microcontinentChance, bandPairs/baseSeparation/edge policies) remain in schema but are now ignored with area mode forced.

### Fix Now (Recommended)
- Restore a dedicated test that asserts stage failures surface as structured `stageResults` entries (keep the small-map success test if desired).
- Decide whether to remove or hard-fail legacy-only landmass/ocean separation knobs now that the legacy path is deleted; otherwise document the no-op behavior.

### Defer / Follow-up
- If removal is too breaking, create a follow-up issue to deprecate and remove the now-no-op landmass/ocean separation knobs (schema + docs + release notes).

### Needs Discussion
- Should any of the legacy landmass/ocean separation knobs be reinterpreted as area-mode tunables, or should they be removed entirely?

### Cross-cutting Risks
- Schema still accepts no-op legacy knobs, which conflicts with the "no dead code" M5 goal and may confuse downstream configs.

## REVIEW m5-u02-standard-mod-boundary-skeleton

### Quick Take
The base-mod boundary is real (PipelineModV1 + @swooper/mapgen-core/base + hello-mod smoke), but the public entrypoint signature and IDs changed without a compatibility story.

### High-Leverage Issues
- `packages/mapgen-core/src/orchestrator/task-graph.ts`: `runTaskGraphGeneration` now requires an injected mod and throws if no default recipe; this is a breaking API change for external callers with no deprecation/compat path.
- `packages/mapgen-core/src/base/mod.ts` + `packages/mapgen-core/src/base/recipes/default.ts`: mod/recipe IDs changed from `core.standard` to `core.base`, which can break any downstream tooling keyed on recipe IDs.

### Fix Now (Recommended)
- Add a compatibility path (e.g., default to `baseMod` when `mod` is omitted, or provide a deprecated wrapper) and document the breaking change if intentional.
- Decide whether to alias `core.standard` to `core.base` (or document a hard migration) to avoid silent downstream breakage.

### Defer / Follow-up
- Document the PipelineModV1 contract in canonical docs once the base/standard split stabilizes.

### Needs Discussion
- Should `runTaskGraphGeneration` stay standard/base-specific (using `M3_STAGE_DEPENDENCY_SPINE`), or should the dependency spine be mod-owned as part of the contract?

### Cross-cutting Risks
- Public API + recipe-id churn at the mod boundary could break external consumers without a migration plan.

## REVIEW m5-u03-standard-registry-recipes-tags-extraction

### Quick Take
Standard tags/recipes/spine are now base-mod owned and core no longer seeds default tags, but the change introduces new breaking surfaces for any caller that relied on pipeline exports or implicit tag registration.

### High-Leverage Issues
- `packages/mapgen-core/src/pipeline/StepRegistry.ts`: default tag registry is now empty; any external StepRegistry usage that registers steps with standard tags will throw unless it explicitly calls `registerBaseTags`.
- `packages/mapgen-core/src/pipeline/index.ts`: removal of `M3_DEPENDENCY_TAGS`/`M4_EFFECT_TAGS`/`M3_STAGE_DEPENDENCY_SPINE` exports is a breaking change for downstream imports; only base/standard shims remain.

### Fix Now (Recommended)
- Add a short migration note or compatibility shim for StepRegistry usage (e.g., helper to create a registry pre-seeded with base tags).
- Document the export move (`@mapgen/pipeline` → `@mapgen/base`) so external consumers don’t silently break.

### Defer / Follow-up
- Once steps are extracted (U04–U06), remove the temporary core → base coupling in step implementations.

### Needs Discussion
- Do we want a stable core-level helper for “standard tag registry” during the transition, or is explicit `registerBaseTags` required everywhere?

### Cross-cutting Risks
- Standard-tag and stage-spine exports moving out of `@mapgen/pipeline` will break any external tooling that imports them without a migration path.

## REVIEW m5-u04-extract-standard-foundation-physics

### Quick Take
Foundation steps/algorithms moved under `@mapgen/base`, but core still owns the foundation artifact contract (`FoundationContext`), which undercuts the “mod-owned foundation” boundary.

### High-Leverage Issues
- `packages/mapgen-core/src/base/pipeline/foundation/producer.ts` + `packages/mapgen-core/src/core/types.ts`: base foundation still depends on core-owned `FoundationContext`/`createFoundationContext`, so the foundation artifact contract remains core-owned despite the extraction goal.

### Fix Now (Recommended)
- Decide whether `FoundationContext`/artifact helpers move into `@mapgen/base` now (or explicitly mark as a temporary shim) so core no longer owns the foundation domain contract.

### Defer / Follow-up
- Align this extraction with M5-U11’s foundation inventory work to avoid moving the foundation contract twice.

### Needs Discussion
- Is `FoundationContext` considered a shared primitive (core-owned), or should it be treated as standard-mod ownership per the U04 decision?

### Cross-cutting Risks
- Leaving foundation artifacts in core makes the mod boundary look clean in wiring but not in ownership, which may complicate U11’s artifact split.
