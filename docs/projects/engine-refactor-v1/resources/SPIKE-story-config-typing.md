# SPIKE: Catch Up Story Config Typing (Climate Swatches + Monsoon Knobs)

## Objective

Eliminate the remaining “escape hatch” config pockets that force consumers (mods and `@swooper/mapgen-core`) to cast to `Record<string, unknown>` for story-adjacent behavior, starting with:

- `climate.swatches` (currently `UnknownRecord`)
- legacy alias `climate.story.swatches` (currently untyped + only accessible via casts)
- monsoon knobs currently written under `foundation.dynamics.directionality.hemispheres.*` (untyped due to `additionalProperties`)

The goal is: **validated config is fully typed for all story/climate knobs that are actually consumed**, so in-repo presets no longer need `as unknown as Record<...>` shims.

## Why This Matters

- Presets like `mods/mod-swooper-maps/src/swooper-earthlike.ts` currently need casts/spreads to inject consumed-but-untyped keys (`climate.story.swatches`, monsoon knobs).
- Core runtime code still reads swatches config via casted `Record<string, unknown>` (`packages/mapgen-core/src/domain/hydrology/climate/swatches/index.ts`).
- This is drift bait: schema suggests “typed config”, but consumers can silently set wrong shapes and only fail at runtime (or just no-op).

This SPIKE is about tightening the config surface without changing algorithms.

## Current State (Evidence)

- `packages/mapgen-core/src/config/schema.ts` defines `UnknownRecord` as a deliberate escape hatch and still uses it for `ClimateConfigSchema.swatches`.
- `packages/mapgen-core/src/domain/hydrology/climate/swatches/index.ts` resolves swatches config with:
  - canonical `ctx.config.climate.swatches`, otherwise
  - legacy alias `ctx.config.climate.story.swatches`
  - both accessed via `Record<string, unknown>` casts.
- `docs/projects/engine-refactor-v1/resources/config-wiring-status.md` explicitly calls out:
  - `climate.swatches` is wired but typed as `UnknownRecord` “for now”.
  - `climate.story.swatches.*` is consumed but untyped.
- `mods/mod-swooper-maps/src/swooper-earthlike.ts` includes:
  - a cast/spread block to inject `climate.story.swatches` keys
  - a cast/spread to inject monsoon knobs under `foundation.dynamics.directionality.hemispheres.*`

## Scope

### In scope (this SPIKE’s target)

1. **TypeBox schema coverage**
   - Add explicit schemas for the swatch config surface used by `applyClimateSwatches`:
     - `climate.swatches.*` (canonical)
     - `climate.story.swatches.*` (legacy alias, typed for now)
   - Add explicit schema fields for monsoon knobs that are currently written under `foundation.dynamics.directionality.hemispheres.*` by presets and read by the monsoon pass.

2. **Remove in-repo preset casts**
   - Update Swooper presets to write only typed keys (no `as unknown as Record<...>`).

3. **Reduce `Record<string, unknown>` reads**
   - Update `applyClimateSwatches` to read typed config (still supporting the alias if we keep it).

### Out of scope

- Changing swatch algorithms, weights, or behavior.
- Changing stage order or gating (e.g., how `storySwatches` runs).
- Removing the legacy alias entirely (that’s a follow-up decision).
- Broader “type every additionalProperties escape hatch” across the whole config (corridors biases, diagnostics flags, etc.). This SPIKE can propose follow-ups, but should not expand to them.

## Proposed Schema Shape (Draft)

### Canonical

Promote a typed canonical surface:

```ts
config.climate.swatches = {
  maxPerMap?: number
  forceAtLeastOne?: boolean
  sizeScaling?: { widthMulSqrt?: number; lengthMulSqrt?: number }
  types?: {
    macroDesertBelt?: { ... }
    equatorialRainbelt?: { ... }
    rainforestArchipelago?: { ... }
    mountainForests?: { ... }
    greatPlains?: { ... }
    // allow future extensions without breaking parsing
  }
}
```

The “types” object should model the keys actually handled by the code today, with `additionalProperties: true` to avoid rejecting future swatch types prematurely.

### Legacy alias (typed, transitional)

If we keep supporting `climate.story.swatches`, type it as the same schema to remove casts in presets and runtime:

```ts
config.climate.story.swatches?: ClimateSwatchesConfig
```

Optionally, the loader can normalize `climate.story.swatches` → `climate.swatches` during conversion (preferred end-state), while still accepting both for a transition period.

### Monsoon knobs (typed)

Presets currently write monsoon knobs under:

```ts
config.foundation.dynamics.directionality.hemispheres.monsoonBias
config.foundation.dynamics.directionality.hemispheres.equatorBandDeg
```

These should become explicit optional fields on the `hemispheres` schema (even if still “legacy/experimental”), so config is validated and consumers don’t need spreads.

## Implementation Plan (Thin Slices)

1. **Schema first (no behavior changes)**
   - Add `ClimateSwatchesConfigSchema` + per-swatch-type schemas into `packages/mapgen-core/src/config/schema.ts`.
   - Replace `ClimateConfigSchema.swatches: UnknownRecord` with `Type.Optional(ClimateSwatchesConfigSchema)`.
   - Add `ClimateStorySchema.swatches: Type.Optional(ClimateSwatchesConfigSchema)` if we keep the alias.
   - Add `monsoonBias` / `equatorBandDeg` to `FoundationDirectionalityConfigSchema.hemispheres` (or wherever the monsoon pass actually reads today).

2. **Runtime typing cleanup**
   - Update `packages/mapgen-core/src/domain/hydrology/climate/swatches/index.ts`:
     - remove `Record<string, unknown>` casts for swatches config
     - read `ctx.config.climate.swatches` (and/or typed legacy alias)

3. **Preset cleanup**
   - Update `mods/mod-swooper-maps/src/swooper-earthlike.ts` (and any other presets) to remove:
     - `...({ ... } as unknown as Record<string, unknown>)` for swatches
     - monsoon spread cast under `hemispheres`
   - Ensure config still validates and swatches still apply.

4. **Tests + docs alignment**
   - Add loader tests ensuring swatches config is accepted and invalid shapes are rejected (or at least surfaced in `safeParseConfig` errors).
   - Update `docs/projects/engine-refactor-v1/resources/config-wiring-status.md` to stop calling `climate.swatches` an `UnknownRecord` pocket and remove it from “untyped but consumed”.

## Risks / Trade-offs

- **Over-constraining**: if we make the swatches schema too strict, we might break existing presets that rely on extra keys. Mitigation: keep `additionalProperties: true` and model only keys we know are used.
- **Alias drift**: supporting both `climate.swatches` and `climate.story.swatches` is inherently redundant; prefer normalization in loader once consumers migrate.
- **Schema bloat**: keep this focused on swatches + monsoon knobs; avoid expanding to all config pockets in one pass.

## Acceptance Criteria

- No `as unknown as Record<...>` casts remain in `mods/mod-swooper-maps/src/swooper-earthlike.ts` for swatches or monsoon knobs.
- `applyClimateSwatches` no longer reads swatches config via `Record<string, unknown>` casts.
- `parseConfig` validates swatches config with useful errors for wrong types (at minimum: rejects non-object shapes and clearly flags invalid numeric fields).
- `docs/projects/engine-refactor-v1/resources/config-wiring-status.md` no longer lists `climate.story.swatches.*` under “untyped but consumed”.

## References

- `packages/mapgen-core/src/config/schema.ts`
- `packages/mapgen-core/src/domain/hydrology/climate/swatches/index.ts`
- `packages/mapgen-core/src/domain/hydrology/climate/swatches/monsoon-bias.ts`
- `docs/projects/engine-refactor-v1/resources/config-wiring-status.md`
- `mods/mod-swooper-maps/src/swooper-earthlike.ts`

