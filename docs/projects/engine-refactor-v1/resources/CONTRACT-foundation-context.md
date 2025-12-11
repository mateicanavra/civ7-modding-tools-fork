# CONTRACT: FoundationContext (M2 Slice)

> Working draft — project-level contract only.  
> This document tracks the **current and intended** `FoundationContext` contract for the M2 engine slice.  
> Keep it in sync with the implementation as we evolve the engine. Once the contract is stable, we should
> promote it into `docs/system/libs/mapgen` (and potentially clone the pattern for other data products).

## 1. Purpose

- Capture what the **M2 engine slice** guarantees about `FoundationContext` and the config→tunables→orchestrator flow.
- Give M3+ work (pipeline, climate, story) a **single reference** instead of reverse-engineering behavior from code.
- Provide a bridge between the **target architecture docs** and the **current MapOrchestrator-centric implementation**.

Authoritative implementation references:

- Types & factories: `packages/mapgen-core/src/core/types.ts`
  - `FoundationContext`, `FoundationConfigSnapshot`, `createFoundationContext`, `assertFoundationContext`, `hasFoundationContext`
- Orchestration & world model: `packages/mapgen-core/src/MapOrchestrator.ts`
- Config & tunables flow: `packages/mapgen-core/src/bootstrap/entry.ts`, `packages/mapgen-core/src/bootstrap/tunables.ts`
- Target architecture: `docs/system/libs/mapgen/architecture.md`, `docs/system/libs/mapgen/foundation.md`

## 2. Scope & Status

- **Scope (M2):**
  - Describe the **shape and semantics** of `FoundationContext` as emitted by the current `foundation` slice.
  - Describe the **config → tunables → MapOrchestrator → FoundationContext → world model** flow at a high level.
  - Define what downstream stages may **assume** once the foundation slice has completed successfully.
- **Status:**
  - This contract is **binding** for M2 and for any M3+ work that claims to build on the “M2 stable slice”.
  - It may be **refined** as we discover gaps; when we make changes, we should update this doc alongside the code.

## 3. Data Product: FoundationContext

At the end of the `foundation` slice, the orchestrator must have:

- An `ExtendedMapContext` (`ctx`) whose:
  - `ctx.dimensions` is a valid `MapDimensions` (width, height, size).
  - `ctx.worldModel` is initialized and contains all plate/dynamics tensors used by `createFoundationContext`.
  - `ctx.foundation` is a **non-null**, immutable `FoundationContext` snapshot created via `createFoundationContext`.

### 3.1 Shape

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

- `dimensions`
  - Width/height/size for the **foundation tensors**, derived from the map dimensions used by `WorldModel`.
  - **Invariant:** `size === width * height` and matches the length of all plate/dynamics tensors.
- `plateSeed`
  - Snapshot from `PlateSeedManager`, if available.
  - Used for diagnostics and deterministic reproduction of plate layouts.
  - May be `null` in test harnesses or non-standard entrypoints; consumers *must* tolerate `null`.
- `plates` (`FoundationPlateFields`)
  - Each field is a 1D tensor of length `size`, representing per-tile plate state:
    - `id`: plate ID per tile.
    - `boundaryCloseness`: proximity to the nearest plate boundary.
    - `boundaryType`: encoded interaction type at boundaries (convergent/divergent/transform).
    - `tectonicStress`: aggregate boundary stress metric.
    - `upliftPotential`: collision-driven uplift intensity.
    - `riftPotential`: divergence-driven rift intensity.
    - `shieldStability`: craton/plate interior stability measure.
    - `movementU` / `movementV`: plate motion vectors.
    - `rotation`: plate angular velocity.
  - **Invariant:** All tensors are present, and `createFoundationContext` enforces exact length matches.
- `dynamics` (`FoundationDynamicsFields`)
  - Per-tile atmospheric/oceanic state:
    - `windU` / `windV`: coarse wind vectors.
    - `currentU` / `currentV`: ocean current vectors.
    - `pressure`: scalar pressure field.
  - **Invariant:** All tensors are present and sized to `dimensions.size`.
- `diagnostics` (`FoundationDiagnosticsFields`)
  - Currently:
    - `boundaryTree`: optional structure used by diagnostics (ASCII, histograms, debug views).
  - This is explicitly **non-stable** and may evolve; consumers outside diagnostics should not depend on its shape.
- `config` (`FoundationConfigSnapshot`)
  - Immutable snapshot of the configuration that informed the foundation run:
    - `seed`, `plates`, `dynamics`, `surface`, `policy`, `diagnostics`.
  - Each sub-object is frozen via `freezeConfigSnapshot` and intended for:
    - Diagnostics and reproducibility.
    - Future pipeline steps that want to introspect the config that produced the tensors, without mutating it.

### 3.2 Invariants & Usage Guarantees

For the **M2 slice**, downstream stages may assume:

- `ctx.foundation` is **either**:
  - `null` (before foundation runs or if the foundation stage is disabled), **or**
  - A fully-populated `FoundationContext` that passed `createFoundationContext`’s validation.
- Any stage that **requires** physics data must:
  - Call `assertFoundationContext(ctx, stageName)` or an equivalent guard before reading plate/dynamics tensors.
  - Treat a missing `FoundationContext` as a hard error (this is how we surface manifest/wiring issues).
- New work in M3+ that depends on foundation physics (climate, story overlays, rivers, etc.) should:
  - Read from `ctx.foundation` and derived buffers (`Heightfield`, `ClimateField`) rather than re-reading raw `WorldModel` tensors.
  - Treat `FoundationContext` as the **canonical bridge** between the physics engine and downstream data products.

## 4. Config → Tunables → Orchestrator → FoundationContext → World Model

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
- Future work (M3+) should treat tunables as:
  - A **compatibility layer** for legacy code.
  - Not the primary long-term config surface for new pipeline steps.

### 4.2 Orchestrator & World Model Flow

- `MapOrchestrator` is constructed with a **validated `MapGenConfig`** and optional adapter options.
- When running the `foundation` stage, the orchestrator:
  - Creates an `ExtendedMapContext` with:
    - Dimensions from the Civ7 adapter or test defaults.
    - The same `MapGenConfig` instance passed into the constructor.
  - Configures and runs `WorldModel` using tunables derived from that config.
  - After `WorldModel` finishes foundation physics, calls:
    - `createFoundationContext(WorldModel, { dimensions, config: foundationConfigSlice })`.
  - Stores the resulting `FoundationContext` on:
    - `ctx.foundation` (for downstream TS stages).
    - `WorldModel` (for any remaining legacy consumers and diagnostics).

**M2 Contract for World Model & FoundationContext**

- `createFoundationContext` **fails fast** if:
  - `WorldModel` is not initialized.
  - Map dimensions are missing or invalid.
  - Any required tensor is missing or has the wrong length.
- On success:
  - `ctx.foundation` is immutable and remains valid for the rest of the generation run.
  - Downstream stages must treat it as read-only and may rely on its tensors to be internally consistent.

## 5. How to Use This Contract (M3+ Work)

When implementing M3+ issues (pipeline generalization, climate, story overlays):

- **Do reference this doc** when:
  - Deciding which `requires`/`provides` contracts to declare for steps that depend on foundation physics.
  - Designing new data products (e.g., `ClimateField`, `StoryOverlays`) that build on plate/dynamics tensors.
- **Do not treat it as immutable**:
  - If you need additional guarantees or fields from foundation, add them to the code **and** update this contract.
  - If you discover mismatches between this doc and the implementation, treat that as a bug in the doc and fix it.
- **Promotion path**:
  - Once `FoundationContext` usage stabilizes across M3/M4, we should:
    - Move this contract (possibly refined) into `docs/system/libs/mapgen` as canonical architecture.
    - Optionally introduce similar contract docs for other data products (`Heightfield`, `ClimateField`, `StoryOverlays`).

## 6. Proposed Extensions (Non-Canonical, To Review)

> The ideas in this section are **proposals**, not decided architecture.  
> They exist to seed discussion and planning for M3/M4. It is explicitly okay to
> revise or discard them as we learn more.

### 6.1 Proposed Step Contracts on Top of FoundationContext

The following outlines **candidate** `requires`/`provides` contracts for future steps,
assuming `FoundationContext` remains the canonical physics snapshot.

- **Foundation slice (today, implicit via MapOrchestrator)**
  - `requires`:
    - `config.foundation` and related tunables (plates, dynamics, surface, diagnostics).
  - `provides`:
    - `FoundationContext` (as defined above).
    - Populated `HeightfieldBuffer` (via `syncHeightfield`) and initial land mask.

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
