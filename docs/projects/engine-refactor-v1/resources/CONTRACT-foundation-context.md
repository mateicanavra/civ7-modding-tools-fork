# CONTRACT: FoundationContext (M2 Slice)

> Working draft — project-level contract.  
> Sections 1–5 are **binding** for the M2 “stable slice”. Sections 6–7 are **non-binding** notes.

## 1. Purpose

- Define the consumer-facing contract for the `FoundationContext` data product emitted by the M2 `foundation` slice.
- Make “M2 stable slice” dependencies explicit for M3+ work (climate, story overlays, hydrology, placement).
- Provide a stable reference while the implementation refactors.

Authoritative implementation references:

- Types & factories: `packages/mapgen-core/src/core/types.ts`
  - `FoundationContext`, `FoundationConfigSnapshot`, `createFoundationContext`, `assertFoundationContext`, `hasFoundationContext`
- Orchestration & world model: `packages/mapgen-core/src/MapOrchestrator.ts`
- World semantics: `packages/mapgen-core/src/world/types.ts`, `packages/mapgen-core/src/world/model.ts`
- Config & tunables flow: `packages/mapgen-core/src/bootstrap/entry.ts`, `packages/mapgen-core/src/bootstrap/tunables.ts`
- Target architecture: `docs/system/libs/mapgen/architecture.md`, `docs/system/libs/mapgen/foundation.md`

## 2. Scope & Status

- **Binding scope (M2):**
  - What exists on `ctx.foundation` after a successful `foundation` stage.
  - How to interpret the tensors (indexing, encodings, value ranges, stability expectations).
  - The config → tunables → orchestrator wiring that feeds foundation.
- **Explicitly out of scope:**
  - Exact physics algorithms, numeric distributions, or parity targets.
  - “Interesting map” guarantees (e.g., plate count > 1); this contract is about shape + semantics, not quality.
- **Status:**
  - Sections 1–5 are binding for the M2 “stable slice”.
  - Sections 6–7 are non-binding design notes (planning + future enforcement ideas).
  - Any change to binding guarantees should update this doc alongside the code.

## 3. Data Product: FoundationContext

`FoundationContext` is the canonical foundation-physics snapshot exposed to downstream stages as `ctx.foundation`.

At the end of the `foundation` stage (when enabled and successful):

- `ctx.foundation` is non-null and produced via `createFoundationContext(...)`.
- `ctx.foundation` only exists if required tensors are present and length-consistent (validation fails fast).
- `ctx.dimensions` matches `ctx.foundation.dimensions` (same width/height/size).

### 3.1 Shape

The authoritative type is `FoundationContext` in `packages/mapgen-core/src/core/types.ts`:

```ts
interface FoundationContext {
  dimensions: Readonly<{ width: number; height: number; size: number }>;
  plateSeed: Readonly<SeedSnapshot> | null;
  plates: Readonly<FoundationPlateFields>;
  dynamics: Readonly<FoundationDynamicsFields>;
  diagnostics: Readonly<FoundationDiagnosticsFields>;
  config: Readonly<FoundationConfigSnapshot>;
}
```

This contract focuses on semantics and invariants (next section) rather than duplicating the field list.

### 3.2 Binding Semantics & Invariants

- **Availability**
  - `ctx.foundation` is `null` until the `foundation` stage runs.
  - If the `foundation` stage is disabled, `ctx.foundation` remains `null`.
  - After a successful run, `ctx.foundation` remains available for the rest of the generation pass.

- **Tile indexing**
  - All tensors in `plates` and `dynamics` are per-tile 1D typed arrays in row-major order:
    - `i = y * width + x` where `0 ≤ x < width`, `0 ≤ y < height`
  - `dimensions.size === width * height`, and every tensor has `length === dimensions.size`.

- **Read-only snapshot**
  - `FoundationContext` is treated as immutable after creation.
  - The object graph is frozen, but the typed arrays are not deep-copied; **do not** mutate tensor contents.

- **Plates (`ctx.foundation.plates`)**
  - `id` (`Int16Array`): plate identifier per tile (opaque; stable within the run).
  - `boundaryType` (`Uint8Array`): boundary interaction type using `BOUNDARY_TYPE` from `packages/mapgen-core/src/world/types.ts`:
    - `none=0`, `convergent=1`, `divergent=2`, `transform=3`
  - `boundaryCloseness`, `tectonicStress`, `upliftPotential`, `riftPotential`, `shieldStability` (`Uint8Array`, `0..255`):
    - closeness/stress are higher near boundaries
    - uplift is higher at convergent boundaries
    - rift is higher at divergent boundaries
    - shield stability is higher in plate interiors (inverse of stress)
  - `movementU`, `movementV`, `rotation` (`Int8Array`, `-127..127`): relative motion/rotation proxies (units may evolve).

- **Dynamics (`ctx.foundation.dynamics`)**
  - `windU`, `windV`, `currentU`, `currentV` (`Int8Array`, `-127..127`): coarse vector components.
    - In the current implementation, negative `U` indicates westward flow and positive `U` indicates eastward flow.
  - `pressure` (`Uint8Array`, `0..255`): normalized mantle-pressure proxy (relative, unitless).

- **Plate seed (`ctx.foundation.plateSeed`)**
  - Optional (`null` allowed). When present, contains a `SeedSnapshot` suitable for reproducing plate layouts and diagnostic logging.

- **Config snapshot (`ctx.foundation.config`)**
  - Shallow-frozen snapshot of config inputs that informed the run (`seed`, `plates`, `dynamics`, `surface`, `policy`, `diagnostics`).
  - Intended for reproducibility and diagnostics; treat as read-only.

- **Diagnostics (`ctx.foundation.diagnostics`)**
  - Debug-only surface; explicitly non-stable (shape may change).
  - Currently includes `boundaryTree` (often `null`).

- **Guard rails**
  - Stages that require foundation physics must call `assertFoundationContext(ctx, stageName)` (or equivalent) before reading tensors.
  - Treat missing `FoundationContext` as a wiring/manifest error, not a recoverable “no-op”.

## 4. Config → Tunables → MapOrchestrator → WorldModel → FoundationContext

This section summarizes the **M2-era flow** that leads to `FoundationContext`. It intentionally focuses on
contracts, not internal implementation details.

### 4.1 Config & Tunables Flow

- `bootstrap(options)` is the **single entrypoint** for building engine config:
  - Composes presets and overrides into a raw config.
  - Resolves `stageConfig` into a `stageManifest` (via `resolveStageManifest`).
  - Validates the combined object via `parseConfig(rawConfig)` to produce a `MapGenConfig`.
  - Calls `bindTunables(validatedConfig)`, which:
    - Stores the validated config.
    - Invalidates the tunables cache.
- `getTunables()` (and the `TUNABLES` facade) produces a **read-only view** over `MapGenConfig`:
  - Shapes configuration into `TunablesSnapshot` (including `FOUNDATION_CFG`, `FOUNDATION_PLATES`, `FOUNDATION_DYNAMICS`).
  - Does **not** apply new defaults; it assumes `parseConfig` has already done so.
  - Is the only supported way for legacy layers to read config in M2.

**M2 Contract for Tunables**

- Tunables are a **derived, read-only view**:
  - They must not be mutated by callers.
  - Their backing `MapGenConfig` comes from the last successful `bootstrap()` / `bindTunables()` call.

### 4.2 Orchestrator & World Model Flow

- `MapOrchestrator` is constructed with a **validated `MapGenConfig`** and optional adapter options.
- When running the `foundation` stage, the orchestrator:
  - Refreshes the tunables snapshot for the generation pass (`resetTunables()` → `getTunables()`).
  - Creates an `ExtendedMapContext` with:
    - Dimensions from the Civ7 adapter or test defaults.
    - A lightweight runtime `ctx.config` object (currently: toggle flags) for legacy call sites.
  - Configures and runs `WorldModel` using tunables derived from the **validated `MapGenConfig`** (bound via `bootstrap()` / `bindTunables()`).
  - After `WorldModel` finishes foundation physics, calls:
    - `createFoundationContext(WorldModel, { dimensions, config: foundationConfigSlice })`.
  - Stores the resulting `FoundationContext` on `ctx.foundation` (for downstream TS stages and diagnostics).

**M2 Contract for World Model & FoundationContext**

- `createFoundationContext` **fails fast** if:
  - `WorldModel` is not initialized.
  - Map dimensions are missing or invalid.
  - Any required tensor is missing or has the wrong length.
- On success:
  - `ctx.foundation` is treated as immutable and remains valid for the rest of the generation run.
  - Downstream stages must treat it as read-only and may rely on its tensors to be internally consistent.

## 5. How to Use This Contract (M3+ Work)

When implementing M3+ issues (pipeline generalization, climate, story overlays):

- **Do reference this doc** when:
  - Deciding which `requires`/`provides` contracts to declare for steps that depend on foundation physics.
  - Designing new data products (e.g., `ClimateField`, `StoryOverlays`) that build on plate/dynamics tensors.
- **Do treat it as a consumer boundary**:
  - If you need additional guarantees or fields, update the code **and** update this contract in the same change.
  - If you discover mismatches between this doc and the implementation, treat that as a bug in the doc and fix it.
- **Do not depend on non-contract surfaces**:
  - Avoid reading raw `WorldModel` state (or a singleton `WorldModel`) in new work; treat `ctx.foundation` as the stable interface.
  - Do not depend on `ctx.foundation.diagnostics` shape outside diagnostics tooling.
  - Do not treat tunables as the long-term config surface for new steps.

See Sections 6–7 for non-binding planning notes and future enforcement ideas.

## 6. Appendix: Future Extensions (Non-Binding)

> Everything in this section is **non-binding**.  
> It exists to seed discussion and planning for M3/M4 and may change or be deleted freely.

### 6.0 Promotion Path (Non-Binding)

- Once `FoundationContext` usage stabilizes across M3/M4, consider:
  - Moving a refined version of this contract into `docs/system/libs/mapgen`.
  - Splitting “contract” from “design sandbox” material if it becomes noisy for consumers.

### 6.1 Proposed Step Contracts on Top of FoundationContext

The following outlines **candidate** `requires`/`provides` contracts for future steps,
assuming `FoundationContext` remains the canonical physics snapshot.

- **Foundation slice (today, implicit via MapOrchestrator)**
  - `requires`:
    - `config.foundation` and related tunables (plates, dynamics, surface, diagnostics).
  - `provides`:
    - `FoundationContext` (as defined above).
    - `HeightfieldBuffer` exists on `ctx.buffers.heightfield`, but it is populated later (via `syncHeightfield()` after terrain-modifying stages), not during foundation initialization.

- **Proposed: Climate baseline step (M3)**
  - `requires`:
    - `FoundationContext.dynamics` (wind/current/pressure).
    - `HeightfieldBuffer` and land mask.
  - `provides`:
    - `ClimateField` (baseline rainfall/humidity, stored in `MapContext.buffers.climate`).
    - Optional derived diagnostics (e.g., rainfall histograms).

- **Proposed: Hydrology / rivers step (M3)**
  - `requires`:
    - `HeightfieldBuffer` (elevation + landMask).
    - `ClimateField` (rainfall/humidity).
  - `provides`:
    - Canonical river flow / basin descriptors (e.g., “RiverGraph” data product).
    - Engine-surface effects via adapter (river placement), but with a structured backing product.

- **Proposed: Story overlays (early pass, M3)**
  - `requires`:
    - `FoundationContext.plates` and `FoundationContext.dynamics`.
    - `HeightfieldBuffer` and `ClimateField`.
  - `provides`:
    - One or more sparse `StoryOverlays` (e.g., continental margins, high-stress belts, rift zones).
    - These overlays become the canonical source for later story passes instead of mutating `StoryTags` directly.

These contracts are intentionally high-level; exact field names and manifests should be defined in the
actual M3/M4 issues and PRDs.

### 6.2 Proposed Cross-Product Contracts

As we introduce more data products, we may want lightweight “cross-product” contracts
that describe how they relate to `FoundationContext`:

- **Heightfield ↔ FoundationContext**
  - Proposal: Heightfield generation should be **derived** from:
    - `FoundationContext.plates` (uplift/rift/shield fields).
    - `FoundationContext.dynamics` (to bias erosion/weathering).
  - Implication: morphology layers should avoid reaching directly into `WorldModel` once
    `FoundationContext` and the heightfield buffers are stable.

- **ClimateField ↔ FoundationContext**
  - Proposal: climate steps should treat `FoundationContext.dynamics` as the **only** source
    of large-scale wind/current/pressure, and should publish a `ClimateField` that downstream
    consumers use instead of reading `GameplayMap` climate state directly.

- **StoryOverlays ↔ FoundationContext / ClimateField**
  - Proposal: story passes that describe tectonic or climatic phenomena should:
    - Use `FoundationContext` and `ClimateField` as inputs.
    - Publish overlays in `MapContext.overlays` that encode the narrative interpretation
      (e.g., “orogeny belts”, “rift valleys”, “storm tracks”) without re-deriving physics.

These cross-product contracts are **not binding yet**; they are here to guide future design
and should be adjusted as we introduce real steps and products.

### 6.3 Promotion Criteria (When This Becomes Canonical)

Before we promote this contract (or a refined version) into system docs, we should
be confident that:

- Multiple downstream clusters (at least climate + one story overlay + one placement/biome step)
  use `FoundationContext` in a consistent way.
- Tests exist that:
  - Assert the presence and basic invariants of `FoundationContext` for typical map sizes.
  - Exercise at least one consumer step end-to-end (e.g., foundation → climate → simple overlay).
- The proposed `requires`/`provides` relationships above have either:
  - Been implemented and validated, or
  - Been replaced with a better scheme that is documented here.

Until then, treat this section as a **design sandbox**: useful for planning and coordination,
but not authoritative.

## 7. How This Could Be Enforced (Non-Binding)

We do **not** enforce this contract yet. If/when we choose to enforce it, candidates include:

- **Unit invariants:** tests for `createFoundationContext` failure modes (missing tensors, size mismatch) and success invariants (lengths, boundaryType enum range).
- **Integration invariants:** run a minimal `MapOrchestrator` pass and assert `ctx.foundation` availability + invariants for typical map sizes.
- **Determinism checks:** for fixed seeds/configs, compare `FoundationContext` tensors across runs to detect accidental drift.
- **Mutation guards:** copy tensors into new typed arrays (true snapshot) and/or introduce readonly tensor wrappers to prevent accidental writes.
- **CI + review gates:** require updating this doc when `FoundationContext` / `createFoundationContext` changes; consider linting against new code reading a global `WorldModel` instead of `ctx.foundation`.
