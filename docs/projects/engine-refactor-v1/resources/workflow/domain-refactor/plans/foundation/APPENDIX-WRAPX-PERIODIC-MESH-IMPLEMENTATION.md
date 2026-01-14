# APPENDIX: WrapX Periodic Delaunay/Voronoi (Implementation Notes)

> Purpose: capture the concrete algorithm + code touchpoints for implementing **wrapX-correct mesh-first Foundation** using `d3-delaunay`, with **no adapter fallback** and **no non-wrap code paths**.
>
> This appendix is intended to be referenced by the Phase 3 implementation plan (`issues/LOCAL-TBD-M8-U21-foundation-vertical-domain-refactor.md`) and the canonical mesh spec (`SPEC-FOUNDATION-DELAUNAY-VORONOI.md`).

## Authority / Inputs

- **Architecture (authoring shape):** `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/WORKFLOW.md`
- **Canonical mesh backend spec:** `docs/projects/engine-refactor-v1/resources/workflow/domain-refactor/plans/foundation/SPEC-FOUNDATION-DELAUNAY-VORONOI.md`
- **Algorithmic coordinate + wrap semantics:** `docs/projects/engine-refactor-v1/resources/PRD-plate-generation.md`
- **External research (periodic construction):**
  - CGAL Periodic 2D Triangulations (periodic copies / offsets): https://doc.cgal.org/latest/Periodic_2_triangulation_2/index.html
  - freud Voronoi periodic boundaries (replication strategy): https://freud.readthedocs.io/en/v1.1.0/examples/module_intros/Voronoi-Voronoi.html
  - d3-delaunay API (neighbors, cellPolygon, update): https://d3js.org/d3-delaunay/voronoi

## Problem Statement

Foundation is mesh-first; the mesh is the canonical model substrate. Civ maps are cylindrical in X, so:

- Mesh adjacency **must** be periodic across the seam.
- Any mesh-space distance / vector math **must** use periodic X distance to avoid seam artifacts.
- There must be **no alternate adapter/backfill path** (single canonical backend).

Slice 6 implements the periodic `d3-delaunay` backend and treats wrapX as a Foundation invariant. This appendix remains the canonical reference for the algorithm and invariants.

## Hard Constraints (locked)

- `wrapX` is **not** authored via config (no knob); it is a required runtime posture.
- `wrapY` is unsupported (hard error or forced false).
- No adapter Voronoi utilities, no fallback/compat path, no “if wrapX then…” dual architecture.
- Defaults/derivations occur only via TypeBox defaults + `normalize(...)` (no hidden run-handler defaults).

## Coordinate Space (hex space)

PRD expectation: Delaunay/Voronoi operates in a continuous plane derived from Civ’s odd-q hex geometry so Euclidean distance matches tile adjacency.

Use the existing odd-q “hex space” mapping (legacy Foundation already uses this):

- `HEX_WIDTH = sqrt(3)`
- `HEX_HEIGHT = 1.5`
- `HALF_HEX_HEIGHT = HEX_HEIGHT / 2`

Mapping:

```ts
px = x * HEX_WIDTH
py = y * HEX_HEIGHT + ((floor(x) & 1) ? HALF_HEX_HEIGHT : 0)
```

Wrap width in this coordinate space:

```ts
wrapWidth = width * HEX_WIDTH
```

## Canonical Periodic Construction (wrapX via replication)

### Overview

Implement periodic Voronoi by **replicating each site** in X:

- Base sites lie in `[0, wrapWidth) × [0, yMax]`
- Create two periodic images per site:
  - `x - wrapWidth`
  - `x + wrapWidth`
- Build Delaunay/Voronoi on the expanded set (3× points).
- Fold neighbors/areas back to the base indices.

This yields seam-correct adjacency with a single canonical implementation.

### Data structures

For `N` base sites:

- Expanded arrays length `3N`:
  - `expandedX[3N]`, `expandedY[3N]`
  - `baseIndexOfExpanded[3N]` where `baseIndexOfExpanded[k] = k % N`

### Lloyd relaxation (periodic)

Goal: move each base site to the centroid of its periodic Voronoi region without seam discontinuities.

Approach:

1. Build expanded sites from current base sites.
2. Compute `delaunay = Delaunay.from(expandedSites)`.
3. Compute Voronoi with an **extended X viewport** to avoid seam clipping for centroiding:
   - `centroidBounds = [-wrapWidth, 0, 2 * wrapWidth, yMax]`
4. For each base site `i`, use the **center replica** `i + N`:
   - `poly = voronoi.cellPolygon(i + N)`
   - centroid is computed in extended space; if `centroidX < 0` add `wrapWidth`; if `centroidX >= wrapWidth` subtract `wrapWidth`.
5. Replace base site `i` with wrapped centroid.
6. Repeat for `relaxationSteps`.

Notes:

- Using the center replica avoids discontinuous clipped polygons at the seam.
- Using `voronoi.update()` can reduce allocations if sites are mutated in-place, but rebuilding each iteration is acceptable if performance is adequate.

### Neighbor extraction (wrap-correct)

Neighbor list per base site must be derived from backend adjacency, then folded.

For each base site `i`:

1. Start with an empty `Set<number>`.
2. For each replica index `r ∈ { i, i+N, i+2N }`:
   - iterate `delaunay.neighbors(r)` (or `voronoi.neighbors(r)` if you need clip-aware edges)
   - map `neighborBase = baseIndexOfExpanded[n]`
   - ignore `neighborBase === i`
   - add to set
3. Sort ascending and store.

This ensures:

- seam neighbors exist (because replicas sit across the seam)
- symmetry holds (validate in tests)

### Area (and optional centroids) in the base domain

To satisfy total-area invariants and produce base-domain-consistent scalars:

1. Compute Voronoi with base-domain viewport:
   - `baseBounds = [0, 0, wrapWidth, yMax]`
2. For each base site `i`, sum the areas of *its replicas’ clipped polygons*:
   - for `r ∈ { i, i+N, i+2N }`:
     - `poly = voronoi.cellPolygon(r)` (already clipped to baseBounds)
     - `area += abs(polygonArea(poly))`

Because periodic cells can split across the seam, summing replica intersections reconstructs the full periodic cell area inside the fundamental domain.

If centroids are needed for diagnostics:

- compute `(cx, cy, area)` per clipped polygon
- accumulate area-weighted centroid across replica pieces

## Downstream Implications (wrap-aware math everywhere)

Once neighbors across the seam exist, **naive `dx = bx - ax` breaks**. All mesh-space computations that use vectors/distances must be wrap-aware using `wrapWidth`.

Concrete touchpoints (current code):

- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/index.ts`
  - replace `distanceSq(ax, ay, bx, by)` with periodic X distance
- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts`
  - replace `dx = bx - ax` with `dx = wrapDeltaX(bx - ax, wrapWidth)`
- `mods/mod-swooper-maps/src/domain/foundation/projections.ts`
  - nearest-cell assignment must use wrap-correct distance in hex space (replicate sites at `x±wrapWidth` or use wrapped distance directly)

Preferred posture:

- Store `wrapWidth` on the mesh artifact contract and treat it as the authoritative periodic width for all mesh math.
- Provide a single helper (e.g. `wrapDeltaX`) in the canonical location (likely `packages/mapgen-core/src/lib/...`) so domain ops don’t reimplement periodic math.

## Entry Boundary Enforcement (no non-wrap runs)

Wrap is not a domain knob; it is a Foundation-owned invariant. Do not surface wrap
controls in runtime/entry layers.

- Remove `wrapX`/`wrapY` handling from:
  - `mods/mod-swooper-maps/src/maps/_runtime/map-init.ts`
  - `mods/mod-swooper-maps/src/maps/_runtime/standard-entry.ts`
- Remove `env.wrap` from the core env schema; Foundation assumes wrapX internally
  and treats wrapY as unsupported.

## Validation / Tests (must cover wrap)

Augment Foundation mesh-first tests to validate periodic correctness:

- Determinism: identical mesh for fixed seed/config.
- Symmetry: adjacency is symmetric for all cells.
- Total area: sum of mesh areas ≈ base-domain area (using the mesh coordinate bbox area).
- Seam adjacency: at least one neighbor pair is “across seam”:
  - there exists `i -> j` where `abs(siteX[j] - siteX[i]) > wrapWidth / 2` (in hex-space units).
- No adapter dependency: `adapter.getVoronoiUtils` is not required.

Suggested test surface:
- `mods/mod-swooper-maps/test/foundation/mesh-first-ops.test.ts`

## Implementation Surface Map (what changes, where)

Canonical backend (mapgen-core):
- `packages/mapgen-core/src/lib/mesh/delaunay.ts`
  - implement periodic replication + foldback as described above
  - expose `wrapWidth` in the returned mesh object

Foundation op contracts + artifacts:
- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-mesh/contract.ts`
- `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/artifacts.ts`
  - include `wrapWidth` in the mesh contract (single source; avoid drift)

Foundation ops consuming mesh:
- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-plate-graph/index.ts`
- `mods/mod-swooper-maps/src/domain/foundation/ops/compute-tectonics/index.ts`
- `mods/mod-swooper-maps/src/domain/foundation/lib/project-plates.ts`

Entry/runtime cleanup:
- `mods/mod-swooper-maps/src/maps/_runtime/map-init.ts`
- `mods/mod-swooper-maps/src/maps/_runtime/standard-entry.ts`
