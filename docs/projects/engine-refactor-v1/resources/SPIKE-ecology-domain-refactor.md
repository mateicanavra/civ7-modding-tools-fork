# Spike: Ecology Domain Refactor — From Nudges to Ownership

**Date:** 2025-12-30
**Baseline:** `a791b983`
**Related:** M6 target architecture, SPIKE-earth-physics-systems-modeling.md

---

## Summary

Replace the current workaround-based ecology domain (7 nudge functions patching engine output) with an **owned biome classification model**. Compute biomes as a pure function of climate, apply narrative as a clean overlay, write to engine.

**Result:** ~400 lines replaces ~2100 lines. One file owns biome logic. Testable, deterministic, configurable.

---

## 1. Problem Statement

### Current Architecture

```
adapter.designateBiomes()     ← Black box assigns biomes
       ↓
7 nudge functions             ← Fix what engine got wrong
       ↓
adapter.setBiomeType()        ← Write corrections
```

### Issues

| Problem | Evidence |
|---------|----------|
| 15+ hardcoded thresholds | Scattered across 8 files |
| Inconsistent function signatures | 3+ param-passing styles |
| Unclear ownership | Who decides biomes — engine or us? |
| Non-narrative nudges compensate for weak model | 3 of 7 nudges fix climate→biome mapping |

### Value Distribution

- **Tundra/Tropical/River nudges** — Compensate for engine's climate model
- **Corridor/Rift nudges (4)** — Narrative integration (legitimate domain concern)

---

## 2. Target Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: computeBiome(climate) → BiomeId               │
│  Pure function. No adapter calls. Testable.             │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 2: applyNarrativeOverlay(biome, narratives)      │
│  Single function. Clear boundary.                       │
└─────────────────────────────────────────────────────────┘
                           ↓
┌─────────────────────────────────────────────────────────┐
│  Layer 3: adapter.setBiomeType(x, y, biome)             │
│  Engine as write-only sink.                             │
└─────────────────────────────────────────────────────────┘
```

**Principles:**
1. Climate model is source of truth
2. Biome classification is pure — deterministic, testable
3. Narrative is an overlay, not a cascade
4. Engine validates nothing; we own correctness

---

## 3. Design Decisions

### Q1: Does the engine reject biome assignments?

**Answer: No.** The engine's `setBiomeType` is a direct write. It does not validate against climate or terrain rules. We tested this empirically — you can set TROPICAL in polar regions and the engine accepts it.

**Implication:** We own correctness entirely. No `canAssignBiome` adapter method needed.

### Q2: Seasonal temperature variance?

**Answer: No.** Annual mean is sufficient for biome classification. Civ7 biomes are static per-map; they don't change seasonally during gameplay. Holdridge and Whittaker models use annual means. Edge cases (tundra with warm summers) are handled by the Gaussian temperature bands in scoring functions.

**Implication:** Keep the simple lapse-rate model. No seasonal complexity.

### Q3: Config exposure for scoring parameters?

**Answer: Threshold centers only.** Expose the "center" values (e.g., `tropicalLatMax: 20`, `desertAridityMin: 0.6`) in config. Keep steepness constants internal — they're implementation details that affect transition sharpness, not gameplay-meaningful knobs.

**Implication:** Config schema gets ~8 optional numeric fields. Sigmoid steepness stays hardcoded.

### Q4: Feature determinism?

**Answer: Yes, embrace it.** If biomes are deterministic from climate, features should be too (modulo RNG for density variation). This makes the entire ecology layer reproducible and testable. The current `canHaveFeature` validation becomes unnecessary — if our logic is correct, placements are valid by construction.

**Implication:** Features phase inherits the same "owned model" pattern. Defer to Phase 2.

---

## 4. Biome Classification Algorithm

### 4.1 Climate Derivation

**Inputs** (from artifacts):
- `latitude` — absolute, 0-90
- `elevation` — meters
- `rainfall` — 0-200 normalized
- `isCoastal` — boolean
- `riverAdjacent` — boolean

**Derived values:**

```typescript
// Temperature from latitude + lapse rate
function deriveTemperature(lat: number, elevation: number): number {
  const latFactor = Math.cos((lat * Math.PI) / 180);
  const baseTemp = -15 + 43 * latFactor; // -15°C polar, +28°C equator
  return baseTemp - (elevation / 1000) * 6.5;
}

// Aridity index (PET/rainfall proxy)
function deriveAridity(temp: number, rainfall: number): number {
  if (rainfall <= 0) return 1.0;
  const PET = 16 * Math.pow(Math.max(0, temp) / 5, 1.5) * 12;
  return Math.min(1.0, PET / (rainfall * 10));
}

// Moisture index with coastal/river bonuses
function deriveMoistureIndex(rainfall: number, isCoastal: boolean, riverAdjacent: boolean): number {
  let m = rainfall / 200;
  if (isCoastal) m += 0.1;
  if (riverAdjacent) m += 0.15;
  return Math.min(1.0, m);
}
```

### 4.2 Affinity Scoring

Each biome has a scoring function returning 0-1. Uses sigmoid curves for smooth transitions:

```typescript
function sigmoid(x: number, center: number, k: number): number {
  return 1 / (1 + Math.exp(-k * (x - center)));
}

function gaussian(x: number, center: number, width: number): number {
  return Math.exp(-Math.pow((x - center) / width, 2));
}
```

**Biome Scores:**

| Biome | Primary Drivers | Formula Sketch |
|-------|-----------------|----------------|
| SNOW | temp < -10, polar, alpine | `invSigmoid(temp, -10) + polarBonus + alpineBonus` |
| TUNDRA | temp -10..5, lat > 55 | `gaussian(temp, -2, 8) × latBonus × moisturePenalty` |
| DESERT | aridity > 0.6, moisture < 0.3 | `sigmoid(aridity, 0.6) × invSigmoid(moisture, 0.25)` |
| TROPICAL | temp > 22, moisture > 0.6, lat < 20 | `sigmoid(temp, 22) × sigmoid(moisture, 0.6) × invSigmoid(lat, 20)` |
| GRASSLAND | temp 5-20, moisture > 0.45 | `gaussian(temp, 12, 10) × sigmoid(moisture, 0.45)` |
| PLAINS | temp 0-25, moisture 0.2-0.5 | `gaussian(temp, 12, 15) × moistureBand × 0.7` |

**Selection:** Highest-scoring biome wins. PLAINS has 0.7 multiplier as fallback.

### 4.3 Configurable Thresholds

```typescript
interface BiomeThresholds {
  snowTempMax?: number;        // default: -10
  tundraTempCenter?: number;   // default: -2
  tundraLatMin?: number;       // default: 55
  desertAridityMin?: number;   // default: 0.6
  tropicalTempMin?: number;    // default: 22
  tropicalLatMax?: number;     // default: 20
  grasslandMoistureMin?: number; // default: 0.45
  plainsMoistureCenter?: number; // default: 0.35
}
```

---

## 5. Narrative Overlay

Single function, clear boundary:

```typescript
function applyNarrativeOverlay(
  baseBiome: BiomeId,
  climate: DerivedClimate,
  tile: { x: number; y: number },
  narratives: NarrativeContext,
  policy: NarrativePolicy,
  rng: RNG
): BiomeId {
  // Corridor preference
  if (narratives.isCorridorTile(tile)) {
    if (rng("ecology:corridor", 100) < policy.corridorStrength * 100) {
      if (climate.temperature > 0) return BiomeId.GRASSLAND;
    }
  }

  // Rift shoulder preference
  if (narratives.isRiftShoulder(tile)) {
    if (rng("ecology:rift", 100) < policy.riftStrength * 100) {
      if (climate.temperature > 20 && climate.moistureIndex > 0.5) {
        return BiomeId.TROPICAL;
      }
      if (climate.temperature > 5) return BiomeId.GRASSLAND;
    }
  }

  return baseBiome;
}
```

**Policy config:**
```typescript
interface NarrativePolicy {
  corridorStrength: number;  // 0-1, default 0.6
  riftStrength: number;      // 0-1, default 0.5
}
```

---

## 6. Implementation Plan

### Phase 1: Core Classification (1 issue)

**CIV-XX: Implement owned biome classification**

Create `domain/ecology/classification/` with:

| File | Contents |
|------|----------|
| `types.ts` | `TileClimate`, `DerivedClimate`, `BiomeId`, `BiomeThresholds` |
| `derive.ts` | `deriveTemperature`, `deriveAridity`, `deriveMoistureIndex` |
| `score.ts` | `scoreSnow`, `scoreTundra`, ... (6 functions) |
| `classify.ts` | `computeBiome(climate, thresholds): BiomeId` |
| `index.ts` | Public API export |

**Acceptance:**
- [x] Pure functions, no adapter dependencies
- [x] 100% unit test coverage on scoring edge cases
- [x] Mediterranean, Sahara, Himalayan examples pass

**Sub-issues:**

1. **CIV-XX-1: Climate derivation functions** (~50 lines)
   - `deriveTemperature`, `deriveAridity`, `deriveMoistureIndex`
   - Unit tests with known lat/elev/rain → expected values

2. **CIV-XX-2: Biome scoring functions** (~150 lines)
   - 6 `score*` functions using sigmoid/gaussian
   - Unit tests: each biome has 3+ test cases at ideal/edge/fail conditions

3. **CIV-XX-3: Classification orchestrator** (~50 lines)
   - `computeBiome` computes affinities, selects winner
   - Integration tests with full climate→biome mapping

---

### Phase 2: Narrative Overlay (1 issue)

**CIV-XX: Implement narrative overlay layer**

Create `domain/ecology/overlay.ts`:

| Function | Purpose |
|----------|---------|
| `applyNarrativeOverlay` | Single entry point for all narrative biome influence |

**Acceptance:**
- [x] Consolidates 4 current corridor/rift nudge functions
- [x] Respects climate gates (no grassland in frozen zones)
- [x] Uses typed RNG labels

**Dependencies:** Phase 1 complete, narrative artifact types stable.

---

### Phase 3: Integration (1 issue)

**CIV-XX: Wire owned classification into biomes step**

Modify `stages/ecology/steps/biomes.ts`:

| Change | Description |
|--------|-------------|
| Remove `adapter.designateBiomes()` call | No longer delegating to engine |
| Add tile loop calling `computeBiome` | Build biome field from climate |
| Add overlay call | Apply narrative after classification |
| Write via `adapter.setBiomeType()` | Engine as sink |

**Acceptance:**
- [x] No calls to `adapter.designateBiomes()`
- [x] Biome field populated from owned model
- [ ] Visual parity check: 10 maps compared to baseline (subjective, should look "right")

---

### Phase 4: Cleanup (1 issue)

**CIV-XX: Remove legacy nudge functions**

Delete from `domain/ecology/biomes/nudges/`:
- `tundra-restraint.ts`
- `tropical-coast.ts`
- `river-valley.ts`
- `corridor-bias.ts`
- `corridor-edge-hints.ts`
- `rift-shoulder.ts`

Update imports in `biomes/index.ts`.

**Acceptance:**
- [x] No nudge functions remain
- [x] `designateEnhancedBiomes` is replaced by new orchestrator
- [x] Tests pass, maps generate correctly

---

### Phase 5: Config Schema (1 issue)

**CIV-XX: Update ecology config schema**

Modify `config/schema/ecology.ts`:

| Change | Description |
|--------|-------------|
| Add `biomeThresholds` section | 8 optional numeric fields |
| Add `narrativePolicy` section | `corridorStrength`, `riftStrength` |
| Remove legacy nudge config | `tundra.latMin`, etc. → migrate to new structure |
| Fix ambiguous docs | "percent" not "0..1 fraction or percent" |

**Acceptance:**
- [x] All threshold config in one place
- [x] Clear documentation with defaults stated
- [x] Backward-compatible (old config keys ignored, not erroring)

---

## 7. Sequencing

```
Phase 1 ──────────────────────────────────────────────►
         [classification module, no integration]

                    Phase 2 ──────────────────────────►
                    [overlay, depends on P1 types]

                              Phase 3 ────────────────►
                              [integration, depends on P1+P2]

                                        Phase 4 ──────►
                                        [cleanup, after P3 validated]

                                              Phase 5 ─►
                                              [config, after P4]
```

**Parallelism:** P1 and P2 can run in parallel after types are defined. P3-P5 are sequential.

**Total scope:** 5 issues, ~600 lines added, ~1700 lines deleted, net -1100 lines.

---

## 8. Test Strategy

### Unit Tests (P1-P2)

| Test Suite | Coverage |
|------------|----------|
| `derive.test.ts` | Temperature, aridity, moisture derivation |
| `score.test.ts` | Each biome scorer with ideal/edge/fail cases |
| `classify.test.ts` | End-to-end climate→biome for canonical examples |
| `overlay.test.ts` | Narrative influence with mocked RNG |

### Integration Tests (P3)

| Test | Purpose |
|------|---------|
| Biome distribution histogram | Validate reasonable % of each biome type |
| Visual snapshot | Side-by-side with baseline map |
| Edge case tiles | Known coordinates that should be specific biomes |

### Regression Tests (P4-P5)

| Test | Purpose |
|------|---------|
| Config migration | Old config keys don't break loading |
| Map determinism | Same seed → same biome field |

---

## 9. Success Criteria

- [x] Single file (`classification/classify.ts`) owns biome logic
- [x] New contributor understands biome model in <5 minutes
- [x] All thresholds in one config section, not scattered
- [x] Narrative overlay clearly separated from physics
- [ ] Maps look plausible (visual review)
- [x] Net code reduction of ~1000 lines

---

## Appendix: Canonical Test Cases

| Name | Lat | Elev | Rain | Coastal | River | Expected |
|------|-----|------|------|---------|-------|----------|
| Mediterranean coast | 35 | 50 | 80 | true | false | GRASSLAND |
| Sahara interior | 25 | 400 | 15 | false | false | DESERT |
| Amazon basin | 5 | 100 | 180 | false | true | TROPICAL |
| Himalayan peak | 30 | 4500 | 60 | false | false | SNOW |
| Siberian plain | 65 | 200 | 50 | false | false | TUNDRA |
| Kansas prairie | 38 | 400 | 70 | false | false | PLAINS |
| English countryside | 52 | 100 | 120 | false | true | GRASSLAND |
| Gobi edge | 42 | 1000 | 25 | false | false | DESERT |
| Norwegian fjord | 62 | 50 | 140 | true | false | TUNDRA |
| Florida coast | 26 | 5 | 150 | true | false | TROPICAL |
