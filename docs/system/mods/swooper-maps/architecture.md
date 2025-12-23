# Map Generator Bootstrap Architecture

## Overview

This mod uses a **preset + overrides** configuration system that allows multiple map variants to share a single codebase while having different behaviors through declarative configuration.

## Current TypeScript Architecture (M4)

- Entry scripts call `bootstrap({ presets, overrides })` from `@swooper/mapgen-core/bootstrap` and receive a validated `MapGenConfig`.
- `MapOrchestrator` is constructed with that validated config and creates a per-run `MapGenContext` carrying it at `context.config`.
- Steps/layers read config from `context.config` (no global runtime config store, no `bootstrap/tunables` module).
- In M4, stage enablement is recipe-driven; `stageConfig` no longer disables steps.

Example (minimal runnable pipeline):
```ts
import { bootstrap, MapOrchestrator, standardMod } from "@swooper/mapgen-core";

const config = bootstrap({
  presets: ["classic"],
});

const recipe = {
  schemaVersion: 1,
  steps: standardMod.recipes.default.steps.map((step) => ({
    ...step,
    enabled: step.id === "foundation" || step.id === "landmassPlates",
  })),
};

new MapOrchestrator(config, { recipeOverride: recipe }).generateMap();
```

## Legacy JS Architecture (Archived)

> **Operational note**  
> Headless generation via an `InMemoryAdapter` proved impractical (the pipeline still depends on Civ VII engine globals such as `GameplayMap`, `TerrainBuilder`, `ResourceBuilder`, `FertilityBuilder`, `GameInfo`, etc.), so the stub adapter has been removed. For rapid iteration we instead rely on FireTuner-driven workflows to trigger map generation without restarting the client.

---

## Dependency Chain Visualization

```
┌─────────────────────────────────────────────────┐
│ CIV VII Engine                                  │
│ Loads: epic-diverse-huge.js (entry point)       │
└───────────────────┬─────────────────────────────┘
                    │
        ┌───────────▼──────────┐
        │ Entry File           │
        │ ├─ bootstrap()       │  ← Calls configuration bootstrap
        │ └─ import orchestr.  │  ← Imports generator
        └───────────┬──────────┘
                    │
        ┌───────────▼──────────────────────┐
        │ bootstrap/entry.js               │
        │ └─ setConfig(merged config)      │  ← Composes config from presets
        └───────────┬──────────────────────┘
                    │
        ┌───────────▼──────────────────────┐
        │ bootstrap/runtime.js             │
        │ └─ stores in globalThis          │  ← Global config store
        └───────────┬──────────────────────┘
                    │
        ┌───────────▼──────────────────────┐
        │ bootstrap/resolved.js            │
        │ ├─ getConfig from runtime        │  ← Reads from global
        │ ├─ merges defaults+presets       │  ← Deep merge resolution
        │ └─ exports group getters         │  ← Typed accessors
        └───────────┬──────────────────────┘
                    │
        ┌───────────▼──────────────────────┐
        │ bootstrap/tunables.js            │
        │ ├─ rebind() refreshes            │  ← Re-reads config
        │ └─ exports live bindings         │  ← ES module live refs
        └───────────┬──────────────────────┘
                    │
        ┌───────────▼──────────────────────┐
        │ map_orchestrator.js              │
        │ ├─ rebind() at start             │  ← Rebind on generate
        │ ├─ uses tunables                 │  ← Read config values
        │ └─ orchestrates layers           │  ← Execute generation
        └──────────────────────────────────┘
```

---

## 3-Tier System Explanation

### Tier 1: Entry Point Files (Game-Facing)

**Location**: `maps/epic-diverse-huge*.js`

These are the files CIV VII actually loads. Each represents a different map variant:

- `epic-diverse-huge.js` - Base variant (classic preset)
- `epic-diverse-huge-temperate.js` - Temperate climate variant
- `epic-diverse-huge-kahula.js` - Dramatic tectonics variant

**Structure**:
```javascript
import { bootstrap } from "./bootstrap/entry.js";
bootstrap({
    // Note: for the current TypeScript/M4 architecture, stage enablement is recipe-driven;
    // include a recipe override if you need a minimal or custom stage set.
    presets: ["classic"],           // or ["temperate"], etc.
    overrides: { /* optional */ }   // variant-specific tweaks
});
import "./map_orchestrator.js";    // Shared generator
```

**Key insight**: Each entry file is tiny (~10-200 lines) and purely declarative. All generation logic lives in the shared orchestrator.

---

### Tier 2: Configuration Pipeline

#### `bootstrap/entry.js`
**Purpose**: Bootstraps per-entry configuration

- Deep merges presets with overrides
- Calls `setConfig()` to store result globally

#### `bootstrap/runtime.js` (legacy JS architecture)
**Purpose (historical)**: Global configuration storage

- Stored merged config under a global key (e.g., `globalThis[__EPIC_MAP_CONFIG__]`) for cross-module access.
- Avoided import-time coupling (reduced circular dependency risk).
- Froze config to prevent mutation.

#### `bootstrap/resolved.js`
**Purpose**: Configuration resolution and merging

- Reads from the current config source.
- Merges: `BASE_CONFIG` + presets (ordered) + runtime overrides.
- Exports typed getters: `getToggles()`, `getLandmass()`, etc.

#### `bootstrap/tunables.js`
**Purpose**: Live module bindings

- Exports ES module `let` variables (not constants).
- Produces a derived, read-only view over the resolved config for consumers such as the map orchestrator and world model.

---

### Tier 3: Execution

#### `map_orchestrator.js`
**Purpose**: Main map generation orchestrator

1. Calls `rebind()` at start of `generateMap()`
2. Reads config via imported tunables
3. Orchestrates generation phases
4. Calls layers in correct order

**Flow**:
```javascript
import { rebind, LANDMASS_CFG } from "./bootstrap/tunables.js";

function generateMap() {
    rebind();  // Refresh config for this run

    WorldModel.init(); // Always required

    createLandmasses(LANDMASS_CFG);
    // ... etc
}
```

---

## Why This Design is Brilliant

### ✅ Multiple Map Variants from One Codebase

**Without this system**, you'd need:
- 3 copies of `map_orchestrator.js` (code duplication!)
- Manual syncing of bug fixes across variants
- Hard-coded configuration

**With this system**:
- 1 orchestrator (~320 lines)
- 3 tiny entry files (~10-200 lines each)
- Declarative presets (easy to maintain)
- **Total code savings**: ~600 lines avoided!

### ✅ Clean Preset Composition

Presets can build on each other:
```javascript
bootstrap({
    presets: ["classic", "arid"],  // Arid extends classic
    overrides: { /* fine-tune */ }
});
```

Merge order (lowest to highest precedence):
1. `BASE_CONFIG` (defaults)
2. `CLASSIC_PRESET`
3. `ARID_PRESET`
4. Runtime overrides

### ✅ No Import Cycles

Traditional approach (broken):
```javascript
// orchestrator.js
import config from "./config.js";  // Needs entry's config

// entry.js
import orchestrator from "./orchestrator.js";  // Circular!
```

Our approach (works):
- Entry sets config in `globalThis` (no import)
- Orchestrator reads from `tunables.js` (no direct entry import)
- Clean unidirectional flow

### ✅ Testability

Can swap presets/overrides without changing code:
```javascript
// Test with different configs
bootstrap({ presets: ["test-minimal"], stageConfig: { foundation: true } });
bootstrap({ stageConfig: { foundation: true }, overrides: { landmass: { baseWaterPercent: 80 } } });
```

---

## File Organization

```
mod/maps/
├── epic-diverse-huge.js                 ← Entry: base variant
├── epic-diverse-huge-temperate.js       ← Entry: temperate variant
├── epic-diverse-huge-kahula.js          ← Entry: kahula variant
├── map_orchestrator.js                  ← Shared generator (DO NOT RENAME!)
├── bootstrap/                           ← Configuration system
│   ├── entry.js                        ← Bootstrap helper
│   ├── runtime.js                      ← Global config store
│   ├── resolved.js                     ← Config resolution
│   ├── tunables.js                     ← Live bindings
│   ├── dev.js                          ← Development logging
│   ├── defaults/                       ← Base config
│   └── presets/                        ← Named presets
│       ├── classic.js
│       └── temperate.js
├── layers/                              ← Generation layers
├── world/                               ← WorldModel (physics)
├── core/                                ← Architecture (MapContext, adapters)
├── story/                               ← Story tagging
└── base-standard/                       ← Local base game copies
```

---

## Common Pitfalls & Troubleshooting

### ⚠️ DO NOT Rename `map_orchestrator.js`

**Why**: All entry files import it:
```javascript
import "./map_orchestrator.js";  // Hardcoded path
```

**If you rename it**: All 3 entry files break, maps won't load.

**Solution**: Keep the name, or update all 3 entry files.

---

### ⚠️ Import Paths Must Be Relative

**Correct**:
```javascript
import { bootstrap } from "./bootstrap/entry.js";          // Entry file
import { LANDMASS_CFG } from "../bootstrap/tunables.js";  // Layer file
```

**Wrong**:
```javascript
import { bootstrap } from "/mod/maps/bootstrap/entry.js";  // Absolute (breaks)
```

---

### ⚠️ Call `rebind()` Before Using Tunables

**Correct**:
```javascript
function generateMap() {
    rebind();      // Refresh config first!
    WorldModel.init(); // Physics stack relies on this
}
```

**Wrong**:
```javascript
function generateMap() {
    // rebind() not called - using stale config!
    WorldModel.init();
}
```

---

### ⚠️ Config is Frozen (Intentional)

**Attempting to mutate** will fail silently or throw:
```javascript
const cfg = getConfig();
cfg.landmass.baseWaterPercent = 80;  // ❌ Frozen!
```

**Solution**: Set overrides in entry file instead:
```javascript
bootstrap({
    stageConfig: { foundation: true }, // include stageConfig for the intended recipe
    overrides: {
        landmass: { baseWaterPercent: 80 }
    }
});
```

---

## Adding a New Map Variant

1. **Create entry file**: `maps/epic-diverse-huge-desert.js`
   ```javascript
   import { bootstrap } from "./bootstrap/entry.js";
   bootstrap({
       presets: ["classic"],
       stageConfig: { foundation: true }, // include stageConfig for the intended recipe
       overrides: {
           climate: {
               baseline: { /* arid settings */ }
           }
       }
   });
   import "./map_orchestrator.js";
   ```

2. **Register in XML**: `config/config.xml`
   ```xml
   <Row
       File="{swooper-maps}mod/maps/epic-diverse-huge-desert.js"
       Name="LOC_MAP_EPIC_DIVERSE_HUGE_DESERT_NAME"
       Description="LOC_MAP_EPIC_DIVERSE_HUGE_DESERT_DESCRIPTION"
       SortIndex="503"
   />
   ```

3. **Add localization**: `text/en_us/MapText.xml`
   ```xml
   <Row>
       <Tag>LOC_MAP_EPIC_DIVERSE_HUGE_DESERT_NAME</Tag>
       <Text>Epic Diverse Huge (Desert)</Text>
   </Row>
   ```

That's it! No orchestrator changes needed.

---

## Performance Characteristics

- **Config resolution**: O(1) - happens once per `generateMap()` call
- **Preset merging**: O(N) where N = preset count (typically 1-2)
- **Live binding updates**: O(1) - simple variable assignments
- **Runtime overhead**: Negligible (<1ms per generation)

---

## Future Enhancements

Possible improvements without breaking existing code:

1. **Hot reload**: Listen for config changes during development
2. **Preset validation**: Type-check presets at load time
3. **Config inspector**: Debug tool to visualize merged config
4. **Async presets**: Load presets from external files (advanced)

---

## Summary

This architecture separates **what** (configuration) from **how** (generation logic), enabling:

- ✅ Multiple map variants without code duplication
- ✅ Clean dependency flow (no circular imports)
- ✅ Easy testing and iteration
- ✅ Maintainable preset system
- ✅ Zero performance overhead

The complexity is worth it - we get professional-grade configuration management with a tiny footprint.
