# SPEC: Target Architecture (Canonical)

## 3. Tag Registry (Artifacts, Buffers, Effects)

### 3.1 Registry invariants

- Each mod instantiates its own registry; tags are valid only if registered.
- Duplicate tag IDs and duplicate step IDs are hard errors.
- Unknown tag references in `requires`/`provides` are hard errors.
- Demo payloads are optional; if provided, they must validate.

### 3.2 Canonical dependency tag inventory (standard recipe)

Artifacts:
- `artifact:foundation.plates`
- `artifact:foundation.dynamics`
- `artifact:foundation.seed`
- `artifact:foundation.diagnostics`
- `artifact:foundation.config`
- `artifact:riverAdjacency`
- `artifact:placementInputs`
- `artifact:placementOutputs`

Notes:
- `artifact:foundation.diagnostics` is a debug-only artifact (a data product dependency), not a “diagnostics toggle plane”.
- Logging/observability is controlled via `RunRequest.settings.trace` and enforced through per-step trace scopes.

Buffers:
- `buffer:heightfield`
- `buffer:climateField`
- `buffer:terrainType`
- `buffer:elevation`
- `buffer:rainfall`
- `buffer:biomeId`
- `buffer:featureType`

Narrative story entries (published primitives):
- `artifact:narrative.motifs.<motifId>.stories.<storyId>@vN`
- Canonical motif IDs for the standard mod: `corridors`, `margins`, `hotspots`, `rifts`, `orogeny`
- Steps and consumers must gate on the **specific story IDs** they require; there is no published “view exists” dependency.

Effects:
- `effect:engine.landmassApplied`
- `effect:engine.coastlinesApplied`
- `effect:engine.riversModeled`
- `effect:engine.biomesApplied`
- `effect:engine.featuresApplied`
- `effect:engine.placementApplied`

---
