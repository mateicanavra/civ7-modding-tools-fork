# Plate-Driven Landmass Refactor Plan

Tracking work to integrate Civ VII plate generation into the Swooper map pipeline.

## Task List

- [x] Config surface updates (types, defaults, tunables) for WorldModel controls
- [x] New preset/entry wiring to opt into plate-driven settings
- [x] Landmass generation refactor to consume WorldModel plate output
- [x] Optional post-processing hooks (plate seed overrides, ocean adjustments)

## Notes

- Keep the game’s official WorldModel as the primary data source; we only layer custom tweaks on top.
- Avoid touching files under `mods/mod-swooper-maps/mod/maps/base-standard/` since they are regenerated from the game.
