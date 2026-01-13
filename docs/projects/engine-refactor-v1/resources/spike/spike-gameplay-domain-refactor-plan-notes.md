# Gameplay Domain Refactor — Plan Notes + Repo Wiring Inventory

This is the **project-scoped** companion to the system-level evidence spike:
- Canonical evidence (design-level, low churn): `docs/system/libs/mapgen/research/SPIKE-gameplay-mapgen-touchpoints.md`

This document is allowed to be **repo-specific**: it captures where “gameplay mapgen” concerns live today (stages, step contracts, adapter APIs) so we can plan a consolidated Gameplay domain refactor without muddying system docs.

## Current in-repo wiring (what we actually call today)

### Placement stage (engine-facing “apply”)

- The placement “apply” step calls Civ7 engine placement APIs (via adapter):
  - `mods/mod-swooper-maps/src/recipes/standard/stages/placement/steps/placement/apply.ts`

This is the strongest current anchor for what a “gameplay application boundary” looks like in the pipeline today.

### Placement domain (planning ops used by the stage)

- Placement ops are already “domain-shaped” planning units used upstream of `apply`:
  - `mods/mod-swooper-maps/src/domain/placement/ops/*`
  - (notably used by placement stage input-derivation steps, e.g. “derive placement inputs”)

### Narrative stages (gameplay-oriented, overlay-shaped outputs)

Narrative is already producing “story” artifacts/overlays that downstream consumers read:
- `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-pre/steps/storyCorridorsPre.contract.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/narrative-post/steps/storyCorridorsPost.contract.ts`

Ecology consumes these narrative outputs (evidence: step contracts under `mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/**/contract.ts` reference narrative artifacts).

**Implication:** a merged Gameplay domain plausibly pulls in “narrative overlay production” as a first-class gameplay output surface (even if the stage braid remains).

## Adapter surface (what’s explicitly supported by the Civ7 bridge)

The adapter already exposes the key base-standard script entrypoints for gameplay mapgen concerns (starts/resources/discoveries/wonders/fertility, etc.):
- `packages/civ7-adapter/src/types.ts` (`EngineAdapter`)

This gives the Gameplay domain a clean “engine boundary” to hang gameplay application steps on, without letting steps import base-standard scripts directly.

## SDK authoring surfaces (data-driven gameplay tuning)

The SDK already contains authoring nodes for start-bias tables (data-driven knobs that impact mapgen-time start placement):
- `packages/sdk/src/nodes/StartBias*Node.ts`

This is evidence that “gameplay at mapgen time” includes both:
- **runtime map scripts** (engine-side map generation)
- **data-driven tuning tables** (modded via SDK/data pipeline)

## Planned next deepening (inventory targets)

If we proceed to “one level deeper”, the concrete deliverable to produce is a gameplay refactor inventory:
- Exact list of **which narrative-* stages/steps** become gameplay-owned (corridors/swatches/motifs/story overlays), and which remain physics-domain-owned.
- Exact list of **which placement stage steps** become gameplay-owned (inputs planning + apply).
- Artifact/overlay contract map for gameplay outputs that downstream domains consume.

Open question to answer with evidence:
- Which additional Civ7 gameplay levers exist in official scripts that we do **not** currently expose via `EngineAdapter` (e.g., script-level APIs that are present but not wrapped yet), and whether they belong in the gameplay domain refactor scope.
