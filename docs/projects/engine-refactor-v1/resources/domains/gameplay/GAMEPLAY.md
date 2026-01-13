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

