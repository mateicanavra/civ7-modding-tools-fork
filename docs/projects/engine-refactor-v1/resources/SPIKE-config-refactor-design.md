# Configuration System Refactor Design

## Problem Statement

The current configuration system has **5 layers of indirection**:

```
BootstrapOptions.overrides (mod input)
    ↓ deepMerge in entry.ts
MapConfig (runtime store in globalThis)
    ↓ getConfig() in runtime.ts
buildTunablesSnapshot() in tunables.ts
    ↓ extracts slices
TunablesSnapshot.FOUNDATION_CFG
    ↓ accessed by
MapOrchestrator.buildMountainOptions()
    ↓ passed to
layerAddMountainsPhysics()
```

### Current Pain Points

1. **Scattered Type Definitions**: Config types spread across `types.ts`, with nested interfaces like `FoundationConfig` containing layer configs that could live at top level.

2. **Ambiguous Nesting**: Mods can specify `mountains` at top-level OR inside `foundation`. Required a "merge fix" to support both patterns.

3. **Multiple Merge Points**: Config is merged in `entry.ts` (bootstrap), then again in `tunables.ts` (layer extraction), and again in `MapOrchestrator` (building options).

4. **Frozen Objects Everywhere**: `safeFreeze`, `shallowFreeze`, `Object.freeze` scattered throughout - defensive programming masking unclear ownership.

5. **Global State**: Config stored in `globalThis.__EPIC_MAP_CONFIG__` - brittle, hard to test, invisible dependencies.

6. **Tunables Indirection**: The "tunables" abstraction adds no value - it's just a memoized view of config slices.

7. **No Runtime Validation**: Types only exist at compile time. Invalid configs fail silently or cause cryptic runtime errors.

---

## Design Goals

1. **Single Source of Truth**: One schema, one place to define what config looks like
2. **Type-Safe**: Full TypeScript inference from schema to usage
3. **Runtime Validated**: Catch invalid configs early with clear error messages
4. **Flat Structure**: No unnecessary nesting (eliminate `foundation` wrapper)
5. **Explicit Dependencies**: Layers receive config as parameters, not global access
6. **Testable**: Easy to provide test configs without mocking globals
7. **Zero Indirection**: Mod defines config → Layer uses config (max 2 steps)
8. **JSON Schema Compatible**: Native JSON Schema output for tooling/documentation

---

## Proposed Architecture

### Pattern Selection

| Pattern | Use Case | Application |
|---------|----------|-------------|
| **TypeBox Schema** | Runtime validation + type inference + JSON Schema | Define config shape once, get types + validation + schema |
| **Builder** | Complex config construction | Optional fluent API for mod authors |
| **Function-based DI** | Layer dependencies | Pass config slices as function parameters |
| **Strategy** | Layer behavior variants | Different config "presets" as named strategies |

### Why TypeBox over Zod?

| Aspect | TypeBox | Zod |
|--------|---------|-----|
| **JSON Schema** | Native output - schemas ARE JSON Schema | Requires zod-to-json-schema adapter |
| **Performance** | ~100x faster with TypeCompiler JIT | Interpreted validation |
| **Bundle Size** | ~30KB (tree-shakeable) | ~55KB |
| **Type Inference** | `Static<typeof T>` | `z.infer<typeof T>` |
| **Ecosystem** | Standard Schema via TypeMap | Native Standard Schema |
| **Default Handling** | Value utilities (Clone/Default/Convert/Clean) | Built into .parse() |

TypeBox's JSON Schema compliance is valuable for:
- Generating documentation from schemas
- Validating configs in external tools
- Potential future IDE autocomplete in mod JSON files

### New File Structure

```
packages/mapgen-core/src/
├── config/
│   ├── schema.ts        # TypeBox schemas (THE source of truth)
│   ├── types.ts         # Re-export inferred types from schema
│   ├── loader.ts        # Parse & validate config (one function)
│   └── index.ts         # Public API
├── layers/
│   └── mountains.ts     # Receives MountainsConfig directly
└── MapOrchestrator.ts   # Orchestrates with validated config
```

---

## Schema Design (TypeBox)

### Core Schema

```typescript
// config/schema.ts
import { Type, type Static, type TSchema } from '@sinclair/typebox';

// ============================================================================
// Layer Schemas (flat, focused)
// ============================================================================

export const PlatesConfigSchema = Type.Object({
  count: Type.Integer({ minimum: 2, maximum: 50, default: 8 }),
  relaxationSteps: Type.Integer({ minimum: 0, maximum: 20, default: 5 }),
  convergenceMix: Type.Number({ minimum: 0, maximum: 1, default: 0.5 }),
  plateRotationMultiple: Type.Number({ default: 1.0 }),
  seedMode: Type.Union([
    Type.Literal('engine'),
    Type.Literal('fixed')
  ], { default: 'engine' }),
  fixedSeed: Type.Optional(Type.Integer()),
}, { default: {} });

export const MountainsConfigSchema = Type.Object({
  tectonicIntensity: Type.Number({ minimum: 0, maximum: 2, default: 1.0 }),
  mountainThreshold: Type.Number({ minimum: 0, maximum: 1, default: 0.58 }),
  hillThreshold: Type.Number({ minimum: 0, maximum: 1, default: 0.32 }),
  upliftWeight: Type.Number({ default: 0.35 }),
  fractalWeight: Type.Number({ default: 0.15 }),
  boundaryWeight: Type.Number({ default: 1.0 }),
  boundaryExponent: Type.Number({ default: 1.6 }),
  convergenceBonus: Type.Number({ default: 1.0 }),
  transformPenalty: Type.Number({ default: 0.6 }),
  riftPenalty: Type.Number({ default: 1.0 }),
  riftDepth: Type.Number({ default: 0.2 }),
}, { default: {} });

export const VolcanoesConfigSchema = Type.Object({
  enabled: Type.Boolean({ default: true }),
  baseDensity: Type.Number({ default: 1/170 }),
  minSpacing: Type.Integer({ default: 3 }),
  boundaryThreshold: Type.Number({ default: 0.35 }),
  convergentMultiplier: Type.Number({ default: 2.4 }),
  minVolcanoes: Type.Integer({ default: 5 }),
  maxVolcanoes: Type.Integer({ default: 40 }),
}, { default: {} });

export const LandmassConfigSchema = Type.Object({
  baseWaterPercent: Type.Number({ minimum: 0, maximum: 100, default: 60 }),
  boundaryBias: Type.Number({ default: 0 }),
  tectonics: Type.Object({
    interiorNoiseWeight: Type.Number({ default: 0.1 }),
    boundaryArcWeight: Type.Number({ default: 0.2 }),
  }, { default: {} }),
}, { default: {} });

export const ClimateConfigSchema = Type.Object({
  baseline: Type.Object({
    bands: Type.Record(Type.String(), Type.Number(), { default: {} }),
  }, { default: {} }),
  refine: Type.Object({
    orographic: Type.Object({
      steps: Type.Number({ default: 6 }),
      reductionBase: Type.Number({ default: 34 }),
    }, { default: {} }),
  }, { default: {} }),
}, { default: {} });

// ============================================================================
// Stage Flags Schema
// ============================================================================

export const StagesConfigSchema = Type.Object({
  foundation: Type.Boolean({ default: true }),
  landmassPlates: Type.Boolean({ default: true }),
  coastlines: Type.Boolean({ default: true }),
  mountains: Type.Boolean({ default: true }),
  volcanoes: Type.Boolean({ default: true }),
  climateBaseline: Type.Boolean({ default: true }),
  climateRefine: Type.Boolean({ default: true }),
  rivers: Type.Boolean({ default: true }),
  biomes: Type.Boolean({ default: true }),
  features: Type.Boolean({ default: true }),
  placement: Type.Boolean({ default: true }),
}, { default: {} });

// ============================================================================
// Root Config Schema (FLAT - no foundation wrapper)
// ============================================================================

export const MapGenConfigSchema = Type.Object({
  // Stage toggles
  stages: StagesConfigSchema,

  // Layer configs (flat at top level)
  plates: PlatesConfigSchema,
  mountains: MountainsConfigSchema,
  volcanoes: VolcanoesConfigSchema,
  landmass: LandmassConfigSchema,
  climate: ClimateConfigSchema,

  // Diagnostics
  diagnostics: Type.Object({
    logAscii: Type.Boolean({ default: false }),
    logHistograms: Type.Boolean({ default: false }),
  }, { default: {} }),
}, { default: {} });

// ============================================================================
// Inferred Types (auto-generated from schema)
// ============================================================================

export type PlatesConfig = Static<typeof PlatesConfigSchema>;
export type MountainsConfig = Static<typeof MountainsConfigSchema>;
export type VolcanoesConfig = Static<typeof VolcanoesConfigSchema>;
export type LandmassConfig = Static<typeof LandmassConfigSchema>;
export type ClimateConfig = Static<typeof ClimateConfigSchema>;
export type StagesConfig = Static<typeof StagesConfigSchema>;
export type MapGenConfig = Static<typeof MapGenConfigSchema>;
```

### Config Loader

TypeBox requires explicit handling of defaults via `Value` utilities. This pattern is recommended by the library author for config/environment loading:

```typescript
// config/loader.ts
import { type TSchema, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { MapGenConfigSchema, type MapGenConfig } from './schema.js';

// Pre-compile schema for high-performance validation
const CompiledSchema = TypeCompiler.Compile(MapGenConfigSchema);

/**
 * Parse raw input into a validated, defaulted config.
 *
 * Pipeline:
 * 1. Clone - prevent mutation of input
 * 2. Default - apply schema defaults to missing properties
 * 3. Convert - coerce types (e.g., string "8" → number 8)
 * 4. Clean - remove properties not in schema
 * 5. Check - validate against schema
 */
export function parseConfig(input: unknown): MapGenConfig {
  // Clone to prevent mutation
  const cloned = Value.Clone(input ?? {});

  // Apply defaults (recursively)
  const defaulted = Value.Default(MapGenConfigSchema, cloned);

  // Convert types where possible (handles string→number, etc.)
  const converted = Value.Convert(MapGenConfigSchema, defaulted);

  // Remove unknown properties
  const cleaned = Value.Clean(MapGenConfigSchema, converted);

  // Validate
  if (!CompiledSchema.Check(cleaned)) {
    const errors = [...CompiledSchema.Errors(cleaned)];
    const messages = errors.map(e => `${e.path}: ${e.message}`).join('\n');
    throw new ConfigValidationError(`Invalid configuration:\n${messages}`, errors);
  }

  return cleaned as MapGenConfig;
}

/**
 * Safe parse that returns result object instead of throwing.
 */
export function safeParseConfig(input: unknown):
  | { success: true; config: MapGenConfig }
  | { success: false; errors: ValueError[] } {
  try {
    const config = parseConfig(input);
    return { success: true, config };
  } catch (error) {
    if (error instanceof ConfigValidationError) {
      return { success: false, errors: error.errors };
    }
    throw error;
  }
}

/**
 * Get default configuration (all defaults applied).
 */
export function getDefaultConfig(): MapGenConfig {
  return parseConfig({});
}

/**
 * Export JSON Schema for external tooling.
 */
export function getJsonSchema(): object {
  return MapGenConfigSchema;
}

/**
 * Custom error class for validation failures.
 */
export class ConfigValidationError extends Error {
  constructor(message: string, public readonly errors: ValueError[]) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

type ValueError = ReturnType<typeof CompiledSchema.Errors> extends Iterable<infer T> ? T : never;
```

---

## oRPC Evaluation: Internal Stage API

### Context

oRPC provides type-safe RPC with validation at procedure boundaries. The question: could this be useful for internal stage-to-stage communication?

### oRPC Capabilities

```typescript
// Define a procedure with validated input/output
const mountainsStage = os
  .input(MountainsConfigSchema)  // TypeBox schema via TypeMap
  .output(StageResultSchema)
  .handler(async ({ input, context }) => {
    return layerAddMountainsPhysics(context.mapCtx, input);
  });

// Call internally (no HTTP)
const result = await mountainsStage.callable({ context: { mapCtx } })
  .call(config.mountains);
```

### Benefits for Stage API

| Benefit | Value |
|---------|-------|
| **Automatic Validation** | Each stage validates its input/output at boundaries |
| **Contract-First** | Define stage interfaces separately from implementation |
| **Middleware** | Common concerns (logging, timing, error handling) as middleware |
| **Type Safety** | End-to-end types from config to stage result |
| **Testability** | Mock stages by implementing contract |

### Concerns

| Concern | Assessment |
|---------|------------|
| **Overhead** | oRPC adds ~5-10KB, but negligible runtime cost for internal calls |
| **Complexity** | Adds abstraction layer between orchestrator and layers |
| **Overkill?** | For simple function calls, may be unnecessary ceremony |
| **TypeBox Integration** | Requires TypeMap as bridge to Standard Schema |

### Recommendation: Consider for V2

For the initial config refactor, **keep stages as plain function calls** with config passed directly. The validation happens at the orchestrator entry point.

Consider oRPC for a future iteration if:
- Stages become more complex (async, streaming, cancellation)
- We want to support external stage plugins
- Stage-level error boundaries become important
- We want automatic OpenAPI documentation of the generation pipeline

### Alternative: Lightweight Stage Contracts

If we want validation at stage boundaries without full oRPC:

```typescript
// stages/contract.ts
import { TypeCompiler } from '@sinclair/typebox/compiler';

export function createStage<TInput extends TSchema, TOutput extends TSchema>(
  inputSchema: TInput,
  outputSchema: TOutput,
  handler: (input: Static<TInput>, ctx: MapContext) => Static<TOutput>
) {
  const inputValidator = TypeCompiler.Compile(inputSchema);
  const outputValidator = TypeCompiler.Compile(outputSchema);

  return (input: unknown, ctx: MapContext): Static<TOutput> => {
    // Validate input
    if (!inputValidator.Check(input)) {
      throw new StageInputError(inputSchema, inputValidator.Errors(input));
    }

    // Execute handler
    const output = handler(input as Static<TInput>, ctx);

    // Validate output (dev mode only?)
    if (process.env.NODE_ENV !== 'production' && !outputValidator.Check(output)) {
      throw new StageOutputError(outputSchema, outputValidator.Errors(output));
    }

    return output;
  };
}

// Usage
const mountainsStage = createStage(
  MountainsConfigSchema,
  MountainsResultSchema,
  (config, ctx) => layerAddMountainsPhysics(ctx, config)
);
```

---

## Layer Integration (Function-Based DI)

### Before (Current)

```typescript
// layers/mountains.ts - accesses global tunables
export function layerAddMountainsPhysics(
  ctx: ExtendedMapContext,
  options: Partial<MountainsConfig> = {}  // Partial, defaults scattered
): void {
  const {
    tectonicIntensity = 1.0,  // Default here
    mountainThreshold = 0.58, // Default here
    // ... 15 more defaults
  } = options;
  // ...
}
```

### After (Proposed)

```typescript
// layers/mountains.ts - receives validated config directly
import type { MountainsConfig } from '../config/schema.js';

/**
 * Add mountains using plate boundary physics.
 *
 * @param ctx - Map context with dimensions and adapter
 * @param config - Validated mountains configuration (no defaults needed here)
 */
export function layerAddMountainsPhysics(
  ctx: ExtendedMapContext,
  config: MountainsConfig  // Full config, already validated with defaults
): void {
  // Direct access - no destructuring defaults needed
  const score = collision * config.boundaryWeight * config.convergenceBonus;
  // ...
}
```

---

## Orchestrator Integration

### Before (Current)

```typescript
// MapOrchestrator.ts
generateMap() {
  resetTunables();
  const tunables = getTunables();

  const foundationCfg = tunables.FOUNDATION_CFG || {};
  const mountainsCfg = (foundationCfg.mountains || {}) as MountainsConfig;

  // Build options by extracting and defaulting AGAIN
  const mountainOptions = this.buildMountainOptions(mountainsCfg);

  layerAddMountainsPhysics(ctx, mountainOptions);
}

private buildMountainOptions(config: MountainsConfig): MountainsConfig {
  return {
    tectonicIntensity: config.tectonicIntensity ?? 1.0,
    mountainThreshold: config.mountainThreshold ?? 0.58,
    // ... 15 more defaults (THIRD time!)
  };
}
```

### After (Proposed)

```typescript
// MapOrchestrator.ts
import { parseConfig, type MapGenConfig } from './config/index.js';

export class MapOrchestrator {
  private config: MapGenConfig;

  constructor(rawConfig: unknown) {
    // Single validation point - throws on invalid
    this.config = parseConfig(rawConfig);
  }

  generateMap(): GenerationResult {
    // Direct access to validated, defaulted config
    if (this.config.stages.mountains) {
      layerAddMountainsPhysics(ctx, this.config.mountains);
    }

    if (this.config.stages.volcanoes) {
      layerAddVolcanoes(ctx, this.config.volcanoes);
    }
    // ...
  }
}
```

---

## Mod Entry Point

### Before (Current)

```typescript
// swooper-desert-mountains.ts
import { bootstrap } from "@swooper/mapgen-core";

const config = {
  stageConfig: { foundation: true, mountains: true, /* ... */ },
  overrides: {
    landmass: { /* ... */ },
    foundation: {           // WHY IS THIS NESTED?
      mountains: { /* ... */ },
      volcanoes: { /* ... */ },
      plates: { /* ... */ },
    },
  },
};

engine.on("GenerateMap", () => {
  bootstrap(config);        // Merges into global
  orchestrator.generateMap(); // Reads from global
});
```

### After (Proposed)

```typescript
// swooper-desert-mountains.ts
import { MapOrchestrator } from "@swooper/mapgen-core";

const config = {
  stages: {
    foundation: true,
    mountains: true,
    volcanoes: true,
    // ...
  },
  plates: {
    count: calculatePlateCount(width, height),
    convergenceMix: 0.55,
  },
  mountains: {  // FLAT - not inside foundation
    tectonicIntensity: 0.5,
    mountainThreshold: 0.82,
  },
  volcanoes: {  // FLAT
    baseDensity: 1/175,
    convergentMultiplier: 3.25,
  },
  landmass: {
    baseWaterPercent: 63,
  },
};

engine.on("GenerateMap", () => {
  // Config validated at construction - fails fast with clear errors
  const orchestrator = new MapOrchestrator(config);
  orchestrator.generateMap();
});
```

---

## Optional: Builder Pattern for Complex Configs

For mods that want a fluent API:

```typescript
// config/builder.ts
import { type MapGenConfig, getDefaultConfig } from './schema.js';

export class ConfigBuilder {
  private config: MapGenConfig;

  constructor() {
    this.config = getDefaultConfig();
  }

  plates(cfg: Partial<PlatesConfig>): this {
    this.config.plates = { ...this.config.plates, ...cfg };
    return this;
  }

  mountains(cfg: Partial<MountainsConfig>): this {
    this.config.mountains = { ...this.config.mountains, ...cfg };
    return this;
  }

  enableStages(...stages: (keyof StagesConfig)[]): this {
    for (const stage of stages) {
      this.config.stages[stage] = true;
    }
    return this;
  }

  disableStages(...stages: (keyof StagesConfig)[]): this {
    for (const stage of stages) {
      this.config.stages[stage] = false;
    }
    return this;
  }

  build(): MapGenConfig {
    return this.config;
  }
}

// Usage:
const config = new ConfigBuilder()
  .plates({ count: 12, convergenceMix: 0.6 })
  .mountains({ tectonicIntensity: 0.5, mountainThreshold: 0.8 })
  .enableStages('foundation', 'mountains', 'volcanoes')
  .disableStages('rivers')
  .build();
```

---

## TypeMap Integration (Optional)

If we need Standard Schema compatibility (for oRPC or other tools):

```typescript
// config/standard-schema.ts
import { TypeBox } from '@sinclair/typemap';
import { Compile } from '@sinclair/typemap';

// Create Standard Schema compatible validator
export const MapGenConfigValidator = Compile(MapGenConfigSchema);

// Now usable with any Standard Schema consumer
// e.g., oRPC, react-hook-form, etc.
```

TypeMap also enables TypeScript syntax parsing:

```typescript
// Parse TypeScript syntax directly into TypeBox schema
const UserSchema = TypeBox(`{
  name: string,
  age: number,
  email?: string
}`);
```

---

## Migration Path

### Phase 1: Add TypeBox Schema (Non-Breaking)
1. Add `@sinclair/typebox` dependency
2. Create `config/schema.ts` with new flat schema
3. Create `config/loader.ts` with parse functions
4. Add adapter that converts old nested config to new flat format

### Phase 2: Update Layers (Internal)
1. Update layer functions to accept full config objects
2. Remove inline defaults (already in schema)
3. Update MapOrchestrator to use new config loader

### Phase 3: Update Mod Entry Points
1. Update mod configs to use flat structure
2. Remove `foundation` wrapper
3. Remove `bootstrap()` - config passed directly to orchestrator

### Phase 4: Remove Old Code
1. Delete `tunables.ts`
2. Delete `runtime.ts` (global store)
3. Delete old `types.ts` interfaces (use TypeBox-inferred types)
4. Delete merge logic in `entry.ts`

---

## Summary: Before vs After

| Aspect | Before | After |
|--------|--------|-------|
| Config definition | 3 files, nested types | 1 file, TypeBox schema |
| Type inference | Manual interface sync | Auto from schema via `Static<T>` |
| Runtime validation | None | TypeBox Value + TypeCompiler |
| Default handling | 3 places (types, tunables, layers) | 1 place (schema) |
| Nesting | `foundation.mountains` | `mountains` (flat) |
| Global state | `globalThis.__EPIC_MAP_CONFIG__` | None (explicit param) |
| Layers access config | Via tunables + options | Direct parameter |
| Indirection levels | 5 | 2 (mod → orchestrator → layer) |
| Testability | Mock globals | Pass test config |
| JSON Schema | None | Native output from TypeBox |

---

## Dependencies

- **@sinclair/typebox**: ~0.32.x (~30KB minified, tree-shakeable)
  - JSON Schema Type Builder with Static Type Resolution
  - High-performance JIT compilation via TypeCompiler
  - Zero runtime dependencies
  - Works in browser, Node, Deno, Bun

- **@sinclair/typemap** (optional): For Standard Schema compatibility
  - Required only if integrating with oRPC or similar tools
  - Provides TypeScript syntax parsing
  - ~100x validation performance via compilation

---

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Breaking mod configs | Phase 1 adapter converts old format |
| Bundle size increase | TypeBox is smaller than Zod; validate at entry only |
| Learning curve | Clear docs + builder pattern option |
| Missing edge cases | Comprehensive test suite for schema |
| Default handling complexity | Document the Clone→Default→Convert→Clean pattern |

---

## Acceptance Criteria

- [ ] Single TypeBox schema defines all config types
- [ ] `parseConfig(input)` validates and returns typed config
- [ ] Layers receive config as direct parameters
- [ ] No global config state
- [ ] Mod entry points use flat config structure
- [ ] All defaults defined in schema only
- [ ] Clear error messages for invalid configs
- [ ] Existing tests pass with new system
- [ ] JSON Schema exportable for documentation

---

## References

- [TypeBox GitHub](https://github.com/sinclairzx81/typebox) - JSON Schema Type Builder
- [TypeMap GitHub](https://github.com/sinclairzx81/typemap) - Standard Schema + Type Translation
- [oRPC Documentation](https://orpc.dev) - If considering stage contracts in future
- [JSON Schema Spec](https://json-schema.org/) - TypeBox generates compliant schemas
