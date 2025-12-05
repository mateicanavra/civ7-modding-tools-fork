# Architecture Decision Records — Swooper Maps

> Significant architectural decisions for the Swooper Maps mod. Follow the global ADR pattern in `docs/system/ADR.md`.

## ADR-001: Era-Tagged Morphology View
**Status:** Accepted
**Date:** 2025-12-05
**Context:** A proposal suggested iterating Foundations → Voronoi plate solve → morphology multiple times to stack per-iteration “era” tags for narrative use. The refactor blueprint mandates a single immutable `FoundationContext` per run with WorldModel tightly coupled to the engine; repeated solves would force teardown of engine-bound state and risk desync with the staged buffers.
**Decision:** Keep the single-pass physics pipeline. Do not rerun foundations/morphology in multiple loops. Derive era-like signals analytically from the existing physics snapshot and publish them as immutable overlays (e.g., `eraMorphology`) alongside margins.
**Consequences:**
- Preserves single source of truth and determinism (`FoundationContext` + WorldModel) without extra plate solves.
- Narrative layers read sparse overlay records derived from physics tensors (`shieldStability`, `riftPotential`, `upliftPotential`, `boundaryCloseness`, `boundaryType`) instead of mutating the heightfield again.
- Performance remains bounded; morphology/physics run once. Implementation lives in overlays/tagging, leaving heightfield edits inside morphology stages only.
- Next steps: add an era overlay entry in `StoryOverlays`, emit records during morphology using staged buffers/tensors, expose accessors for narrative/placement consumers, and cover with diagnostics (ASCII/histograms) for validation.
