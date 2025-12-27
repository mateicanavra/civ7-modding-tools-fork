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

- **Directionality settings migration (PIPELINE-2 follow-up)** [Source: CIV-56]
  - **Context:** M4 per-step config plumbing defers ADR-ER1-019 (directionality in `RunRequest.settings`).
  - **Type:** triage
  - **Notes:** CIV-56 keeps `foundation.dynamics.directionality` inside step config views to avoid expanding settings; we still need a dedicated settings surface and consumer migration away from `ctx.config.foundation.*`.
  - **Next check:** before PIPELINE-4 runtime cutover or when `RunSettings` expands.

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
