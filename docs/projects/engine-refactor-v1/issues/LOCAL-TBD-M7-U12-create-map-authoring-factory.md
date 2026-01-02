---
id: LOCAL-TBD-M7-U12
title: "[M7] Introduce createMap() factory for map entrypoints (metadata + settings + recipe config)"
state: planned
priority: 2
estimate: 8
project: engine-refactor-v1
milestone: M7
assignees: []
labels: []
parent: null
children: []
blocked_by: [LOCAL-TBD-M6-U10]
blocked: []
related_to: [ADR-ER1-035]
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR
- Replace ad-hoc per-map entrypoint wiring with a single `createMap()` authoring factory that bundles map metadata + `RunSettings` + direct recipe config (no overrides translation), so maps are single-file, explicit, and uniform.

## Deliverables
- A mod-owned `createMap()` (or `defineMap()`) helper that produces a typed “map definition” object containing:
  - `id` (stable, unique)
  - display metadata (at least `name`)
  - `settings: RunSettings` (or a builder that returns `RunSettings` deterministically from authored inputs)
  - `config: StandardRecipeConfig | null` (direct, no `StandardRecipeOverrides`)
  - `run()` that calls the standard runner glue (`src/maps/_runtime/**`) without reintroducing hidden defaults.
- All `mods/mod-swooper-maps/src/maps/*.ts` entrypoints updated to use the factory and export map definitions consistently.
- A single, documented pattern for how authors set:
  - seed/dimensions/wrap/latitude bounds
  - trace settings (per-step verbosity) and directionality
  - recipe config (explicit, direct)

## Acceptance Criteria
- `mods/mod-swooper-maps/src/maps/*.ts` contains no custom ad-hoc “map entrypoint” logic beyond calling `createMap(...)`.
- Map entrypoints do not construct or depend on:
  - `StandardRecipeOverrides`
  - `buildStandardRecipeConfig(...)`
  - any DeepPartial “global-ish overrides” blob surface.
- Map entrypoints are uniform enough that downstream tooling can enumerate them mechanically (explicit exports), without parsing or executing custom code paths.
- `createMap()` does not hide defaulting behavior:
  - map definitions must supply `settings` and `config` explicitly (or provide a builder function with explicit inputs).

## Testing / Verification
- `pnpm check`
- `pnpm build`
- `pnpm test`
- `pnpm deploy:mods`

## Dependencies / Notes
- Blocked by: `LOCAL-TBD-M6-U10` (canonical config + resolver pipeline; direct `StandardRecipeConfig` authoring; no overrides translation).
- Related decision: ADR-ER1-035 (config normalization + plan truth; run-boundary settings).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Details (Local Only)

### Quick Navigation
- [TL;DR](#tldr)
- [Deliverables](#deliverables)
- [Acceptance Criteria](#acceptance-criteria)
- [Testing / Verification](#testing--verification)
- [Dependencies / Notes](#dependencies--notes)

### A) Define the factory API (author-facing)
Decision (locked for this issue):
- Provide a single entrypoint helper: `createMap(definition)` (name can be `defineMap`; pick one and apply consistently).
- Home: `mods/mod-swooper-maps/src/maps/_runtime/create-map.ts` (mod-owned runtime glue).

API sketch (illustrative):
- `createMap({ id, name, settings, config, run })` where:
  - `settings` is a concrete `RunSettings` object (preferred), or `buildSettings(init)` with an explicit init POJO.
  - `config` is `StandardRecipeConfig | null`.
  - `run` is optional only if the factory can provide a single canonical runner for the standard recipe without hiding behavior.

### B) Decide the metadata surface (minimal now; extensible later)
Keep minimal and explicit:
- required: `id`, `name`
- optional: `description`, `version`, `tags` (string list)

Explicitly out of scope:
- automatic Civ7 XML/modinfo generation (track separately).

### C) Migrate all maps
- Convert every `mods/mod-swooper-maps/src/maps/*.ts` entrypoint to export a `createMap(...)` definition.
- Ensure there is a single listable surface for “available maps” (one barrel or explicit export list) that does not depend on dynamic loading.

### Pre-work
Goal: leave an implementer with no hidden branching.

1) Inventory current map entrypoint patterns
- “List every file under `mods/mod-swooper-maps/src/maps/*.ts` and categorize: how it sets `settings`, how it sets `config`, and how it calls runtime glue.”
- “Identify which fields are currently duplicated across maps (seed policy, wrap, latitude, trace defaults, directionality).”

2) Pick the canonical factory location and export surface
- “Confirm the intended import path for authors (`mods/mod-swooper-maps/src/maps/_runtime/create-map.ts` vs a top-level barrel).”
- “Confirm how maps are enumerated today (manual exports) and what the target enumeration is (explicit exports only; no loader tooling).”

3) Define the minimal metadata we must not lose
- “List which metadata fields we need to preserve for future Civ7 XML/modinfo work (id/name at minimum).”
- “Confirm whether the `id` must match any external Civ7 identifiers today, or whether it is internal-only for now.”
