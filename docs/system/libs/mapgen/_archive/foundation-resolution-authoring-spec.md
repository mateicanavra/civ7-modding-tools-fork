# Foundation Resolution + Authoring Surface Spec

> **System:** Author-facing configuration & resolution scaling for Foundation.
> **Scope:** Replace derived/opaque knobs with explicit, high-leverage profiles and internal constants.
> **Status:** Proposed (spec for implementation).

## Context (Current State)

- Foundation mesh/plate sizing currently depends on derived values like `referenceArea`, `plateScalePower`, and `cellsPerPlate`, which are not intuitive to authors and can be misconfigured.
- The environment already supplies map dimensions at runtime, but some configs still force authors to reason about sizing indirectly.

## Goals

1. **High-leverage authoring:** Make scale and plate complexity controllable via stable profiles rather than low-level derived fields.
2. **No magic numbers:** Derived values must be explicit constants in code, not hidden inline.
3. **Deterministic, mesh-first:** Preserve current deterministic behavior and mesh-first posture.

## Proposed Solution Outline

### 1) High-level Profiles (Author-Facing)

**New knobs (top-level):**

```yaml
foundation:
  resolutionProfile: balanced  # coarse | balanced | fine | ultra
  plateMotionPolicy: balanced  # cohesive | dispersive | shearing | balanced
  historyProfile: balanced     # young | balanced | ancient
```

### 2) Derived Constants (Internal)

Define a **single source of truth** mapping from profile → constants:

```ts
// packages/mapgen-core/src/domain/foundation/constants.ts (new)
export const RESOLUTION_PROFILES = {
  coarse: { cellDensityPerTile: 0.3, plateDensityPerTile: 0.002 },
  balanced: { cellDensityPerTile: 0.6, plateDensityPerTile: 0.003 },
  fine: { cellDensityPerTile: 1.2, plateDensityPerTile: 0.004 },
  ultra: { cellDensityPerTile: 2.0, plateDensityPerTile: 0.006 },
} as const;
```

### 3) Computation Logic (Runtime-Derived)

```ts
// foundation/compute-mesh normalize
const { width, height } = ctx.env.dimensions;
const { cellDensityPerTile, plateDensityPerTile } = RESOLUTION_PROFILES[profile];
const cellCount = Math.round(width * height * cellDensityPerTile);
const plateCount = Math.max(2, Math.round(width * height * plateDensityPerTile));
```

## Behavioral Differences

| Current | Proposed |
|---|---|
| Authors tune `referenceArea`/`plateScalePower` | Authors choose a profile (coarse → ultra) |
| Scaling is indirect and non-obvious | Scaling is explicit, readable, and stable |
| Derived values in config | Derived values are constants in code |

## Diagrams

**Configuration flow:**

```
Author profile → RESOLUTION_PROFILES constants → derived cellCount/plateCount → mesh generation
```

## E2E Example

**Input (author config):**

```yaml
foundation:
  resolutionProfile: fine
```

**Runtime behavior:**

- At 120×80 (9,600 tiles), `cellCount ≈ 11,520`, `plateCount ≈ 38` (based on constants).
- Authors can switch to `coarse` or `ultra` without touching internal fields.

## File Tree (Proposed)

```
packages/
  mapgen-core/
    src/domain/foundation/
      constants.ts          # RESOLUTION_PROFILES + default constants
mods/
  mod-swooper-maps/
    src/recipes/standard/stages/foundation/
      steps/mesh.ts         # apply profile-derived counts
```

## Implementation Steps

1. Add `resolutionProfile` to foundation knobs schema.
2. Add `RESOLUTION_PROFILES` constants and remove derived fields from public schema.
3. Update `compute-mesh` and `compute-plate-graph` normalization to use profile-derived counts.
4. Update docs and migration notes.

## Benefits

- **Author experience:** fewer footguns, clearer intent.
- **Robustness:** scales predictably across map sizes.
- **Maintainability:** constants are centralized, versioned, and documented.
