# Map Generator Bootstrap Architecture

## Overview

This mod uses **explicit overrides + recipe selection** so variants can share one codebase while choosing configuration and step enablement explicitly (no preset composition in the TS runtime).

## Current TypeScript Architecture (M4)

- Entry scripts call `bootstrap({ overrides })` from `@swooper/mapgen-core/bootstrap` and receive a validated `MapGenConfig`.
- Entry scripts call `applyMapInitData` to resolve map settings and seed the adapter with init data.
- Entry scripts select or derive a RecipeV1 (often from the injected `baseMod`) and pass it via `runTaskGraphGeneration`.
- Steps/layers read config from `context.config` (no global runtime config store, no `bootstrap/tunables` module).

Example (minimal runnable pipeline):
```ts
import { baseMod } from "@swooper/mapgen-core/base";
import { applyMapInitData, bootstrap, runTaskGraphGeneration } from "@swooper/mapgen-core";

const config = bootstrap({
  overrides: {},
});

applyMapInitData({ logPrefix: "[MOD]" });

const recipe = {
  schemaVersion: 1,
  steps: baseMod.recipes.default.steps.map((step) => ({
    ...step,
    enabled: step.id === "foundation" || step.id === "landmassPlates",
  })),
};

runTaskGraphGeneration({ mod: baseMod, mapGenConfig: config, orchestratorOptions: { recipeOverride: recipe } });
```

## Dependency Chain Visualization (M4)

```
┌─────────────────────────────────────────────────┐
│ CIV VII Engine                                  │
│ Loads: entry script (map variant)               │
└───────────────────┬─────────────────────────────┘
                    │
        ┌───────────▼──────────┐
        │ Entry File           │
        │ ├─ bootstrap()       │  ← Validates overrides
        │ ├─ applyMapInitData  │  ← Adapter seed
        │ └─ runTaskGraphGen   │  ← Executes pipeline
        └───────────┬──────────┘
                    │
        ┌───────────▼──────────┐
        │ runTaskGraphGen      │
        │ ├─ compile plan      │  ← ExecutionPlan
        │ └─ execute plan       │  ← PipelineExecutor
        └───────────┬──────────┘
                    │
        ┌───────────▼──────────┐
        │ Step graph            │
        │ └─ steps read config  │  ← context.config
        └──────────────────────┘
```

## Operational Note

Headless generation via an `InMemoryAdapter` proved impractical (the pipeline still depends on Civ VII engine globals such as `GameplayMap`, `TerrainBuilder`, `ResourceBuilder`, `FertilityBuilder`, `GameInfo`, etc.), so the stub adapter has been removed. For rapid iteration we instead rely on FireTuner-driven workflows to trigger map generation without restarting the client.

## Legacy JS Architecture (Archived)

The pre-M4 JS architecture relied on presets, global runtime config storage, and `tunables` rebinds to feed the orchestrator. That flow (including `bootstrap({ presets })` and `stageConfig` enablement) is intentionally removed in M4 and should not be used for current mod entrypoints.
