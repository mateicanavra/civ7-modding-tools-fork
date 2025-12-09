# Project: Swooper Maps

**Status:** Active
**Teams:** Solo / AI-assisted

## Scope & Objectives

Large-scale procedural map generation mod for Civilization VII featuring:
- Physics-based terrain generation using Voronoi plate tectonics
- Climate simulation with baseline, swatch, and refinement layers
- Narrative overlay system for geological storytelling
- Stage manifest-based orchestration

## Deliverables

- [ ] Stable physics pipeline (Voronoi → plate mask → terrain)
- [ ] Climate engine integration
- [ ] Narrative overlay system
- [ ] Multiple map presets
- [ ] TypeScript migration with testable package architecture

## Milestones

- [M-TS: TypeScript Migration & Package Architecture](milestones/M-TS-typescript-migration.md) — Transform monolithic JS into typed, testable packages

## Active Plans

- [MAPS Engine Refactor](MAPS-engine-refactor/overview.md) — Physics-first orchestration engine
- [Era-Tagged Morphology ADR](../../system/libs/mapgen/adrs/adr-001-era-tagged-morphology.md) — Single-Pass Morphology decision
- [Plate Generation Refactor](plate-generation-refactor.md) — Unified Voronoi pipeline

## Resources

- [Map Generation Pipeline Outline](resources/map-generation-pipeline.outline.md)
- [Slideshows](resources/slideshows/)

## System Documentation

Evergreen architecture docs live in the system directory:
- [Mod Architecture](../../system/mods/swooper-maps/architecture.md) — Bootstrap and config pipeline
- [Mod Vision](../../system/mods/swooper-maps/vision.md) — Epic Diverse content vision
- [Mapgen Design](../../system/libs/mapgen/design.md) — Stage manifest and foundation config
- [Mapgen Pipeline](../../system/libs/mapgen/margins-narrative.md) — Continental margins and narrative overlays

## Links & References

- Mod source: `mods/mod-swooper-maps/`
- Templates: `docs/templates/`
