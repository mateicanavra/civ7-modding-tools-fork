# Plate-Driven Landmass Refactor Plan

Tracking work to integrate Civ VII plate generation into the Swooper map pipeline.

## Task List

- [x] Config surface updates (types, defaults, tunables) for WorldModel controls
- [x] New preset/entry wiring to opt into plate-driven settings
- [x] Landmass generation refactor to consume WorldModel plate output
- [x] Optional post-processing hooks (plate seed overrides, ocean adjustments)

## Phase 2 – Plate-Driven Terrain & Climate

- [x] Integrate plate polygons into landmass carving (port or wrap the Voronoi continent generator)
- [ ] Re-tune mountains & hills to honor uplift/rift potentials (adjust targets + weighting)
- [ ] Expand configuration hooks for plate-aware terrain (post-processing ranges, presets, docs)

## Notes

- Keep the game’s official WorldModel as the primary data source; we only layer custom tweaks on top.
- Avoid touching files under `mods/mod-swooper-maps/mod/maps/base-standard/` since they are regenerated from the game.
- When tackling Phase 2, validate each step in-game (terrain distribution, start placement, climate) before moving to the next bullet.
