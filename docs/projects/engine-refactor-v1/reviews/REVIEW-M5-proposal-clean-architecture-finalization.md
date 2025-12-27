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

## REVIEW m5-u05-extract-standard-morphology-hydrology

### Quick Take
Morphology and hydrology steps now live under @mapgen/base with thin pipeline re-exports, but standard artifact publication helpers still live in core, so the boundary is not fully clean.

### High-Leverage Issues
- `packages/mapgen-core/src/pipeline/artifacts.ts` remains core-owned and uses `M3_DEPENDENCY_TAGS` from `@mapgen/base`; base pipeline steps still import it, so core still embeds standard artifact knowledge.

### Fix Now (Recommended)
- Move artifact publication helpers (publishHeightfieldArtifact, publishClimateFieldArtifact, publishRiverAdjacencyArtifact) into `@mapgen/base` (or a base-owned artifacts module) and update step imports; keep a deprecated re-export if needed.

### Defer / Follow-up
- If we cannot move it in M5, add an issue to relocate `pipeline/artifacts` and remove the core-to-base tag dependency.

### Needs Discussion
- Should artifact publication helpers be treated as core primitives (then decouple from M3 tags) or standard-mod helpers (then move to base)?

### Cross-cutting Risks
- Core retains a standard-tag dependency via `pipeline/artifacts`, which undermines the "core is generic" contract.

## REVIEW m5-u06-extract-standard-ecology-placement-narrative

### Quick Take
Ecology, placement, and narrative steps are now base-owned with thin pipeline re-exports, but effect ownership metadata and artifact helpers still reflect core ownership.

### High-Leverage Issues
- `packages/mapgen-core/src/base/tags.ts`: `EFFECT_OWNERS` still sets `pkg: "@swooper/mapgen-core"` for biomes/features/placement even though those steps now live in the base mod, so ownership metadata is out of date.
- `packages/mapgen-core/src/base/pipeline/placement/DerivePlacementInputsStep.ts` + `PlacementStep.ts` still import `publishPlacement*Artifact` from `@mapgen/pipeline/artifacts`, keeping standard artifact publication helpers in core.

### Fix Now (Recommended)
- Update effect tag owners to reflect the base mod package (or explicitly document why core should own those effects) so verification/diagnostics do not misattribute ownership.
- Move placement artifact publication helpers into a base-owned module (or add a base wrapper) and update step imports to avoid the core dependency.

### Defer / Follow-up
- If core is intentionally the owner-of-record for effect tags, capture that policy in the base tag docs so the mismatch is explicit.

### Needs Discussion
- Do we want effect ownership to track the package path (`@swooper/mapgen-core/base`) or a mod ID, and where should that be enforced?

### Cross-cutting Risks
- Ownership metadata drift between tags and step location could undermine effect verification or tooling expectations.

## REVIEW m5-u07-delete-compat-deprecation-surfaces

### Quick Take
Legacy shims and compat surfaces are removed and artifact helpers are now base-owned, but the ecology domain now imports base artifacts directly, which reintroduces a core-to-base dependency.

### High-Leverage Issues
- `packages/mapgen-core/src/domain/ecology/biomes/index.ts` and `packages/mapgen-core/src/domain/ecology/features/index.ts` now import `@mapgen/base/pipeline/artifacts`, so core domain logic depends on the base mod and standard artifact tags.

### Fix Now (Recommended)
- Decide whether ecology domain should move into the base mod (if it is standard-specific) or reintroduce a core-owned artifact accessor so `@mapgen/domain` does not import base modules.

### Defer / Follow-up
- If the base dependency is intentional, document the exception in the domain ownership docs and add a follow-up to cleanly separate it later.

### Needs Discussion
- Are ecology domain modules intended to be reusable primitives (core-owned) or standard-mod specifics (base-owned)?

### Cross-cutting Risks
- Core domain now depends on base artifacts, weakening the "core is generic" boundary and complicating future non-base consumers.

## REVIEW m5-u08-remove-globals-fallbacks-engine-boundary

### Quick Take
Global/fallback usage is largely removed (Voronoi utils via adapter, RNG globals gone, terrain constants now require adapter indices, narrative caches moved run-scoped), but one adapter capability still lacks an explicit guard.

### High-Leverage Issues
- `packages/mapgen-core/src/base/pipeline/foundation/producer.ts`: `adapter.getVoronoiUtils()` is called without an explicit capability check, so stale adapters will fail with a generic "is not a function" error rather than the clear missing-capability message promised in the AC.

### Fix Now (Recommended)
- Add an explicit guard (similar to `getLatitude`/`isWater`) or a helper that throws a clear error when `getVoronoiUtils` is missing.

### Defer / Follow-up
- If we want TypeScript-only enforcement, document the runtime error behavior and upgrade requirements in adapter docs.

### Needs Discussion
- Should adapter capability validation be centralized (one helper) rather than scattered checks?

### Cross-cutting Risks
- None identified.

## REVIEW m5-u09-def-016-schema-ownership-split-settings

### Quick Take
The schema split is clean and step configs no longer embed directionality, but the new `settings.directionality` field is currently unused, so the source of truth is ambiguous.

### High-Leverage Issues
- `packages/mapgen-core/src/base/run-request.ts` now sets `settings.directionality`, but step implementations read `context.config.foundation.dynamics.directionality`; nothing reads `settings.directionality`, so the new setting is dead and could drift from config.

### Fix Now (Recommended)
- Either wire steps to read directionality from `context.settings` (making the settings boundary real) or remove `settings.directionality` and keep foundation config as the single source of truth.

### Defer / Follow-up
- If the plan is to switch later, document the migration path and when config vs settings is authoritative.

### Needs Discussion
- Should directionality be a run setting (settings-owned) or remain foundation-owned config with no settings mirror?

### Cross-cutting Risks
- Directionality now has two potential sources of truth (config vs settings), which can confuse tooling or future adapters.

## REVIEW m5-u10-colocation-consolidation-pass

### Quick Take
Foundation shims were removed and imports were updated to base-owned paths; the cleanup looks consistent and mechanical.

### High-Leverage Issues
- None found.

### Fix Now (Recommended)
- None.

### Defer / Follow-up
- None.

### Needs Discussion
- None.

### Cross-cutting Risks
- None identified.

## REVIEW m5-u11-def-014-foundation-inventory

### Quick Take
Foundation now publishes discrete `artifact:foundation.*@v1` outputs with targeted assertions, but the canonical contract docs still describe the monolithic `artifact:foundation` surface.

### High-Leverage Issues
- `docs/projects/engine-refactor-v1/resources/CONTRACT-foundation-context.md` still defines the monolithic `artifact:foundation` contract and references `ctx.artifacts.foundation`, which no longer exists after the split.

### Fix Now (Recommended)
- Update or replace the contract doc to define the discrete `artifact:foundation.*@v1` contracts (plates/dynamics/seed/diagnostics/config) and remove monolith references.

### Defer / Follow-up
- After new contracts land, archive the monolithic contract doc (or mark it historical) to avoid future drift.

### Needs Discussion
- Do we want a single umbrella contract doc for the foundation inventory or separate per-artifact contracts?

### Cross-cutting Risks
- Documentation still points consumers/tooling at `artifact:foundation`, risking mismatched dependencies after this split.
