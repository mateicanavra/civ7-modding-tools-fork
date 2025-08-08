## Mini-roadmap and Feature Tracker

This document tracks completed work and upcoming enhancements for the CLI and XML-first crawler.

### Completed

- XML-first deep crawl (Completed)
  - GameEffects normalization into logical tables: `Modifiers`, `ModifierArguments`, `RequirementSets`, `RequirementSetRequirements`, `Requirements`, `RequirementArguments`.
  - Attach-chain traversal via `ModifierArguments(Name="ModifierId") → Modifiers`.
  - Light layering and delete semantics: respects Database `<Delete>`, deterministic file order (lexicographic), last write wins by sequence, prunes non-existent targets.
  - Provenance on every row (`__file`, `__table`) for accurate manifest slicing.
- CLI UX unchanged; defaults from `civ.config.jsonc`.
  - Acceptance validated on: `CIVILIZATION_ROME`, `LEADER_GENGHIS_KHAN`.

- Visualization improvements (Completed)
  - Edge labeling for readability (e.g., `LeaderTraits`, `TraitModifiers`, `Argument`, `Attach`, `SubjectRequirementSetId`, `OwnerRequirementSetId`).
  - Self-loop edges suppressed.

- Phase B — Layout semantics & UX (Completed)
  - VIZ-3: Layered layout by table with `rankdir=LR`; group ranks: Leaders/Civilizations → Traits → Modifiers → RequirementSets → Requirements → Arguments.
  - VIZ-6: Provenance-aware tooltips and hyperlinks.
    - Nodes: tooltip shows `Table:Id` and relative path; `URL` points to `file://<abs>`; `target=_blank`.
    - Edges: tooltip shows `<label> from <fromTable>:<fromId> → <toTable>:<toId>`.
    - Proper DOT/URI escaping; no URLs on edges.
  - Acceptance: Verified on `LEADER_AMINA`, `CIVILIZATION_ROME`; no Phase A regressions; large graphs still render.

- Phase D — Structural grouping (Completed)
  - VIZ-11: Cluster requirement sets
    - Each `RequirementSet` is rendered as a cluster containing its `Requirements` and `RequirementArguments`.
    - Preserves Phase B layered ranks; cluster members are removed from global ranks to avoid double-parenting.
    - Edges to/from clusters use invisible anchors with `lhead`/`ltail` for clean routing.
    - Acceptance: Rome/Amina show each ReqSet as a grouped unit; labels and edge styles preserved.

- VIZ-19 — Semantic tooltips (Completed)
  - Modifiers: include `Effect`, `Collection`, optional `Permanent`, plus top N `Name=Value` arguments.
  - RequirementSets: include `RequirementSetType` and count of requirements.
  - Requirements: include `RequirementType` and key `Name=Value` arguments.
  - Acceptance: Tooltips show concise summaries in addition to `table:id` + path.

- Phase F (Baseline) — Local Interactive Visualizer (VIZ-13)
  - Explore defaults to generating and opening a local HTML viewer:
    - `civ7 explore <seed>` now emits `out/<seed>/graph.svg` and `out/<seed>/graph.html`, then opens `graph.html`.
    - `--viz.html` (alias `--vizHtml`) controls HTML viewer emission (default: true).
    - `--open` controls auto-open behavior (default: true); `--openOnline` unchanged.
  - Viewer design (offline, single file, no deps):
    - Wraps the rendered `graph.svg` (from `@hpcc-js/wasm` in Node) inside a minimal HTML shell.
    - Mouse: wheel zoom anchored to cursor; drag to pan; double‑click to fit.
    - Keyboard: WASD/Arrow pan with acceleration/deceleration; `+`/`-` to zoom; `0` to fit; `Shift` for faster pan.
    - Fit-to-screen on load and window resize.
    - Light theme background to match SVG defaults; no external network calls.
  - Acceptance: Works offline; preserves DOT styling fidelity; handles large graphs.

- Phase F (Dev server) — VIZ-14 (optional) 
  - `--serve` flag starts a tiny static server rooted at `out/<seed>` and opens `http://localhost:<port>/graph.html`.
  - `--port` selects port (default 3000, falls back if busy).
  - Use with `civ7 explore <seed> --serve` for local iteration.

### Next up

- Phase C — Complexity controls (crawler + viewer cross-cutting)
  - VIZ-4: Toggle noisy structures via flags (optional)
    - Examples: `--viz.hideArguments`, `--viz.hideRequirementArguments`, `--viz.hideGenericEdges`.
  - VIZ-5: Depth limiting
    - Examples: `--viz.maxDepth=N` to cap BFS depth; consider per-table depth caps later.
  - Direction: Adjust how deep we traverse and which structures we reveal to surface more meaningful information with controllable complexity.

### Future development

- Rich viewer milestone (defer)
  - Consider leveraging existing graph libraries for a richer UI with less custom code.
  - Candidate: AntV G6 (+ ELK for layout) to provide minimap, search, filters, deep-linking, and configurable styling out of the box.
  - Bundle: Treat as a dedicated milestone alongside styling; package as a static app if pursued.

- Parked items (until rich viewer milestone):
  - Phase E — Config-driven styling (VIZ-10)
    - Override node/edge styles via config; better done within the chosen viewer framework.
  - Phase F (Advanced) — VIZ-15..18 (minimap/search/state/packaging)
    - To be implemented within the rich viewer track.

---

## Phase reference (static descriptions)

The sections below describe each phase in detail. They are not a roadmap and may include items already completed.

#### Phase A — Quick visual clarity (Completed)
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

#### Phase B — Layout semantics & UX (Completed)
- VIZ-3: Layered layout by table (rank hints)
  - `rankdir=LR`; grouped ranks: Leaders/Civs → Traits → Modifiers → RequirementSets → Requirements → Arguments.
- VIZ-6: Tooltips and hyperlinks (provenance-aware)
  - Node `tooltip` and `URL` to file paths; preserve full IDs; edge tooltips added; offline-safe and escaped.

#### Phase C — Complexity controls (Next)
- VIZ-4: Toggle noisy structures via flags (optional)
  - Flags: `--viz.hideArguments`, `--viz.hideRequirementArguments`, `--viz.hideGenericEdges`.
- VIZ-5: Depth limiting
  - Optional `--viz.maxDepth=N` to cap BFS depth.

#### Phase D — Structural grouping (Completed)
- VIZ-11: Cluster requirement sets
  - Render each `RequirementSet` and its `Requirements`/`Arguments` as a subgraph cluster; style aligns with RequirementSet node color.
  - Non-goal: clustering by file; file is provenance, not a semantic boundary. Consider file overlays later if needed.

#### VIZ-19 — Semantic tooltips (Completed)
- Purpose: add meaning without changing labels heavily.
- Content by type:
  - Modifiers: `Effect`, `Collection`, optional `Permanent`, plus a few `Name=Value` arguments.
  - RequirementSets: `RequirementSetType` and number of requirements.
  - Requirements: `RequirementType` and key `Name=Value` arguments.
- Acceptance: Tooltip shows summaries; DOT strings escaped; no performance regressions.

#### Phase E — Theming & wrapper (defer until requested)
- VIZ-10: Config-driven styling (optional)
  - Optional `viz` block in `civ.config.jsonc` to override table/node/edge styles.
- VIZ-12: HTML wrapper for pan/zoom UX (optional)
  - `--viz.html` to emit a minimal HTML viewer that wraps the SVG for panning/zooming.

#### Phase F (Baseline) — Local Interactive Visualizer (keep server pipeline as-is) (Completed)

Goal: Add a polished, local, interactive visualization path without changing the server-side crawl→DOT pipeline.

// Completed as an SVG wrapper (no d3-graphviz) — see Completed section above.

// Completed — see Completed section above.

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

---

Notes
- Keep crawl/index/DOT rendering exactly as-is. Visualizers are additive, consuming the DOT output.
- Continue to prefer `@hpcc-js/wasm` for server-side rendering; baseline local viewer is a lightweight SVG wrapper; consider d3-graphviz or G6+ELK for advanced UX if/when needed.

### Archived Plans

- XML-FIRST-CRAWL-PLAN.md — Implemented and removed. The plan was realized as:
  - GameEffects normalization, attach-chains, layering/deletes, provenance, deterministic traversal.
  - Acceptance: deep graphs for Rome and Genghis, manifests include GameEffects sources, no dangling edges.
  - Visualization improvements are now tracked as tickets above.


