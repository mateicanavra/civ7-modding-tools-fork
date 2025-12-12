# Climate & Hydrology Stage Architecture

## 1. Overview

The **Climate & Hydrology Stage** follows the Foundation and Morphology phases. Its responsibility is to simulate the atmospheric and hydrological processes that determine the habitability of the map.

This stage transforms the physical board (Elevation, Landmasses) into a living world by calculating **Wind**, **Moisture**, **Rainfall**, and **Drainage**.

### Core Responsibilities
1.  **Atmospheric Circulation:** Establish global baseline moisture and temperature based on latitude and planetary physics (Hadley cells).
2.  **Regional Weather:** Apply localized weather systems (Monsoons, Trade Winds) via configurable "Swatches".
3.  **Orographic Physics:** Simulate the interaction between wind and terrain to create rain shadows and moisture gradients.
4.  **Hydrology:** Route water downhill to form rivers, lakes, and erosion patterns.

---

## 2. Data Model

The Climate stage operates on the shared `MapGenContext`. It consumes the geometry produced by the Foundation stage and produces both final gameplay data and intermediate physical artifacts.

### 2.1. Inputs (Read-Only)
*   `context.dimensions`: Map size and wrapping rules.
*   `context.fields.elevation`: The height map (crucial for wind blocking).
*   `context.fields.terrain`: Land vs. Water masks.
*   `context.artifacts.mesh`: The underlying Voronoi geometry.

### 2.2. Artifacts (`context.artifacts.climate`)
Intermediate physical data used to calculate the final rainfall. These are preserved to allow future gameplay systems (e.g., sailing mechanics) to access realistic wind data.

```typescript
interface ClimateArtifacts {
  /**
   * Vector field representing prevailing wind direction and intensity.
   * Used for rain shadows and potentially sailing speed modifiers.
   */
  windVectors: Vector2[];

  /**
   * 0.0 - 1.0 floating point map of absolute moisture before quantization.
   * Allows for smooth blending and erosion calculations.
   */
  moistureMap: Float32Array;

  /**
   * Tracks which weather systems applied moisture to which cells.
   * Useful for debugging "Why is this desert here?".
   */
  debugLog?: { cellIndex: number; source: string; amount: number }[];
}
```

### 2.3. Outputs (Mutable Fields)
*   `context.fields.rainfall`: Quantized integer levels (0-255) mapping to game concepts (Arid, Semi-Arid, Wet, etc.).
*   `context.artifacts.riverGraph`: The network of river segments and flow directions.

---

## 3. The Pipeline

The Hydrology phase is composed of a sequence of atomic **MapGenSteps**.

### 3.1. Step 1: Global Circulation (`hydrology.climate.circulation`)
**Goal:** Establish the planetary baseline.

*   **Logic:** Applies moisture based on latitude bands (Equator = Wet, Horse Latitudes = Dry).
*   **Physics:** Simulates simplified Hadley, Ferrel, and Polar cells.
*   **Result:** A base `moistureMap` derived purely from geography.

### 3.2. Step 2: Regional Weather (`hydrology.climate.regional`)
**Goal:** Apply specific weather phenomena defined by the map script.

*   **Pattern:** **Strategy Pattern**. This step iterates over configured "Swatches" and delegates to specific `WeatherSystem` implementations.
*   **Strategies:**
    *   `TradeWinds`: Directional moisture transport.
    *   `Monsoon`: Seasonal pressure-differential moisture.
    *   `Continental`: Inland drying effects.
*   **Result:** Modifications to `moistureMap` and `windVectors`.

### 3.3. Step 3: Orographic Effect (`hydrology.climate.orographic`)
**Goal:** Simulate interaction between wind and terrain.

*   **Logic:**
    1.  Sample `windVectors` at each cell.
    2.  Check upwind neighbors for `elevation` > current cell.
    3.  **Windward Side:** Increase moisture (adiabatic cooling).
    4.  **Leeward Side:** Decrease moisture (rain shadow).
*   **Result:** Sharp transitions in rainfall around mountain ranges.

### 3.4. Step 4: Hydrological Refinement (`hydrology.refinement`)
**Goal:** Route water and define surface features.

*   **Logic:**
    1.  **Basin Filling:** Identify local minima (depressions) and fill them to form lakes.
    2.  **Flow Routing:** Calculate flow direction for every cell towards the ocean or a lake.
    3.  **River Generation:** Accumulate flow; edges exceeding a threshold become Rivers.
    4.  **Erosion:** (Optional) Slightly modify elevation based on river flow.
*   **Result:** `riverGraph` and final `rainfall` quantization.

---

## 4. Physics & Logic Modules

To maintain testability and separation of concerns, the "heavy lifting" math is decoupled from the Steps and resides in pure stateless function libraries.

### 4.1. Meteorology (`libs/physics/meteorology.ts`)
Pure functions for atmospheric calculations.
*   `calculateAdiabaticLapse(wind, slope, moisture)`
*   `getLatitudeMoisture(lat, config)`

### 4.2. Fluid Dynamics (`libs/physics/fluid.ts`)
Algorithms for flow and distance fields.
*   `calculateFlowMap(elevation, mesh)`
*   `fillDepressions(elevation)`

---

## 5. Configuration

The Climate stage is controlled by the `climate` slice of `MapGenConfig`.

```typescript
interface ClimateConfig {
  /** Global tuning */
  moisture: {
    globalModifier: number; // -1.0 to 1.0
    poleToEquatorGradient: Curve;
  };

  /** The list of active weather systems */
  swatches: Array<{
    type: 'trade_winds' | 'monsoon' | 'blob';
    region: RegionSelector; // e.g., "Northern Hemisphere", "Tropics"
    intensity: number;
    direction?: Vector2;
  }>;

  /** Physics constants */
  orographic: {
    upliftFactor: number; // How much rain mountains cause
    shadowFactor: number; // How dry the other side gets
  };
}
```

---

## 6. RFC: Implementation Plan & Architecture Updates

> **Note:** This section outlines the transition from the legacy `climate-engine.ts` to the target architecture described above.

### 6.1. Proposed Changes to `MapGenContext`
We need to formalize the `climate` artifact container in the core types.

*   **Action:** Update `packages/mapgen-core/src/core/types.ts`.
*   **Change:** Add `climate: ClimateArtifacts` to the `MapGenContext.artifacts` interface.
*   **Rationale:** Allows decoupling steps. The "Wind" step produces vectors, the "Rain" step consumes them. Future mods (Sailing) can read them.

### 6.2. Refactoring `climate-engine.ts`
The current file is a monolithic transaction script. It should be exploded into:

1.  **`src/steps/hydrology/`**:
    *   `GlobalCirculationStep.ts`
    *   `RegionalWeatherStep.ts` (The Swatch iterator)
    *   `OrographicStep.ts`
    *   `HydrologyStep.ts`
2.  **`src/steps/hydrology/systems/`**:
    *   `WeatherSystem.ts` (Interface)
    *   `TradeWindsSystem.ts`
    *   `MonsoonSystem.ts`
3.  **`src/physics/`**:
    *   `meteorology.ts` (Extracted math from `climate-engine.ts`)

### 6.3. Strategy Pattern for Swatches
Currently, swatches are handled via a massive switch statement.
*   **Proposal:** Introduce a `WeatherSystemRegistry` (similar to `StepRegistry`) or a simple Factory pattern.
*   **Benefit:** Mods can register new weather types (e.g., "El Niño", "Magic Storm") without editing the core loop.

### 6.4. Visualization
*   **Proposal:** Add a debug flag to render `windVectors` as ASCII arrows in the CLI output, similar to the existing map visualizations.