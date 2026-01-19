# Gameplay Context Packet (Domain-Only, Non-Prescriptive)

This is supporting context for the Gameplay domain refactor. It is NOT authoritative and must not override the canonical workflow docs or Phase 2 modeling.

## Scope framing (what “Gameplay” is, at mapgen time)

Gameplay is the map generation domain concerned with player-facing “board outcomes”:
- Starts and board setup (start plots, regions/partitions, start-bias inputs).
- Content placement that players interact with early (resources, natural wonders, discoveries, floodplains, other constructibles).
- Engine apply boundaries and projections that translate domain intent into Civ7 engine state.

Gameplay is NOT:
- A physics domain (it does not own earth-physics causality).
- A story/narrative overlay system for this refactor phase.
- A catch-all bag for downstream convenience (biasing must be explicit via config or explicit contracts; no hidden multipliers).

## Key boundary relationship: Ecology ↔ Gameplay (directional; not a design lock-in)

Ecology and Gameplay must be co-designed:
- Ecology tends to be physics-derived “world meaning” (biomes, soil/fertility proxies, candidate basins/intents).
- Gameplay tends to be player-facing “board setup + placements applied”.

The boundary is an explicit Phase 0.5/2 deliverable:
- What belongs in Ecology vs what belongs in Gameplay.
- Which contracts are public (stable) vs internal.
- Where Gameplay should consume Ecology outputs vs where Ecology should consume Gameplay constraints.

## Evidence: Civ7 mapgen-time gameplay touchpoints

Use `docs/system/libs/mapgen/research/SPIKE-gameplay-mapgen-touchpoints.md` as evidence for:
- which mapgen-time gameplay levers exist in Civ7 scripts/data,
- which constants/tables are data-driven (start biases, discovery sifting mapping, map-type resource behavior),
- what the engine expects to happen during map generation.

This evidence should shape “what must be supported”, not dictate our internal domain model.

## Known repo-local gravity (prior art, not constraints)

The repo currently has:
- a Placement domain that is already “domain-shaped” as ops/contracts/config,
- legacy story/narrative surfaces and stages that currently influence physics and ecology.

For this refactor phase, the posture is:
- Narrative/story overlays are legacy and must be removed/replaced (not stabilized as a first-class contract).
- Placement dissolves into Gameplay ownership.

Existing repo-local inventories live under:
- docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/gameplay/

## Risks and traps (what to watch for early)

- Premature convergence on today’s stage braid:
  - model Gameplay from first principles, then decide what braid boundaries exist for real constraints.
- Hidden multipliers/constants creeping into “biasing” logic:
  - any thresholds/weights must be explicit config or named constants with intent.
- Backdoors to engine globals:
  - Gameplay is an engine apply boundary; keep engine reads/writes behind adapter surfaces.
- Contract sprawl:
  - publish only stable, cross-domain contracts; keep unstable intermediates internal.

