---
id: M5-U01
title: "[M5] DEF-011: Delete `crustMode` and the legacy behavior branch"
state: planned
priority: 2
estimate: 0
project: engine-refactor-v1
milestone: M5
assignees: []
labels: [Architecture, Cleanup]
parent: null
children: []
blocked_by: []
blocked: []
related_to: []
---

<!-- SECTION SCOPE [SYNC] -->
## TL;DR

Remove the `crustMode` selector from the public config surface and delete the `"legacy"` algorithm branch so mapgen has a single canonical behavior path.

## Goal

Make it impossible to accidentally “keep legacy alive” through configuration. If `crustMode` exists, it will be used; if it is used, we have to maintain two paths; therefore it must be removed and the behavior unified.

## Deliverables

- [x] Remove `crustMode` from the config schema and any forwarding/plumbing layers.
- [x] Delete the `"legacy"` behavior branch in landmask/crust/ocean separation.
- [x] Update any tests/docs that assume the existence of the selector or the legacy behavior.

## Acceptance Criteria

- `crustMode` is not accepted by any schema or runtime parsing path; configs that still supply it fail validation with a clear error.
- No `"legacy"` branch remains on the runtime path for crust/landmask behavior.
- Standard smoke test remains green under `MockAdapter`.
- Docs no longer present `"legacy"` as a supported/valid configuration.

## Testing / Verification

- `pnpm -C packages/mapgen-core test`
- Standard smoke test (exact command/path may move during M5 extraction; update when the standard mod boundary is established).

## Dependencies / Notes

- **Paper trail:** `docs/projects/engine-refactor-v1/deferrals.md` (DEF-011, locked).
- **Sequencing:** do early to avoid churn while packages/steps are moved.
- **Complexity × parallelism:** medium complexity, high parallelism (localized but semantics-sensitive).

---

<!-- SECTION IMPLEMENTATION [NOSYNC] -->
## Implementation Notes (Local Only)

- Treat this as “delete the fork,” not “preserve both behind a different name.”
- Prefer deleting wiring and updating callers over keeping “compat parsing” for removed keys.

## Prework Findings (Complete)

Goal: enumerate the full `crustMode` surface + every behavior fork it controls so implementation is “delete the fork” (not rediscovery).

### 1) Inventory: config surface + call sites

#### Config schemas

```yaml
configSchemas:
  - location: packages/mapgen-core/src/config/schema.ts
    surface: LandmassConfigSchema.crustMode
    notes: 'Public config knob today; default: "legacy".'
  - location: packages/mapgen-core/src/config/schema.ts
    surface: FoundationSurfaceConfigSchema.crustMode
    notes: Marked "[internal]" but still a schema-accepted alias for a crust-mode value.
  - location: packages/mapgen-core/src/domain/morphology/landmass/ocean-separation/types.ts
    surface: 'PlateAwareOceanSeparationParams.crustMode?: "legacy" | "area"'
    notes: Plumbs the mode into ocean separation branching.
  - location: packages/mapgen-core/src/domain/morphology/landmass/crust-mode.ts
    surface: CrustMode + normalizeCrustMode()
    notes: Normalization currently defaults unknown -> "legacy".
```

#### Runtime plumbing

```yaml
runtimePlumbing:
  - location: packages/mapgen-core/src/pipeline/morphology/LandmassStep.ts
    usage: 'Passes landmassCfg.crustMode into applyPlateAwareOceanSeparation({ crustMode })'
    notes: Primary step-level plumbing.
  - location: packages/mapgen-core/src/domain/morphology/landmass/index.ts
    usage: const crustMode = normalizeCrustMode(landmassCfg.crustMode)
    notes: Mode gates landmask generation semantics.
  - location: packages/mapgen-core/src/domain/morphology/landmass/crust-first-landmask.ts
    usage: 'mode === "area" ? assignCrustTypesByArea(...) : null'
    notes: Mode gates crust assignment + sea-level semantics.
  - location: packages/mapgen-core/src/domain/morphology/landmass/ocean-separation/apply.ts
    usage: 'if (crustMode === "area") { ... } else { ... }'
    notes: Mode gates ocean-separation algorithm branch.
```

#### In-repo config consumers (mods)

```yaml
inRepoConfigConsumers:
  - location: mods/mod-swooper-maps/src/swooper-earthlike.ts
    usage: 'crustMode: "area"'
    notes: In-repo external-ish consumer; will break once the key is rejected/removed.
  - location: mods/mod-swooper-maps/src/swooper-desert-mountains.ts
    usage: 'crustMode: "area"'
    notes: Same.
```

### 2) Inventory: behavior forks tied to `crustMode`

#### A) Landmask / crust assignment forks

Primary branch point:
- `packages/mapgen-core/src/domain/morphology/landmass/crust-first-landmask.ts`:
  - `"area"`: uses `assignCrustTypesByArea(graph, targetLandTiles)` and sets `seaLevel = 0`.
  - `"legacy"`: uses stochastic `assignCrustTypes(...)` and computes `seaLevel = computeSeaLevel(...)`.

Secondary knobs implicitly “disabled” under `"area"`:
- `packages/mapgen-core/src/domain/morphology/landmass/crust-first-landmask.ts` sets applied config values differently:
  - `clusteringBias` and `microcontinentChance` become `0` when `mode === "area"`.

#### B) Ocean separation forks

Primary branch point:
- `packages/mapgen-core/src/domain/morphology/landmass/ocean-separation/apply.ts`:
  - `"area"`: uses the window-intersection/channel-carving path gated by `policy.minChannelWidth` + `policy.channelJitter`.
  - `"legacy"`: uses boundary-closeness-based carving (`foundation.plates.boundaryCloseness`) and `policy.bandPairs`/edge policies.

### 3) Default behavior today vs post-delete expectations

Default today:
- Schema default is `"legacy"` (`LandmassConfigSchema.crustMode`).
- `normalizeCrustMode()` normalizes unknown → `"legacy"`.

Implication for DEF‑011:
- M5 deletes the fork and makes `"area"` canonical; this is a **semantic default change** for any consumer that relied on omitted/unknown `crustMode`.
- In-repo Swooper configs explicitly set `"area"` already, so the in-repo mod configs should remain behaviorally stable once the key is removed (they just need the key deleted from the config objects).

### 4) Guardrails (suggested zero-hit checks)

Post-cutover, these should be zero-hit (or constrained to docs/tests as appropriate):
- `rg -n "\\bcrustMode\\b" packages/ mods/`
- `rg -n "\"legacy\"\\s*\\|\\s*\"area\"|normalizeCrustMode|CrustMode" packages/mapgen-core/src/domain/morphology/landmass`
