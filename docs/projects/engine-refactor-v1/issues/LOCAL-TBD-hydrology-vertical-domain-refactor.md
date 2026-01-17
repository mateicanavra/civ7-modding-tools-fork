# Hydrology Vertical Domain Refactor — Phase 3 Implementation Plan

This issue converts Hydrology Phase 0.5–2 spikes into an **executable slice plan** for implementing the locked Hydrology model via **contract-first ops + orchestration-only steps**, with **no compat surfaces inside Hydrology**.

## TL;DR
- Remove authored climate interventions (swatches, story-driven modifiers, paleo) from Hydrology and from the recipe braid; replace with physics-only, deterministic, derivative Hydrology.
- Establish a stable boundary where **public semantic knobs compile** into a **normalized internal parameter set** (no author “thumbs on the scale”).
- Implement the Phase 2 causality spine through atomic ops and staged steps, keeping the pipeline green at the end of every slice.
- Keep downstream consumers unblocked by maintaining a small set of stable projections (e.g., today’s `artifact:climateField`) while expanding the internal model and adding new typed artifacts as needed.

## Phase artifact links (inputs; model is locked in Phase 2)
- Plan index: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/HYDROLOGY.md`
- Phase 0.5 (greenfield): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-greenfield-synthesis.md`
- Phase 1 (current-state): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-current-state-synthesis.md`
- Phase 2 (modeling; authoritative model for this plan): `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling-synthesis.md`
- Required canonical spike artifacts (workflow requirement; linked from synthesis):
  - `docs/projects/engine-refactor-v1/resources/spike/spike-hydrology-greenfield.md`
  - `docs/projects/engine-refactor-v1/resources/spike/spike-hydrology-current-state.md`
  - `docs/projects/engine-refactor-v1/resources/spike/spike-hydrology-modeling.md`
- Workflow: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
- Guardrails reference: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/verification-and-guardrails.md`
- Traps/locked decisions reference: `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/references/implementation-traps-and-locked-decisions.md`
- Required ledgers (Phase 3):
  - `docs/projects/engine-refactor-v1/resources/domains/hydrology/legacy-disposition-ledger.md`

<!-- Path roots (use for file references) -->
engine-refactor-v1 = docs/projects/engine-refactor-v1
swooper-src = mods/mod-swooper-maps/src
swooper-test = mods/mod-swooper-maps/test
mapgen-core = packages/mapgen-core

## Scope guardrails (do not violate)
- Slice planning only. No model changes belong here; model changes go to the Phase 2 spike.
- Every slice ends pipeline-green (no dual paths).
- The refactored Hydrology domain must not retain compat surfaces; any transitional shims are **downstream-owned**, explicitly deprecated, and have removal triggers.
- Hydrology is a single domain; “subdomains” are internal organization only.
- Projections never define internal representation.

---

## Locked decisions + bans (and guardrails)

These are locked by Phase 2 and are enforceable; each has a guardrail planned in Slice 1.

### Ban: authored climate interventions inside Hydrology
**Banned surfaces (must not exist post-slice-1):**
- Hydrology swatches and macro overrides:
  - `swooper-src/domain/hydrology/climate/swatches/**`
  - `swooper-src/domain/hydrology/climate/index.ts` export `applyClimateSwatches`
  - `swooper-src/recipes/standard/stages/narrative-swatches/**` (Narrative-owned step that calls Hydrology swatches)
- Story motifs as climate inputs:
  - `swooper-src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts` reading `deps.artifacts.overlays` for hotspots/rifts
  - `swooper-src/recipes/standard/stages/hydrology-post/steps/climateRefine.contract.ts` requiring `narrativePreArtifacts.overlays`
- Paleo hydrology “thumbs on scale”:
  - `swooper-src/recipes/standard/stages/hydrology-core/steps/rivers.ts` calling `storyTagClimatePaleo`
  - `swooper-src/domain/hydrology/config.ts` `climate.story.*` (story-driven climate modifiers)

**Guardrails (Slice 1, test-backed):**
- Contract-guard: step contracts in Hydrology stages must not require `narrativePreArtifacts.overlays`.
- Import-guard: repo scan fails if Hydrology domain imports `@mapgen/domain/narrative/*`.
- Surface-guard: repo scan fails if `applyClimateSwatches`, `storyTagClimateSwatches`, or `storyTagClimatePaleo` remain referenced by Hydrology steps.
- “No swatches stage” guard: the standard recipe stage list must not include `narrative-swatches`.

### Ban: compat surfaces inside Hydrology
Hydrology must publish only canonical artifacts/projections aligned to the Phase 2 model. Any temporary legacy shapes live downstream with explicit deprecation and removal triggers.

**Guardrails (Slice 1+):**
- Consumer-guard tests: verify no downstream code deep-imports Hydrology internals (only uses contracts/exports).
- Schema-guard: forbid `Type.Any()` in Hydrology stage artifacts where a typed-array schema is expected (except with an explicit allowlist + removal trigger).

### Lock: determinism + bounded feedback
Same inputs + seed must yield identical outputs; bounded feedback (cryosphere/albedo) must use fixed iteration counts and stable tie-breaking.

**Guardrails (Slice 2+):**
- Determinism tests for key ops (golden-map regression; seed fixed).
- Explicit iteration-count constants validated in tests.

---

## Config semantics (public knobs → normalized internals)

Canonical semantics live in the Phase 2 “Config semantics table”:
- `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/hydrology/spike-hydrology-modeling-synthesis.md`

Phase 3 policy (locked for implementation):
- Public Hydrology config is **semantic knobs only**; no low-level parameter bags and no regional overrides.
- Missing vs explicit:
  - Missing knob ⇒ uses default semantics (may evolve only via explicit project-level retune PRs).
  - Explicit knob ⇒ freezes behavior for that run (defaults don’t override explicit choices).
- Empty/null:
  - Empty strings / nulls are invalid for knobs.
- Determinism:
  - Any “mode” switch is deterministic; any seed-driven selection must be seed-driven, not interactive, and must remain physically constrained.

Stable fix anchor (preferred):
- A single compilation boundary: `HydrologyKnobs` (public) → `HydrologyParams` (normalized internal).
- This boundary must be invoked from step orchestration, not from ops.

---

## Stable fix anchors (where changes should land)

These anchors are intended to survive later slices by keeping fixes at stable boundaries.

### A) Step boundary: config compilation + validation
- Anchor: `swooper-src/recipes/standard/stages/hydrology-pre/steps/climateBaseline.contract.ts`
  - Today: uses `ClimateConfigSchema.properties.baseline`
  - Target: accepts only semantic knobs (and/or per-step knobs) and compiles to normalized internal params.

### B) Artifact boundary: stage-owned artifacts as stable contracts
- Anchor: `swooper-src/recipes/standard/stages/hydrology-pre/artifacts.ts`
  - Today: `artifact:climateField` uses `Type.Any()` payloads; tighten to typed arrays and treat as a projection surface.

### C) Domain boundary: ops are pure + contract-first
- Anchor: `swooper-src/domain/hydrology/ops/**`
  - Introduce the Phase 2 op catalog as atomic ops; steps orchestrate and wire buffers/artifacts.

### D) Forbidden dependency boundary: Narrative → Hydrology and Hydrology → Narrative
- Anchors:
  - `swooper-src/recipes/standard/stages/narrative-swatches/**` (delete stage)
  - `swooper-src/recipes/standard/stages/hydrology-post/steps/climateRefine.ts` (remove overlay reads)

---

## Explicit upstream authoritative intake scan (producer inventory)

Hydrology is not a pipeline root; this scan is mandatory.

### Current authoritative inputs Hydrology consumes (evidence)
- Morphology topography:
  - `swooper-src/recipes/standard/stages/hydrology-pre/steps/lakes.contract.ts` requires `morphologyArtifacts.topography`
- Hydrology-pre heightfield buffer (currently produced after lake generation):
  - `swooper-src/recipes/standard/stages/hydrology-pre/artifacts.ts` `artifact:heightfield`
- Foundation latitude basis (queried via adapter today; should become explicit):
  - `swooper-src/recipes/standard/stages/hydrology-pre/steps/climateBaseline.ts` builds `latitudeByRow` from `context.adapter.getLatitude(...)`

### Target adopted upstream inputs (Phase 2 posture; no model change here)
- From Morphology:
  - land/sea mask + elevation (authoritative geometry)
  - (preferred later) bathymetry / shallow shelf proxy for ocean coupling
  - (preferred later) routing geometry (flow direction) as a Morphology-owned artifact (locked below)
- From Foundation:
  - coordinate/latitude basis as explicit typed field (avoid re-query patterns in steps)

### Locked boundary decision (Phase 3): routing ownership
**Choice:** Morphology owns routing geometry (flow direction + any purely geometric helpers); Hydrology owns discharge accumulation and hydrography projection.

Rationale:
- Routing direction is a geometric property of topography; it belongs with Morphology’s topography/routing buffers.
- Hydrology’s physics uses routing to move water; water budget and discharge belong in Hydrology.
- Prevents duplicate routing solvers across domains.

Guardrail:
- Hydrology ops must not implement a second “routing geometry” solver once Morphology publishes it (one authoritative owner).

---

## Explicit downstream impact scan (consumer inventory)

Hydrology is not a pipeline leaf; this scan is mandatory.

### Current downstream consumers of Hydrology artifacts (evidence)
- Hydrology-core rivers step consumes climate:
  - `swooper-src/recipes/standard/stages/hydrology-core/steps/rivers.contract.ts` requires `hydrologyPreArtifacts.climateField`
- Hydrology-post climate refine consumes wind + overlays + rivers:
  - `swooper-src/recipes/standard/stages/hydrology-post/steps/climateRefine.contract.ts` requires `hydrologyPreArtifacts.windField`, `narrativePreArtifacts.overlays`, `hydrologyCoreArtifacts.riverAdjacency`
- Narrative post consumes river adjacency:
  - `swooper-src/recipes/standard/stages/narrative-post/steps/storyCorridorsPost.contract.ts` requires `hydrologyCoreArtifacts.riverAdjacency`
- Ecology consumes climate + heightfield broadly:
  - `swooper-src/recipes/standard/stages/ecology/steps/pedology/contract.ts`
  - `swooper-src/recipes/standard/stages/ecology/steps/biomes/contract.ts`
  - `swooper-src/recipes/standard/stages/ecology/steps/features/contract.ts`
  - `swooper-src/recipes/standard/stages/ecology/steps/resource-basins/contract.ts`

### Target downstream contract posture
- Keep a stable, minimal projection surface for existing consumers:
  - `artifact:climateField` remains the primary “ecology baseline” projection but becomes typed and may expand additively.
- Add new typed Hydrology artifacts for model fidelity (consumers can migrate when ready):
  - temperature, PET/aridity, cryosphere indices, discharge/runoff, hydrography snapshots (rivers/lakes ids/masks).

---

## Step decomposition plan (Phase 2 causality spine → steps → artifacts/buffers)

Phase 2 causality spine is authoritative. This plan assigns it to concrete steps without changing the model.

### Target Hydrology steps (staged; keeps current stage braid)

**Hydrology (pre)**
- `lakes` (projection): keep engine lake stamping as a projection until hydrography projection is fully owned; ensure it does not become canonical truth.
- (replace) `climate-baseline` → “climate spine pass 1”:
  - compile semantic knobs → normalized params
  - compute forcing/thermal scaffold
  - compute circulation (winds) + initial ocean coupling proxy
  - compute moisture transport + precipitation (annual mean + amplitude; optional seasonal modes)
  - publish climate projections (`artifact:climateField`, `artifact:windField`) and any new Hydrology artifacts (additive).

**Hydrology (core)**
- `rivers` → “hydrography projection”:
  - short-term: keep engine stamping until internal discharge-driven hydrography is implemented
  - long-term: project internal discharge + routing into river network and stamp engine accordingly
  - publish a stable hydrography projection artifact (successor to `artifact:riverAdjacency`).

**Hydrology (post)**
- `climate-refine` → “climate spine pass 2”:
  - remove narrative motif inputs entirely
  - if a second pass remains, it must be physics-only (e.g., bounded cryosphere/albedo feedback; diagnostics)
  - publish diagnostics/cryosphere artifacts additively

### Artifact/buffer posture (target)
- Buffers (mutable internal working fields): temperature, winds/currents, humidity, precipitation, PET/aridity, cryosphere, discharge.
- Artifacts (stage-owned contracts): stable snapshots/projections of buffers consumed downstream.

---

## Consumer migration matrix (break/fix by slice)

Legend:
- **Break:** consumer must change in this slice.
- **No-op:** consumer unchanged.
- **Optional:** consumer can adopt new artifacts but is not required.

| Consumer | Today uses | Slice 1 | Slice 2 | Slice 3 | Slice 4 | Slice 5 |
| --- | --- | --- | --- | --- | --- | --- |
| `narrative-swatches/story-swatches` | overlays → climate swatches | **Break (deleted)** | n/a | n/a | n/a | n/a |
| `hydrology-post/climate-refine` | overlays motifs + riverAdjacency | **Break** (remove overlays + story config) | No-op | evolves to new ops | adds cryosphere/diagnostics | No-op |
| `hydrology-core/rivers` | engine rivers + `story.paleo` | **Break** (remove paleo) | No-op | No-op | Optional adopt discharge | **Break** (internal hydrography projection if cutover) |
| `narrative-post/storyCorridorsPost` | `artifact:riverAdjacency` | No-op | Optional migrate | Optional migrate | Optional migrate | **Break** (if riverAdjacency replaced) |
| Ecology steps (`pedology`, `biomes`, `features`, `resource-basins`) | `artifact:climateField` rainfall/humidity | No-op | No-op | No-op | Optional adopt new hydrology artifacts | Optional adopt discharge/wetness |

---

## Slice list with deliverables (executable plan)

Slice order is derived from Phase 2 deltas and refined for pipeline safety (see “Sequencing refinement note”).

### Slice 1 — Delete authored climate interventions + add guardrails (hard cut)

Goal: enforce the Phase 2 bans while keeping the pipeline green.

Deliverables:
- Delete the `narrative-swatches` stage (and its step) from the standard recipe braid.
- Remove all Hydrology consumption of `artifact:overlays` for climate purposes:
  - `hydrology-post/climate-refine` no longer reads overlays motifs.
- Remove paleo/story climate modifiers from Hydrology:
  - `hydrology-core/rivers` no longer calls `storyTagClimatePaleo`
  - remove `climate.story.*` and `climate.swatches.*` from Hydrology public config surface (or rehome downstream if still desired as explicitly deprecated non-physics gameplay overlays; default is **remove**).
- Add guardrails (tests + scans) that make these decisions sticky.

Acceptance gates:
- No `narrative-swatches` stage in the standard recipe.
- No Hydrology step contracts require `narrativePreArtifacts.overlays`.
- No references to swatches/paleo modifiers remain in Hydrology steps.

### Slice 2 — Introduce semantic knobs + normalized internal params boundary

Goal: replace low-level climate config bags with the public semantic knobs posture and a stable compilation boundary.

Deliverables:
- Define the public Hydrology knobs schema (semantic knobs only) and wire it into Hydrology step schemas.
- Implement `knobs → params` compilation boundary (stable fix anchor).
- Add determinism policy docs/tests for knob compilation (missing/empty/null).

Acceptance gates:
- Hydrology step schemas accept only semantic knobs (no latitude-band configs).
- Determinism tests for knob compilation pass.

### Slice 3 — Contract-first op spine for climate/ocean coupling (behavior-preserving where possible)

Goal: convert climate computation into atomic ops and staged orchestration consistent with Phase 2 model.

Deliverables:
- Introduce op contracts (Phase 2 catalog subset) and register implementations under `swooper-src/domain/hydrology/ops/**`.
- Replace direct calls to legacy climate functions with orchestration over ops.
- Maintain the existing `artifact:climateField` projection for downstream consumers (still rainfall/humidity), now derived from the internal fields.

Acceptance gates:
- Hydrology steps import no op implementations directly.
- Ops do not call ops.
- `artifact:climateField` remains present and deterministic (golden-map regression).

### Slice 4 — Add cryosphere + aridity + diagnostics as additive Hydrology artifacts

Goal: implement the high-fidelity “climate realism” surfaces (bounded feedback) without forcing immediate downstream migration.

Deliverables:
- Add internal buffers + op(s) for cryosphere and bounded albedo feedback (fixed iterations).
- Add PET/aridity and diagnostic fields (rain shadow, continentality, convergence proxies).
- Publish additive, typed Hydrology artifacts for these fields; keep `artifact:climateField` stable.

Acceptance gates:
- Bounded feedback iteration counts are explicit and tested.
- Additive artifacts are deterministic and typed (no `Type.Any()`).

### Slice 5 — Hydrography ownership: discharge-driven rivers/lakes projection cutover

Goal: shift from engine-driven hydrography as “truth” to Hydrology-owned hydrography derived from precipitation/runoff + routing geometry, while still stamping engine state as a projection.

Deliverables:
- Adopt Morphology-owned routing geometry artifact (per locked boundary) for flow direction.
- Implement discharge accumulation + river classification (minor vs navigable) as Hydrology ops.
- Project hydrography to:
  - engine terrain stamping (rivers/lakes), and
  - a stable downstream artifact (successor to `artifact:riverAdjacency`).
- Migrate Narrative post corridors and any other consumers to the new hydrography artifact if `riverAdjacency` is replaced.

Acceptance gates:
- Major/minor river projections are present and deterministic.
- No consumers rely on legacy engine-only heuristics without an explicit projection boundary.

### Documentation pass (either Slice 4.5 or folded into each slice)

Minimum requirements (if folded, enforce per-slice):
- Inventory touched/created schemas, functions, ops, steps, stages, and contracts.
- JSDoc/schema descriptions include behavior, defaults, modes, determinism expectations, and downstream effects.

---

## Contract deltas per slice (summary)

- Slice 1:
  - Remove `narrativePreArtifacts.overlays` from Hydrology climate step contracts.
  - Remove `narrative-swatches` stage (recipe braid change).
- Slice 2:
  - Hydrology step schemas move from `ClimateConfigSchema` bags to semantic knobs.
- Slice 3:
  - Add Hydrology op contracts for climate spine; `artifact:climateField` remains (projection) but becomes typed/validated.
- Slice 4:
  - Add new Hydrology artifacts for cryosphere/aridity/diagnostics.
- Slice 5:
  - Add/replace hydrography artifacts (river network + lakes ids/masks; potentially replace `artifact:riverAdjacency` with a richer snapshot).

---

## Migration checklist per slice (minimum)

Each slice must:
- keep the pipeline green,
- delete (or make private) replaced entrypoints (no dual paths),
- add guardrails for any locked decision introduced,
- update consumer contracts in the same slice if they would otherwise break.

---

## Cleanup ownership + triage links

- Any downstream shims added during implementation must:
  - live outside Hydrology (e.g., recipe-owned projection steps or downstream domains),
  - be explicitly deprecated, and
  - have removal triggers recorded in `docs/projects/engine-refactor-v1/deferrals.md` (not in Hydrology).
- Cross-cutting or sequencing questions discovered during implementation go to:
  - `docs/projects/engine-refactor-v1/triage.md`

---

## Sequencing refinement note (required)

Drafted slices from Phase 2 deltas as:
1) remove authored interventions, 2) normalize config, 3) op/step cutover, 4) add high-fidelity fields, 5) hydrography cutover.

Re-ordered for pipeline safety:
- Deletions of forbidden surfaces come first (Slice 1) to prevent model drift.
- Config compilation boundary comes before op/step refactor so later slices have a stable anchor.
- Hydrography cutover is last because it changes the deepest consumer surfaces (engine stamping + narrative corridors).

Re-checked downstream impacts against the final order and confirmed each slice can end pipeline-green without leaving dual paths inside Hydrology.

---

## Lookback 3 (pre-implementation checkpoint)

To be completed immediately before Phase 4 implementation begins:
- Confirm that all Slice 1 guardrails are present and effective (scans + tests).
- Confirm Morphology publishes routing geometry (or insert an explicit upstream dependency issue/slice).
- Confirm consumer migration matrix remains accurate (re-scan contracts with `rg`).

## Lookback 4 (post-implementation retro)

To be completed after Phase 4 slices land:
- Summarize what changed vs plan, and why.
- Record any deferred work with triggers in `docs/projects/engine-refactor-v1/deferrals.md`.

## Notes
- Rename this issue with the milestone once assigned (keep slug stable).
