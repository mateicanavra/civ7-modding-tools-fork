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

- Execution order (priority)
  1. Phase A — Quick visual clarity (done; incremental tweaks okay)
  2. Phase F (Baseline) — Local Interactive Visualizer (VIZ-13)
  3. Phase B — Layout semantics & UX (VIZ-3, VIZ-6)
  4. Phase C — Complexity controls (VIZ-4, VIZ-5)
  5. Phase D — Structural grouping (VIZ-11)
  6. Optional: Phase F (Dev server) — VIZ-14; Phase E — Config-driven styling (VIZ-10)
  7. Later: Phase F (Advanced) — VIZ-15, VIZ-16, VIZ-17, VIZ-18

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

#### Phase F (Baseline) — Local Interactive Visualizer (keep server pipeline as-is)

Goal: Add a polished, local, interactive visualization path without changing the server-side crawl→DOT pipeline.

- VIZ-13: Explore — local HTML viewer using d3-graphviz (baseline)
  - Why: Fastest path to beautiful DOT rendering with pan/zoom and fit-to-screen.
  - Scope:
    - CLI: `civ7 explore <seed> --viz.html` to emit `graph.html` next to SVG (embed DOT inline).
    - Viewer: Single-file HTML + d3-graphviz to render DOT→SVG, with zoom and fit options.
    - Auto-open in default browser after generation (macOS `open`, Linux `xdg-open`, Windows `start`).
  - Acceptance:
    - Works offline; no external services; opens in <2s on Amina/Rome graphs.
    - Honors our DOT styling (shapes, colors, edge styles); responsive fit.
  - Risks: Large graphs are still SVG; acceptable for now.

- VIZ-14: Explore — dev server mode (optional)
  - Why: Enable quick iteration and hot reload for large graphs.
  - Scope: `--serve` flag spins a tiny local HTTP server (Express or Node http) that serves `graph.html`, `graph.dot`, and opens `http://localhost:<port>`.
  - Acceptance: Server starts; browser opens; refresh picks up new DOT.

- VIZ-15: Advanced viewer prototype (G6 + ELK)
  - Why: Rich UX (minimap, search, filters) and scalable layout beyond plain DOT.
  - Scope:
    - Parse DOT → AST (`@ts-graphviz/parser`) → nodes/edges model.
    - Layout with `elkjs` (direction RIGHT, spacing tuned); render with AntV G6.
    - Map table types to colors/shapes; add hover/click tooltips (file/provenance), selection highlight.
  - Acceptance: Rome/Amina graphs render with minimap; nodes clickable to show file path; performance acceptable.
  - Risks: More code/complexity; keep separate from baseline viewer.

- VIZ-16: Search and filters (optional)
  - Scope: In-viewer search by `table:id`; filters to hide `*Arguments`, generic edges.
  - Acceptance: Instant search; toggles affect visibility without reload.

- VIZ-17: Deep link & state (optional)
  - Scope: Persist selected seed and toggles in URL hash; copy-link to share a view.

- VIZ-18: Packaging (optional)
  - Scope: If needed, split into `packages/viewer/` (Vite+TS) and publish a static bundle; CLI copies it and injects DOT.

Notes
- Keep crawl/index/DOT rendering exactly as-is. Visualizers are additive, consuming the DOT output.
- Continue to prefer `@hpcc-js/wasm` for server-side rendering; d3-graphviz for the local HTML viewer; G6+ELK for advanced UX if/when needed.

### Archived Plans

- XML-FIRST-CRAWL-PLAN.md — Implemented and removed. The plan was realized as:
  - GameEffects normalization, attach-chains, layering/deletes, provenance, deterministic traversal.
  - Acceptance: deep graphs for Rome and Genghis, manifests include GameEffects sources, no dangling edges.
  - Visualization improvements are now tracked as tickets above.


