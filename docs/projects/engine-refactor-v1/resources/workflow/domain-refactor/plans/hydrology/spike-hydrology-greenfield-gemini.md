# SPIKE: Hydrology Domain Greenfield Model (Phase 0.5)

- Status: Phase 0.5 Output (Greenfield Proposal)
- Author: Gemini
- Date: 2026-01-16
- Scope: Hydrology Domain (Atmosphere, Surface Water, Cryosphere)
- Supersedes:
  - docs/system/libs/mapgen/hydrology.md (Legacy contract is too coarse)
- mods/mod-swooper-maps/src/domain/hydrology/climate/baseline.ts (Replaces static bands with dynamic circulation)

## 1. Executive Vision: The Living Water Cycle

The legacy Hydrology implementation relied on static latitude bands, noise-based rainfall, and unconnected "river" logic. This greenfield model proposes a fully coupled Earth Systems approach. Water is not just "placed"; it is transported.

In this model, Hydrology is the engine that converts Energy (Solar/Thermal) and Geography (Terrain/Ocean) into Life Support (Moisture/Freshwater). It does not approximate climate; it simulates the circulation of heat and moisture to produce emergent, gameplay-relevant microclimates.

### Core Philosophy

- **Emergence over Intervention:** We explicitly reject "Designer Placement" of climate zones. A desert exists because of high-pressure systems or rain shadows, never because a script painted "Desert" at a specific latitude. "Swatches" and "Paint" operations are forbidden.
- **Conservation of Mass:** Water evaporates, transports, precipitates, and flows. It does not appear magically via "wetness modifiers."
- **Causality Spine:** Energy $\to$ Atmospheric Circulation $\to$ Precipitation $\to$ Surface Flow $\to$ Soil Moisture $\to$ Biomes.
- **Deterministic Physics:** The pipeline is a solver. Given the same inputs (Terrain, Planet Parameters), it produces the exact same climate/river graph every time without arbitrary "dice rolls" for river starts.

## 2. Domain Architecture & Subdomains

Hydrology is a "Vertical Domain" containing three tightly coupled subdomains. While they are distinct logical units, they share the same graph topology (Voronoi) and data buffers.

### 2.1 Subdomain: Atmosphere (Climate & Circulation)

- Responsibility: The transport of heat and moisture.
- Energy Balance: Solar insolation (latitude + seasonal tilt) vs. Radiative cooling.
- Atmospheric Circulation:
  - Macro: Hadley, Ferrel, and Polar cells driven by thermal gradients.
  - Coriolis Effect: Deflection of winds (Trades, Westerlies) based on planetary rotation.
  - Jet Streams: Fast-moving upper-atmosphere currents guiding storm tracks.
- Moisture Transport:
  - Evaporation: From Ocean (SST-dependent) and Land (Evapotranspiration).
  - Advection: Moving moisture packets along wind vectors.
  - Orographic Lift: Terrain forcing air up -> cooling -> precipitation (Windward wet / Leeward dry).

### 2.2 Subdomain: Cryosphere (Ice & Snow)

- Responsibility: Phase transitions and long-term water storage.
- Thermodynamics: Freezing/thawing based on Surface Temperature.
- Albedo Feedback: Dynamic tracking of surface reflectivity (Snow/Ice = High, Ocean = Low) modifying the Energy Balance in the Atmosphere subdomain.
- Glaciation: Accumulation of snow into ice sheets; glacial flow (slow erosion/transport) if computationally viable, or static extent modeling.

### 2.3 Subdomain: Surface Water (Hydrology Proper)

- Responsibility: Liquid water movement and storage.
- Flow Routing: Steepest descent routing on the graph (D8/D-inf equivalent on Voronoi).
- Flux Accumulation: Summing precipitation + upstream flow + snowmelt.
- River Formation: Threshold-based channelization (Stream -> River -> Major River) with varying discharge.
- Lakes & Basins:
  - Exorheic (Open): Overflow to ocean.
  - Endorheic (Closed): Evaporation balances inflow (Salt Lakes/Seas).
  - Groundwater: Soil moisture saturation and aquifer recharge (buffer for vegetation).

## 3. The Physical Model (Simulation Mechanics)

### 3.1 The Atmospheric Circulation Model

Replaces static baseline.ts bands and swatches.

Instead of hardcoded rain bands or map-script overrides ("make this band dry"), we implement a Vector Field Simulation. The "Knobs" exposed to the user control the physics parameters, not the outcome.

Config Knobs (Planetary Parameters):
- PlanetRotationSpeed (controls Coriolis strength / cell width).
- GlobalTemperature (controls evaporation rates / Hadley cell extent).
- MoistureBudget (global water availability).

Mechanism:
- Pressure Field Initialization: High pressure at poles/30°, Low pressure at Equator/60°.
- Gradient Force: Air moves High -> Low.
- Coriolis Deflection: Apply rotational torque to vectors.
- Advection: Wind vectors transport scalar fields (Heat, Moisture).

Data Artifact: GlobalWindField (Vector2 per cell).

### 3.2 The Advection-Diffusion Rainfall Model

Replaces noise-based rainfall.

Rainfall is computed by solving a simplified transport equation on the graph:
```
Moisture_New = Moisture_Old + Evaporation - Precipitation + Advection(Wind) + Diffusion
```

Orographic Trigger:
```
Precipitation = Moisture * max(0, DeltaHeight * WindSpeed * LiftEfficiency)
```

This naturally generates wet coastal mountains and arid interior plateaus.

Data Artifact: PrecipitationMap (Scalar per cell).

### 3.3 The River Graph & Lake Solver

Refinement of current Planchon-Darboux implementation.

- Depression Filling: Identify sinks. Fill to spillover height to define Lake Domains.
- Flow Graph: Calculate connectivity.
- Variable Discharge: Rivers are not boolean lines. They carry a Discharge (m³/s) value derived from the Flux Accumulation step.
- Gameplay Impact: Allows distinguishing "Navigable Rivers" (High Discharge) from "Minor Rivers" (Low Discharge) dynamically.

## 4. Upstream & Downstream Integration

### 4.1 Upstream Dependencies (Inputs)

| Domain | Requirement | Greenfield Gap / Change Candidate |
| --- | --- | --- |
| Foundation | Tectonic Plate Vectors | Needed for mountain orientation (affects wind blocking). |
| Morphology | Heightmap (High Res) | Critical. Must allow negative elevations (bathymetry) for ocean depth/SST calculation. |
| Oceanography | Sea Surface Temp (SST) | Major Gap. We need Oceanography to provide currents/temps to drive evaporation rates. |
| Astronomy | Orbital Parameters | Axial tilt, Rotation direction (for Coriolis). |

### 4.2 Downstream Capabilities (Outputs)

| Domain | Product | Unlocked Capability |
| --- | --- | --- |
| Ecology | Effective Moisture (P-E) | Holdridge Life Zones. Replaces simple "Rainfall" for biome checks. Allows true "Cold Deserts" vs "Tundra". |
| Ecology | Soil Moisture | Support for Wetlands, Peat Bogs, and Aquifer resources. |
| Placement | River Discharge | Navigable Rivers. Logic becomes "If Discharge > X, Unit can Embark". |
| Narrative | Weather Patterns | Prevailing winds for "Age of Exploration" sailing speeds or volcanic fallout direction. |
| Visuals | Snowline / Ice | Dynamic seasonal snow cover (shader input) driven by Albedo/Temp. |

## 5. References & Authority

### Internal Sources (Influenced Proposal)

- SPIKE-earth-physics-systems-modeling.md: Primary source for the physics-based advection, orographic lift, and feedback loop concepts. (Sections 3 & 4 adopted).
- SPIKE-civ7-map-generation-features.md: Validated the need for "Navigable Rivers" and detailed "feature" interactions.

### Superseded Documents

- docs/system/libs/mapgen/hydrology.md: This document describes a "gameplay-oriented, not physical simulation" approach. This spike explicitly overrides that philosophy. We are doing a physical simulation (abstracted) because the gameplay richness depends on it.
- mods/mod-swooper-maps/src/domain/hydrology/climate/swatches/: The entire concept of "swatches" (manual climate overrides) is Rejected.

### External Concepts

- Holdridge Life Zones: Adopted as the target biome classification model.
- Navier-Stokes (Simplified): Using "Stable Fluids" concepts for wind/advection on the graph, purely as a transport mechanism.

## 6. Lookback 0.5 (Pre-work Analysis)

**Gap Analysis:**
The current system treats Climate as a "texture pass" to paint biomes, heavily reliant on "swatches" to force specific outcomes (e.g., "Shattered Ring must be dry"). The proposed system treats Climate as a dynamic engine.

**Key Decision:**
We define the "Climate" of a map strictly via Planetary Parameters (High-level knobs like aridity, temperature, age). These parameters compile down to physics constants (evaporation coefficients, Hadley cell widths). We do not allow direct manipulation of the result fields (e.g., "paint this tile wet"). The pipeline must be robust enough that valid geology + valid physics = valid gameplay.
