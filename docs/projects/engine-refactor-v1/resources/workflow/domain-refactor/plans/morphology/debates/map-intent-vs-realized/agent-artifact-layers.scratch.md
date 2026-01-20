# Debate Scratchpad — Option 1: Artifact Layers (Agent O1)

This scratchpad is owned by Agent O1.

## Position (Option 1)
Model `map.*` as **two parallel, immutable artifact namespaces**:
- **Intent layers**: what Gameplay *intends* to exist on the Civ7 map (adapter-agnostic, deterministic).
- **Realized layers**: what Gameplay can *guarantee* now exists in the engine after stamping + required postprocess, represented primarily in adapter-agnostic terms but optionally carrying opaque engine refs for debugging/traceability.

This preserves **one canonical path** (Truth → intent → stamp → realized) while giving downstream steps a stable contract for “has happened”, without “sometimes stamp directly” and without “we’ll delete later” shims.

Non-negotiables satisfied:
- No logic outside steps: projection, stamping, and readback live in step files.
- Artifacts immutable once published: each layer is a new publish; no “publish then mutate”.
- No conditional projection paths: every consumer depends on either `map.intents.*` or `map.realized.*`, never on hidden adapter state.
- Backfeeding ban: Physics never reads `map.*` (only Gameplay-owned steps do).
- Civ7 topology is fixed: `wrapX=true`, `wrapY=false`, no knobs.

---

## (1) Concrete Artifact Model

### Namespaces (exact)
Keep a **small fixed set** of `map.*` artifacts in two parallel namespaces:

**Intent**
- `artifact:map.intents.meta`
- `artifact:map.intents.raster`
- `artifact:map.intents.entities`

**Realized**
- `artifact:map.realized.meta`
- `artifact:map.realized.raster`
- `artifact:map.realized.entities`
- `artifact:map.realized.receipts`

Rationale:
- Avoids dynamic artifact IDs (“pass-1”, “pass-2”, …) that are awkward to author statically.
- Still supports layering by making each artifact carry ordered `layers[]`.
- Keeps “what exists” vs “what happened” explicit (`realized.*` vs `realized.receipts`).

### Shared foundational types (schema intent, not implementation)
All `map.*` artifacts should share:

**`MapTopology`**
- `width: number`
- `height: number`
- `wrapX: true` (constant)
- `wrapY: false` (constant)
- canonical tile index `i = y * width + x` and canonical coordinate `(x = i % width, y = floor(i/width))`

**`MapLayerRef`**
- `layerId: string` (stable per layer; deterministic, e.g. `${stageId}/${stepId}/${passId}`)
- `layerOrdinal: number` (explicit ordering)
- `inputs: Array<{ artifactId: string; digest?: string }>` (physics truth provenance by artifact ID)
- `intentDigest: string` (hash of canonicalized layer payload, after sorting/canonicalization)

### Intent artifacts (`artifact:map.intents.*`)
**Definition:** adapter-agnostic “what should be true”, expressed as stable semantic keys.

#### `artifact:map.intents.meta`
- `schemaVersion: 1`
- `topology: MapTopology`
- `recipeId: string`
- `runSeed: number` (or `{ baseSeed, salt }` if needed)
- `keyNamespace: "civ7"` (explicit; intent keys are Civ7-facing string IDs, not numeric engine values)
- `layers: Array<MapLayerRef>` (the canonical ordered list of layers that exist across raster + entities)

#### `artifact:map.intents.raster`
Tile surfaces in palette form (compact + deterministic):
- `layers: Array<{ ref: MapLayerRef; surfaces: RasterIntentSurfaces }>`

`RasterIntentSurfaces` is completeness-first (fixed schema), but each layer may omit surfaces it doesn’t touch (omitted => “no change” when folding):
- `terrain?: { palette: string[]; indexByTile: Uint16Array }`
- `features?: { palette: string[]; indexByTile: Uint16Array }` (single feature per tile; if Civ7 supports stacks, use fixed stack lanes)
- `biome?: { palette: string[]; indexByTile: Uint16Array }`
- `tags?: { palette: string[]; bitsetByTile: Uint32Array }` (bit positions are stable keys via palette)
- `regions?: { palette: string[]; indexByTile: Uint16Array }` (e.g., landmass regions `"WEST"|"EAST"|"NONE"`)
- `overlays?: { palette: string[]; indexByTile: Uint16Array }` (if overlays need engine visibility)

Folding semantics (canonical, deterministic):
- apply layers in `layerOrdinal` order
- within a surface, later layers override earlier assignments (no deletes)
- within a layer, all structures must be canonicalizable (sorted palettes; stable array iteration order) so `intentDigest` is stable

#### `artifact:map.intents.entities`
Entities capture “non-per-tile” intents with stable IDs:
- `layers: Array<{ ref: MapLayerRef; ops: MapEntityIntentOp[] }>`

`MapEntityIntentOp` (no deletes; only create/upsert):
- `opId: string` (stable; e.g., `${entityKind}/${entityKey}`)
- `entityKind: "naturalWonder" | "river" | "namedRegion" | "overlay" | "custom"` (extensible but explicit)
- `entityKey: string` (stable semantic key; never an engine ID)
- `placement`:
  - either `tiles: number[]` (tile indices, with wrapX semantics)
  - or `polyline: Array<{ x: number; y: number }>` (rivers, roads)
- `props: Record<string, unknown>` (typed per kind in the real schema)
- `applyOrder: number` (explicit ordering for deterministic stamping)

### Realized artifacts (`artifact:map.realized.*`)
**Definition:** adapter-informed “what we guarantee is true in-engine now”, i.e. the post-stamp state, captured as adapter-agnostic keys, plus receipts.

The key property: realized artifacts are **computed after stamping** (and required postprocess) *inside the stamping step*, either by:
- direct knowledge (tile writes are deterministic “set”), and/or
- explicit **readback** from `context.adapter` when the engine may normalize/fix values.

#### `artifact:map.realized.meta`
- `schemaVersion: 1`
- `topology: MapTopology`
- `fromIntentMetaDigest: string`
- `fromIntentLayerDigests: Array<{ layerId: string; intentDigest: string }>`
- `stampRunId: string` (stable for this run; e.g., hash of `(recipeId, runSeed, layer digests, adapter version)`)
- `adapter: { adapterId: string; adapterVersion?: string }`

#### `artifact:map.realized.raster`
Same shape as intent raster (palette + indices) but semantically “engine-validated”:
- `layers: Array<{ ref: MapLayerRef; realizedFromIntentDigest: string; surfaces: RasterRealizedSurfaces; divergences?: Divergence[] }>`

`RasterRealizedSurfaces` mirrors `RasterIntentSurfaces` but is *complete* at the layer boundary (because it is a state snapshot, not a delta):
- `terrain: { palette: string[]; indexByTile: Uint16Array }`
- `features: { palette: string[]; indexByTile: Uint16Array }`
- `biome: { palette: string[]; indexByTile: Uint16Array }`
- `tags: { palette: string[]; bitsetByTile: Uint32Array }`
- `regions: { palette: string[]; indexByTile: Uint16Array }`
- `overlays: { palette: string[]; indexByTile: Uint16Array }`

`Divergence` is the key “honesty mechanism” to prevent silent drift:
- `kind: "tileOverride" | "paletteRemap" | "engineFixup"`
- `surface: keyof RasterRealizedSurfaces`
- `tileIndex?: number`
- `expectedKey?: string`
- `realizedKey?: string`
- `reasonCode: "validateAndFixTerrain" | "coastlineExpansion" | "areaRecalc" | "unknown"`

Semantics:
- If the engine changes something we didn’t predict, we **record it**, and (Phase 2 lock-in) decide whether to fail hard or allowlisted normalize.

#### `artifact:map.realized.entities`
Like intent entities, but with:
- `realizedFromIntentDigest: string`
- `entities: Array<{ entityKind; entityKey; tiles/polyline; props; engineRef?: EngineRef }>`

`EngineRef` is strictly optional and opaque (discourages coupling):
- `{ namespace: "civ7"; kind: string; id: number | string }`

#### `artifact:map.realized.receipts`
Small, queryable execution guarantees (this is what downstream steps should depend on when they only care “did stamping happen?”):
- `stampRunId: string`
- `executedBy: { stageId: string; stepId: string }`
- `completed: true`
- `postprocess: { validateAndFixTerrain: boolean; recalculateAreas: boolean; stampContinents: boolean; ... }`
- `layerApplications: Array<{ layerId: string; intentDigest: string; applied: true }>`
- `invariantsChecked: Array<{ name: string; ok: boolean; detail?: string }>`

This is intentionally the “contract surface” for execution guarantees; downstream should not have to load huge rasters just to know stamping ran.

### What “realized” means (in one sentence)
“Realized” means: **the stamping step has executed the engine writes and required engine postprocess, and has produced an immutable snapshot/receipt that downstream steps can treat as authoritative for engine-facing map state, without re-reading the engine.**

Engine IDs are not the primary meaning; they are optional trace fields.

### Determinism + multi-pass stamping (idempotence posture)
**Determinism**
- Intent layers must be canonicalizable + hashed (`intentDigest`) so we can pin “this exact plan”.
- Realized layers must record `realizedFromIntentDigest` and should be stable under the same engine adapter version.
- Any divergence from intent is explicitly captured (and optionally allowlisted) so determinism failures are observable.

**Multi-pass stamping**
- A “pass” is modeled as an additional intent layer + a subsequent realized snapshot.
- “Pass ordering” is the `layerOrdinal` order; no implicit “sometimes we stamp early”.
- Realized snapshots are the boundaries downstream can depend on (e.g., after coastlines expansion).

**Idempotence**
- Raster stamping is inherently idempotent (tile set = overwrite).
- Entity stamping must be “upsert by `entityKey`” at the adapter boundary. If Civ7 cannot upsert directly, the adapter must maintain an internal `(entityKey → engineRef)` map during the run and/or return refs for subsequent updates (stored in realized entities).
- No “delete later”: intents should represent the desired final presence; overrides are permitted, deletions are not part of the model.

---

## (2) How Steps Use These Artifacts in a Braid

### Canonical braid pattern (single-pass example)
Within the Morphology phase, braid in a Gameplay-owned “map materialization” stage:

1) `step: project-map-intents`
   - reads: physics truth artifacts only (e.g., `artifact:morphology.topography`, `artifact:morphology.landmasses`, hydrology truths, etc.)
   - writes: `artifact:map.intents.meta`, `artifact:map.intents.raster`, `artifact:map.intents.entities`

2) `step: stamp-map-and-publish-realized`
   - reads: `artifact:map.intents.*`
   - stamps: via `context.adapter` (engine writes)
   - runs required postprocess in-step (e.g., validate/fix, area recalcs, continent stamping)
   - reads back engine state *only if needed* to stay honest about fixups
   - writes: `artifact:map.realized.*`

Downstream gameplay steps either:
- read `artifact:map.realized.receipts` when they only need “guarantee it happened”, or
- read `artifact:map.realized.raster/entities` when they need the effective state and want to remain engine-read-free.

Physics steps are prohibited from reading any `artifact:map.*` (backfeeding ban stays intact).

### Multi-pass example (explicit, still single canonical path)
If Civ7 requires a pass boundary (e.g., “terrain must be stamped + validated before features are stamped”):

Pass A:
1) `project-map-intents-terrain` → publishes intent layer `L1` (terrain, regions, tags)
2) `stamp-terrain-and-snapshot` → publishes realized snapshot `R1` (+ receipt)

Pass B:
3) `project-map-intents-features` → publishes intent layer `L2` (features, overlays, entities)
4) `stamp-features-and-snapshot` → publishes realized snapshot `R2` (+ receipt)

Key point: **even in multi-pass**, the structure is always “publish intent layer → stamp → publish realized snapshot/receipt”. No alternate paths; no “sometimes stamp directly”.

---

## (3) Risks / Failure Modes + Mitigations

### Risk: duplication + drift between intent and realized
Failure mode:
- Consumers treat intent as “truth”, but engine postprocess changes the map; downstream becomes inconsistent unless it reads the engine.

Mitigations:
- Make the “use realized” rule explicit: anything that depends on engine-normalized map state must read `map.realized.*`.
- Require realized snapshots to include `divergences[]` and/or fail hard on unknown fixups (Phase 2 policy).
- Pin `fromIntentDigest` + adapter version; drift becomes diagnosable and testable.

### Risk: engine coupling leakage via realized artifacts
Failure mode:
- People start depending on engine numeric IDs embedded in realized, reintroducing coupling.

Mitigations:
- Keep realized surfaces adapter-agnostic (stable string keys) as the primary state.
- Allow engine refs only as optional opaque `engineRef` objects, and never for raster surfaces.
- Keep “execution guarantee” in `artifact:map.realized.receipts` so most steps never touch heavy realized state.

### Risk: artifact bloat / performance (tile surfaces are big)
Failure mode:
- Realized requires readback of multiple tile layers, producing heavy artifacts.

Mitigations:
- Palette + typed-array indices rather than string-per-tile.
- Snapshot only the surfaces that the engine can mutate (e.g., terrain after `validateAndFixTerrain`, area/continent IDs after recalcs), not necessarily every surface.
  - Note: this suggests splitting `map.realized.raster` into multiple sub-artifacts if needed later, but the fixed set above is a “Phase 2 lock” decision.

### Risk: unclear “what counts as stamped”
Failure mode:
- “stamping done” becomes ambiguous: were postprocess calls executed? were all layers applied?

Mitigations:
- `artifact:map.realized.receipts` is the authoritative definition:
  - which layers were applied,
  - which postprocess steps ran,
  - which invariants were checked (e.g., “areas recalculated”, “continents stamped”).

### Risk: multi-pass order bugs (implicit dependencies)
Failure mode:
- Pass ordering becomes an implicit convention rather than a contract; later refactors silently reorder and break invariants.

Mitigations:
- Encode `layerOrdinal` and required boundaries in the receipt/invariants.
- Phase 2 must lock the braid order and the required pass boundaries (see recommendation).

---

## (4) Recommendation (crisp)

### Recommend: **Accept Option 1**, but only as “intent + realized snapshot + receipt”
I accept this option because it’s the only one that cleanly handles the hard case:
- engine postprocess (validation/area/continent stamping) can legitimately mutate the map relative to intent,
- we want downstream to be deterministic without re-reading the engine,
- and we need an explicit “execution guarantee” surface without conditional paths.

However, it must be constrained to avoid turning realized into an engine-coupled dumping ground.

### Phase 2 lock-ins required if we accept
1) **Authoritative meaning of realized**: realized is a post-stamp snapshot/receipt, computed in-step, and is the only “stamping happened” contract.
2) **Key encoding policy**: intent + realized state use stable string keys (Civ7-facing IDs), not engine numeric IDs; engine IDs are optional opaque refs only.
3) **Pass boundaries + ordering**: the canonical braid (which passes exist, their order, and which postprocess calls are required at each boundary) is part of the Phase 2 contract.
4) **Idempotence contract at the adapter**: entity stamping must be upsert-by-key (or equivalent); raster stamping is overwrite-by-tile.
5) **Divergence policy**: what engine fixups are allowlisted vs hard-fail, and how divergences are recorded.
6) **Backfeeding enforcement**: Physics domains must have lint/guards preventing reads of any `artifact:map.*`.
