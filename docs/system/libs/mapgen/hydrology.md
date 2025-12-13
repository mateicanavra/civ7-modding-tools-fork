interface OceanArtifacts {
  /**
   * Vector field representing ocean current direction and intensity.
   * Derived from Wind + Coriolis + Coastline deflection.
   */
  currentVectors: Vector2[];

  /**
   * Sea Surface Temperature (Celsius).
   * Advected by currents; drives evaporation and coastal warming/cooling.
   */
  sst: Float32Array;

  /**
   * 0.0 - 1.0 fraction of sea ice coverage.
   * Derived from SST + Salinity.
   */
  seaIce: Float32Array;
}

interface ClimateArtifacts {
  /**
   * Vector field representing prevailing wind direction.
   * Used for rain shadows and sailing mechanics.
   */
  windVectors: Vector2[];

  /**
   * Surface Air Temperature (Celsius).
   * Derived from Latitude + Elevation + Albedo + Ocean influence.
   */
  temperatureMap: Float32Array;

  /**
   * Absolute moisture content (mm/year equivalent).
   * Before quantization into gameplay bands.
   */
  moistureMap: Float32Array;
}

interface HydrologyArtifacts {
  /**
   * The network of river segments and flow directions.
   */
  riverGraph: RiverGraph;

  /**
   * Mask identifying cells that are lakes (filled depressions).
   */
  lakeMask: Uint8Array;
}
```

### 2.3. Outputs (Mutable Fields)
*   `context.fields.rainfall`: Quantized integer levels (0-255) mapping to game concepts (Arid, Semi-Arid, Wet).
*   `context.fields.features`: Updates Ice features based on Cryosphere logic.

---

## 3. The Pipeline

The Hydrology phase is a coupled system simulation executed as a sequence of steps.

### 3.1. Step 1: Global Circulation (`hydrology.climate.circulation`)
**Goal:** Establish the planetary baseline.
*   **Logic:**
    *   **Insolation:** Calculate base temperature from Latitude and Axial Tilt.
    *   **Wind:** Generate Hadley/Ferrel/Polar cell wind vectors.
*   **Result:** Baseline `temperatureMap` and `windVectors`.

### 3.2. Step 2: Oceanography (`hydrology.ocean.simulate`)
**Goal:** Move heat around the oceans.
*   **Logic:**
    1.  **Basins:** Identify connected ocean regions.
    2.  **Currents:** Construct vector field: $V_{current} = w_1 V_{wind} + w_2 V_{gyre} + w_3 V_{coast}$.
    3.  **SST:** Advect temperature using the current field (warm water moves poleward, cold water moves equatorward).
    4.  **Ice:** Threshold SST to create `seaIce`.

### 3.3. Step 3: Regional Weather (`hydrology.climate.regional`)
**Goal:** Apply specific weather phenomena.
*   **Pattern:** **Strategy Pattern** (Swatches).
*   **Strategies:**
    *   `TradeWinds`: Moisture transport.
    *   `Monsoon`: Seasonal pressure-differential moisture.
    *   `Continental`: Inland drying effects.
*   **Result:** Modifies `moistureMap` and `windVectors`.

### 3.4. Step 4: Orographic Effect (`hydrology.climate.orographic`)
**Goal:** Simulate interaction between wind and terrain.
*   **Logic:**
    1.  Sample `windVectors`.
    2.  Check upwind neighbors for `elevation` > current cell.
    3.  **Windward:** Increase moisture (Adiabatic cooling).
    4.  **Leeward:** Decrease moisture (Rain Shadow).

### 3.5. Step 5: Cryosphere Feedback (`hydrology.cryosphere.feedback`)
**Goal:** Simulate the Ice-Albedo feedback loop.
*   **Logic:**
    1.  **Snow/Ice:** If `temperature` < Threshold, set Albedo high.
    2.  **Feedback:** Recalculate Temperature with new Albedo (1 iteration).
    3.  **Result:** Sharpens ice caps and allows for "Ice Age" tipping points.

### 3.6. Step 6: Surface Hydrology (`hydrology.surface.refine`)
**Goal:** Route water and define rivers.
*   **Logic:**
    1.  **Depression Filling:** Identify and fill local minima to form lakes.
    2.  **Flow Routing:** Calculate Steepest Descent for every cell.
    3.  **River Generation:** Accumulate flux; edges exceeding a threshold become Rivers.

---

## 4. Configuration

Controlled by the `hydrology` slice of `MapGenConfig`.

```typescript
interface HydrologyConfig {
  /** Planetary Physics */
  planet: {
    axialTilt: number; // Degrees
    solarConstant: number; // Base temperature scalar
  };

  /** Ocean settings */
  ocean: {
    currentStrength: number; // How much wind drives currents
    heatTransport: number; // How much currents move heat
    freezingPoint: number; // Temp at which sea ice forms
  };

  /** Climate tuning */
  climate: {
    moistureBias: number; // Global wet/dry slider
    rainShadowStrength: number;
    swatches: Array<WeatherSwatchConfig>;
  };
}
```
</file_content>