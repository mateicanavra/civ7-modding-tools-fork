# CONTRACT: `artifact:foundation` (Monolithic FoundationContext Payload)

**Update (2025-12-23, M4 execution):** This document defines the M4 contract for the monolithic foundation artifact (`artifact:foundation`) stored at `ctx.artifacts.foundation`. `ctx.foundation` is legacy and must not exist by end of M4. The post-M4 split into discrete `artifact:foundation.*` products is deferred (DEF-014).

> Working draft — project-level contract.  
> Sections 1–5 are **binding** for the M4 monolithic `artifact:foundation` contract. Sections 6–7 are **non-binding** notes.

## 1. Purpose

- Define the consumer-facing contract for the monolithic foundation payload (`artifact:foundation`) emitted by foundation producers.
- Make M4 foundation dependencies explicit for downstream work (climate, story overlays, hydrology, placement).
- Provide a stable reference while the implementation refactors and consumers migrate off legacy surfaces.
- Clarify the post-M4 path: split into discrete `artifact:foundation.*` products (DEF-014).

Authoritative implementation references:

- Types & factories: `packages/mapgen-core/src/core/types.ts`
  - `FoundationContext`, `FoundationConfigSnapshot`, `createFoundationContext`, `assertFoundationContext`, `hasFoundationContext`
- Orchestration & foundation stage: `packages/mapgen-core/src/orchestrator/task-graph.ts`, `packages/mapgen-core/src/pipeline/foundation/producer.ts`
- Foundation semantics: `packages/mapgen-core/src/foundation/types.ts`, `packages/mapgen-core/src/foundation/plates.ts`
- Config flow: `packages/mapgen-core/src/bootstrap/entry.ts`, `packages/mapgen-core/src/orchestrator/task-graph.ts`
- Target architecture: `docs/system/libs/mapgen/architecture.md`, `docs/system/libs/mapgen/foundation.md`

## 2. Scope & Status

- **Binding scope (M4):**
  - What exists at `ctx.artifacts.foundation` (and under `artifact:foundation`) after a successful foundation provider run.
  - How to interpret the tensors (indexing, encodings, value ranges, stability expectations).
  - The config → orchestrator wiring that feeds foundation.
- **Explicitly out of scope:**
  - Exact physics algorithms, numeric distributions, or parity targets.
  - “Interesting map” guarantees (e.g., plate count > 1); this contract is about shape + semantics, not quality.
- **Status:**
  - Sections 1–5 are binding for the M4 monolithic `artifact:foundation` contract.
  - Sections 6–7 are non-binding design notes (planning + future enforcement ideas).
  - Any change to binding guarantees should update this doc alongside the code.

## 3. Data Product: FoundationContext

`FoundationContext` is the monolithic foundation-physics snapshot exposed to downstream consumers as the artifact `artifact:foundation`, stored at `ctx.artifacts.foundation` in M4.
Post-M4, this monolith is split into discrete `artifact:foundation.*` products (deferred per DEF-014).

After a successful foundation provider run:

- `ctx.artifacts.foundation` exists and is produced via `createFoundationContext(...)`.
- Tag-based access (`ctx.artifacts.get("artifact:foundation")`) returns the same payload.
- The artifact only exists if required tensors are present and length-consistent (validation fails fast).
- `ctx.dimensions` matches `ctx.artifacts.foundation.dimensions` (same width/height/size).

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
  - `ctx.artifacts.foundation` is absent until a foundation provider publishes `artifact:foundation`.
  - If the recipe omits a foundation provider, the artifact remains absent.
  - After a successful run, the artifact remains available for the rest of the generation pass.

- **Tile indexing**
  - All tensors in `plates` and `dynamics` are per-tile 1D typed arrays in row-major order:
    - `i = y * width + x` where `0 ≤ x < width`, `0 ≤ y < height`
  - `dimensions.size === width * height`, and every tensor has `length === dimensions.size`.

- **Read-only snapshot**
  - `FoundationContext` is treated as immutable after creation.
  - The object graph is frozen, but the typed arrays are not deep-copied; **do not** mutate tensor contents.

- **Plates (`ctx.artifacts.foundation.plates`)**
  - `id` (`Int16Array`): plate identifier per tile (opaque; stable within the run).
  - `boundaryType` (`Uint8Array`): boundary interaction type using `BOUNDARY_TYPE` from `packages/mapgen-core/src/foundation/constants.ts`:
    - `none=0`, `convergent=1`, `divergent=2`, `transform=3`
  - `boundaryCloseness`, `tectonicStress`, `upliftPotential`, `riftPotential`, `shieldStability` (`Uint8Array`, `0..255`):
    - closeness/stress are higher near boundaries
    - uplift is higher at convergent boundaries
    - rift is higher at divergent boundaries
    - shield stability is higher in plate interiors (inverse of stress)
  - `movementU`, `movementV`, `rotation` (`Int8Array`, `-127..127`): relative motion/rotation proxies (units may evolve).

- **Dynamics (`ctx.artifacts.foundation.dynamics`)**
  - `windU`, `windV`, `currentU`, `currentV` (`Int8Array`, `-127..127`): coarse vector components.
    - In the current implementation, negative `U` indicates westward flow and positive `U` indicates eastward flow.
  - `pressure` (`Uint8Array`, `0..255`): normalized mantle-pressure proxy (relative, unitless).

- **Plate seed (`ctx.artifacts.foundation.plateSeed`)**
  - Optional (`null` allowed). When present, contains a `SeedSnapshot` suitable for reproducing plate layouts and diagnostic logging.

- **Config snapshot (`ctx.artifacts.foundation.config`)**
  - Shallow-frozen snapshot of config inputs that informed the run (`seed`, `plates`, `dynamics`, `surface`, `policy`, `diagnostics`).
  - Intended for reproducibility and diagnostics; treat as read-only.

- **Diagnostics (`ctx.artifacts.foundation.diagnostics`)**
  - Debug-only surface; explicitly non-stable (shape may change).
  - Currently includes `boundaryTree` (often `null`).

- **Guard rails**
  - Steps that require foundation must declare `requires: ["artifact:foundation"]` and must fail fast if the artifact is missing.
  - Treat missing `artifact:foundation` as a wiring/recipe error, not a recoverable “no-op”.

## 4. Config → Task Graph → Foundation Pipeline → FoundationContext

This section summarizes the **M4 Task Graph flow** that leads to `FoundationContext`. It intentionally focuses on
contracts, not internal implementation details.

### 4.1 Config Flow

- `bootstrap(options)` is the **single entrypoint** for building engine config:
  - ~~Composes presets and overrides into a raw config.~~  
    **Update (2025-12-21, M4 planning):** Presets are removed; entry is recipe + settings selection. See `../milestones/M4-target-architecture-cutover-legacy-cleanup.md`.
  - ~~Resolves `stageConfig` into a `stageManifest` (via `resolveStageManifest`).~~  
    **Update (2025-12-22, M4 planning):** Stage-based ordering/config inputs are deletion-only and do not survive M4; do not treat `stageManifest` as a target contract.
  - Validates the combined object via `parseConfig(rawConfig)` to produce a `MapGenConfig`.
  - Returns the validated config to the caller.

**M3 Contract for Config**

- Task Graph execution and all steps/layers read configuration from `ctx.config` (validated `MapGenConfig`).
- There is no module-scoped tunables layer in M3.

### 4.2 Task Graph & Foundation Flow

- The Task Graph runner is constructed with a **validated `MapGenConfig`** and adapter options.
- When running the `foundation` step, the Task Graph runner:
  - Creates an `ExtendedMapContext` with:
    - Dimensions from the Civ7 adapter or test defaults.
    - `ctx.config` set to the validated `MapGenConfig` (with effective toggles derived from stage enablement).
  - Runs foundation step-owned producers (plates + dynamics) using the injected `MapGenConfig`.
  - Builds `FoundationContext` via `createFoundationContext(...)` from the produced tensors and config slice.
  - Publishes the resulting payload to `ctx.artifacts.foundation` (satisfies `artifact:foundation` for downstream consumers and diagnostics).

**M4 Contract for `artifact:foundation`**

- `createFoundationContext` **fails fast** if:
  - Map dimensions are missing or invalid.
  - Any required tensor is missing or has the wrong length.
- On success:
  - `ctx.artifacts.foundation` is treated as immutable and remains valid for the rest of the generation run.
  - Downstream stages must treat it as read-only and may rely on its tensors to be internally consistent.

## 5. How to Use This Contract (M3+ Work)

When implementing M3+ issues (pipeline generalization, climate, story overlays):

- **Do reference this doc** when:
  - Deciding which `requires`/`provides` contracts to declare for steps that depend on foundation physics.
  - Designing new data products (e.g., `ClimateField`, `StoryOverlays`) that build on plate/dynamics tensors.
- **Do treat it as an M4 interim artifact contract**:
  - Prefer publishing additional explicit `artifact:*` / `field:*` products rather than extending the monolithic payload.
  - Do not “sneak in” new dependencies on legacy surfaces while migrating.
- **Do not depend on non-contract surfaces**:
  - Avoid reading raw `WorldModel` state (or a singleton `WorldModel`) in new work; depend on `artifact:foundation` (via `ctx.artifacts`) instead.
  - Do not depend on `ctx.artifacts.foundation.diagnostics` shape outside diagnostics tooling.
  - Do not reintroduce a tunables-style config facade; use `ctx.config` (validated `MapGenConfig`) instead.

Post-M4 (DEF-014), migrate consumers from the monolithic `artifact:foundation` to discrete `artifact:foundation.*` products.

See Sections 6–7 for non-binding planning notes and future enforcement ideas.

## 6. Appendix: Future Extensions (Non-Binding; Historical)

> Everything in this section is **non-binding**.  
> It exists to seed discussion and planning for M3/M4 and may change or be deleted freely.

**Update (2025-12-23, M4 execution):** This appendix predates the accepted M4 decision to make the monolithic foundation payload an artifact (`artifact:foundation` at `ctx.artifacts.foundation`). Treat the content below as historical notes only.

### 6.0 Promotion Path (Non-Binding)

- ~~Once `FoundationContext` usage stabilizes across M3/M4, consider…~~  
  **Update (2025-12-23, M4 execution):** The monolithic payload is an M4 interim contract only; do not plan to promote it as a long-term canonical surface. Post-M4, split into discrete `artifact:foundation.*` products (DEF-014).

### 6.1 Proposed Step Contracts on Top of FoundationContext (Historical; Superseded)

The following outlines **candidate** `requires`/`provides` contracts for future steps,
assuming `FoundationContext` remains the canonical physics snapshot.

- **Foundation slice (today, implicit via Task Graph runner)**
  - `requires`:
    - `config.foundation` (plates, dynamics, surface, diagnostics).
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

### 6.2 Proposed Cross-Product Contracts (Historical; Superseded)

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
- **Integration invariants:** run a minimal Task Graph pass and assert `artifact:foundation` / `ctx.artifacts.foundation` availability + invariants for typical map sizes.
- **Determinism checks:** for fixed seeds/configs, compare `FoundationContext` tensors across runs to detect accidental drift.
- **Mutation guards:** copy tensors into new typed arrays (true snapshot) and/or introduce readonly tensor wrappers to prevent accidental writes.
- **CI + review gates:** require updating this doc when `FoundationContext` / `createFoundationContext` changes; consider linting against new code reading `ctx.foundation` or a global `WorldModel` instead of `artifact:foundation` via `ctx.artifacts`.
