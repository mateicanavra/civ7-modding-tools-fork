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

- **Plot tag/region helper renames + adapter ID methods** [Source: CIV-67]
  - **Context:** CIV-67 engine-boundary cleanup removes engine-global tokens from mapgen-core and routes plot-tag/region IDs through new adapter methods.
  - **Type:** triage
  - **Notes:** Mapgen-core helpers were renamed (`addPlotTagIds*`, `resolveLandmassIds`, `markLandmassId`) and adapter gained `getPlotTagId`/`getLandmassId`/`setLandmassId`. Downstream callers on older helper names must update.
  - **Next check:** before merging any branches that still reference the old helper names.

- **Narrative artifacts use Set/Map snapshots in M4** [Source: CIV-73]
  - **Context:** CIV-73 publishes `artifact:narrative.*@v1` using Set/Map snapshots that mirror StoryTags (corridor metadata retained; hotspot trails omitted).
  - **Type:** triage
  - **Notes:** Revisit contract shape/serialization before consumer cutover to avoid downstream assumptions.
  - **Next check:** before CIV-74 consumer migration or any external artifact export.

- **Placement inputs cutover landed early in CIV-71** [Source: CIV-71/CIV-72]
  - **Context:** CIV-71 implementation now requires `artifact:placementInputs@v1` and removes legacy placement input wiring, even though the CIV-71 AC said additive-only. CIV-72 currently focuses on placement outputs verification.
  - **Type:** triage
  - **Notes:** Decide whether to accept the sequencing shift (CIV-71 does cutover + derive step, CIV-72 does outputs verification) or re-split to align with original ACs. If accepted, update CIV-71/CIV-72 scope expectations accordingly.
  - **Next check:** before restacking/merging the placement inputs branches.

- **Directionality settings migration (PIPELINE-2 follow-up)** [Source: CIV-56]
  - **Context:** M4 per-step config plumbing defers ADR-ER1-019 (directionality in `RunRequest.settings`).
  - **Type:** triage
  - **Notes:** CIV-56 keeps `foundation.dynamics.directionality` inside step config views to avoid expanding settings; we still need a dedicated settings surface and consumer migration away from `ctx.config.foundation.*`.
  - **Update (2025-12-27):** Pulled into M5 scope as part of schema ownership + settings boundary cleanup; see `issues/M5-U09-DEF-016-schema-ownership-split-settings.md` (and `milestones/M5-proposal-clean-architecture-finalization.md` for sequencing).
  - **Next check:** before PIPELINE-4 runtime cutover or when `RunSettings` expands.

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

- **Legacy landmass/ocean separation knobs now no-op post DEF-011** [Source: M5-U01 review]
  - **Context:** M5-U01 (DEF-011).
  - **Type:** triage
  - **Notes:** With `crustMode` removed, landmass config knobs (continentalFraction/crustClusteringBias/microcontinentChance) and ocean separation policy knobs (bandPairs/baseSeparationTiles/boundaryClosenessMultiplier/edge policies) are still accepted in schema but ignored. Decide whether to remove or redefine them; otherwise configs silently no-op.
  - **Next check:** before merging remaining M5 cleanup branches or before a release that advertises the new config surface.
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

- **Revisit `FoundationContext` contract doc structure & enforcement** [Review by: end of M3]
  - **Context:** M2 stable-slice contract at `resources/CONTRACT-foundation-context.md` (CIV-34 follow-up).
  - **Type:** triage
  - **Notes:** Re-evaluate whether to split into (1) a crisp, binding contract doc and (2) a separate aspirations/planning doc; tighten semantics as more M3 consumers land; implement enforcement ideas outlined in the contract doc (tests/CI/mutation guards) when the interface stabilizes.
  - **Next check:** after the first real M3 consumer steps ship (e.g., climate baseline) or at the end of M3.

## Backlog (definite, unsequenced)

- **Full MapGen architecture documentation sweep (post Task Graph / canonical products)** [Review by: late M3 / early M4]
  - **Context:** System docs at `docs/system/libs/mapgen/*.md` vs implementation once `PipelineExecutor` / `MapGenStep` / `StepRegistry` and canonical products stabilize.
  - **Type:** backlog
  - **Notes:** Larger pass to fully reconcile “current vs target” details across canonical system docs (e.g., `architecture.md`, `foundation.md`, `hydrology.md`, plus adjacent system pages as needed), removing remaining mismatches once the M3 architecture lands. This is explicitly **not** part of `CIV-40` (which only adds framing + minimal current-state pointers).
  - **Next check:** after Task Graph + step execution is implemented and key products (`FoundationContext`, `ClimateField`, `StoryOverlays`) are stabilized.

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
