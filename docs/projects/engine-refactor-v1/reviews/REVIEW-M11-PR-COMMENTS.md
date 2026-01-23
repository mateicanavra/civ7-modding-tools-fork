# REVIEW-M11-PR-COMMENTS (Scratch)

## Scope

This document aggregates PR comments across the current unmerged Graphite stack and tracks their status relative to the latest stack head. It is **scratch** and will be appended as we review more comments.

**Stack PRs (open):** #718, #717, #716, #715, #714, #713, #712, #711, #710, #709, #708, #707, #706, #705, #704, #703, #702, #701, #700, #699, #698, #697, #696, #695, #694, #693, #692, #691, #690, #689, #688, #687.

**Latest recheck:** 2026-01-23. Stack head at commit `43d9d6e65` (U20). No upstream comment resolutions detected; U18 touched `compute-plate-graph` and `morphology-mid/geomorphology` but unresolved items remain.

**Primary linked docs by branch:**
- #718 → (no issue doc yet)
- #717 → (no issue doc yet)
- #716 → (no issue doc yet)
- #715 → `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U17-sea-level-solver-balance.md`
- #714 → `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U16-morphology-jsdoc-and-comments.md`
- #713 → `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U15-foundation-realism-execution-spine.md`
- #712 → `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U14-validation-observability-realism-dashboard.md`
- #711 → `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U13-foundation-crust-load-bearing-prior.md`
- #710 → `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U12-foundation-polar-caps-as-plates.md`
- #709 → `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U11-foundation-tectonic-segments-and-history.md`
- #708 → `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U10-foundation-plate-partition-realism.md`
- #707 → `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-realism-gaps.md`
- #706 → `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U14-validation-observability-realism-dashboard.md` (mountain wall / belt regressions)
- #705 → `docs/projects/engine-refactor-v1/issues/M11-U02-config-knobs-and-presets.md`, `docs/projects/engine-refactor-v1/issues/M11-U08-polar-boundary-and-cryosphere.md`
- #704 → `docs/projects/engine-refactor-v1/issues/M11-U09-geomorphology-stream-power-erosion.md`
- #703 → `docs/projects/engine-refactor-v1/issues/M11-U08-polar-boundary-and-cryosphere.md`
- #702 → `docs/projects/engine-refactor-v1/issues/M11-U07-volcanoes-truth-contract-completion.md`
- #701 → `docs/projects/engine-refactor-v1/issues/M11-U06-orogeny-mountains-physics-anchored.md`
- #700 → `docs/projects/engine-refactor-v1/issues/M11-U05-morphology-substrate-material-driven.md`
- #699 → `docs/projects/engine-refactor-v1/issues/M11-U04-foundation-tile-material-drivers.md`
- #698 → `docs/projects/engine-refactor-v1/issues/M11-U03-foundation-crust-coherence-upgrade.md`
- #697 → `docs/projects/engine-refactor-v1/issues/M11-U02-config-knobs-and-presets.md`
- #696 → `docs/projects/engine-refactor-v1/issues/M11-U01-spec-authority-reconciliation.md`
- #695 → `docs/projects/engine-refactor-v1/issues/M11-U00-physics-first-realism-upgrade-plan.md`
- #694 → `docs/projects/engine-refactor-v1/issues/M10-U05-truth-artifacts-and-map-projections.md`
- #691 → `docs/projects/engine-refactor-v1/issues/M10-U06-tracing-observability-hardening.md`
- #690 → `docs/projects/engine-refactor-v1/issues/M10-U04-gameplay-stamping-cutover.md`
- #689 → `docs/projects/engine-refactor-v1/issues/M10-U03-map-morphology-stamping.md`
- #688 → `docs/projects/engine-refactor-v1/issues/M10-U02-delete-overlay-system.md`
- #687 → `docs/projects/engine-refactor-v1/issues/M10-U01-delete-overlays-as-morphology-inputs.md`

## Comment ingestion (2026-01-23)

Sources: GitHub issue comments + inline review comments for all stack PRs (#718 → #687).

**Totals:** 46 comments
- **Actionable:** 14 (10 from `chatgpt-codex-connector[bot]`, 4 from `mateicanavra`)
- **Automation:** 32 (Graphite stack warnings posted by `mateicanavra`)

**PRs with only automation comments:** #718, #717, #716, #715, #714, #713, #712, #710, #709, #704, #703, #702, #701, #699, #696, #695, #694, #693, #692, #691, #688.

## Comment Inventory (Actionable)

Legend for status:
- **resolved downstream**: fixed in a higher PR / current stack head
- **planned downstream**: issue doc calls for it in a future slice, but not yet fixed
- **unresolved**: still present in stack head and not explicitly planned
- **superseded**: no longer applicable due to structural change

### PR #711 — U13 crust load-bearing prior
Doc: `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U13-foundation-crust-load-bearing-prior.md`

1) **Import existing core SDK function; sweep similar errors**
- Author: `mateicanavra`
- Type: issue comment
- Location: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/index.ts:14`
- Status: **unresolved**
- Evidence: local helper functions (`distanceSq`, `chooseUniqueSeedCells`, etc.) still defined in `compute-crust/index.ts`.

2) **Schema hygiene rules for all contracts**
- Author: `mateicanavra`
- Type: issue comment
- Location: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/contract.ts:1`
- Requirements:
  - no top-level object defaults
  - no `additionalProperties` field
  - JSdoc above each property/schema; JSdoc matches `description`
- Status: **unresolved**
- Evidence: `compute-crust/contract.ts` still has schema defaults and `additionalProperties: false`, no JSdoc per field.
- Doc cross-check: `LOCAL-TBD-M11-U10` explicitly mandates `additionalProperties: false`, and `docs/system/libs/mapgen/hydrology-api.md` says defaults belong in schemas. This comment conflicts with existing docs; needs reconciliation.

3) **Descriptions must include behavior + defaults**
- Author: `mateicanavra`
- Type: issue comment
- Location: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/contract.ts:17`
- Status: **unresolved**
- Evidence: current descriptions are short (“baseline …”) without behavioral context or defaults.

### PR #708 — U10 plate partition realism
Doc: `docs/projects/engine-refactor-v1/issues/LOCAL-TBD-M11-U10-foundation-plate-partition-realism.md`

4) **Op is a “god-operation”; partition logic must be split into rules/strategies**
- Author: `mateicanavra`
- Type: issue comment
- Location: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/index.ts:1`
- Status: **unresolved**
- Evidence: `compute-plate-graph/index.ts` still embeds MinHeap + seed selection + Dijkstra implementation.

5) **Extract partition logic into shared rules/strategies**
- Author: `chatgpt-codex-connector[bot]`
- Type: review comment
- Location: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/index.ts:14`
- Status: **unresolved** (same issue as #4)
- Evidence: same as above.

### PR #707 — Spike: foundation realism gaps
Doc: `docs/projects/engine-refactor-v1/resources/spike/spike-foundation-realism-gaps.md`

6) **Restore exported preset or update imports**
- Author: `chatgpt-codex-connector[bot]`
- Type: review comment
- Location: `mods/mod-swooper-maps/src/maps/presets/swooper-earthlike.config.ts:14` (historic)
- Status: **resolved downstream**
- Evidence: no `swooperEarthlikeConfig` references remain in repo (`rg` returns none).

### PR #706 — Fix mountain wall ranges via plate projection
Docs: `LOCAL-TBD-M11-U14-validation-observability-realism-dashboard.md` (mountain wall guardrails), `LOCAL-TBD-M11-U11` (projection rewrite)

7) **Seed polar-band boundaries beyond just edge rows**
- Author: `chatgpt-codex-connector[bot]`
- Type: review comment
- Location: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plates-tensors/lib/project-plates.ts:234`
- Status: **planned downstream**
- Evidence: current code seeds boundary influence only from tile plate boundaries (no polar-band seeding).
- Doc cross-check: U11 owns projection rewrite and removal of polar hacks; U12 forbids latitude overrides. This fix likely lands with U11’s new projection logic.

### PR #705 — Fix realism default config + polar projection
Docs: `M11-U02`, `M11-U08`

8) **Keep tile boundaries tied to actual plate edges (avoid boundaryType fan-out)**
- Author: `chatgpt-codex-connector[bot]`
- Type: review comment
- Location: `mods/mod-swooper-maps/src/domain/foundation/lib/project-plates.ts:178` (historic)
- Status: **resolved downstream**
- Evidence: current `project-plates.ts` builds `boundaryCloseness` from tile adjacency, not from cell-level boundaryType.

### PR #700 — U05 substrate material-driven
Doc: `docs/projects/engine-refactor-v1/issues/M11-U05-morphology-substrate-material-driven.md`

9) **Boundary closeness should affect non-boundary tiles**
- Author: `chatgpt-codex-connector[bot]`
- Type: review comment
- Location: `mods/mod-swooper-maps/src/domain/morphology/ops/compute-substrate/rules/index.ts:84`
- Status: **unresolved**
- Evidence: `boundaryCloseness` is multiplied by a boost gated on `boundaryType`; `boundaryType` is `none` for interior tiles, so proximity falloff is effectively ignored for interior tiles.

### PR #698 — U03 crust coherence upgrade
Doc: `docs/projects/engine-refactor-v1/issues/M11-U03-foundation-crust-coherence-upgrade.md`

10) **Boundary-only plates should be youngest, not oldest**
- Author: `chatgpt-codex-connector[bot]`
- Type: review comment
- Location: `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/index.ts:195`
- Status: **unresolved**
- Evidence: `dist01 = maxDist <= 0 ? 1 : d / maxDist`, which makes boundary-only plates “oldest.”

### PR #697 — U02 config knobs + presets
Doc: `docs/projects/engine-refactor-v1/issues/M11-U02-config-knobs-and-presets.md`

11) **Clamp erosion rates to schema maximums after knob multiplier**
- Author: `chatgpt-codex-connector[bot]`
- Type: review comment
- Location: `mods/mod-swooper-maps/src/recipes/standard/stages/morphology-mid/steps/geomorphology.ts:39`
- Status: **unresolved**
- Evidence: `clampNumber` is called with `{ min: 0 }` only; schema max = 1 is ignored.

### PR #690 — M10 gameplay stamping cutover
Doc: `docs/projects/engine-refactor-v1/issues/M10-U04-gameplay-stamping-cutover.md`

12) **Handle wrap-around when building river adjacency masks**
- Author: `chatgpt-codex-connector[bot]`
- Type: review comment
- Location: `mods/mod-swooper-maps/src/recipes/standard/stages/hydrology-hydrography/river-adjacency.ts:25`
- Status: **unresolved**
- Evidence: adjacency scan clamps `x0/x1` to map bounds; no wrap-X handling.

### PR #689 — M10 map-morphology stamping
Doc: `docs/projects/engine-refactor-v1/issues/M10-U03-map-morphology-stamping.md`

13) **Sync heightfield buffers after `expandCoasts`**
- Author: `chatgpt-codex-connector[bot]`
- Type: review comment
- Location: `mods/mod-swooper-maps/src/recipes/standard/stages/map-morphology/steps/plotCoasts.ts:20`
- Status: **unresolved (needs decision)**
- Evidence: step calls `adapter.expandCoasts(...)` but does not re-sync `context.buffers.heightfield`.

### PR #687 — M10 delete overlays as morphology inputs
Doc: `docs/projects/engine-refactor-v1/issues/M10-U01-delete-overlays-as-morphology-inputs.md`

14) **Update config uses after schema key removal (seaLanes, hotspot, seaLaneAvoidRadius)**
- Author: `chatgpt-codex-connector[bot]`
- Type: review comment
- Location: `mods/mod-swooper-maps/src/domain/morphology/ops/compute-coastline-metrics/contract.ts:8`, `.../plan-island-chains/contract.ts:7`
- Status: **resolved downstream**
- Evidence: no recipe configs reference `seaLanes` or `seaLaneAvoidRadius` anymore; obsolete keys removed from standard recipe configs.

## Unresolved Issues — Categories & Invariants to Extract

### A) Contract/schema hygiene
**Proposed invariants:**
- No top-level object defaults in contract schemas.
- Avoid `additionalProperties` unless explicitly required (decision needed; current docs conflict).
- JSdoc for each schema property; JSdoc text matches `description`.
- Descriptions must include behavioral context + default posture.

**Evidence:** PR #711 comments.

**Conflict to resolve:**
- `LOCAL-TBD-M11-U10` instructs `additionalProperties: false` on new configs.
- `docs/system/libs/mapgen/hydrology-api.md` asserts defaults belong in schemas.

### B) Op modularity (no god-ops)
**Proposed invariants:**
- Ops should be thin orchestrators; algorithms live in rules/strategies/shared libs.
- Entry files under `src/**` remain declarative (AGENTS rule).

**Evidence:** PR #708 comments; `mods/mod-swooper-maps/src/AGENTS.md`.

### C) Boundary & polar semantics
**Proposed invariants:**
- `boundaryCloseness` must influence interior tiles (gradients, not only boundary ring).
- Boundary-only plates are **youngest** (age = 0) to preserve “young at boundaries” semantics.
- Polar band boundary influence must not disappear away from edge rows (unless U11 fully replaces projection).

**Evidence:** PR #698, #700, #706 comments; U03/U05/U11 docs.

### D) Knob normalization safety
**Proposed invariants:**
- After applying knob multipliers, clamp to schema max/min to avoid invalid configs.

**Evidence:** PR #697 comment; M11-U02 doc “knobs apply last” + strict schema validation.

### E) Gameplay stamping correctness
**Proposed invariants:**
- Adapter mutations that affect terrain must either (a) sync buffers or (b) explicitly assert downstream ignores adapter state.
- Wrap-X maps must respect seam adjacency when building proximity masks.

**Evidence:** PR #689, #690 comments.

## Invariant scan snapshot (current stack head)

- **Schema defaults:** 375 `default:` occurrences across 51 contract files (scan: `rg -n "default:" mods/mod-swooper-maps/src/**/contract.ts`).
- **`additionalProperties`:** 78 occurrences across 23 contract files (scan: `rg -n "additionalProperties" mods/mod-swooper-maps/src/**/contract.ts`).
- **Boundary closeness gating:** `compute-substrate` still gates closeness by `boundaryType` (see `mods/mod-swooper-maps/src/domain/morphology/ops/compute-substrate/rules/index.ts`).
- **Boundary-only plates:** `dist01 = maxDist <= 0 ? 1 : d / maxDist` still present (see `mods/mod-swooper-maps/src/domain/foundation/ops/compute-crust/index.ts`).
- **Polar band seeding:** `project-plates.ts` seeds boundaries only by tile plate adjacency (no tectonics boundary seeding).
- **Wrap-X adjacency:** `hydrology-hydrography/river-adjacency.ts` does not wrap X.
