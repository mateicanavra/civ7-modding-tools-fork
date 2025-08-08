## Mini-roadmap and Feature Tracker

This document tracks completed work and upcoming enhancements for the CLI and XML-first crawler.

### Completed

- XML-first deep crawl (Completed)
  - GameEffects normalization into logical tables: `Modifiers`, `ModifierArguments`, `RequirementSets`, `RequirementSetRequirements`, `Requirements`, `RequirementArguments`.
  - Attach-chain traversal via `ModifierArguments(Name="ModifierId") → Modifiers`.
  - Light layering and delete semantics: respects Database `<Delete>`, deterministic file order (lexicographic), last write wins by sequence, prunes non-existent targets.
  - Provenance on every row (`__file`, `__table`) for accurate manifest slicing.
  - CLI UX unchanged; defaults from `civ-zip-config.jsonc`.
  - Acceptance validated on: `CIVILIZATION_ROME`, `LEADER_GENGHIS_KHAN`.

- Visualization improvements (Completed)
  - Edge labeling for readability (e.g., `LeaderTraits`, `TraitModifiers`, `Argument`, `Attach`, `SubjectRequirementSetId`, `OwnerRequirementSetId`).
  - Self-loop edges suppressed.

### Upcoming (Tickets, prioritized shallow → deep)

#### Phase A — Quick visual clarity
- VIZ-8: Global layout tuning
  - Set graph attrs: `rankdir=LR`, `overlap=false`, `splines=true`, `concentrate=true`, `nodesep`, `ranksep`.
- VIZ-1: Node styling by table (shape, border, color)
  - Map tables to Graphviz node attributes (shape, style, fillcolor, color, penwidth). Focus on: `Traits`, `Modifiers`, `RequirementSets`, `Requirements`, `ModifierArguments`, `RequirementArguments`.
- VIZ-2: Edge styling by relationship
  - Solid for primary relations (LeaderTraits, TraitModifiers), dashed for attach, dotted for generic, distinct colors for requirement set links.
- VIZ-9: Label wrapping and truncation
  - Wrap/truncate long IDs in labels; use full IDs in tooltips.
- VIZ-7: Legend/Key cluster
  - Add a legend subgraph that explains node and edge styles.

#### Phase B — Layout semantics & UX
- VIZ-3: Layered layout by table (rank hints)
  - Use `rankdir=LR`; group ranks: Leaders/Civs → Traits → Modifiers → RequirementSets → Requirements → Arguments.
- VIZ-6: Tooltips and hyperlinks (provenance-aware)
  - Add node `tooltip` and `URL` to file paths; preserve full IDs in tooltip.

#### Phase C — Complexity controls
- VIZ-4: Toggle noisy structures via flags (optional)
  - Flags: `--viz.hideArguments`, `--viz.hideRequirementArguments`, `--viz.hideGenericEdges`.
- VIZ-5: Depth limiting
  - Optional `--viz.maxDepth=N` to cap BFS depth.

#### Phase D — Structural grouping
- VIZ-11: Cluster requirement sets
  - Render each `RequirementSet` and its `Requirements`/`Arguments` as a subgraph cluster.

#### Phase E — Theming & wrapper (defer until requested)
- VIZ-10: Config-driven styling (optional)
  - Optional `viz` block in `civ-zip-config.jsonc` to override table/node/edge styles.
- VIZ-12: HTML wrapper for pan/zoom UX (optional)
  - `--viz.html` to emit a minimal HTML viewer that wraps the SVG for panning/zooming.

### Archived Plans

- XML-FIRST-CRAWL-PLAN.md — Implemented and removed. The plan was realized as:
  - GameEffects normalization, attach-chains, layering/deletes, provenance, deterministic traversal.
  - Acceptance: deep graphs for Rome and Genghis, manifests include GameEffects sources, no dangling edges.
  - Visualization improvements are now tracked as tickets above.


