# CONTRACT: `artifact:foundation.*` (Foundation Inventory)

**Update (2025-12-27, M5 execution):** The monolithic foundation artifact (`artifact:foundation` at
`ctx.artifacts.foundation`) is retired. Foundation now publishes discrete artifacts:

- `artifact:foundation.plates`
- `artifact:foundation.dynamics`
- `artifact:foundation.seed`
- `artifact:foundation.diagnostics`
- `artifact:foundation.config`

This document defines the binding contract for these discrete artifacts.

## 1. Purpose

- Define the consumer-facing contract for the foundation inventory artifacts.
- Make post-M5 foundation dependencies explicit for downstream work (climate, narrative story entries/views,
  hydrology, placement).
- Provide a stable reference for tags, shapes, and invariants as algorithms evolve.

Authoritative implementation references:

- Types, tags, validators: `packages/mapgen-core/src/core/types.ts`
- Assertions: `packages/mapgen-core/src/core/assertions.ts`
- Foundation stage publisher (standard recipe): `mods/mod-swooper-maps/src/recipes/standard/stages/foundation/producer.ts`
- Target architecture: SPEC-target-architecture-draft

## 2. Scope & Status

- **Binding scope (M5+):**
  - The artifacts listed above, their shapes, and invariants.
  - When the artifacts are published and how consumers must declare dependencies.
- **Explicitly out of scope:**
  - Algorithmic details (exact plate physics, numeric distributions, or parity targets).
  - Guarantees about "interesting maps" (quality is not a contract here).

## 3. Data Products (Foundation Inventory)

### 3.1 Common invariants

- All per-tile tensors are 1D typed arrays in row-major order:
  - `i = y * width + x` where `0 <= x < width`, `0 <= y < height`.
- `width * height` must match the length of every per-tile tensor.
- All payload objects are treated as immutable snapshots. Do not mutate the arrays.

### 3.2 `artifact:foundation.plates`

Shape: `FoundationPlateFields` from `packages/mapgen-core/src/core/types.ts`.

- `id` (`Int16Array`): plate identifier per tile (opaque; stable within the run).
- `boundaryType` (`Uint8Array`): boundary interaction type
  (`none=0`, `convergent=1`, `divergent=2`, `transform=3`).
- `boundaryCloseness`, `tectonicStress`, `upliftPotential`, `riftPotential`,
  `shieldStability` (`Uint8Array`, `0..255`): boundary-driven scalar fields.
- `movementU`, `movementV`, `rotation` (`Int8Array`, `-127..127`): relative motion/rotation
  proxies (units may evolve).

### 3.3 `artifact:foundation.dynamics`

Shape: `FoundationDynamicsFields` from `packages/mapgen-core/src/core/types.ts`.

- `windU`, `windV`, `currentU`, `currentV` (`Int8Array`, `-127..127`): coarse vector components.
- `pressure` (`Uint8Array`, `0..255`): normalized mantle-pressure proxy (relative, unitless).

### 3.4 `artifact:foundation.seed`

Shape: `SeedSnapshot` (see `packages/mapgen-core/src/foundation/types.ts`).

- Optional snapshot used for reproducibility and diagnostics.
- When present, it is treated as immutable and may include seed locations/config metadata.

### 3.5 `artifact:foundation.diagnostics`

Shape: `FoundationDiagnosticsFields` from `packages/mapgen-core/src/core/types.ts`.

- Debug-only surface; explicitly non-stable.
- Currently includes `boundaryTree` (often `null`).

### 3.6 `artifact:foundation.config`

Shape: `FoundationConfigSnapshot` from `packages/mapgen-core/src/core/types.ts`.

- Shallow-frozen snapshot of config inputs that informed the run:
  `seed`, `plates`, `dynamics`, `surface`, `policy`, `diagnostics`.
- Intended for reproducibility and diagnostics; treat as read-only.

## 4. Publishing and Consumption Rules

- The foundation stage publishes **all** foundation artifacts listed above.
- Downstream steps must declare `requires` against the specific artifacts they consume.
  - Example: steps reading plate tensors must require `artifact:foundation.plates`.
- The legacy `artifact:foundation` tag and `ctx.artifacts.foundation` must not be used.
- Missing artifacts are wiring/recipe errors and should fail fast.

## 5. Orchestration Flow (M5+)

- The run boundary is `RunRequest = { recipe, settings }`, compiled into an `ExecutionPlan`.
- The standard recipe foundation stage publishes the foundation inventory:
  - plates + dynamics tensors,
  - optional seed snapshot (when available),
  - debug-only diagnostics payload (when available),
  - a shallow config snapshot for reproducibility/debugging.
- All artifacts are published into `context.artifacts` via the `artifact:foundation.*` tags.

## 6. Historical Notes

- The M4 monolithic foundation payload is obsolete. If needed, consult prior history in git.
- Do not reintroduce `ctx.foundation` or `artifact:foundation` in new work.
