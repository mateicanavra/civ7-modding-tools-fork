# Gameplay Domain Refactor (Draft Spec)

## Objective

Consolidate **mapgen-time gameplay concerns** into a coherent Gameplay domain surface, while preserving the current **stage braid** (interleaving with physics domains) where necessary.

“Gameplay” here includes:
- “Board setup” (starts, advanced start regions, scoring inputs like fertility/water)
- “Content placement” (resources, wonders, discoveries, floodplains, other constructibles)
- “Story overlays” (corridors/swatches/motifs) as structured, publishable context for downstream consumers

This is a planning/spec document, not implementation.

## Canonical Sources

- System evidence spike (design-level): `docs/system/libs/mapgen/research/SPIKE-gameplay-mapgen-touchpoints.md`
- Project wiring inventory (repo-specific): `docs/projects/engine-refactor-v1/resources/spike/spike-gameplay-domain-refactor-plan-notes.md`

## Current State Snapshot (What Exists Today)

- Stage braid + step inventory: `STAGE-STEP-INVENTORY.md`
- Ownership proposal (draft): `OWNERSHIP-MAP.md`
- Code absorption candidates: `DOMAIN-ABSORPTION-INVENTORY.md`
- Civ7 lever inventory: `CIV7-MAPGEN-LEVER-INVENTORY.md`
- Adapter gap triage: `ADAPTER-GAP-TRIAGE.md`

## Outputs (What This Spec Should Produce)

- A crisp **ownership model** for the stage braid: what becomes Gameplay-owned vs physics-owned.
- A **domain-code absorption inventory**: what we would absorb from Placement/Narrative today.
- An evidence-backed list of **Civ7 mapgen levers** that Gameplay should own.
- A triaged list of **adapter gaps** (out-of-scope vs needed-for-v1 vs later).
- A short list of **open questions** that are truly blocking (vs nice-to-resolve).

## Key Artifacts

See:
- `OWNERSHIP-MAP.md`
- `DOMAIN-ABSORPTION-INVENTORY.md`
- `CIV7-MAPGEN-LEVER-INVENTORY.md`
- `ADAPTER-GAP-TRIAGE.md`

## Target Shape (Design-Level, Repo-Aware)

### What “Gameplay owns” (definition)

Gameplay owns:
- the **meaningful contracts** of player-facing board setup and board content placement (starts, advanced start regions, content placement hooks)
- the **overlay system contract** (overlay keys/types/semantics) as the “story about how the world was made”

Gameplay does not necessarily own:
- every step that reads/writes overlays (physics steps may publish overlays as a byproduct)
- physics causality itself (terrain/climate/hydrology/etc remain physics domains)

### “Braid preserved, ownership clarified”

The stage braid stays interleaved (source: `STAGE-STEP-INVENTORY.md`), but we treat:
- `narrative-*` stages as **Gameplay-owned** (overlay production)
- `placement` as **Gameplay-owned** (engine apply boundary)

Physics stages remain physics-owned, but:
- they may **consume** overlays as policy inputs
- they may **publish** overlays when they are the authoritative producer (see HOTSPOTS wrinkle in `OWNERSHIP-MAP.md`)

### Domain module consolidation (draft intent)

Introduce a new public domain surface (name TBD in implementation):
- `@mapgen/domain/gameplay`

Absorb:
- Placement domain ops/config as the “planning + apply” backbone (see `DOMAIN-ABSORPTION-INVENTORY.md`)
- Narrative overlay machinery + motif/corridor/swatches/orogeny modules as gameplay-owned overlay production tooling

Deprecate (eventual):
- `@mapgen/domain/placement` (subsumed into Gameplay)
- `@mapgen/domain/narrative` (subsumed into Gameplay)

## Boundaries and Guardrails (What Must Be True)

### 1) Overlay contract stability

Overlay outputs are cross-pipeline: multiple downstream steps depend on them.

Guardrail:
- Any refactor must preserve a stable overlay contract surface for consumers (or explicitly migrate consumers in the same slice).

Evidence of consumers and their needs:
- `STAGE-STEP-INVENTORY.md` (“Cross-Pipeline Overlay Consumers”)

### 2) “Gameplay owns meaning; physics may publish”

We treat overlays as the Gameplay-owned story contract, but do not force all overlay publication to occur in Gameplay-owned stages.

This keeps churn low and matches current reality:
- `morphology-post/steps/islands.ts` publishes HOTSPOTS overlays as part of island shaping.

### 3) Adapter boundary remains the execution boundary

Gameplay must not import Civ7 `base-standard` scripts directly in step implementations.
Instead:
- gameplay application steps call through the existing `EngineAdapter` methods.

The adapter gap triage indicates Gameplay v1 likely does not require new adapter methods:
- `ADAPTER-GAP-TRIAGE.md`

## Open Questions (Intentionally Few)

1) What is the intended fate of story modules that directly mutate physics buffers (e.g., paleo rainfall artifacts)?
   - Evidence: `mods/mod-swooper-maps/src/domain/narrative/paleo/rainfall-artifacts.ts`
   - Options are captured in `DOMAIN-ABSORPTION-INVENTORY.md`.

2) Do we want to enforce “only gameplay stages publish overlays”, or is “physics may publish overlays” our stable posture?
   - Recommended default for v1: allow physics publication when authoritative (see `OWNERSHIP-MAP.md`).

## Suggested Next Artifact (If We Proceed)

The implementation/migration plan for Gameplay v1 lives in:
- `docs/projects/engine-refactor-v1/resources/domains/gameplay/IMPLEMENTATION-PLAN.md`
