# Map Generation Plugin

The `plugin-mapgen` package provides the map generation pipeline for Civ VII mods. It layers climate, tectonics, and narrative systems on top of the base game generators.

## Key Components

- **Landmass generation** — Plate-aware continental shaping via Voronoi physics
- **Climate system** — Two-phase rainfall with orographic effects and humidity gradients
- **Narrative overlays** — Story-driven terrain motifs (hotspots, rifts, corridors, swatches)
- **Biome/feature placement** — Validated placement with base-game compatibility

## Documentation

- [Layer Contracts](layer-contracts.md) — Detailed API contracts for each generation layer
- [Climate Story System](climate-story/) — Climate narrative overlays and motifs

## Related

- [Swooper Maps Architecture](../mods/swooper-maps/overview.md) — Bootstrap and config system
- Package source: `packages/plugins/plugin-mapgen/`

<!-- NOTE FOR AGENTS:
If this overview exceeds ~300 lines or you find yourself adding a major subsystem,
consider splitting into dedicated docs per DOCS.md Section 7 guidelines.
-->
