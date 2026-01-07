# Config Resolution Flow - Slide Outline

**Deck ID**: `config-resolution-flow`
**Title**: "Following the Config: End-to-End Resolution in the Mapgen Pipeline"
**Angle**: Technical
**Primary blocks**: diagram, codeBlock, explanation, layers

---

## Concepts

| ID | Label | Color | Description |
|----|-------|-------|-------------|
| `authoring` | Authoring | blue | Compile-time contracts and schemas |
| `runtime` | Runtime | purple | Execution-time implementations |
| `confusion` | Confusion Point | orange | Areas of complexity worth noting |

---

## Slide 1: The Config Journey

**Purpose**: Set up the problem and preview the architecture
**Concept**: (none - intro)
**Blocks**:
1. `explanation`: A single config value like `{ climateWeight: 1.5 }` must traverse 4+ layers before reaching the algorithm that uses it. Understanding this flow is essential for debugging, extending, and eventually simplifying the system.
2. `layers` (pyramid, 4 layers):
   - Recipe: Nested config aggregated from all stages/steps
   - Step: Composes one or more op configs
   - Op: Discriminated union of strategy configs
   - Strategy: The actual config consumer

**Transition**: Let's start at the top—where config enters the system.

---

## Slide 2: Recipe Entry Point

**Purpose**: Show the top-level config structure users/callers provide
**Concept**: `authoring`
**Blocks**:
1. `explanation`: The recipe config is a deeply nested object synthesized from all stages and steps. TypeBox infers this type automatically via `RecipeConfigOf<typeof stages>`.
2. `codeBlock`: Recipe config type structure
   - File: `/packages/mapgen-core/src/authoring/types.ts`
   - Lines: 48-62 (RecipeConfigOf type)
3. `codeBlock`: Example config shape
   - File: `/mods/mod-swooper-maps/src/recipes/standard/recipe.ts`
   - Lines: showing `StandardRecipeConfig` usage

**Transition**: When `recipe.run()` is called, this config enters the compiler.

---

## Slide 3: The Compiler Bridge

**Purpose**: Show how recipe.compile() transforms config into an execution plan
**Concept**: `authoring`
**Blocks**:
1. `explanation`: The compiler extracts step configs from the nested structure and calls each step's `resolveConfig()` to normalize values before execution.
2. `diagram` (mermaid flowchart):
   ```
   recipe.run(ctx, settings, config)
     → recipe.compile(settings, config)
       → instantiate(config) → flat step list
       → for each step: step.resolveConfig(stepConfig, settings)
       → ExecutionPlan with resolved configs
   ```
3. `codeBlock`: Recipe compile method
   - File: `/packages/mapgen-core/src/authoring/recipe.ts`
   - Lines: 143-160 (compile function)

**Confusion point annotation**: The compile step is where config resolution happens, but the naming suggests it's about execution planning. This conflation is a source of confusion.

**Transition**: Let's zoom into a step to see how it handles config.

---

## Slide 4: Step Config Composition

**Purpose**: Show how steps compose multiple op configs
**Concept**: `authoring`
**Blocks**:
1. `explanation`: Steps define a schema that embeds each op's config union. Multi-op steps like `features-plan` compose 4 independent op configs. The step's `resolveConfig` must delegate to each op.
2. `codeBlock`: Step contract with multi-op config
   - File: `/mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-plan/contract.ts`
   - Lines: 5-31
3. `codeBlock`: Step resolveConfig delegating to ops
   - File: `/mods/mod-swooper-maps/src/recipes/standard/stages/ecology/steps/features-plan/index.ts`
   - Lines: 25-31

**Confusion point annotation**: Steps must manually call each op's `resolveConfig`. This is boilerplate that could be automated in a declarative system.

**Transition**: Each op has its own resolution logic. Let's follow one.

---

## Slide 5: Op Config: The Discriminated Union

**Purpose**: Explain the strategy selection mechanism
**Concept**: `authoring`
**Blocks**:
1. `explanation`: Each op's config is a discriminated union: `{ strategy: "name", config: {...} }`. This allows type-safe strategy selection while sharing the same input/output contract.
2. `diagram` (mermaid):
   ```
   OpConfigSchema = Union of:
     { strategy: "default", config: DefaultConfigSchema }
     { strategy: "coastal-shelf", config: CoastalShelfConfigSchema }
     { strategy: "orogeny-boosted", config: OrogenyBoostedConfigSchema }
   ```
3. `codeBlock`: Op config union construction
   - File: `/packages/mapgen-core/src/authoring/op/create.ts`
   - Lines: 84-96

**Transition**: Once a strategy is selected, its `resolveConfig` normalizes the values.

---

## Slide 6: Strategy Resolution

**Purpose**: Show how strategy.resolveConfig applies defaults
**Concept**: `runtime` (this is implementation)
**Blocks**:
1. `explanation`: Each strategy can define a `resolveConfig` hook that applies schema defaults via `applySchemaDefaults()`. This uses TypeBox's `Value.Default()`, `Value.Convert()`, `Value.Clean()` chain.
2. `codeBlock`: Strategy resolveConfig pattern
   - File: `/mods/mod-swooper-maps/src/domain/ecology/ops/pedology-classify/strategies/default.ts`
   - Lines: 7-10 (resolveConfig)
3. `codeBlock`: applySchemaDefaults implementation
   - File: `/packages/mapgen-core/src/authoring/schema.ts`
   - Lines: 6-13

**Confusion point annotation**: `resolveConfig` can do arbitrary transformations, not just defaults. This breaks the declarative model—config becomes code-dependent.

**Transition**: Now the config is fully resolved. What happens at runtime?

---

## Slide 7: Runtime Execution

**Purpose**: Show the runtime path (post-resolution)
**Concept**: `runtime`
**Blocks**:
1. `explanation`: At runtime, the executor calls `step.run(context, resolvedConfig)`. Steps call `op.runValidated()` which validates then invokes `strategy.run(input, config)`. By this point, config is already resolved—no further transformations.
2. `diagram` (mermaid sequence):
   ```
   Executor → step.run(ctx, resolvedConfig)
   step → op.runValidated(input, config.classify)
   op → validate(input, config)
   op → strategy.run(input, config)
   strategy → compute with config.weights
   ```
3. `codeBlock`: Op runValidated surface
   - File: `/packages/mapgen-core/src/authoring/op/validation-surface.ts`
   - Lines: 15-46

**Transition**: Let's see the complete picture.

---

## Slide 8: The Full Flow

**Purpose**: End-to-end diagram with annotations
**Concept**: (none - synthesis)
**Blocks**:
1. `diagram` (mermaid flowchart - vertical):
   ```
   RecipeConfig { ecology: { pedology: { classify: {...} } } }
     ↓ recipe.instantiate()
   StepOccurrence[] with extracted configs
     ↓ step.resolveConfig(stepConfig, settings)
   Step calls op.resolveConfig() for each op
     ↓ op.resolveConfig(strategySelection, settings)
   Strategy.resolveConfig applies defaults
     ↓ Execution Plan (configs frozen)
   ═══════════════════════════════════════
     ↓ executor.executePlan()
   step.run(ctx, resolvedConfig)
     ↓ op.runValidated(input, config)
   strategy.run(input, config) ← config used here
   ```
2. `explanation`: The line between compile-time and runtime is the ExecutionPlan. Above it, configs are transformed. Below it, they're consumed. A fully declarative system would eliminate all transformation logic above the line.

**Transition**: What does this mean for the future?

---

## Slide 9: Confusion Points Summary

**Purpose**: Consolidate the complexity sources identified
**Concept**: `confusion`
**Blocks**:
1. `explanation`: Three key areas where config resolution creates confusion or coupling:
2. `table` (3 rows):
   - Row 1: "resolveConfig hooks | Arbitrary code transforms | Break declarative model"
   - Row 2: "Manual delegation | Steps manually call op.resolveConfig | Boilerplate, error-prone"
   - Row 3: "Compile/runtime blur | Resolution happens in 'compile' phase | Naming misleads"
3. `explanation`: A future declarative approach would: (1) Make all defaults schema-only, (2) Auto-generate step→op delegation, (3) Rename phases to match semantics.

---

## Slide 10: Toward Declarative Config

**Purpose**: Tease future direction without over-promising
**Concept**: `authoring`
**Blocks**:
1. `explanation`: A fully declarative config system would:
   - Eliminate `resolveConfig` hooks entirely
   - Use schema defaults as the only normalization mechanism
   - Auto-derive step schemas from op compositions
   - Make the "compile" phase purely structural (no value transformations)
2. `layers` (stack, 3 layers):
   - Layer 1: "Schema Defaults" - All normalization via TypeBox defaults
   - Layer 2: "Composition Rules" - Steps declare which ops, schema auto-composed
   - Layer 3: "Execution" - Pure runtime, no config mutation

**Transition**: (End)

---

## Validation Checklist

- [ ] All blocks use allowed types for technical angle
- [ ] Concepts referenced exist in registry
- [ ] Code blocks have real file paths and line ranges
- [ ] Diagrams use valid Mermaid syntax
- [ ] Slide count: 10 (within reasonable bounds)
- [ ] Narrative flows logically with clear transitions
