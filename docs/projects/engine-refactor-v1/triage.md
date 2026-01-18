# Engine Refactor v1 — Triage & Backlog

This doc captures unsequenced work and open questions discovered during the project.  
Milestone and issue docs remain canonical for scheduled/active scope; entries here are reminders to revisit or place later.

Time-bound temporary compatibility tradeoffs live in `docs/projects/engine-refactor-v1/deferrals.md` (keep them out of triage unless they need active research/decision work).

**Entry format**
- **Title**
  - **Context:** milestone + issue(s) or discussion timestamp/source.
  - **Type:** `triage` (needs research/decision) or `backlog` (definite work, unsequenced).
  - **Notes:** short rationale / constraints / links.
  - **Next check:** when/how to re‑evaluate.

**Revisit index (best‑effort scan)**
- [Early M3+] Design/implement modern story orogeny layer
- [During M3 story migration] Add minimal story parity regression harness

## Triage (needs decision / research)

- **Morphology coastline marker artifact renamed + published** [Source: LOCAL-TBD-M9-hydrology-s1-delete-authored-interventions]
  - **Context:** Slice 1 enforcement work needed a stable, contract-first “coastlines complete” gate for Narrative seed steps.
  - **Type:** triage
  - **Notes:** Renamed the marker artifact from `coastlinesApplied` → `coastlinesExpanded` and ensured the Morphology `coastlines` step publishes it (write-once) so downstream contracts can gate without effect-tag style shims.
  - **Next check:** none.

- **Single-producer enforcement scoped to `artifacts.provides` in Phase 1** [Source: LOCAL-TBD-M8-U21]
  - **Context:** U21 Phase 1 adds artifact contracts without mod migration; legacy steps still declare artifact ids directly in `requires/provides`.
  - **Type:** triage
  - **Notes:** Current enforcement checks duplicates only for artifact ids declared via `artifacts.provides`. Revisit after Phase 2 migration to enforce across all artifact provides.
  - **Next check:** when starting U21-F or once mod migration lands.

- **Empty ops manifests for non-op domains** [Source: LOCAL-TBD-M8-U20]
  - **Context:** U20 domain authoring sweep aligned all domains to defineDomain/createDomain, including domains without ops.
  - **Type:** triage
  - **Notes:** Empty ops manifests keep the entrypoint pattern uniform; monitor if this creates expectations for ops where none exist.
  - **Next check:** if future domains add ops or if entrypoint purity becomes a boundary concern.

- **createStep defaults to ExtendedMapContext** [Source: LOCAL-TBD-M8-U20]
  - **Context:** Removed mod-local step binder by making `createStep` default its context to `ExtendedMapContext`.
  - **Type:** triage
  - **Notes:** Streamlines authoring imports but requires explicit generics for any future non-ExtendedMapContext step usage.
  - **Next check:** if authoring SDK is reused outside mod contexts or if a new context type is introduced.

- **Object schema defaults now merge nested defaults** [Source: LOCAL-TBD-M7-F2]
  - **Context:** F2 updated `buildSchemaDefaults` to merge explicit object defaults with nested defaults so op default configs validate under runtime-only validation.
  - **Type:** triage
  - **Notes:** Default configs may now include nested defaults that were previously omitted; keep an eye on baseline behavior for ops that relied on sparse defaults.
  - **Next check:** during next config-default audit or if default-based regressions appear in ecology/placement tests.

- **Authoring schema defaults now derive from schema defaults only** [Source: LOCAL-TBD-M7-F1]
  - **Context:** F1 removed `Value.Default/Convert/Clean` from authoring and replaced `applySchemaDefaults`/`buildDefaultConfigValue` with schema-default extraction.
  - **Type:** triage
  - **Notes:** Defaulting now depends on explicit schema defaults; unions/arrays may behave differently from TypeBox Value.Default. Watch for op configs that relied on implicit conversion/clean.
  - **Next check:** during F2 enforcement or if config default regressions surface in ops/tests.

- **Plan compilation requires explicit step configs when a schema exists** [Source: LOCAL-TBD-M7-D2]
  - **Context:** D2 validate-only planner removes defaulting/cleaning; missing configs should surface as errors.
  - **Type:** triage
  - **Notes:** compileExecutionPlan now treats missing config as `step.config.invalid` instead of defaulting `{}`; ensure all compiled recipes supply explicit step configs.
  - **Next check:** before F1 no-shims audit or when onboarding external recipe entrypoints.

- **Compile-time validation contract + compiler-backed validated runner** [Source: LOCAL-TBD-M7-REVIEW]
  - **Context:** M7 runtime validation removal: compiler normalization is canonical; runtime execution is fail-fast and invariant-only.
  - **Type:** triage
  - **Notes:** Tests/tooling must use the compiler-backed runner (`normalizeStrict` → `op.normalize` → `normalizeStrict` → `op.run`). Runtime execution should not reintroduce schema defaulting/validation; artifact handlers enforce runtime invariants.
  - **Next check:** before adding new ops/tests or exposing tooling APIs that run ops directly.

- **Ecology preset config dropped legacy `features` step** [Source: LOCAL-TBD-M7-C2]
  - **Context:** C2 stage config alignment removed `ecology.features` blocks from map presets so compiler validation only sees step-id keyed inputs.
  - **Type:** triage
  - **Notes:** Preset tuning for feature placement/embellishments now relies on defaults until E2/E3 reintroduce explicit config mapping.
  - **Next check:** during E2/E3 ecology migration or when retuning map presets.

- **Authoring step contracts own IDs/metadata (Stage Option A)** [Source: LOCAL-TBD-M7-B2]
  - **Context:** Stage Option A requires stage surfaces derived from step IDs; we moved step fields under `contract` to align with compile surfaces.
  - **Type:** triage
  - **Notes:** This accelerates the API shift but avoids parallel shims; check downstream authoring/SDK call sites for assumptions about top-level step fields.
  - **Next check:** before finalizing stage/recipe authoring docs or exposing authoring SDK externally.

- **Compiler normalize error path joinPath handling** [Source: LOCAL-TBD-M7-A1]
  - **Context:** M7 A1 compiler normalize helpers reuse execution-plan joinPath behavior to avoid trailing slashes on root error paths.
  - **Type:** triage
  - **Notes:** Spec reference shows base+suffix joinPath; revisit if compiler error formatting needs to match spec examples exactly.
  - **Next check:** when compileRecipeConfig wiring (A2) adds integration tests or external error consumers.

- **ResolveConfig compile failures use a distinct error code** [Source: LOCAL-TBD-M6-U10]
  - **Context:** U10 plan compilation now emits `step.resolveConfig.failed` for resolver exceptions/invalid returns.
  - **Type:** triage
  - **Notes:** Downstream tooling that assumed only `step.config.invalid` may need to handle the new code explicitly.
  - **Next check:** before exposing compile errors to external tooling or UI.

- **Run settings require explicit directionality + trace** [Source: LOCAL-TBD-M6-U10]
  - **Context:** U10 removes runtime defaults/mutation for `settings.directionality` and `settings.trace`; map entrypoints must provide them explicitly.
  - **Type:** triage
  - **Notes:** Verify any external entrypoints supply these settings or add boundary validation for missing fields.
  - **Next check:** when integrating external map entrypoints or tooling.

- **Legacy orchestrator test coverage dropped** [Source: `docs/projects/engine-refactor-v1/issues/_archive/LOCAL-TBD-M6-U08-realign-tests-and-ci-gates-to-ownership.md`]
  - **Context:** Realigning tests to ownership removes `runTaskGraphGeneration`/bootstrap/config test suites.
  - **Type:** triage
  - **Notes:** Legacy path is scheduled for deletion in M6-U07; no CI coverage remains for orchestrator-only flows.
  - **Next check:** after U07 removal or if legacy entrypoints must remain supported.

- **Biome symbol defaults must align with Civ7 base biomes** [Source: LOCAL-TBD-M7-U08]
  - **Context:** Ecology classification uses a `snow` symbol, but Civ7 base resources expose only six biomes (tundra/grassland/plains/tropical/desert/marine).
  - **Type:** triage
  - **Notes:** Default bindings now map `snow` to `BIOME_TUNDRA` to avoid missing engine globals; revisit if a future Civ7 update adds BIOME_SNOW.
  - **Next check:** after any Civ7 patch that changes biome definitions.

- **Marine biome must be assigned explicitly for water tiles** [Source: LOCAL-TBD-M7-U08]
  - **Context:** Base feature placement and gameplay queries expect `BIOME_MARINE` on water tiles; missing marine biomes can crash map generation.
  - **Type:** triage
  - **Notes:** Added explicit marine binding + water assignment in the biomes step to guarantee engine validity.
  - **Next check:** if land/water mask generation changes or additional water terrain types are introduced.

- **Feature placement ownership: phase replacement + clarify floodplains boundary** [Source: LOCAL-TBD-M7-U09]
  - **Context:** Transitioning ecology feature placement away from vanilla `addFeatures` requires separating “requirements we must preserve” from Civ7’s internal algorithm; floodplains also straddle the hydrology boundary.
  - **Type:** triage
  - **Notes:** Plan is to phase replacement (aquatic+ice → vegetated → wet/isolate) while keeping `adapter.canHaveFeature` as the canonical gate; defer “full floodplains ownership” until we define a minimal river topology/adjacency contract or an explicit hybrid policy.
  - **Next check:** before implementing `LOCAL-TBD-M7-U09` (confirm floodplains scope and where the ownership boundary should live).

- **Authored climate interventions removed from Hydrology** [Source: LOCAL-TBD-M9-hydrology-s1-delete-authored-interventions]
  - **Context:** Phase 2 Hydrology model bans swatches/paint and story-driven perturbations; Slice 1 deletes those surfaces.
  - **Type:** triage
  - **Notes:** `climate.swatches` and `climate.story` are no longer part of the Hydrology config surface; any future authored “make this wet/dry” mechanisms must live outside Hydrology (explicitly deprecated/owned downstream) and be tracked with removal triggers.
  - **Next check:** none (revisit only if Phase 2 authority changes).

- **Standard recipe runtime stored per context** [Source: `docs/projects/engine-refactor-v1/issues/_archive/LOCAL-TBD-M6-U05-1-translate-base-steps-into-recipe-local-stage-step-files.md`]
  - **Context:** Standard recipe steps need shared mutable state (continents, start sectors, mapInfo) without registry-layer runtime injection.
  - **Type:** triage
  - **Notes:** Implemented as a WeakMap keyed by `ExtendedMapContext` and initialized from adapter lookup/chooseStartSectors. Revisit if runs become concurrent or if mapInfo should be passed via settings metadata.
  - **Next check:** before finalizing map/preset rewrites (M6 U06) or adding multi-run concurrency.

- **Standard recipe stage IDs expanded for legacy ordering** [Source: `docs/projects/engine-refactor-v1/issues/_archive/LOCAL-TBD-M6-U05-2-compose-standard-recipe-and-tag-definitions-via-authoring-sdk.md`]
  - **Context:** Preserving legacy step order required splitting morphology and narrative into additional stage IDs.
  - **Type:** triage
  - **Notes:** New stage IDs include `morphology-pre`, `morphology-mid`, `morphology-post`, and `narrative-mid` alongside the narrative/hydrology splits. Ensure config mappings and any stage-based tooling are updated.
  - **Next check:** during M6 U06 map/preset rewrite or before stabilizing recipe config shape.

- **Map overrides mapped directly to recipe config without parseConfig defaults** [Source: `docs/projects/engine-refactor-v1/issues/_archive/LOCAL-TBD-M6-U06-rewrite-maps-as-recipe-instances.md`]
  - **Context:** Map entrypoints now build recipe config directly from overrides and derive run settings at the boundary (no `context.config` global overrides).
  - **Type:** triage
  - **Notes:** Entry points build recipe config directly from overrides and derive run settings from overrides; `context.config` is no longer used as a global knob. This skips `parseConfig` defaults/validation; add explicit validation or defaults if step configs require them.
  - **Next check:** before stabilizing map config docs or when recipe config defaults are audited.

- **Engine tag definitions/registry are generic over context** [Source: `docs/projects/engine-refactor-v1/issues/_archive/LOCAL-TBD-M6-U01-promote-runtime-pipeline-as-engine-sdk-surface.md`]
  - **Context:** M6 engine cutover removes `ExtendedMapContext` from `engine/**` and introduces a minimal `EngineContext`.
  - **Type:** triage
  - **Notes:** `DependencyTagDefinition<TContext>` and `TagRegistry<TContext>` now accept contextual `satisfies` callbacks without binding engine to core. Watch for downstream typing changes (e.g., registries that assumed non-generic definitions).
  - **Next check:** when authoring SDK and content package work begins wiring tag definitions outside mapgen-core.

- **Authoring schema enforcement stays in authoring layer (engine remains permissive)** [Source: `docs/projects/engine-refactor-v1/issues/_archive/LOCAL-TBD-M6-U02-1-define-authoring-pojos-and-schema-requirements.md`]
  - **Context:** M6 authoring SDK contract work keeps `MapGenStep.configSchema` optional in engine runtime while authoring requires explicit schema.
  - **Type:** triage
  - **Notes:** Revisit once all base steps have explicit schemas; at that point decide if engine contract should be tightened.
  - **Next check:** before declaring engine surface stable or before deprecating engine-only authoring calls.

- **Authoring types use stage/recipe generics to preserve config variance** [Source: `docs/projects/engine-refactor-v1/issues/_archive/LOCAL-TBD-M6-U07-delete-legacy-base-bootstrap-config-orchestrator.md`]
  - **Context:** Config ownership moved into the mod, and stages still need to accept steps with concrete config types.
  - **Type:** triage
  - **Notes:** `Stage` is generic over the step tuple and `RecipeModule` is specialized per inferred config type, avoiding `any` defaults or bivariant `run`. Revisit if we want stricter constraints on `RecipeConfig` shape.
  - **Next check:** before publishing the authoring SDK or documenting long-term typing guarantees.

- **Recipe `instanceId` uniqueness enforced in authoring** [Source: `docs/projects/engine-refactor-v1/issues/_archive/LOCAL-TBD-M6-U02-1-define-authoring-pojos-and-schema-requirements.md`]
  - **Context:** `compileExecutionPlan` does not check `instanceId` collisions; authoring validation will enforce uniqueness.
  - **Type:** triage
  - **Notes:** If engine-only call sites remain, decide whether to add engine-level guards or document the expectation.
  - **Next check:** before publishing the authoring SDK or when external tooling uses engine runtime directly.

- **Authoring step IDs standardized as `recipeId.stageId.stepId`** [Source: `docs/projects/engine-refactor-v1/issues/_archive/LOCAL-TBD-M6-U02-2-implement-createrecipe-registry-plumbing-and-api-surface.md`]
  - **Context:** M6 authoring SDK derives deterministic full IDs; base recipe currently uses single-segment step IDs.
  - **Type:** triage
  - **Notes:** Re-authoring the base recipe will change step IDs; update tags/tests and verify downstream tooling assumptions.
  - **Next check:** during M6 U05 (re-author standard recipe) before stabilizing authoring IDs.

- **Expose lib/plates + lib/heightfield as public mapgen-core subpaths** [Source: `docs/projects/engine-refactor-v1/issues/_archive/LOCAL-TBD-M6-U04-1-relocate-domain-modules-to-mod-owned-libs.md`]
  - **Context:** Domain libraries now depend on `lib/plates` and `lib/heightfield` utilities once moved into the mod package.
  - **Type:** triage
  - **Notes:** Confirm the expanded export surface is acceptable and update documentation/tests as needed.
  - **Next check:** before publishing the mapgen-core package or declaring the content package boundary stable.

- **Mapgen-core content alias points at the mod domain** [Source: `docs/projects/engine-refactor-v1/issues/_archive/LOCAL-TBD-M6-U04-2-update-recipe-steps-to-use-mod-owned-domain-libs.md`, `docs/projects/engine-refactor-v1/issues/_archive/LOCAL-TBD-M6-U04-3-remove-core-domain-exports-and-clean-import-edges.md`]
  - **Context:** Base pipeline steps still live in mapgen-core but must resolve domain logic from `mods/mod-swooper-maps/src/domain`.
  - **Type:** triage
  - **Notes:** `@mapgen-content/*` now resolves to the mod domain to avoid core-domain imports; verify packaging/story around releases.
  - **Next check:** before removing base pipeline steps or publishing updated SDK packages.

- **Plot tag/region helper renames + adapter ID methods** [Source: CIV-67]
  - **Context:** CIV-67 engine-boundary cleanup removes engine-global tokens from mapgen-core and routes plot-tag/region IDs through new adapter methods.
  - **Type:** triage
  - **Notes:** Mapgen-core helpers were renamed (`addPlotTagIds*`, `resolveLandmassIds`, `markLandmassId`) and adapter gained `getPlotTagId`/`getLandmassId`/`setLandmassId`. Downstream callers on older helper names must update.
  - **Next check:** before merging any branches that still reference the old helper names.

- **Narrative artifacts use Set/Map snapshots in M4** [Source: CIV-73]
  - **Context:** CIV-73 publishes `artifact:narrative.*` using Set/Map snapshots that mirror StoryTags (corridor metadata retained; hotspot trails omitted).
  - **Type:** triage
  - **Notes:** Revisit contract shape/serialization before consumer cutover to avoid downstream assumptions.
  - **Next check:** before CIV-74 consumer migration or any external artifact export.

- **Placement inputs cutover landed early in CIV-71** [Source: CIV-71/CIV-72]
  - **Context:** CIV-71 implementation now requires `artifact:placementInputs` and removes legacy placement input wiring, even though the CIV-71 AC said additive-only. CIV-72 currently focuses on placement outputs verification.
  - **Type:** triage
  - **Notes:** Decide whether to accept the sequencing shift (CIV-71 does cutover + derive step, CIV-72 does outputs verification) or re-split to align with original ACs. If accepted, update CIV-71/CIV-72 scope expectations accordingly.
  - **Next check:** before restacking/merging the placement inputs branches.

- **Directionality settings migration (PIPELINE-2 follow-up)** [Source: CIV-56]
  - **Context:** M4 per-step config plumbing defers ADR-ER1-019 (directionality in `RunRequest.settings`).
  - **Type:** triage
  - **Notes:** CIV-56 keeps `foundation.dynamics.directionality` inside step config views to avoid expanding settings; we still need a dedicated settings surface and consumer migration away from `ctx.config.foundation.*`.
  - **Update (2025-12-27):** Pulled into M5 scope as part of schema ownership + settings boundary cleanup; see `issues/M5-U09-DEF-016-schema-ownership-split-settings.md` (and `milestones/M5-proposal-clean-architecture-finalization.md` for sequencing).
  - **Next check:** before PIPELINE-4 runtime cutover or when `RunSettings` expands.

- **Foundation artifact contract docs out of sync with DEF-014 split** [Source: M5-U11]
  - **Context:** M5-U11 replaces monolithic `artifact:foundation` with discrete `artifact:foundation.*` artifacts.
  - **Type:** triage
  - **Notes:** `docs/projects/engine-refactor-v1/resources/CONTRACT-foundation-context.md` still describes the monolithic contract; decide whether to replace it with a single inventory contract or add per-artifact contracts.
  - **Next check:** before merging M5-U11 or shipping consumer guidance.

- **TaskGraph entrypoint + recipe ID breaking changes** [Source: M5-U02 review]
  - **Context:** M5-U02 standard-mod boundary skeleton.
  - **Type:** triage
  - **Notes:** `runTaskGraphGeneration` now requires an injected mod, and base/standard IDs shifted to `core.base` from `core.standard`. Decide on compatibility (default mod / alias) and document migration for external consumers.
  - **Next check:** before publishing a release or expecting external mods/tools to consume the new boundary.

- **Standard tag exports + default tag registry removal** [Source: M5-U03 review]
  - **Context:** M5-U03 registry/recipes/tags extraction.
  - **Type:** triage
  - **Notes:** `@mapgen/pipeline` no longer exports standard tags/spine and `StepRegistry` no longer seeds default tags. External code must import from `@mapgen/base` and call `registerBaseTags`, or we provide a compatibility helper.
  - **Next check:** before publishing a release or expecting third-party pipelines to compile against the new registry behavior.

- **Strong effect verification vs zero-output configs** [Source: M5-U13 review]
  - **Context:** M5-U13 adds read-back verification for `effect:engine.landmassApplied`, `effect:engine.coastlinesApplied`, and `effect:engine.riversModeled`.
  - **Type:** triage
  - **Notes:** Verifiers now fail when no land/water, no coast tiles, or no rivers exist. Decide whether extreme configs (all land/all water/riverless) are invalid or if verifiers should tolerate zero outputs via config-aware checks or evidence fallback.
  - **Next check:** before shipping strict effect verification to users with custom recipes or extreme tuning.

- **Legacy landmass/ocean separation knobs now no-op post DEF-011** [Source: M5-U01 review]
  - **Context:** M5-U01 (DEF-011).
  - **Type:** triage
  - **Notes:** With `crustMode` removed, landmass config knobs (continentalFraction/crustClusteringBias/microcontinentChance) and ocean separation policy knobs (bandPairs/baseSeparationTiles/boundaryClosenessMultiplier/edge policies) are still accepted in schema but ignored. Decide whether to remove or redefine them; otherwise configs silently no-op.
  - **Next check:** before merging remaining M5 cleanup branches or before a release that advertises the new config surface.

- **Standard artifact publication helpers still core-owned** [Source: M5-U05 review]
  - **Context:** M5-U05 morphology/hydrology extraction.
  - **Type:** triage
  - **Notes:** `packages/mapgen-core/src/pipeline/artifacts.ts` uses `M3_DEPENDENCY_TAGS` from `@mapgen/base` and is imported by base pipeline steps, leaving standard artifact knowledge in core. Decide whether to move it to base or redesign as a generic artifact API.
  - **Next check:** before publishing M5 boundary as stable or before merging remaining extraction branches.

- **Effect tag ownership metadata still points to core** [Source: M5-U06 review]
  - **Context:** M5-U06 ecology/placement extraction.
  - **Type:** triage
  - **Notes:** `packages/mapgen-core/src/base/tags.ts` sets `EFFECT_OWNERS` to `pkg: "@swooper/mapgen-core"` for biomes/features/placement even though those steps now live in the base mod. Decide whether to update ownership to the base package or document the intent.
  - **Next check:** before effect verification is made more strict or before a release that documents effect ownership.

- **Ecology domain depends on base artifacts** [Source: M5-U07 review]
  - **Context:** M5-U07 compat cleanup and artifact helper move.
  - **Type:** triage
  - **Notes:** `packages/mapgen-core/src/domain/ecology/*` now imports `@mapgen/base/pipeline/artifacts`, creating a core-to-base dependency and tying domain logic to standard artifact IDs. Decide whether to move ecology domain into base or provide a core-owned artifact accessor.
  - **Next check:** before declaring the core domain reusable outside the base mod.

- **Directionality source of truth is split** [Source: M5-U09 review]
  - **Context:** M5-U09 schema split + settings migration.
  - **Type:** triage
  - **Notes:** `buildRunRequest` now sets `settings.directionality`, but steps still read `config.foundation.dynamics.directionality`, leaving the settings field unused and introducing a dual source-of-truth risk. Decide whether to wire settings or remove the settings mirror.
  - **Next check:** before further settings migration or external tooling expects settings.directionality.
- **Observability runId + fingerprint derivation** [Source: CIV-75]
  - **Context:** M4 observability baseline implementation for trace/run IDs.
  - **Type:** triage
  - **Notes:** Current implementation derives `runId` from the plan fingerprint and fingerprints `{settings (minus trace), nodes (stepId/nodeId/config)}` while excluding trace config + plan extensions. Revisit if extensions gain semantics or if runId must diverge from fingerprint.
  - **Next check:** when adding semantic recipe extensions or requiring unique per-run IDs.

- **Mapgen research spikes: decide keep vs archive+salvage** [Review by: post-M4]
  - **Context:** Doc inventory/archive pass recorded at `docs/projects/engine-refactor-v1/resources/_archive/SPIKE-inventory-archive-planning.md`.
  - **Type:** triage
  - **Notes:** These are intentionally left as-is for now; later, do a focused read to either (a) keep them as research references, or (b) archive them after salvaging only the timeless modeling concepts into canonical mapgen docs:
    - `docs/system/libs/mapgen/research/SPIKE-civ7-map-generation-features.md`
    - `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling.md`
    - `docs/system/libs/mapgen/research/SPIKE-earth-physics-systems-modeling-alt.md`
    - `docs/system/libs/mapgen/research/SPIKE-synthesis-earth-physics-systems-swooper-engine.md`
  - **Next check:** after M4 (or when updating `docs/system/libs/mapgen/*.md`).

- **Revisit foundation artifact contract doc structure & enforcement** [Review by: end of M3]
  - **Context:** Foundation now publishes discrete `artifact:foundation.*` products; the legacy `FoundationContext` contract doc is obsolete.
  - **Type:** triage
  - **Notes:** Re-evaluate whether to split into (1) a crisp, binding artifact contract doc and (2) a separate aspirations/planning doc; tighten semantics as more M3 consumers land; implement enforcement ideas (tests/CI/mutation guards) when the interface stabilizes.
  - **Next check:** after the first real M3 consumer steps ship (e.g., climate baseline) or at the end of M3.

## Backlog (definite, unsequenced)

- **Full MapGen architecture documentation sweep (post Task Graph / canonical products)** [Review by: late M3 / early M4]
  - **Context:** System docs at `docs/system/libs/mapgen/*.md` vs implementation once `PipelineExecutor` / `MapGenStep` / `StepRegistry` and canonical products stabilize.
  - **Type:** backlog
  - **Notes:** Larger pass to fully reconcile “current vs target” details across canonical system docs (e.g., `architecture.md`, `foundation.md`, `hydrology.md`, plus adjacent system pages as needed), removing remaining mismatches once the M3 architecture lands. This is explicitly **not** part of `CIV-40` (which only adds framing + minimal current-state pointers).
  - **Next check:** after Task Graph + step execution is implemented and key products (foundation artifacts, `ClimateField`, narrative story entries) are stabilized.

- **LandmassRegionId-first starts (remove `ContinentBounds` projection shim)** [Review by: next Placement/Gameplay refactor]
  - **Context:** Morphology vertical refactor (Phase 3 Slice 3) removes hidden runtime continent windows and introduces an explicit downstream **Gameplay-owned** LandmassRegionId projection step. Civ7 interop still requires `adapter.assignStartPositions(...)`, which currently accepts `westContinent/eastContinent` bounds; keeping those bounds is a downstream-only projection shim.
  - **Links:** Gameplay spec issue: `docs/projects/engine-refactor-v1/resources/domains/gameplay/ISSUE-LANDMASS-REGION-ID-PROJECTION.md`.
  - **Type:** backlog
  - **Notes:** Make start placement operate on explicit LandmassRegionId partitioning and remove `ContinentBounds` from Placement op contracts and runtime wiring. Keep any remaining “bounds” logic as an internal convenience (if needed) and ensure it never becomes a canonical contract surface.
  - **Next check:** when starting the Placement/Gameplay domain refactor, or if the adapter/start-position surface changes.

- **~~Migrate `state:engine.*` → verified `effect:*` + reification~~** [Review by: early M4]  
  **Update (2025-12-21, M4 planning):** This work is now scheduled in M4 (effects verification + placement inputs). See `milestones/M4-target-architecture-cutover-legacy-cleanup.md`.
  - **Context:** `CIV-41` Task Graph MVP; deferral at `docs/projects/engine-refactor-v1/deferrals.md` (DEF-008).
  - **Type:** backlog
  - **Notes:** Target policy is now clear: `state:engine.*` is transitional-only; engine-surface guarantees are modeled as schedulable `effect:*` tags that are runtime-verifiable (adapter queries / postcondition checks), and cross-step data dependencies should prefer reified `field:*` / `artifact:*` products. Remaining work is implementation: introduce effect verification hooks and migrate the highest-risk `state:engine.*` usages first (e.g., placement prerequisites).
  - **Next check:** when effect verification hooks exist in the executor/registry, or when we begin the `state:engine.*` namespace removal workstream.

- **Deduplicate `PipelineExecutor.execute()` / `executeAsync()` execution loops** [Review by: early M4]
  - **Context:** `CIV-41` Task Graph MVP review follow-up.
  - **Type:** backlog
  - **Notes:** Reduce duplicated control flow while preserving deterministic trace/log ordering and the existing error semantics (fail-fast for missing dependencies).
  - **Update (2025-12-27):** Pulled into M5 scope as part of the colocation/consolidation pass; see `issues/M5-U10-colocation-consolidation-pass.md` (and `milestones/M5-proposal-clean-architecture-finalization.md` for sequencing).
  - **Next check:** once M3 executor behavior stabilizes and before adding more step phases that would multiply duplicated logic.

- **Modern story orogeny layer (windward/lee amplification)** [Review by: early M3+]
  - **Context:** M2 / `CIV-36` minimal story parity deferred orogeny; `CIV-39` orogeny tunables promotion explicitly deferred in 2025‑12‑12 discussion.
  - **Type:** backlog
  - **Notes:** Legacy JS used `storyTagOrogenyBelts` + an `OrogenyCache` to amplify rainfall on windward/lee flanks along long convergent belts. We will **not** port that cache‑based flow in M2. In the task‑graph architecture (`docs/system/libs/mapgen/architecture.md`), reintroduce orogeny as a dedicated step/layer that:
    - Derives belts/flanks from `MapGenContext.artifacts.tectonics` (uplift/convergence) and prevailing winds.
    - Publishes modern story tags/overlays and/or applies rainfall/biome modifiers via context fields/buffers.
    - Owns a modern config surface (may replace legacy `foundation.story.orogeny.*` knobs).
  - **Next check:** schedule once Pipeline/Story steps land in M3 and we can validate parity without re‑adding legacy shims.

- **Add minimal story parity regression harness** [Review by: during M3 story migration]
  - **Context:** M2 review `REVIEW-M2-stable-engine-slice.md` CIV‑36 section; noted 2025‑12‑12.
  - **Type:** backlog
  - **Notes:** Current smoke test only asserts non‑empty margins/hotspots/rifts. Add a light harness (metrics or golden snapshots on a few canonical seeds/sizes) to validate distributions and overlays don’t drift as M3 refactors land.
  - **Next check:** schedule alongside `LOCAL-M3-story-system` step migration or when story consumers report parity gaps.

- **Post‑M3: Morphology selective replacement behind stable products + regression harness** [Review by: late M3 / early M4]
  - **Context:** Morphology target doc `docs/system/libs/mapgen/morphology.md`; wrap‑first posture recorded in `../../_archive/projects/engine-refactor-v1/milestones/M3-core-engine-refactor-config-evolution.md`.
  - **Type:** backlog
  - **Notes:** After the pipeline/products stabilize (and a basic regression harness exists), selectively replace high‑value morphology sub‑steps behind a stable product spine; avoid tuning-heavy algorithm swaps before consumers/tests can catch regressions.
  - **Next check:** once `PipelineExecutor` + `Heightfield`/`ClimateField`/overlays are stable enough to support parity checks.

- **Post‑M3: Hydrology modernization (optional oceanography/cryosphere) behind artifacts** [Review by: late M3+]
  - **Context:** Hydrology target doc `docs/system/libs/mapgen/hydrology.md`; synthesis spike `docs/system/libs/mapgen/research/SPIKE-synthesis-earth-physics-systems-swooper-engine.md`.
  - **Type:** backlog
  - **Notes:** Keep M3 wrap‑first (engine rivers + existing TS climate). Any oceanography/cryosphere work should land only once we have stable climate/hydrology products and a clear gameplay need.
  - **Next check:** after consumers are migrated off `GameplayMap` and a river data product exists.

- **Post‑M3: Ecology modernization (pedology/biomes/resources) behind ecology artifacts** [Review by: late M3+]
  - **Context:** Ecology target doc `docs/system/libs/mapgen/ecology.md`.
  - **Type:** backlog
  - **Notes:** Once hydrology/climate products are canonical, refactor ecology into explicit steps/products (pedology → biomes → resources/features) and retire legacy monolithic passes behind adapters.
  - **Next check:** after `LOCAL-M3-HYDROLOGY-PRODUCTS` lands and biomes/placement adapters exist.
