var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// ../../packages/mapgen-core/dist/chunk-S2LUEUIL.js
var GLOBAL_KEY = "__EPIC_MAP_CONFIG__";
var EMPTY_FROZEN_OBJECT = Object.freeze({});
var _localStore = EMPTY_FROZEN_OBJECT;
function isObject(v) {
  return v != null && typeof v === "object";
}
function shallowFreeze(obj) {
  try {
    return Object.freeze(obj);
  } catch {
    return obj;
  }
}
function setConfig(config) {
  const obj = isObject(config) ? config : {};
  const frozen = shallowFreeze(obj);
  try {
    globalThis[GLOBAL_KEY] = frozen;
  } catch {
    _localStore = frozen;
  }
}
function getConfig() {
  try {
    const v = globalThis[GLOBAL_KEY];
    return isObject(v) ? v : EMPTY_FROZEN_OBJECT;
  } catch {
    return isObject(_localStore) ? _localStore : EMPTY_FROZEN_OBJECT;
  }
}
var _cache = null;
var EMPTY_OBJECT = Object.freeze({});
var EMPTY_STAGE_MANIFEST = Object.freeze({
  order: [],
  stages: {}
});
var DEFAULT_TOGGLES = Object.freeze({
  STORY_ENABLE_HOTSPOTS: true,
  STORY_ENABLE_RIFTS: true,
  STORY_ENABLE_OROGENY: true,
  STORY_ENABLE_SWATCHES: true,
  STORY_ENABLE_PALEO: true,
  STORY_ENABLE_CORRIDORS: true
});
var DEFAULT_LANDMASS = Object.freeze({
  baseWaterPercent: 60
});
var DEFAULT_FOUNDATION = Object.freeze({});
var DEFAULT_PLATES = Object.freeze({
  count: 8,
  relaxationSteps: 5,
  convergenceMix: 0.5,
  plateRotationMultiple: 1,
  seedMode: "engine"
});
var DEFAULT_DYNAMICS = Object.freeze({
  mantle: Object.freeze({ bumps: 4, amplitude: 0.6, scale: 0.4 }),
  wind: Object.freeze({ jetStreaks: 3, jetStrength: 1, variance: 0.6 })
});
var DEFAULT_DIRECTIONALITY = Object.freeze({
  cohesion: 0
});
var DEFAULT_CLIMATE = Object.freeze({});
function safeFreeze(obj) {
  if (!obj || typeof obj !== "object") {
    return EMPTY_OBJECT;
  }
  if (Object.isFrozen(obj)) {
    return obj;
  }
  return Object.freeze({ ...obj });
}
function deepMerge(base, override) {
  if (!override || typeof override !== "object") {
    return safeFreeze(base);
  }
  const result = { ...base };
  for (const key of Object.keys(override)) {
    const baseVal = base[key];
    const overrideVal = override[key];
    if (baseVal && typeof baseVal === "object" && !Array.isArray(baseVal) && overrideVal && typeof overrideVal === "object" && !Array.isArray(overrideVal)) {
      result[key] = deepMerge(baseVal, overrideVal);
    } else if (overrideVal !== void 0) {
      result[key] = overrideVal;
    }
  }
  return Object.freeze(result);
}
function buildTunablesSnapshot() {
  const config = getConfig();
  const togglesConfig = config.toggles || {};
  const toggleValue = (key, fallback) => {
    const val = togglesConfig[key];
    return typeof val === "boolean" ? val : fallback;
  };
  const foundationConfig = config.foundation || {};
  const platesConfig = deepMerge(DEFAULT_PLATES, foundationConfig.plates);
  const dynamicsConfig = deepMerge(DEFAULT_DYNAMICS, foundationConfig.dynamics);
  const directionalityConfig = deepMerge(
    DEFAULT_DIRECTIONALITY,
    dynamicsConfig.directionality || foundationConfig.dynamics?.directionality
  );
  const manifestConfig = config.stageManifest || {};
  const stageManifest = Object.freeze({
    order: manifestConfig.order || [],
    stages: manifestConfig.stages || {}
  });
  return {
    STAGE_MANIFEST: stageManifest,
    STORY_ENABLE_HOTSPOTS: toggleValue("STORY_ENABLE_HOTSPOTS", true),
    STORY_ENABLE_RIFTS: toggleValue("STORY_ENABLE_RIFTS", true),
    STORY_ENABLE_OROGENY: toggleValue("STORY_ENABLE_OROGENY", true),
    STORY_ENABLE_SWATCHES: toggleValue("STORY_ENABLE_SWATCHES", true),
    STORY_ENABLE_PALEO: toggleValue("STORY_ENABLE_PALEO", true),
    STORY_ENABLE_CORRIDORS: toggleValue("STORY_ENABLE_CORRIDORS", true),
    LANDMASS_CFG: deepMerge(DEFAULT_LANDMASS, config.landmass),
    FOUNDATION_CFG: safeFreeze(foundationConfig),
    FOUNDATION_PLATES: platesConfig,
    FOUNDATION_DYNAMICS: dynamicsConfig,
    FOUNDATION_DIRECTIONALITY: directionalityConfig,
    CLIMATE_CFG: deepMerge(DEFAULT_CLIMATE, config.climate)
  };
}
function getTunables() {
  if (_cache) return _cache;
  _cache = buildTunablesSnapshot();
  return _cache;
}
function resetTunables() {
  _cache = null;
}
function rebind() {
  resetTunables();
  getTunables();
}
function stageEnabled(stage) {
  const tunables = getTunables();
  const stages = tunables.STAGE_MANIFEST.stages || {};
  const entry = stages[stage];
  return !!(entry && entry.enabled !== false);
}

// ../../packages/mapgen-core/dist/chunk-HODRDV2O.js
function isObject2(v) {
  return v != null && typeof v === "object" && (Object.getPrototypeOf(v) === Object.prototype || Object.getPrototypeOf(v) === null);
}
function clone(v) {
  if (Array.isArray(v)) return v.slice();
  if (isObject2(v)) {
    const o = {};
    for (const k of Object.keys(v)) o[k] = v[k];
    return o;
  }
  return v;
}
function deepMerge2(base, src) {
  if (!src || !isObject2(src)) return clone(base);
  if (!isObject2(base)) return clone(src);
  const out = {};
  for (const k of Object.keys(base)) out[k] = clone(base[k]);
  for (const k of Object.keys(src)) {
    const b = out[k];
    const s = src[k];
    if (isObject2(b) && isObject2(s)) {
      out[k] = deepMerge2(b, s);
    } else {
      out[k] = clone(s);
    }
  }
  return out;
}
function bootstrap(options = {}) {
  const presets = Array.isArray(options.presets) && options.presets.length > 0 ? options.presets.filter((n) => typeof n === "string") : void 0;
  const overrides = options && typeof options === "object" && options.overrides ? clone(options.overrides) : void 0;
  const stageConfig = options && typeof options === "object" && options.stageConfig ? clone(options.stageConfig) : void 0;
  const cfg = {};
  if (presets) cfg.presets = presets;
  if (stageConfig) cfg.stageConfig = stageConfig;
  if (overrides) {
    Object.assign(cfg, deepMerge2(cfg, overrides));
  }
  setConfig(cfg);
  rebind();
}

// ../../packages/mapgen-core/dist/chunk-F3UBWB2Z.js
var BOUNDARY_TYPE = {
  none: 0,
  convergent: 1,
  divergent: 2,
  transform: 3
};
function safeTimestamp() {
  try {
    return typeof Date?.now === "function" ? Date.now() : null;
  } catch {
    return null;
  }
}
function freezeRngState(state) {
  if (!state || typeof state !== "object") return null;
  const clone2 = {};
  for (const key of Object.keys(state)) {
    clone2[key] = state[key];
  }
  return Object.freeze(clone2);
}
function normalizeSeedConfig(config) {
  const cfg = config || {};
  const wantsFixed = cfg.seedMode === "fixed";
  const hasFixed = wantsFixed && Number.isFinite(cfg.fixedSeed);
  const seedMode = hasFixed ? "fixed" : "engine";
  const fixedSeed = hasFixed ? Math.trunc(cfg.fixedSeed) : null;
  const seedOffset = Number.isFinite(cfg.seedOffset) ? Math.trunc(cfg.seedOffset) : 0;
  return { seedMode, fixedSeed, seedOffset };
}
function getRandomImpl() {
  try {
    const global = globalThis;
    if (global.RandomImpl && typeof global.RandomImpl === "object") {
      return global.RandomImpl;
    }
  } catch {
  }
  return null;
}
function applySeedControl(seedMode, fixedSeed, seedOffset) {
  const RandomImpl = getRandomImpl();
  if (!RandomImpl || typeof RandomImpl.getState !== "function" || typeof RandomImpl.setState !== "function") {
    return { restore: null, seed: null, rngState: null };
  }
  let originalState = null;
  try {
    originalState = RandomImpl.getState();
  } catch {
    originalState = null;
  }
  if (!originalState || typeof originalState !== "object") {
    return { restore: null, seed: null, rngState: null };
  }
  const hasFixed = seedMode === "fixed" && Number.isFinite(fixedSeed);
  const offsetValue = Number.isFinite(seedOffset) ? Math.trunc(seedOffset) : 0;
  let seedValue = null;
  if (hasFixed) {
    seedValue = Math.trunc(fixedSeed);
  } else {
    const base = originalState.state;
    if (typeof base === "bigint") {
      seedValue = Number(base & 0xffffffffn);
    } else if (typeof base === "number") {
      seedValue = base >>> 0;
    }
  }
  if (seedValue == null) {
    const restore2 = () => {
      try {
        RandomImpl.setState(originalState);
      } catch {
      }
    };
    return { restore: restore2, seed: null, rngState: freezeRngState(originalState) };
  }
  seedValue = offsetValue ? seedValue + offsetValue >>> 0 : seedValue >>> 0;
  let appliedState = null;
  try {
    if (typeof RandomImpl.seed === "function") {
      RandomImpl.seed(seedValue >>> 0);
      appliedState = RandomImpl.getState?.() ?? null;
    } else {
      const nextState = { ...originalState };
      if (typeof nextState.state === "bigint") {
        nextState.state = BigInt(seedValue >>> 0);
      } else {
        nextState.state = seedValue >>> 0;
      }
      RandomImpl.setState(nextState);
      appliedState = nextState;
    }
  } catch {
    appliedState = null;
  }
  const restore = () => {
    try {
      RandomImpl.setState(originalState);
    } catch {
    }
  };
  return { restore, seed: seedValue >>> 0, rngState: freezeRngState(appliedState) };
}
function normalizeSites(sites) {
  if (!Array.isArray(sites) || sites.length === 0) return null;
  const frozen = sites.map((site, index) => {
    if (site && typeof site === "object") {
      const id = site.id ?? index;
      const x = site.x ?? 0;
      const y = site.y ?? 0;
      return Object.freeze({ id, x, y });
    }
    return Object.freeze({ id: index, x: 0, y: 0 });
  });
  return Object.freeze(frozen);
}
var PlateSeedManager = {
  capture(width, height, config) {
    const seedCfg = normalizeSeedConfig(config);
    const timestamp = safeTimestamp();
    const control = applySeedControl(seedCfg.seedMode, seedCfg.fixedSeed, seedCfg.seedOffset);
    const snapshot = {
      width,
      height,
      seedMode: seedCfg.seedMode,
      seedOffset: seedCfg.seedOffset
    };
    if (seedCfg.fixedSeed != null) snapshot.fixedSeed = seedCfg.fixedSeed;
    if (timestamp != null) snapshot.timestamp = timestamp;
    if (control.seed != null) snapshot.seed = control.seed;
    if (control.rngState) snapshot.rngState = control.rngState;
    return {
      snapshot: Object.freeze(snapshot),
      restore: typeof control.restore === "function" ? control.restore : null
    };
  },
  finalize(baseSnapshot, extras = {}) {
    if (!baseSnapshot || typeof baseSnapshot !== "object") return null;
    const { config = null, meta = null } = extras;
    const result = {
      width: baseSnapshot.width,
      height: baseSnapshot.height,
      seedMode: baseSnapshot.seedMode
    };
    if (baseSnapshot.timestamp != null) result.timestamp = baseSnapshot.timestamp;
    if (baseSnapshot.seedOffset != null) result.seedOffset = baseSnapshot.seedOffset;
    if (baseSnapshot.seed != null) result.seed = baseSnapshot.seed;
    if (baseSnapshot.fixedSeed != null) result.fixedSeed = baseSnapshot.fixedSeed;
    if (baseSnapshot.rngState) result.rngState = baseSnapshot.rngState;
    if (config && typeof config === "object") {
      result.config = Object.freeze({ ...config });
    }
    const seeds = Array.isArray(meta?.seedLocations) ? meta.seedLocations : Array.isArray(meta?.sites) ? meta.sites : null;
    const normalizedSites = normalizeSites(seeds);
    if (normalizedSites) {
      result.seedLocations = normalizedSites;
      result.sites = normalizedSites;
    }
    return Object.freeze(result);
  }
};
var DefaultVoronoiUtils = {
  createRandomSites(count, width, height) {
    const sites = [];
    for (let id = 0; id < count; id++) {
      const seed1 = id * 1664525 + 1013904223 >>> 0;
      const seed2 = seed1 * 1664525 + 1013904223 >>> 0;
      const x = seed1 % 1e4 / 1e4 * width;
      const y = seed2 % 1e4 / 1e4 * height;
      sites.push({
        x,
        y,
        voronoiId: id
      });
    }
    return sites;
  },
  computeVoronoi(sites, bbox, relaxationSteps = 0) {
    let currentSites = [...sites];
    for (let step = 0; step < relaxationSteps; step++) {
      currentSites = currentSites.map((site, i) => ({
        ...site,
        voronoiId: i
      }));
    }
    const cells = currentSites.map((site) => ({
      site,
      halfedges: []
      // Simplified - not computing actual edges
    }));
    return {
      cells,
      edges: [],
      vertices: []
    };
  },
  calculateCellArea(cell) {
    return 100;
  },
  normalize(v) {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    if (len < 1e-10) return { x: 0, y: 0 };
    return { x: v.x / len, y: v.y / len };
  }
};
function createPlateRegion(name, id, type, maxArea, color, rng) {
  const angle = rng(360, "PlateAngle") * Math.PI / 180;
  const speed = 0.5 + rng(100, "PlateSpeed") / 200;
  return {
    name,
    id,
    type,
    maxArea,
    color,
    seedLocation: { x: 0, y: 0 },
    m_movement: {
      x: Math.cos(angle) * speed,
      y: Math.sin(angle) * speed
    },
    m_rotation: (rng(60, "PlateRotation") - 30) * 0.1
    // -3 to +3 degrees
  };
}
function toByte(f) {
  return Math.max(0, Math.min(255, Math.round(f * 255))) | 0;
}
function clampInt8(v) {
  return Math.max(-127, Math.min(127, v)) | 0;
}
function dot2(a, b) {
  return a.x * b.x + a.y * b.y;
}
function dot2_90(a, b) {
  return -a.y * b.x + a.x * b.y;
}
function rotate2(v, angleRad) {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  return {
    x: v.x * cos - v.y * sin,
    y: v.x * sin + v.y * cos
  };
}
function getHexNeighbors(x, y, width, height) {
  const neighbors = [];
  const isOddCol = (x & 1) === 1;
  const offsets = isOddCol ? [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, 1],
    [1, 1]
  ] : [
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-1, -1],
    [1, -1]
  ];
  for (const [dx, dy] of offsets) {
    const nx = x + dx;
    const ny = y + dy;
    const wrappedX = (nx % width + width) % width;
    if (ny >= 0 && ny < height) {
      neighbors.push({ x: wrappedX, y: ny, i: ny * width + wrappedX });
    }
  }
  return neighbors;
}
function detectBoundaryTiles(plateId, width, height) {
  const size = width * height;
  const isBoundary = new Uint8Array(size);
  const neighborPlates = new Int16Array(size);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const myPlate = plateId[i];
      neighborPlates[i] = -1;
      const neighbors = getHexNeighbors(x, y, width, height);
      for (const n of neighbors) {
        const otherPlate = plateId[n.i];
        if (otherPlate !== myPlate) {
          isBoundary[i] = 1;
          neighborPlates[i] = otherPlate;
          break;
        }
      }
    }
  }
  return { isBoundary, neighborPlates };
}
function computeDistanceField(isBoundary, width, height, maxDistance = 20) {
  const size = width * height;
  const distance = new Uint8Array(size);
  distance.fill(255);
  const queue = [];
  for (let i = 0; i < size; i++) {
    if (isBoundary[i]) {
      distance[i] = 0;
      queue.push(i);
    }
  }
  let head = 0;
  while (head < queue.length) {
    const i = queue[head++];
    const d = distance[i];
    if (d >= maxDistance) continue;
    const x = i % width;
    const y = Math.floor(i / width);
    const neighbors = getHexNeighbors(x, y, width, height);
    for (const n of neighbors) {
      if (distance[n.i] > d + 1) {
        distance[n.i] = d + 1;
        queue.push(n.i);
      }
    }
  }
  return distance;
}
function calculatePlateMovement(plate, pos, rotationMultiple) {
  if (!plate || !plate.seedLocation) {
    return { x: 0, y: 0 };
  }
  const relPos = {
    x: pos.x - plate.seedLocation.x,
    y: pos.y - plate.seedLocation.y
  };
  const angularMovement = plate.m_rotation * Math.PI / 180 * rotationMultiple;
  const rotatedPos = rotate2(relPos, angularMovement);
  const rotationMovement = {
    x: relPos.x - rotatedPos.x,
    y: relPos.y - rotatedPos.y
  };
  return {
    x: rotationMovement.x + plate.m_movement.x,
    y: rotationMovement.y + plate.m_movement.y
  };
}
function computeBoundaryPhysicsForTiles(isBoundary, neighborPlates, plateId, plateRegions, width, height, plateRotationMultiple, normalize) {
  const size = width * height;
  const subduction = new Float32Array(size);
  const sliding = new Float32Array(size);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (!isBoundary[i]) continue;
      const plate1Id = plateId[i];
      const plate2Id = neighborPlates[i];
      if (plate2Id < 0 || plate2Id >= plateRegions.length) continue;
      const plate1 = plateRegions[plate1Id];
      const plate2 = plateRegions[plate2Id];
      if (!plate1 || !plate2) continue;
      const pos = { x, y };
      const movement1 = calculatePlateMovement(plate1, pos, plateRotationMultiple);
      const movement2 = calculatePlateMovement(plate2, pos, plateRotationMultiple);
      const normal = normalize({
        x: plate2.seedLocation.x - plate1.seedLocation.x,
        y: plate2.seedLocation.y - plate1.seedLocation.y
      });
      subduction[i] = dot2(normal, movement1) - dot2(normal, movement2);
      sliding[i] = Math.abs(dot2_90(normal, movement1) - dot2_90(normal, movement2));
    }
  }
  return { subduction, sliding };
}
function assignBoundaryTypesWithInheritance(distanceField, isBoundary, _neighborPlates, physics, boundaryType, boundaryCloseness, upliftPotential, riftPotential, shieldStability, tectonicStress, width, height, maxInfluenceDistance = 5, decay = 0.55) {
  const size = width * height;
  const convThreshold = 0.25;
  const divThreshold = -0.15;
  const transformThreshold = 0.4;
  for (let i = 0; i < size; i++) {
    if (!isBoundary[i]) continue;
    const sub = physics.subduction[i];
    const slid = physics.sliding[i];
    if (sub > convThreshold) {
      boundaryType[i] = BOUNDARY_TYPE.convergent;
    } else if (sub < divThreshold) {
      boundaryType[i] = BOUNDARY_TYPE.divergent;
    } else if (slid > transformThreshold) {
      boundaryType[i] = BOUNDARY_TYPE.transform;
    } else {
      boundaryType[i] = BOUNDARY_TYPE.none;
    }
  }
  const inheritedFrom = new Int32Array(size);
  inheritedFrom.fill(-1);
  for (let i = 0; i < size; i++) {
    if (isBoundary[i]) {
      inheritedFrom[i] = i;
    }
  }
  const queue = [];
  for (let i = 0; i < size; i++) {
    if (isBoundary[i]) queue.push(i);
  }
  let head = 0;
  while (head < queue.length) {
    const i = queue[head++];
    const d = distanceField[i];
    if (d >= maxInfluenceDistance) continue;
    const x = i % width;
    const y = Math.floor(i / width);
    const neighbors = getHexNeighbors(x, y, width, height);
    for (const n of neighbors) {
      if (inheritedFrom[n.i] < 0 && distanceField[n.i] === d + 1) {
        inheritedFrom[n.i] = inheritedFrom[i];
        queue.push(n.i);
      }
    }
  }
  for (let i = 0; i < size; i++) {
    const dist = distanceField[i];
    if (dist >= maxInfluenceDistance) {
      boundaryCloseness[i] = 0;
      boundaryType[i] = BOUNDARY_TYPE.none;
      upliftPotential[i] = 0;
      riftPotential[i] = 0;
      shieldStability[i] = 255;
      tectonicStress[i] = 0;
      continue;
    }
    const closeness = Math.exp(-dist * decay);
    const closeness255 = toByte(closeness);
    boundaryCloseness[i] = closeness255;
    const sourceIdx = inheritedFrom[i];
    if (sourceIdx >= 0 && !isBoundary[i]) {
      boundaryType[i] = boundaryType[sourceIdx];
    }
    const bType = boundaryType[i];
    tectonicStress[i] = closeness255;
    shieldStability[i] = 255 - closeness255;
    if (bType === BOUNDARY_TYPE.convergent) {
      upliftPotential[i] = closeness255;
      riftPotential[i] = closeness255 >> 2;
    } else if (bType === BOUNDARY_TYPE.divergent) {
      upliftPotential[i] = closeness255 >> 2;
      riftPotential[i] = closeness255;
    } else {
      upliftPotential[i] = closeness255 >> 2;
      riftPotential[i] = closeness255 >> 2;
    }
  }
}
function summarizeBoundaryCoverage(isBoundary, boundaryCloseness) {
  const size = isBoundary.length || 1;
  let boundaryTiles = 0;
  let influencedTiles = 0;
  let closenessSum = 0;
  let closenessInfluencedSum = 0;
  let maxCloseness = 0;
  for (let i = 0; i < size; i++) {
    if (isBoundary[i]) boundaryTiles++;
    const c = boundaryCloseness[i] | 0;
    if (c > 0) influencedTiles++;
    closenessSum += c;
    if (c > 0) closenessInfluencedSum += c;
    if (c > maxCloseness) maxCloseness = c;
  }
  return {
    boundaryTileShare: boundaryTiles / size,
    boundaryInfluenceShare: influencedTiles / size,
    avgCloseness: closenessSum / size,
    avgInfluenceCloseness: influencedTiles > 0 ? closenessInfluencedSum / influencedTiles : 0,
    maxCloseness,
    boundaryTiles,
    influencedTiles,
    totalTiles: size
  };
}
function computePlatesVoronoi(width, height, config, options = {}) {
  const {
    count = 8,
    relaxationSteps = 5,
    convergenceMix = 0.5,
    plateRotationMultiple = 1,
    directionality = null
  } = config;
  const voronoiUtils = options.voronoiUtils || DefaultVoronoiUtils;
  const rng = options.rng || ((max, _label) => {
    const global = globalThis;
    if (global.TerrainBuilder && typeof global.TerrainBuilder.getRandomNumber === "function") {
      return global.TerrainBuilder.getRandomNumber(
        max,
        _label
      );
    }
    return Math.floor(Math.random() * max);
  });
  const size = width * height;
  const meta = {
    width,
    height,
    config: {
      count,
      relaxationSteps,
      convergenceMix,
      plateRotationMultiple
    },
    seedLocations: []
  };
  const runGeneration = (attempt = {}) => {
    const {
      cellDensity = 3e-3,
      boundaryInfluenceDistance = 3,
      boundaryDecay = 0.8,
      plateCountOverride = null
    } = attempt;
    const plateCount = Math.max(2, plateCountOverride ?? count);
    const bbox = { xl: 0, xr: width, yt: 0, yb: height };
    const sites = voronoiUtils.createRandomSites(plateCount, bbox.xr, bbox.yb);
    const diagram = voronoiUtils.computeVoronoi(sites, bbox, relaxationSteps);
    const plateRegions = diagram.cells.map((cell, index) => {
      const region = createPlateRegion(
        `Plate${index}`,
        index,
        0,
        bbox.xr * bbox.yb,
        { x: Math.random(), y: Math.random(), z: Math.random() },
        rng
      );
      region.seedLocation = { x: cell.site.x, y: cell.site.y };
      if (directionality) {
        applyDirectionalityBias(region, directionality, rng);
      }
      return region;
    });
    if (!plateRegions.length) {
      throw new Error("[WorldModel] Plate generation returned zero plates");
    }
    meta.seedLocations = plateRegions.map((region, id) => ({
      id,
      x: region.seedLocation?.x ?? 0,
      y: region.seedLocation?.y ?? 0
    }));
    const cellCount = Math.max(
      plateCount * 2,
      Math.floor(width * height * cellDensity),
      plateCount
    );
    const cellSites = voronoiUtils.createRandomSites(cellCount, bbox.xr, bbox.yb);
    const cellDiagram = voronoiUtils.computeVoronoi(cellSites, bbox, 2);
    const regionCells = cellDiagram.cells.map((cell, index) => ({
      cell,
      id: index,
      area: voronoiUtils.calculateCellArea(cell),
      plateId: -1
    }));
    for (const regionCell of regionCells) {
      const pos = { x: regionCell.cell.site.x, y: regionCell.cell.site.y };
      let bestDist = Infinity;
      let bestPlateId = -1;
      for (let i = 0; i < plateRegions.length; i++) {
        const dx = pos.x - plateRegions[i].seedLocation.x;
        const dy = pos.y - plateRegions[i].seedLocation.y;
        const dist = dx * dx + dy * dy;
        if (dist < bestDist) {
          bestDist = dist;
          bestPlateId = i;
        }
      }
      regionCell.plateId = bestPlateId;
    }
    const plateId = new Int16Array(size);
    const boundaryCloseness = new Uint8Array(size);
    const boundaryType = new Uint8Array(size);
    const tectonicStress = new Uint8Array(size);
    const upliftPotential = new Uint8Array(size);
    const riftPotential = new Uint8Array(size);
    const shieldStability = new Uint8Array(size);
    const plateMovementU = new Int8Array(size);
    const plateMovementV = new Int8Array(size);
    const plateRotation = new Int8Array(size);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const pos = { x, y };
        let bestDist = Infinity;
        let pId = 0;
        for (let p = 0; p < plateRegions.length; p++) {
          const dx = pos.x - plateRegions[p].seedLocation.x;
          const dy = pos.y - plateRegions[p].seedLocation.y;
          const dist = dx * dx + dy * dy;
          if (dist < bestDist) {
            bestDist = dist;
            pId = p;
          }
        }
        plateId[i] = pId;
        const plate = plateRegions[pId];
        const movement = calculatePlateMovement(plate, pos, plateRotationMultiple);
        plateMovementU[i] = clampInt8(Math.round(movement.x * 100));
        plateMovementV[i] = clampInt8(Math.round(movement.y * 100));
        plateRotation[i] = clampInt8(Math.round(plate.m_rotation * 100));
      }
    }
    const { isBoundary, neighborPlates } = detectBoundaryTiles(plateId, width, height);
    const distanceField = computeDistanceField(
      isBoundary,
      width,
      height,
      boundaryInfluenceDistance + 1
    );
    const physics = computeBoundaryPhysicsForTiles(
      isBoundary,
      neighborPlates,
      plateId,
      plateRegions,
      width,
      height,
      plateRotationMultiple,
      voronoiUtils.normalize
    );
    assignBoundaryTypesWithInheritance(
      distanceField,
      isBoundary,
      neighborPlates,
      physics,
      boundaryType,
      boundaryCloseness,
      upliftPotential,
      riftPotential,
      shieldStability,
      tectonicStress,
      width,
      height,
      boundaryInfluenceDistance,
      boundaryDecay
    );
    const boundaryStats = summarizeBoundaryCoverage(isBoundary, boundaryCloseness);
    meta.boundaryStats = boundaryStats;
    return {
      plateId,
      boundaryCloseness,
      boundaryType,
      tectonicStress,
      upliftPotential,
      riftPotential,
      shieldStability,
      plateMovementU,
      plateMovementV,
      plateRotation,
      boundaryTree: null,
      plateRegions,
      meta
    };
  };
  const attempts = [
    { cellDensity: 3e-3, boundaryInfluenceDistance: 3, boundaryDecay: 0.8 },
    { cellDensity: 2e-3, boundaryInfluenceDistance: 2, boundaryDecay: 0.9 },
    {
      cellDensity: 2e-3,
      boundaryInfluenceDistance: 2,
      boundaryDecay: 0.9,
      plateCountOverride: Math.max(6, Math.round(count * 0.6))
    },
    {
      cellDensity: 15e-4,
      boundaryInfluenceDistance: 2,
      boundaryDecay: 1,
      plateCountOverride: Math.max(4, Math.round(count * 0.4))
    }
  ];
  const saturationLimit = 0.45;
  const closenessLimit = 80;
  let lastResult = null;
  for (const attempt of attempts) {
    const result = runGeneration(attempt);
    lastResult = result;
    const stats = result.meta?.boundaryStats;
    const boundaryShare = stats?.boundaryInfluenceShare ?? 1;
    const boundaryTileShare = stats?.boundaryTileShare ?? 1;
    const avgInfluenceCloseness = stats?.avgInfluenceCloseness ?? 255;
    if (boundaryShare <= saturationLimit && boundaryTileShare <= saturationLimit && avgInfluenceCloseness <= closenessLimit) {
      return result;
    }
  }
  return lastResult;
}
function applyDirectionalityBias(plate, directionality, rng) {
  const cohesion = Math.max(0, Math.min(1, directionality.cohesion ?? 0));
  const plateAxisDeg = (directionality.primaryAxes?.plateAxisDeg ?? 0) | 0;
  const angleJitterDeg = (directionality.variability?.angleJitterDeg ?? 0) | 0;
  const magnitudeVariance = directionality.variability?.magnitudeVariance ?? 0.35;
  const currentAngle = Math.atan2(plate.m_movement.y, plate.m_movement.x) * 180 / Math.PI;
  const currentMag = Math.sqrt(plate.m_movement.x ** 2 + plate.m_movement.y ** 2);
  const jitter = rng(angleJitterDeg * 2 + 1, "PlateDirJit") - angleJitterDeg;
  const targetAngle = currentAngle * (1 - cohesion) + plateAxisDeg * cohesion + jitter * magnitudeVariance;
  const rad = targetAngle * Math.PI / 180;
  plate.m_movement.x = Math.cos(rad) * currentMag;
  plate.m_movement.y = Math.sin(rad) * currentMag;
}
var _state = {
  initialized: false,
  width: 0,
  height: 0,
  plateId: null,
  boundaryCloseness: null,
  boundaryType: null,
  tectonicStress: null,
  upliftPotential: null,
  riftPotential: null,
  shieldStability: null,
  plateMovementU: null,
  plateMovementV: null,
  plateRotation: null,
  windU: null,
  windV: null,
  currentU: null,
  currentV: null,
  pressure: null,
  boundaryTree: null,
  plateSeed: null
};
var _configProvider = null;
function getConfig2() {
  if (_configProvider) {
    return _configProvider();
  }
  return {};
}
function idx(x, y, width) {
  return y * width + x;
}
function clampInt(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v | 0;
}
function toByte01(f) {
  const v = Math.max(0, Math.min(1, f));
  return Math.round(v * 255) | 0;
}
function toByte2(v) {
  if (v <= 1 && v >= 0) return toByte01(v);
  return clampInt(Math.round(v), 0, 255);
}
function computePlates(width, height, options) {
  const config = getConfig2();
  const platesCfg = config.plates || {};
  const count = Math.max(2, (platesCfg.count ?? 8) | 0);
  const convergenceMix = Math.max(0, Math.min(1, platesCfg.convergenceMix ?? 0.5));
  const relaxationSteps = Math.max(0, (platesCfg.relaxationSteps ?? 5) | 0);
  const plateRotationMultiple = platesCfg.plateRotationMultiple ?? 1;
  const seedMode = platesCfg.seedMode === "fixed" ? "fixed" : "engine";
  const seedOffset = Number.isFinite(platesCfg.seedOffset) ? Math.trunc(platesCfg.seedOffset) : 0;
  const fixedSeed = Number.isFinite(platesCfg.fixedSeed) ? Math.trunc(platesCfg.fixedSeed) : void 0;
  const configSnapshot = {
    count,
    relaxationSteps,
    convergenceMix,
    plateRotationMultiple,
    seedMode,
    fixedSeed,
    seedOffset,
    directionality: config.directionality ?? null
  };
  const { snapshot: seedBase, restore: restoreSeed } = PlateSeedManager.capture(
    width,
    height,
    configSnapshot
  );
  let plateData = null;
  try {
    plateData = computePlatesVoronoi(width, height, configSnapshot, options);
  } finally {
    if (typeof restoreSeed === "function") {
      try {
        restoreSeed();
      } catch {
      }
    }
  }
  if (!plateData) {
    const fallbackConfig = Object.freeze({ ...configSnapshot });
    const fallbackSeed = seedBase ? Object.freeze({
      ...seedBase,
      config: fallbackConfig
    }) : Object.freeze({
      width,
      height,
      seedMode: "engine",
      config: fallbackConfig
    });
    _state.plateSeed = PlateSeedManager.finalize(seedBase, { config: configSnapshot }) || fallbackSeed;
    return;
  }
  _state.plateId.set(plateData.plateId);
  _state.boundaryCloseness.set(plateData.boundaryCloseness);
  _state.boundaryType.set(plateData.boundaryType);
  _state.tectonicStress.set(plateData.tectonicStress);
  _state.upliftPotential.set(plateData.upliftPotential);
  _state.riftPotential.set(plateData.riftPotential);
  _state.shieldStability.set(plateData.shieldStability);
  _state.plateMovementU.set(plateData.plateMovementU);
  _state.plateMovementV.set(plateData.plateMovementV);
  _state.plateRotation.set(plateData.plateRotation);
  _state.boundaryTree = plateData.boundaryTree;
  const meta = plateData.meta;
  _state.plateSeed = PlateSeedManager.finalize(seedBase, {
    config: configSnapshot,
    meta: meta ? { seedLocations: meta.seedLocations } : void 0
  }) || Object.freeze({
    width,
    height,
    seedMode: "engine",
    config: Object.freeze({ ...configSnapshot })
  });
}
function computePressure(width, height, rng) {
  const size = width * height;
  const pressure = _state.pressure;
  if (!pressure) return;
  const config = getConfig2();
  const mantleCfg = config.dynamics?.mantle || {};
  const bumps = Math.max(1, (mantleCfg.bumps ?? 4) | 0);
  const amp = Math.max(0.1, mantleCfg.amplitude ?? 0.6);
  const scl = Math.max(0.1, mantleCfg.scale ?? 0.4);
  const sigma = Math.max(4, Math.floor(Math.min(width, height) * scl));
  const getRandom = rng || getDefaultRng();
  const centers = [];
  for (let i = 0; i < bumps; i++) {
    const cx = getRandom(width, "PressCX");
    const cy = getRandom(height, "PressCY");
    const a = amp * (0.75 + getRandom(50, "PressA") / 100);
    centers.push({ x: Math.floor(cx), y: Math.floor(cy), a });
  }
  const acc = new Float32Array(size);
  const inv2s2 = 1 / (2 * sigma * sigma);
  let maxVal = 1e-6;
  for (let k = 0; k < centers.length; k++) {
    const { x: cx, y: cy, a } = centers[k];
    const yMin = Math.max(0, cy - sigma * 2);
    const yMax = Math.min(height - 1, cy + sigma * 2);
    const xMin = Math.max(0, cx - sigma * 2);
    const xMax = Math.min(width - 1, cx + sigma * 2);
    for (let y = yMin; y <= yMax; y++) {
      const dy = y - cy;
      for (let x = xMin; x <= xMax; x++) {
        const dx = x - cx;
        const e = Math.exp(-(dx * dx + dy * dy) * inv2s2);
        const v = a * e;
        const i = idx(x, y, width);
        acc[i] += v;
        if (acc[i] > maxVal) maxVal = acc[i];
      }
    }
  }
  for (let i = 0; i < size; i++) {
    pressure[i] = toByte2(acc[i] / maxVal);
  }
}
function computeWinds(width, height, getLatitude, rng) {
  const U = _state.windU;
  const V = _state.windV;
  if (!U || !V) return;
  const config = getConfig2();
  const windCfg = config.dynamics?.wind || {};
  const streaks = Math.max(0, (windCfg.jetStreaks ?? 3) | 0);
  const jetStrength = Math.max(0, windCfg.jetStrength ?? 1);
  const variance = Math.max(0, windCfg.variance ?? 0.6);
  const getRandom = rng || getDefaultRng();
  const getLat = getLatitude || ((x, y) => {
    const global = globalThis;
    if (global.GameplayMap && typeof global.GameplayMap.getPlotLatitude === "function") {
      return global.GameplayMap.getPlotLatitude(x, y);
    }
    return (y / height * 180 - 90) * -1;
  });
  const streakLats = [];
  for (let s = 0; s < streaks; s++) {
    const base = 30 + s * (30 / Math.max(1, streaks - 1));
    const jitter = getRandom(12, "JetJit") - 6;
    streakLats.push(Math.max(15, Math.min(75, base + jitter)));
  }
  for (let y = 0; y < height; y++) {
    const latDeg = Math.abs(getLat(0, y));
    let u = latDeg < 30 || latDeg >= 60 ? -80 : 80;
    const v = 0;
    for (let k = 0; k < streakLats.length; k++) {
      const d = Math.abs(latDeg - streakLats[k]);
      const f = Math.max(0, 1 - d / 12);
      if (f > 0) {
        const boost = Math.round(32 * jetStrength * f);
        u += latDeg < streakLats[k] ? boost : -boost;
      }
    }
    const varU = Math.round((getRandom(21, "WindUVar") - 10) * variance) | 0;
    const varV = Math.round((getRandom(11, "WindVVar") - 5) * variance) | 0;
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      U[i] = clampInt(u + varU, -127, 127);
      V[i] = clampInt(v + varV, -127, 127);
    }
  }
}
function computeCurrents(width, height, isWater, getLatitude) {
  const U = _state.currentU;
  const V = _state.currentV;
  if (!U || !V) return;
  const checkWater = isWater || ((x, y) => {
    const global = globalThis;
    if (global.GameplayMap && typeof global.GameplayMap.isWater === "function") {
      return global.GameplayMap.isWater(
        x,
        y
      );
    }
    return false;
  });
  const getLat = getLatitude || ((x, y) => {
    const global = globalThis;
    if (global.GameplayMap && typeof global.GameplayMap.getPlotLatitude === "function") {
      return global.GameplayMap.getPlotLatitude(x, y);
    }
    return (y / height * 180 - 90) * -1;
  });
  for (let y = 0; y < height; y++) {
    const latDeg = Math.abs(getLat(0, y));
    let baseU = 0;
    const baseV = 0;
    if (latDeg < 12) {
      baseU = -50;
    } else if (latDeg >= 45 && latDeg < 60) {
      baseU = 20;
    } else if (latDeg >= 60) {
      baseU = -15;
    }
    for (let x = 0; x < width; x++) {
      const i = idx(x, y, width);
      if (checkWater(x, y)) {
        U[i] = clampInt(baseU, -127, 127);
        V[i] = clampInt(baseV, -127, 127);
      } else {
        U[i] = 0;
        V[i] = 0;
      }
    }
  }
}
function getDefaultRng() {
  const global = globalThis;
  if (global.TerrainBuilder && typeof global.TerrainBuilder.getRandomNumber === "function") {
    return global.TerrainBuilder.getRandomNumber;
  }
  return (max) => Math.floor(Math.random() * max);
}
var WorldModel = {
  isEnabled() {
    return !!_state.initialized;
  },
  init(options = {}) {
    if (_state.initialized) return true;
    let width = options.width;
    let height = options.height;
    if (width === void 0 || height === void 0) {
      const global = globalThis;
      if (global.GameplayMap) {
        const gm = global.GameplayMap;
        if (typeof gm.getGridWidth === "function" && typeof gm.getGridHeight === "function") {
          width = width ?? gm.getGridWidth();
          height = height ?? gm.getGridHeight();
        }
      }
    }
    if (width === void 0 || height === void 0) {
      console.warn("[WorldModel] Cannot initialize: dimensions not available");
      return false;
    }
    _state.width = width | 0;
    _state.height = height | 0;
    const size = Math.max(0, width * height) | 0;
    _state.plateId = new Int16Array(size);
    _state.boundaryCloseness = new Uint8Array(size);
    _state.boundaryType = new Uint8Array(size);
    _state.tectonicStress = new Uint8Array(size);
    _state.upliftPotential = new Uint8Array(size);
    _state.riftPotential = new Uint8Array(size);
    _state.shieldStability = new Uint8Array(size);
    _state.plateMovementU = new Int8Array(size);
    _state.plateMovementV = new Int8Array(size);
    _state.plateRotation = new Int8Array(size);
    _state.windU = new Int8Array(size);
    _state.windV = new Int8Array(size);
    _state.currentU = new Int8Array(size);
    _state.currentV = new Int8Array(size);
    _state.pressure = new Uint8Array(size);
    computePlates(width, height, options.plateOptions);
    computePressure(width, height, options.rng);
    computeWinds(width, height, options.getLatitude, options.rng);
    computeCurrents(width, height, options.isWater, options.getLatitude);
    _state.initialized = true;
    return true;
  },
  reset() {
    _state.initialized = false;
    _state.width = 0;
    _state.height = 0;
    _state.plateId = null;
    _state.boundaryCloseness = null;
    _state.boundaryType = null;
    _state.tectonicStress = null;
    _state.upliftPotential = null;
    _state.riftPotential = null;
    _state.shieldStability = null;
    _state.plateMovementU = null;
    _state.plateMovementV = null;
    _state.plateRotation = null;
    _state.windU = null;
    _state.windV = null;
    _state.currentU = null;
    _state.currentV = null;
    _state.pressure = null;
    _state.boundaryTree = null;
    _state.plateSeed = null;
  },
  get plateId() {
    return _state.plateId;
  },
  get boundaryCloseness() {
    return _state.boundaryCloseness;
  },
  get boundaryType() {
    return _state.boundaryType;
  },
  get tectonicStress() {
    return _state.tectonicStress;
  },
  get upliftPotential() {
    return _state.upliftPotential;
  },
  get riftPotential() {
    return _state.riftPotential;
  },
  get shieldStability() {
    return _state.shieldStability;
  },
  get windU() {
    return _state.windU;
  },
  get windV() {
    return _state.windV;
  },
  get currentU() {
    return _state.currentU;
  },
  get currentV() {
    return _state.currentV;
  },
  get pressure() {
    return _state.pressure;
  },
  get plateMovementU() {
    return _state.plateMovementU;
  },
  get plateMovementV() {
    return _state.plateMovementV;
  },
  get plateRotation() {
    return _state.plateRotation;
  },
  get boundaryTree() {
    return _state.boundaryTree;
  },
  get plateSeed() {
    return _state.plateSeed;
  }
};

// ../../packages/mapgen-core/dist/chunk-WMVVCSVA.js
import { addNaturalWonders } from "/base-standard/maps/natural-wonder-generator.js";
import { generateResources } from "/base-standard/maps/resource-generator.js";
import { assignAdvancedStartRegions } from "/base-standard/maps/assign-advanced-start-region.js";
import { generateDiscoveries } from "/base-standard/maps/discovery-generator.js";
import { generateSnow } from "/base-standard/maps/snow-generator.js";
import { assignStartPositions } from "/base-standard/maps/assign-starting-plots.js";
var EMPTY_FROZEN_OBJECT2 = Object.freeze({});
function createExtendedMapContext(dimensions, adapter, config) {
  const { width, height } = dimensions;
  const size = width * height;
  const heightfield = {
    elevation: new Int16Array(size),
    terrain: new Uint8Array(size),
    landMask: new Uint8Array(size)
  };
  const rainfall = new Uint8Array(size);
  const climate = {
    rainfall,
    humidity: new Uint8Array(size)
  };
  return {
    dimensions,
    fields: {
      rainfall,
      elevation: new Int16Array(size),
      temperature: new Uint8Array(size),
      biomeId: new Uint8Array(size),
      featureType: new Int16Array(size),
      terrainType: new Uint8Array(size)
    },
    worldModel: null,
    rng: {
      callCounts: /* @__PURE__ */ new Map(),
      seed: null
    },
    config,
    metrics: {
      timings: /* @__PURE__ */ new Map(),
      histograms: /* @__PURE__ */ new Map(),
      warnings: []
    },
    adapter,
    foundation: null,
    buffers: {
      heightfield,
      climate,
      scratchMasks: /* @__PURE__ */ new Map()
    },
    overlays: /* @__PURE__ */ new Map()
  };
}
function ctxRandom(ctx, label, max) {
  const count = ctx.rng.callCounts.get(label) || 0;
  ctx.rng.callCounts.set(label, count + 1);
  return ctx.adapter.getRandomNumber(max, `${label}_${count}`);
}
function writeHeightfield(ctx, x, y, options) {
  if (!ctx || !options) return;
  const { width } = ctx.dimensions;
  const idxValue = y * width + x;
  const hf = ctx.buffers?.heightfield;
  if (hf) {
    if (typeof options.terrain === "number") {
      hf.terrain[idxValue] = options.terrain & 255;
    }
    if (typeof options.elevation === "number") {
      hf.elevation[idxValue] = options.elevation | 0;
    }
    if (typeof options.isLand === "boolean") {
      hf.landMask[idxValue] = options.isLand ? 1 : 0;
    }
  }
  if (typeof options.terrain === "number") {
    ctx.adapter.setTerrainType(x, y, options.terrain);
  }
  if (typeof options.elevation === "number") {
    ctx.adapter.setElevation(x, y, options.elevation);
  }
}
function writeClimateField(ctx, x, y, options) {
  if (!ctx || !options) return;
  const { width } = ctx.dimensions;
  const idxValue = y * width + x;
  const climate = ctx.buffers?.climate;
  if (climate) {
    if (typeof options.rainfall === "number") {
      const rf = Math.max(0, Math.min(200, options.rainfall)) | 0;
      climate.rainfall[idxValue] = rf & 255;
      if (ctx.fields?.rainfall) {
        ctx.fields.rainfall[idxValue] = rf & 255;
      }
    }
    if (typeof options.humidity === "number") {
      const hum = Math.max(0, Math.min(255, options.humidity)) | 0;
      climate.humidity[idxValue] = hum & 255;
    }
  }
  if (typeof options.rainfall === "number") {
    ctx.adapter.setRainfall(
      x,
      y,
      Math.max(0, Math.min(200, options.rainfall)) | 0
    );
  }
}
function freezeConfigSnapshot(value) {
  if (!value || typeof value !== "object") return EMPTY_FROZEN_OBJECT2;
  try {
    return Object.freeze(value);
  } catch {
    return value;
  }
}
function ensureTensor(name, tensor, size) {
  if (!tensor || typeof tensor.length !== "number") {
    throw new Error(`[FoundationContext] Missing ${name} tensor.`);
  }
  if (tensor.length !== size) {
    throw new Error(
      `[FoundationContext] ${name} tensor length mismatch (expected ${size}, received ${tensor.length}).`
    );
  }
  return tensor;
}
function createFoundationContext(worldModel, options) {
  if (!worldModel?.initialized) {
    throw new Error(
      "[FoundationContext] WorldModel is not initialized or disabled."
    );
  }
  if (!options?.dimensions) {
    throw new Error(
      "[FoundationContext] Map dimensions are required to build the context."
    );
  }
  const width = options.dimensions.width | 0;
  const height = options.dimensions.height | 0;
  const size = Math.max(0, width * height) | 0;
  if (size <= 0) {
    throw new Error("[FoundationContext] Invalid map dimensions.");
  }
  const plateId = ensureTensor("plateId", worldModel.plateId, size);
  const boundaryCloseness = ensureTensor(
    "boundaryCloseness",
    worldModel.boundaryCloseness,
    size
  );
  const boundaryType = ensureTensor(
    "boundaryType",
    worldModel.boundaryType,
    size
  );
  const tectonicStress = ensureTensor(
    "tectonicStress",
    worldModel.tectonicStress,
    size
  );
  const upliftPotential = ensureTensor(
    "upliftPotential",
    worldModel.upliftPotential,
    size
  );
  const riftPotential = ensureTensor(
    "riftPotential",
    worldModel.riftPotential,
    size
  );
  const shieldStability = ensureTensor(
    "shieldStability",
    worldModel.shieldStability,
    size
  );
  const plateMovementU = ensureTensor(
    "plateMovementU",
    worldModel.plateMovementU,
    size
  );
  const plateMovementV = ensureTensor(
    "plateMovementV",
    worldModel.plateMovementV,
    size
  );
  const plateRotation = ensureTensor(
    "plateRotation",
    worldModel.plateRotation,
    size
  );
  const windU = ensureTensor("windU", worldModel.windU, size);
  const windV = ensureTensor("windV", worldModel.windV, size);
  const currentU = ensureTensor("currentU", worldModel.currentU, size);
  const currentV = ensureTensor("currentV", worldModel.currentV, size);
  const pressure = ensureTensor("pressure", worldModel.pressure, size);
  const configInput = options.config || {};
  const configSnapshot = {
    seed: freezeConfigSnapshot(configInput.seed),
    plates: freezeConfigSnapshot(configInput.plates),
    dynamics: freezeConfigSnapshot(configInput.dynamics),
    surface: freezeConfigSnapshot(configInput.surface),
    policy: freezeConfigSnapshot(configInput.policy),
    diagnostics: freezeConfigSnapshot(configInput.diagnostics)
  };
  return Object.freeze({
    dimensions: Object.freeze({ width, height, size }),
    plateSeed: worldModel.plateSeed || null,
    plates: Object.freeze({
      id: plateId,
      boundaryCloseness,
      boundaryType,
      tectonicStress,
      upliftPotential,
      riftPotential,
      shieldStability,
      movementU: plateMovementU,
      movementV: plateMovementV,
      rotation: plateRotation
    }),
    dynamics: Object.freeze({ windU, windV, currentU, currentV, pressure }),
    diagnostics: Object.freeze({
      boundaryTree: worldModel.boundaryTree || null
    }),
    config: Object.freeze(configSnapshot)
  });
}
function syncHeightfield(ctx) {
  if (!ctx?.adapter) return;
  const hf = ctx.buffers?.heightfield;
  if (!hf) return;
  const { width, height } = ctx.dimensions;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idxValue = y * width + x;
      const terrain = ctx.adapter.getTerrainType(x, y);
      if (terrain != null) {
        hf.terrain[idxValue] = terrain & 255;
      }
      const elevation = ctx.adapter.getElevation(x, y);
      if (Number.isFinite(elevation)) {
        hf.elevation[idxValue] = elevation | 0;
      }
      hf.landMask[idxValue] = ctx.adapter.isWater(x, y) ? 0 : 1;
    }
  }
}
function syncClimateField(ctx) {
  if (!ctx?.adapter) return;
  const climate = ctx.buffers?.climate;
  if (!climate) return;
  const { width, height } = ctx.dimensions;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idxValue = y * width + x;
      const rf = ctx.adapter.getRainfall(x, y);
      if (Number.isFinite(rf)) {
        const rfClamped = Math.max(0, Math.min(200, rf)) | 0;
        climate.rainfall[idxValue] = rfClamped & 255;
        if (ctx.fields?.rainfall) {
          ctx.fields.rainfall[idxValue] = rfClamped & 255;
        }
      }
    }
  }
}
var DEFAULT_OCEAN_SEPARATION = {
  enabled: true,
  bandPairs: [
    [0, 1],
    [1, 2]
  ],
  baseSeparationTiles: 0,
  boundaryClosenessMultiplier: 1,
  maxPerRowDelta: 3
};
var OCEAN_TERRAIN = 0;
var FLAT_TERRAIN = 3;
function clampInt2(value, min, max) {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
function normalizeWindow(win, index, width, height) {
  if (!win) {
    return {
      west: 0,
      east: Math.max(0, width - 1),
      south: 0,
      north: Math.max(0, height - 1),
      continent: index
    };
  }
  const west = clampInt2(win.west ?? 0, 0, width - 1);
  const east = clampInt2(win.east ?? width - 1, 0, width - 1);
  const south = clampInt2(win.south ?? 0, 0, height - 1);
  const north = clampInt2(win.north ?? height - 1, 0, height - 1);
  return {
    west: Math.min(west, east),
    east: Math.max(west, east),
    south: Math.min(south, north),
    north: Math.max(south, north),
    continent: win.continent ?? index
  };
}
function createRowState(win, index, width, height) {
  const normalized = normalizeWindow(win, index, width, height);
  const west = new Int16Array(height);
  const east = new Int16Array(height);
  for (let y = 0; y < height; y++) {
    west[y] = normalized.west;
    east[y] = normalized.east;
  }
  return {
    index,
    west,
    east,
    south: normalized.south,
    north: normalized.north,
    continent: normalized.continent
  };
}
function aggregateRowState(state, width, height) {
  let minWest = width - 1;
  let maxEast = 0;
  const south = clampInt2(state.south, 0, height - 1);
  const north = clampInt2(state.north, 0, height - 1);
  for (let y = south; y <= north; y++) {
    if (state.west[y] < minWest) minWest = state.west[y];
    if (state.east[y] > maxEast) maxEast = state.east[y];
  }
  return {
    west: clampInt2(minWest, 0, width - 1),
    east: clampInt2(maxEast, 0, width - 1),
    south,
    north,
    continent: state.continent
  };
}
function applyLandmassPostAdjustments(windows, geometry, width, height) {
  if (!Array.isArray(windows) || windows.length === 0) return windows;
  const post = geometry?.post;
  if (!post || typeof post !== "object") return windows;
  const expandAll = Number.isFinite(post.expandTiles) ? Math.trunc(post.expandTiles) : 0;
  const expandWest = Number.isFinite(post.expandWestTiles) ? Math.trunc(post.expandWestTiles) : 0;
  const expandEast = Number.isFinite(post.expandEastTiles) ? Math.trunc(post.expandEastTiles) : 0;
  const clampWest = Number.isFinite(post.clampWestMin) ? Math.max(0, Math.trunc(post.clampWestMin)) : null;
  const clampEast = Number.isFinite(post.clampEastMax) ? Math.min(width - 1, Math.trunc(post.clampEastMax)) : null;
  const overrideSouth = Number.isFinite(post.overrideSouth) ? clampInt2(Math.trunc(post.overrideSouth), 0, height - 1) : null;
  const overrideNorth = Number.isFinite(post.overrideNorth) ? clampInt2(Math.trunc(post.overrideNorth), 0, height - 1) : null;
  const minWidth = Number.isFinite(post.minWidthTiles) ? Math.max(0, Math.trunc(post.minWidthTiles)) : null;
  let changed = false;
  const adjusted = windows.map((win) => {
    if (!win) return win;
    let west = clampInt2(win.west | 0, 0, width - 1);
    let east = clampInt2(win.east | 0, 0, width - 1);
    let south = clampInt2(win.south | 0, 0, height - 1);
    let north = clampInt2(win.north | 0, 0, height - 1);
    const expansionWest = expandAll + expandWest;
    const expansionEast = expandAll + expandEast;
    if (expansionWest > 0) west = clampInt2(west - expansionWest, 0, width - 1);
    if (expansionEast > 0) east = clampInt2(east + expansionEast, 0, width - 1);
    if (clampWest != null) west = Math.max(west, clampWest);
    if (clampEast != null) east = Math.min(east, clampEast);
    if (minWidth != null && minWidth > 0) {
      const span = east - west + 1;
      if (span < minWidth) {
        const deficit = minWidth - span;
        const extraWest = Math.floor(deficit / 2);
        const extraEast = deficit - extraWest;
        west = clampInt2(west - extraWest, 0, width - 1);
        east = clampInt2(east + extraEast, 0, width - 1);
      }
    }
    if (overrideSouth != null) south = overrideSouth;
    if (overrideNorth != null) north = overrideNorth;
    const mutated = west !== win.west || east !== win.east || south !== win.south || north !== win.north;
    if (mutated) changed = true;
    if (!mutated) return win;
    return {
      west,
      east,
      south,
      north,
      continent: win.continent
    };
  });
  return changed ? adjusted : windows;
}
function applyPlateAwareOceanSeparation(params) {
  const width = params?.width | 0;
  const height = params?.height | 0;
  const windows = Array.isArray(params?.windows) ? params.windows : [];
  if (!width || !height || windows.length === 0) {
    return {
      windows: windows.map((win, idx4) => normalizeWindow(win, idx4, width, height))
    };
  }
  const ctx = params?.context ?? null;
  const adapter = params?.adapter && typeof params.adapter.setTerrainType === "function" ? params.adapter : null;
  const tunables = getTunables();
  const foundationPolicy = tunables.FOUNDATION_CFG?.oceanSeparation;
  const policy = params?.policy || foundationPolicy || DEFAULT_OCEAN_SEPARATION;
  if (!policy || !policy.enabled || !WorldModel.isEnabled()) {
    return {
      windows: windows.map((win, idx4) => normalizeWindow(win, idx4, width, height)),
      landMask: params?.landMask ?? void 0
    };
  }
  const closeness = WorldModel.boundaryCloseness;
  if (!closeness || closeness.length !== width * height) {
    return {
      windows: windows.map((win, idx4) => normalizeWindow(win, idx4, width, height)),
      landMask: params?.landMask ?? void 0
    };
  }
  const landMask = params?.landMask instanceof Uint8Array && params.landMask.length === width * height ? params.landMask : null;
  const heightfield = ctx?.buffers?.heightfield;
  const bandPairs = Array.isArray(policy.bandPairs) && policy.bandPairs.length ? policy.bandPairs : [
    [0, 1],
    [1, 2]
  ];
  const baseSeparation = Math.max(0, (policy.baseSeparationTiles ?? 0) | 0);
  const closenessMultiplier = Number.isFinite(policy.boundaryClosenessMultiplier) ? policy.boundaryClosenessMultiplier : 1;
  const maxPerRow = Math.max(0, (policy.maxPerRowDelta ?? 3) | 0);
  const rowStates = windows.map((win, idx4) => createRowState(win, idx4, width, height));
  const setTerrain = (x, y, terrain, isLand) => {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const idx4 = y * width + x;
    if (landMask) {
      landMask[idx4] = isLand ? 1 : 0;
    }
    if (ctx) {
      writeHeightfield(ctx, x, y, { terrain, isLand });
    } else if (adapter) {
      adapter.setTerrainType(x, y, terrain);
    }
    if (heightfield && !landMask) {
      heightfield.landMask[idx4] = isLand ? 1 : 0;
    }
  };
  const carveOceanFromEast = (state, y, tiles) => {
    if (!tiles) return 0;
    let removed = 0;
    let x = state.east[y];
    const limit = state.west[y];
    const rowOffset = y * width;
    while (removed < tiles && x >= limit) {
      const idx4 = rowOffset + x;
      if (!landMask || landMask[idx4]) {
        setTerrain(x, y, OCEAN_TERRAIN, false);
        removed++;
      }
      x--;
    }
    state.east[y] = clampInt2(state.east[y] - removed, limit, width - 1);
    return removed;
  };
  const carveOceanFromWest = (state, y, tiles) => {
    if (!tiles) return 0;
    let removed = 0;
    let x = state.west[y];
    const limit = state.east[y];
    const rowOffset = y * width;
    while (removed < tiles && x <= limit) {
      const idx4 = rowOffset + x;
      if (!landMask || landMask[idx4]) {
        setTerrain(x, y, OCEAN_TERRAIN, false);
        removed++;
      }
      x++;
    }
    state.west[y] = clampInt2(state.west[y] + removed, 0, limit);
    return removed;
  };
  const fillLandFromWest = (state, y, tiles) => {
    if (!tiles) return 0;
    let added = 0;
    let x = state.west[y] - 1;
    while (added < tiles && x >= 0) {
      setTerrain(x, y, FLAT_TERRAIN, true);
      added++;
      x--;
    }
    state.west[y] = clampInt2(state.west[y] - added, 0, width - 1);
    return added;
  };
  const fillLandFromEast = (state, y, tiles) => {
    if (!tiles) return 0;
    let added = 0;
    let x = state.east[y] + 1;
    while (added < tiles && x < width) {
      setTerrain(x, y, FLAT_TERRAIN, true);
      added++;
      x++;
    }
    state.east[y] = clampInt2(state.east[y] + added, 0, width - 1);
    return added;
  };
  for (const pair of bandPairs) {
    const li = Array.isArray(pair) ? pair[0] | 0 : -1;
    const ri = Array.isArray(pair) ? pair[1] | 0 : -1;
    const left = rowStates[li];
    const right = rowStates[ri];
    if (!left || !right) continue;
    const rowStart = Math.max(0, Math.max(left.south, right.south));
    const rowEnd = Math.min(height - 1, Math.min(left.north, right.north));
    for (let y = rowStart; y <= rowEnd; y++) {
      const mid = clampInt2(Math.floor((left.east[y] + right.west[y]) / 2), 0, width - 1);
      const clos = closeness[y * width + mid] | 0;
      let sep = baseSeparation;
      if (sep > 0) {
        const weight = clos / 255;
        sep += Math.round(weight * closenessMultiplier * baseSeparation);
      }
      if (sep > maxPerRow) sep = maxPerRow;
      if (sep <= 0) continue;
      carveOceanFromEast(left, y, sep);
      carveOceanFromWest(right, y, sep);
    }
  }
  const edgeWest = policy.edgeWest || {};
  if (rowStates.length && edgeWest.enabled) {
    const state = rowStates[0];
    const base = (edgeWest.baseTiles ?? 0) | 0;
    const mult = Number.isFinite(edgeWest.boundaryClosenessMultiplier) ? edgeWest.boundaryClosenessMultiplier : 1;
    const cap = Math.max(0, (edgeWest.maxPerRowDelta ?? 2) | 0);
    for (let y = state.south; y <= state.north; y++) {
      const clos = closeness[y * width + 0] | 0;
      let mag = Math.abs(base) + Math.round(clos / 255 * Math.abs(base) * mult);
      if (mag > cap) mag = cap;
      if (mag <= 0) continue;
      if (base >= 0) {
        carveOceanFromWest(state, y, mag);
      } else {
        fillLandFromWest(state, y, mag);
      }
    }
  }
  const edgeEast = policy.edgeEast || {};
  if (rowStates.length && edgeEast.enabled) {
    const state = rowStates[rowStates.length - 1];
    const base = (edgeEast.baseTiles ?? 0) | 0;
    const mult = Number.isFinite(edgeEast.boundaryClosenessMultiplier) ? edgeEast.boundaryClosenessMultiplier : 1;
    const cap = Math.max(0, (edgeEast.maxPerRowDelta ?? 2) | 0);
    for (let y = state.south; y <= state.north; y++) {
      const clos = closeness[y * width + (width - 1)] | 0;
      let mag = Math.abs(base) + Math.round(clos / 255 * Math.abs(base) * mult);
      if (mag > cap) mag = cap;
      if (mag <= 0) continue;
      if (base >= 0) {
        carveOceanFromEast(state, y, mag);
      } else {
        fillLandFromEast(state, y, mag);
      }
    }
  }
  const normalized = rowStates.map((state) => aggregateRowState(state, width, height));
  if (ctx && landMask && ctx.buffers?.heightfield?.landMask) {
    ctx.buffers.heightfield.landMask.set(landMask);
  }
  return {
    windows: normalized,
    landMask: landMask ?? void 0
  };
}
var DEFAULT_CLOSENESS_LIMIT = 255;
var CLOSENESS_STEP_PER_TILE = 8;
var MIN_CLOSENESS_LIMIT = 150;
var MAX_CLOSENESS_LIMIT = 255;
var FRACTAL_TECTONIC_ID = 3;
var OCEAN_TERRAIN2 = 0;
var FLAT_TERRAIN2 = 3;
function clampInt22(value, min, max) {
  if (!Number.isFinite(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
function clampPct(value, min, max, fallback) {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}
function clamp01(value, fallback = 0) {
  if (value === void 0 || !Number.isFinite(value)) return fallback;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
function clampRange(value, fallback, min, max) {
  if (value === void 0 || !Number.isFinite(value)) return fallback;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}
function computeClosenessLimit(postCfg) {
  const expand = postCfg?.expandTiles ? Math.trunc(postCfg.expandTiles) : 0;
  const limit = DEFAULT_CLOSENESS_LIMIT + expand * CLOSENESS_STEP_PER_TILE;
  return clampInt22(limit, MIN_CLOSENESS_LIMIT, MAX_CLOSENESS_LIMIT);
}
function createPlateDrivenLandmasses(width, height, ctx, options = {}) {
  if (!WorldModel.isEnabled()) {
    return null;
  }
  const shield = WorldModel.shieldStability;
  const closeness = WorldModel.boundaryCloseness;
  const boundaryType = WorldModel.boundaryType;
  const plateIds = WorldModel.plateId;
  if (!shield || !closeness || !boundaryType || !plateIds) {
    return null;
  }
  const size = width * height;
  if (shield.length !== size || closeness.length !== size || boundaryType.length !== size || plateIds.length !== size) {
    return null;
  }
  const tunables = getTunables();
  const landmassCfg = options.landmassCfg || tunables.LANDMASS_CFG || {};
  const boundaryBias = clampInt22(
    Number.isFinite(landmassCfg.boundaryBias) ? landmassCfg.boundaryBias : 0.25,
    0,
    0.4
  );
  const boundaryShareTarget = Number.isFinite(landmassCfg.boundaryShareTarget) ? Math.max(0, Math.min(1, landmassCfg.boundaryShareTarget)) : 0.15;
  const tectonicsCfg = landmassCfg.tectonics || {};
  const interiorNoiseWeight = clamp01(tectonicsCfg.interiorNoiseWeight, 0.3);
  const arcWeight = clampRange(tectonicsCfg.boundaryArcWeight, 0.8, 0, 2);
  const arcNoiseWeight = clamp01(tectonicsCfg.boundaryArcNoiseWeight, 0.5);
  const fractalGrain = clampInt22(
    Number.isFinite(tectonicsCfg.fractalGrain) ? tectonicsCfg.fractalGrain : 4,
    1,
    32
  );
  const geomCfg = options.geometry || {};
  const postCfg = geomCfg.post || {};
  const baseWaterPct = clampPct(landmassCfg.baseWaterPercent ?? 64, 0, 100, 64);
  const waterScalar = clampPct(
    Number.isFinite(landmassCfg.waterScalar) ? landmassCfg.waterScalar * 100 : 100,
    25,
    175,
    100
  ) / 100;
  const waterPct = clampPct(baseWaterPct * waterScalar, 0, 100, baseWaterPct);
  const totalTiles = size || 1;
  const targetLandTiles = Math.max(
    1,
    Math.min(totalTiles - 1, Math.round(totalTiles * (1 - waterPct / 100)))
  );
  const closenessLimit = computeClosenessLimit(postCfg);
  const adapter = ctx?.adapter;
  const useFractal = !!(adapter && typeof adapter.createFractal === "function" && typeof adapter.getFractalHeight === "function" && (interiorNoiseWeight > 0 || arcNoiseWeight > 0));
  if (useFractal) {
    adapter.createFractal(FRACTAL_TECTONIC_ID, width, height, fractalGrain, 0);
  }
  const baseInteriorWeight = 1 - interiorNoiseWeight;
  const interiorScore = new Uint16Array(size);
  const arcScore = new Uint16Array(size);
  const landScore = new Uint16Array(size);
  let interiorMin = 255, interiorMax = 0, interiorSum = 0;
  let arcMin = 255, arcMax = 0, arcSum = 0;
  let interiorStretch = 1;
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx4 = rowOffset + x;
      const closenessVal = closeness[idx4] | 0;
      const interiorBase = 255 - closenessVal;
      let noise255 = 128;
      if (useFractal && interiorNoiseWeight > 0) {
        const raw = adapter.getFractalHeight(FRACTAL_TECTONIC_ID, x, y) | 0;
        noise255 = raw >>> 8;
      }
      const centeredNoise = noise255 - 128;
      const noisyInterior = interiorBase * baseInteriorWeight + centeredNoise * interiorNoiseWeight;
      const clampedInterior = noisyInterior < 0 ? 0 : noisyInterior > 255 ? 255 : noisyInterior;
      const interiorVal = clampedInterior & 255;
      interiorScore[idx4] = interiorVal;
      interiorMin = Math.min(interiorMin, interiorVal);
      interiorMax = Math.max(interiorMax, interiorVal);
      interiorSum += interiorVal;
      const bType = boundaryType[idx4] | 0;
      const rawArc = closenessVal;
      let arc = rawArc;
      if (bType === BOUNDARY_TYPE.convergent) {
        arc = rawArc * arcWeight;
      } else if (bType === BOUNDARY_TYPE.divergent) {
        arc = rawArc * 0.25;
      } else {
        arc = rawArc * 0.5;
      }
      if (useFractal && arcNoiseWeight > 0) {
        const raw = adapter.getFractalHeight(FRACTAL_TECTONIC_ID, x, y) | 0;
        const noiseNorm = (raw >>> 8) / 255;
        const noiseMix = 1 + (noiseNorm - 0.5) * arcNoiseWeight;
        arc *= noiseMix;
      }
      if (boundaryBias > 0) {
        arc += closenessVal * boundaryBias;
      }
      const clampedArc = arc < 0 ? 0 : arc > 255 ? 255 : arc;
      arcScore[idx4] = clampedArc & 255;
      arcMin = Math.min(arcMin, arcScore[idx4]);
      arcMax = Math.max(arcMax, arcScore[idx4]);
      arcSum += arcScore[idx4];
    }
  }
  if (interiorMax > 0) {
    const desiredTop = arcMax > 0 ? arcMax + 32 : 255;
    interiorStretch = desiredTop / interiorMax;
    if (interiorStretch < 1.05 || !Number.isFinite(interiorStretch)) {
      interiorStretch = 1;
    } else {
      interiorStretch = Math.min(1.6, interiorStretch);
      interiorMin = 255;
      interiorMax = 0;
      interiorSum = 0;
      for (let i = 0; i < size; i++) {
        const stretched = Math.min(255, Math.round(interiorScore[i] * interiorStretch));
        interiorScore[i] = stretched;
        interiorMin = Math.min(interiorMin, stretched);
        interiorMax = Math.max(interiorMax, stretched);
        interiorSum += stretched;
      }
    }
  }
  for (let i = 0; i < size; i++) {
    landScore[i] = interiorScore[i] >= arcScore[i] ? interiorScore[i] : arcScore[i];
  }
  const computeLandScore = (idx4) => landScore[idx4] | 0;
  const countTilesAboveTyped = (threshold) => {
    let count = 0;
    for (let i = 0; i < size; i++) {
      const score = computeLandScore(i);
      if (score >= threshold && closeness[i] <= closenessLimit) {
        count++;
      }
    }
    return count;
  };
  let low = 0;
  let high = 255;
  let bestThreshold = 128;
  let bestDiff = Number.POSITIVE_INFINITY;
  let bestCount = 0;
  while (low <= high) {
    const mid = low + high >> 1;
    const count = countTilesAboveTyped(mid);
    const diff = Math.abs(count - targetLandTiles);
    if (diff < bestDiff || diff === bestDiff && count > bestCount) {
      bestDiff = diff;
      bestThreshold = mid;
      bestCount = count;
    }
    if (count > targetLandTiles) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  const boundaryBand = (closenessArr, idx4) => (closenessArr[idx4] | 0) >= 90;
  const computeShares = (threshold) => {
    let land = 0, boundaryLand2 = 0, convergentLand = 0;
    for (let i = 0; i < size; i++) {
      const score = computeLandScore(i);
      const isLand = score >= threshold && closeness[i] <= closenessLimit;
      if (isLand) {
        land++;
        if (boundaryBand(closeness, i)) boundaryLand2++;
        if (boundaryType[i] === BOUNDARY_TYPE.convergent) convergentLand++;
      }
    }
    return { land, boundaryLand: boundaryLand2, convergentLand };
  };
  let { land: landCount, boundaryLand } = computeShares(bestThreshold);
  const minBoundary = Math.round(targetLandTiles * boundaryShareTarget);
  if (boundaryLand < minBoundary) {
    const maxAllowedLand = Math.round(targetLandTiles * 1.5);
    let t = bestThreshold - 5;
    while (t >= 0) {
      const shares = computeShares(t);
      landCount = shares.land;
      boundaryLand = shares.boundaryLand;
      if (boundaryLand >= minBoundary) {
        bestThreshold = t;
        break;
      }
      if (landCount > maxAllowedLand) {
        break;
      }
      t -= 5;
    }
  }
  const landMask = new Uint8Array(size);
  let finalLandTiles = 0;
  const setTerrain = (x, y, terrain, isLand) => {
    if (ctx) {
      writeHeightfield(ctx, x, y, {
        terrain,
        elevation: isLand ? 0 : -1,
        isLand
      });
    } else if (adapter) {
      adapter.setTerrainType(x, y, terrain);
    }
  };
  for (let y = 0; y < height; y++) {
    const rowOffset = y * width;
    for (let x = 0; x < width; x++) {
      const idx4 = rowOffset + x;
      const score = computeLandScore(idx4);
      const isLand = score >= bestThreshold && closeness[idx4] <= closenessLimit;
      if (isLand) {
        landMask[idx4] = 1;
        finalLandTiles++;
        setTerrain(x, y, FLAT_TERRAIN2, true);
      } else {
        landMask[idx4] = 0;
        setTerrain(x, y, OCEAN_TERRAIN2, false);
      }
    }
  }
  const plateStats = /* @__PURE__ */ new Map();
  for (let idx4 = 0; idx4 < size; idx4++) {
    if (!landMask[idx4]) continue;
    const plateId = plateIds[idx4];
    if (plateId == null || plateId < 0) continue;
    const y = Math.floor(idx4 / width);
    const x = idx4 - y * width;
    let stat = plateStats.get(plateId);
    if (!stat) {
      stat = {
        plateId,
        count: 0,
        minX: width,
        maxX: -1,
        minY: height,
        maxY: -1
      };
      plateStats.set(plateId, stat);
    }
    stat.count++;
    if (x < stat.minX) stat.minX = x;
    if (x > stat.maxX) stat.maxX = x;
    if (y < stat.minY) stat.minY = y;
    if (y > stat.maxY) stat.maxY = y;
  }
  const minWidth = postCfg.minWidthTiles ? Math.max(1, Math.trunc(postCfg.minWidthTiles)) : 0;
  const polarRows = 0;
  const windows = Array.from(plateStats.values()).filter((s) => s.count > 0 && s.maxX >= s.minX && s.maxY >= s.minY).map((s) => {
    const expand = postCfg.expandTiles ? Math.trunc(postCfg.expandTiles) : 0;
    const expandWest = postCfg.expandWestTiles ? Math.trunc(postCfg.expandWestTiles) : 0;
    const expandEast = postCfg.expandEastTiles ? Math.trunc(postCfg.expandEastTiles) : 0;
    let west = Math.max(0, s.minX - Math.max(0, expand + expandWest));
    let east = Math.min(width - 1, s.maxX + Math.max(0, expand + expandEast));
    if (minWidth > 0) {
      const span = east - west + 1;
      if (span < minWidth) {
        const deficit = minWidth - span;
        const extraWest = Math.floor(deficit / 2);
        const extraEast = deficit - extraWest;
        west = Math.max(0, west - extraWest);
        east = Math.min(width - 1, east + extraEast);
      }
    }
    if (postCfg.clampWestMin != null) {
      west = Math.max(west, Math.max(0, Math.trunc(postCfg.clampWestMin)));
    }
    if (postCfg.clampEastMax != null) {
      east = Math.min(east, Math.min(width - 1, Math.trunc(postCfg.clampEastMax)));
    }
    const verticalPad = Math.max(0, expand);
    const baseSouth = Math.max(polarRows, s.minY - verticalPad);
    const baseNorth = Math.min(height - polarRows, s.maxY + verticalPad);
    const south = postCfg.overrideSouth != null ? clampInt22(Math.trunc(postCfg.overrideSouth), 0, height - 1) : clampInt22(baseSouth, 0, height - 1);
    const north = postCfg.overrideNorth != null ? clampInt22(Math.trunc(postCfg.overrideNorth), 0, height - 1) : clampInt22(baseNorth, 0, height - 1);
    return {
      plateId: s.plateId,
      west,
      east,
      south,
      north,
      centerX: (west + east) * 0.5,
      count: s.count,
      continent: 0
      // Will be assigned below
    };
  }).sort((a, b) => a.centerX - b.centerX);
  const windowsOut = windows.map((win, index) => ({
    west: win.west,
    east: win.east,
    south: win.south,
    north: win.north,
    continent: index
  }));
  let startRegions = void 0;
  if (windowsOut.length >= 2) {
    startRegions = {
      westContinent: { ...windowsOut[0] },
      eastContinent: { ...windowsOut[windowsOut.length - 1] }
    };
  }
  if (ctx?.buffers?.heightfield?.landMask) {
    ctx.buffers.heightfield.landMask.set(landMask);
  }
  return {
    windows: windowsOut,
    startRegions,
    landMask,
    landTiles: finalLandTiles,
    threshold: bestThreshold
  };
}
var _cache2 = null;
function createStoryTags() {
  return {
    // Hotspot tags
    hotspot: /* @__PURE__ */ new Set(),
    hotspotParadise: /* @__PURE__ */ new Set(),
    hotspotVolcanic: /* @__PURE__ */ new Set(),
    // Rift tags
    riftLine: /* @__PURE__ */ new Set(),
    riftShoulder: /* @__PURE__ */ new Set(),
    // Margin tags
    activeMargin: /* @__PURE__ */ new Set(),
    passiveShelf: /* @__PURE__ */ new Set(),
    // Corridor tags
    corridorSeaLane: /* @__PURE__ */ new Set(),
    corridorIslandHop: /* @__PURE__ */ new Set(),
    corridorLandOpen: /* @__PURE__ */ new Set(),
    corridorRiverChain: /* @__PURE__ */ new Set(),
    // Corridor metadata
    corridorKind: /* @__PURE__ */ new Map(),
    corridorStyle: /* @__PURE__ */ new Map(),
    corridorAttributes: /* @__PURE__ */ new Map()
  };
}
function getStoryTags() {
  if (_cache2) return _cache2;
  _cache2 = createStoryTags();
  return _cache2;
}
function resetStoryTags() {
  _cache2 = null;
}
var HILL_FRACTAL = 1;
var COAST_TERRAIN = 1;
function clamp(v, lo, hi) {
  if (v < lo) return lo;
  if (v > hi) return hi;
  return v;
}
function computePlateBias(closenessNorm, boundaryType, cfg) {
  let cn = closenessNorm;
  if (cn == null || Number.isNaN(cn)) cn = 0;
  const threshold = cfg.threshold;
  const power = cfg.power;
  let weight = 0;
  if (cn >= threshold) {
    const span = Math.max(1e-3, 1 - threshold);
    const normalized = clamp((cn - threshold) / span, 0, 1);
    const ramp = Math.pow(normalized, power);
    let typeMul = 0;
    if (boundaryType === BOUNDARY_TYPE.convergent) typeMul = cfg.convergent;
    else if (boundaryType === BOUNDARY_TYPE.transform) typeMul = cfg.transform;
    else if (boundaryType === BOUNDARY_TYPE.divergent) typeMul = cfg.divergent;
    weight = ramp * typeMul;
  } else if (cfg.interior !== 0 && threshold > 0) {
    const normalized = clamp(1 - cn / threshold, 0, 1);
    weight = Math.pow(normalized, power) * cfg.interior;
  }
  return weight;
}
function addRuggedCoasts(iWidth, iHeight, ctx) {
  const adapter = ctx?.adapter;
  const area = Math.max(1, iWidth * iHeight);
  const sqrtScale = Math.min(2, Math.max(0.6, Math.sqrt(area / 1e4)));
  if (adapter?.createFractal) {
    adapter.createFractal(HILL_FRACTAL, iWidth, iHeight, 4, 0);
  }
  const worldModelEnabled = WorldModel.isEnabled();
  const boundaryCloseness = worldModelEnabled ? WorldModel.boundaryCloseness : null;
  const boundaryType = worldModelEnabled ? WorldModel.boundaryType : null;
  const tunables = getTunables();
  const cfg = tunables.FOUNDATION_CFG?.coastlines || {};
  const cfgBay = cfg.bay || {};
  const cfgFjord = cfg.fjord || {};
  const bayNoiseExtra = (sqrtScale > 1 ? 1 : 0) + (Number.isFinite(cfgBay.noiseGateAdd) ? cfgBay.noiseGateAdd : 0);
  const fjordBaseDenom = Math.max(
    6,
    (Number.isFinite(cfgFjord.baseDenom) ? cfgFjord.baseDenom : 12) - (sqrtScale > 1.3 ? 1 : 0)
  );
  const fjordActiveBonus = Number.isFinite(cfgFjord.activeBonus) ? cfgFjord.activeBonus : 1;
  const fjordPassiveBonus = Number.isFinite(cfgFjord.passiveBonus) ? cfgFjord.passiveBonus : 2;
  const bayRollDenActive = Number.isFinite(cfgBay.rollDenActive) ? cfgBay.rollDenActive : 4;
  const bayRollDenDefault = Number.isFinite(cfgBay.rollDenDefault) ? cfgBay.rollDenDefault : 5;
  const plateBiasRaw = cfg.plateBias || {};
  const plateBiasCfg = {
    threshold: clamp(Number.isFinite(plateBiasRaw.threshold) ? plateBiasRaw.threshold : 0.45, 0, 1),
    power: Math.max(0.1, Number.isFinite(plateBiasRaw.power) ? plateBiasRaw.power : 1.25),
    convergent: Number.isFinite(plateBiasRaw.convergent) ? plateBiasRaw.convergent : 1,
    transform: Number.isFinite(plateBiasRaw.transform) ? plateBiasRaw.transform : 0.4,
    divergent: Number.isFinite(plateBiasRaw.divergent) ? plateBiasRaw.divergent : -0.6,
    interior: Number.isFinite(plateBiasRaw.interior) ? plateBiasRaw.interior : 0,
    bayWeight: Math.max(0, Number.isFinite(plateBiasRaw.bayWeight) ? plateBiasRaw.bayWeight : 0.35),
    bayNoiseBonus: Math.max(
      0,
      Number.isFinite(plateBiasRaw.bayNoiseBonus) ? plateBiasRaw.bayNoiseBonus : 1
    ),
    fjordWeight: Math.max(
      0,
      Number.isFinite(plateBiasRaw.fjordWeight) ? plateBiasRaw.fjordWeight : 0.8
    )
  };
  const corridorPolicy = tunables.FOUNDATION_CFG?.corridors || {};
  const seaPolicy = corridorPolicy.sea || {};
  const SEA_PROTECTION = seaPolicy.protection || "hard";
  const SOFT_MULT = Math.max(0, Math.min(1, seaPolicy.softChanceMultiplier ?? 0.5));
  const StoryTags = getStoryTags();
  const applyTerrain = (x, y, terrain, isLand) => {
    if (ctx) {
      writeHeightfield(ctx, x, y, { terrain, isLand });
    } else if (adapter) {
      adapter.setTerrainType(x, y, terrain);
    }
  };
  const isCoastalLand = (x, y) => {
    if (!adapter) return false;
    if (adapter.isWater(x, y)) return false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < iWidth && ny >= 0 && ny < iHeight) {
          if (adapter.isWater(nx, ny)) return true;
        }
      }
    }
    return false;
  };
  const isAdjacentToLand = (x, y, radius) => {
    if (!adapter) return false;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < iWidth && ny >= 0 && ny < iHeight) {
          if (!adapter.isWater(nx, ny)) return true;
        }
      }
    }
    return false;
  };
  const getRandom = (label, max) => {
    if (ctx) {
      return ctxRandom(ctx, label, max);
    }
    if (adapter) {
      return adapter.getRandomNumber(max, label);
    }
    return Math.floor(Math.random() * max);
  };
  const getFractalHeight = (x, y) => {
    if (adapter?.getFractalHeight) {
      return adapter.getFractalHeight(HILL_FRACTAL, x, y);
    }
    return 0;
  };
  for (let y = 1; y < iHeight - 1; y++) {
    for (let x = 1; x < iWidth - 1; x++) {
      const tileKey = `${x},${y}`;
      const onSeaLane = StoryTags.corridorSeaLane?.has(tileKey) ?? false;
      const softMult = onSeaLane && SEA_PROTECTION === "soft" ? SOFT_MULT : 1;
      if (onSeaLane && SEA_PROTECTION === "hard") {
        continue;
      }
      if (isCoastalLand(x, y)) {
        const h = getFractalHeight(x, y);
        const i = y * iWidth + x;
        const closenessByte = boundaryCloseness ? boundaryCloseness[i] | 0 : 0;
        const closenessNorm = closenessByte / 255;
        const bType = boundaryType ? boundaryType[i] | 0 : BOUNDARY_TYPE.none;
        const nearBoundary = closenessNorm >= plateBiasCfg.threshold;
        const plateBiasValue = boundaryCloseness ? computePlateBias(closenessNorm, bType, plateBiasCfg) : 0;
        const isActive = StoryTags.activeMargin?.has(tileKey) || nearBoundary;
        const noiseGateBonus = plateBiasValue > 0 ? Math.round(plateBiasValue * plateBiasCfg.bayNoiseBonus) : 0;
        const noiseGate = 2 + bayNoiseExtra + (isActive ? 1 : 0) + noiseGateBonus;
        const bayRollDen = isActive ? bayRollDenActive : bayRollDenDefault;
        let bayRollDenUsed = softMult !== 1 ? Math.max(1, Math.round(bayRollDen / softMult)) : bayRollDen;
        if (plateBiasCfg.bayWeight > 0 && plateBiasValue !== 0) {
          const scale = clamp(1 + plateBiasValue * plateBiasCfg.bayWeight, 0.25, 4);
          bayRollDenUsed = Math.max(1, Math.round(bayRollDenUsed / scale));
        }
        let laneAttr = null;
        for (let ddy = -1; ddy <= 1 && !laneAttr; ddy++) {
          for (let ddx = -1; ddx <= 1; ddx++) {
            if (ddx === 0 && ddy === 0) continue;
            const k = `${x + ddx},${y + ddy}`;
            if (StoryTags.corridorSeaLane?.has(k)) {
              laneAttr = StoryTags.corridorAttributes?.get(k) || null;
              if (laneAttr) break;
            }
          }
        }
        if (laneAttr?.edge) {
          const edgeCfg = laneAttr.edge;
          const bayMult = Number.isFinite(edgeCfg.bayCarveMultiplier) ? edgeCfg.bayCarveMultiplier : 1;
          if (bayMult && bayMult !== 1) {
            bayRollDenUsed = Math.max(1, Math.round(bayRollDenUsed / bayMult));
          }
        }
        if (h % 97 < noiseGate && getRandom("Carve Bay", bayRollDenUsed) === 0) {
          applyTerrain(x, y, COAST_TERRAIN, false);
          continue;
        }
      }
      if (adapter?.isWater(x, y)) {
        if (isAdjacentToLand(x, y, 1)) {
          const i = y * iWidth + x;
          const closenessByte = boundaryCloseness ? boundaryCloseness[i] | 0 : 0;
          const closenessNorm = closenessByte / 255;
          const bType = boundaryType ? boundaryType[i] | 0 : BOUNDARY_TYPE.none;
          const nearBoundary = closenessNorm >= plateBiasCfg.threshold;
          const plateBiasValue = boundaryCloseness ? computePlateBias(closenessNorm, bType, plateBiasCfg) : 0;
          let nearActive = nearBoundary;
          let nearPassive = false;
          for (let ddy = -1; ddy <= 1 && (!nearActive || !nearPassive); ddy++) {
            for (let ddx = -1; ddx <= 1; ddx++) {
              if (ddx === 0 && ddy === 0) continue;
              const nx = x + ddx;
              const ny = y + ddy;
              if (nx <= 0 || nx >= iWidth - 1 || ny <= 0 || ny >= iHeight - 1) continue;
              const k = `${nx},${ny}`;
              if (!nearActive && StoryTags.activeMargin?.has(k)) nearActive = true;
              if (!nearPassive && StoryTags.passiveShelf?.has(k)) nearPassive = true;
            }
          }
          const denom = Math.max(
            4,
            fjordBaseDenom - (nearPassive ? fjordPassiveBonus : 0) - (nearActive ? fjordActiveBonus : 0)
          );
          let denomUsed = softMult !== 1 ? Math.max(1, Math.round(denom / softMult)) : denom;
          if (plateBiasCfg.fjordWeight > 0 && plateBiasValue !== 0) {
            const fjScale = clamp(1 + plateBiasValue * plateBiasCfg.fjordWeight, 0.2, 5);
            denomUsed = Math.max(1, Math.round(denomUsed / fjScale));
          }
          let edgeCfg = null;
          for (let my = -1; my <= 1 && !edgeCfg; my++) {
            for (let mx = -1; mx <= 1; mx++) {
              if (mx === 0 && my === 0) continue;
              const kk = `${x + mx},${y + my}`;
              if (StoryTags.corridorSeaLane?.has(kk)) {
                const attr = StoryTags.corridorAttributes?.get(kk);
                edgeCfg = attr?.edge ? attr.edge : null;
                if (edgeCfg) break;
              }
            }
          }
          if (edgeCfg) {
            const fj = Number.isFinite(edgeCfg.fjordChance) ? edgeCfg.fjordChance : 0;
            const cliffs = Number.isFinite(edgeCfg.cliffsChance) ? edgeCfg.cliffsChance : 0;
            const effect = Math.max(0, Math.min(0.5, fj + cliffs * 0.5));
            if (effect > 0) {
              denomUsed = Math.max(1, Math.round(denomUsed * (1 - effect)));
            }
          }
          if (getRandom("Fjord Coast", denomUsed) === 0) {
            applyTerrain(x, y, COAST_TERRAIN, false);
          }
        }
      }
    }
  }
}
var HILL_FRACTAL2 = 1;
var COAST_TERRAIN2 = 1;
var FLAT_TERRAIN3 = 3;
function storyKey(x, y) {
  return `${x},${y}`;
}
function addIslandChains(iWidth, iHeight, ctx) {
  const adapter = ctx?.adapter;
  if (adapter?.createFractal) {
    adapter.createFractal(HILL_FRACTAL2, iWidth, iHeight, 5, 0);
  }
  const tunables = getTunables();
  const islandsCfg = tunables.FOUNDATION_CFG?.islands || {};
  const storyTunables = tunables.FOUNDATION_CFG?.story || {};
  const corridorsCfg = tunables.FOUNDATION_CFG?.corridors || {};
  const fracPct = (islandsCfg.fractalThresholdPercent ?? 90) | 0;
  const threshold = getFractalThreshold(adapter, fracPct);
  const paradiseWeight = (storyTunables.hotspot?.paradiseBias ?? 2) | 0;
  const volcanicWeight = (storyTunables.hotspot?.volcanicBias ?? 1) | 0;
  const peakPercent = Math.max(
    0,
    Math.min(100, Math.round((storyTunables.hotspot?.volcanicPeakChance ?? 0.33) * 100) + 10)
  );
  const StoryTags = getStoryTags();
  const applyTerrain = (tileX, tileY, terrain, isLand) => {
    if (ctx) {
      writeHeightfield(ctx, tileX, tileY, { terrain, isLand });
    } else if (adapter) {
      adapter.setTerrainType(tileX, tileY, terrain);
    }
  };
  const getRandom = (label, max) => {
    if (ctx) {
      return ctxRandom(ctx, label, max);
    }
    if (adapter) {
      return adapter.getRandomNumber(max, label);
    }
    return Math.floor(Math.random() * max);
  };
  const getFractalHeight = (x, y) => {
    if (adapter?.getFractalHeight) {
      return adapter.getFractalHeight(HILL_FRACTAL2, x, y);
    }
    return 0;
  };
  const isWater = (x, y) => {
    if (adapter) {
      return adapter.isWater(x, y);
    }
    return true;
  };
  const isAdjacentToLand = (x, y, radius) => {
    if (!adapter) return false;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < iWidth && ny >= 0 && ny < iHeight) {
          if (!adapter.isWater(nx, ny)) return true;
        }
      }
    }
    return false;
  };
  for (let y = 2; y < iHeight - 2; y++) {
    for (let x = 2; x < iWidth - 2; x++) {
      if (!isWater(x, y)) continue;
      const minDist = (islandsCfg.minDistFromLandRadius ?? 2) | 0;
      if (isAdjacentToLand(x, y, Math.max(0, minDist))) continue;
      const laneRadius = (corridorsCfg.sea?.avoidRadius ?? 2) | 0;
      if (laneRadius > 0 && StoryTags.corridorSeaLane && StoryTags.corridorSeaLane.size > 0) {
        let nearSeaLane = false;
        for (let my = -laneRadius; my <= laneRadius && !nearSeaLane; my++) {
          for (let mx = -laneRadius; mx <= laneRadius; mx++) {
            const kk = storyKey(x + mx, y + my);
            if (StoryTags.corridorSeaLane.has(kk)) {
              nearSeaLane = true;
              break;
            }
          }
        }
        if (nearSeaLane) continue;
      }
      const v = getFractalHeight(x, y);
      const isHotspot = StoryTags.hotspot.has(storyKey(x, y));
      let nearActive = false;
      let nearPassive = false;
      for (let my = -1; my <= 1 && (!nearActive || !nearPassive); my++) {
        for (let mx = -1; mx <= 1; mx++) {
          if (mx === 0 && my === 0) continue;
          const k = storyKey(x + mx, y + my);
          if (!nearActive && StoryTags.activeMargin?.has(k)) nearActive = true;
          if (!nearPassive && StoryTags.passiveShelf?.has(k)) nearPassive = true;
        }
      }
      const denActive = (islandsCfg.baseIslandDenNearActive ?? 5) | 0;
      const denElse = (islandsCfg.baseIslandDenElse ?? 7) | 0;
      const baseIslandDen = nearActive ? denActive : denElse;
      const baseAllowed = v > threshold && getRandom("Island Seed", baseIslandDen) === 0;
      const hotspotAllowed = isHotspot && getRandom("Hotspot Island Seed", Math.max(1, (islandsCfg.hotspotSeedDenom ?? 2) | 0)) === 0;
      if (!(baseAllowed || hotspotAllowed)) continue;
      let centerTerrain = COAST_TERRAIN2;
      let classifyParadise = false;
      if (isHotspot) {
        const pWeight = paradiseWeight + (nearPassive ? 1 : 0);
        const vWeight = volcanicWeight;
        const bucket = pWeight + vWeight;
        const roll = getRandom("HotspotKind", bucket || 1);
        classifyParadise = roll < pWeight;
        if (!classifyParadise) {
          if (getRandom("HotspotPeak", 100) < peakPercent) {
            centerTerrain = FLAT_TERRAIN3;
          }
        }
      }
      const centerIsLand = centerTerrain !== COAST_TERRAIN2 && centerTerrain !== 0;
      applyTerrain(x, y, centerTerrain, centerIsLand);
      if (isHotspot) {
        if (classifyParadise) {
          StoryTags.hotspotParadise.add(storyKey(x, y));
        } else {
          StoryTags.hotspotVolcanic.add(storyKey(x, y));
        }
      }
      const maxCluster = Math.max(1, (islandsCfg.clusterMax ?? 3) | 0);
      const count = 1 + getRandom("Island Size", maxCluster);
      for (let n = 0; n < count; n++) {
        const dx = getRandom("dx", 3) - 1;
        const dy = getRandom("dy", 3) - 1;
        const nx = x + dx;
        const ny = y + dy;
        if (nx <= 0 || nx >= iWidth - 1 || ny <= 0 || ny >= iHeight - 1) continue;
        if (!isWater(nx, ny)) continue;
        applyTerrain(nx, ny, COAST_TERRAIN2, false);
      }
    }
  }
}
function getFractalThreshold(adapter, percent) {
  const clampedPercent = Math.max(0, Math.min(100, percent));
  return Math.floor(clampedPercent / 100 * 65535);
}
var MOUNTAIN_FRACTAL = 0;
var HILL_FRACTAL3 = 1;
var MOUNTAIN_TERRAIN = 5;
var HILL_TERRAIN = 4;
var COAST_TERRAIN3 = 1;
var OCEAN_TERRAIN3 = 0;
function idx2(x, y, width) {
  return y * width + x;
}
function layerAddMountainsPhysics(ctx, options = {}) {
  const {
    tectonicIntensity = 1,
    mountainThreshold = 0.45,
    hillThreshold = 0.25,
    upliftWeight = 0.75,
    fractalWeight = 0.25,
    riftDepth = 0.3,
    boundaryWeight = 0.6,
    boundaryExponent = 1.4,
    interiorPenaltyWeight = 0.2,
    convergenceBonus = 0.9,
    transformPenalty = 0.3,
    riftPenalty = 0.75,
    hillBoundaryWeight = 0.45,
    hillRiftBonus = 0.5,
    hillConvergentFoothill = 0.25,
    hillInteriorFalloff = 0.2,
    hillUpliftWeight = 0.25
  } = options;
  const scaledConvergenceBonus = convergenceBonus * tectonicIntensity;
  const scaledBoundaryWeight = boundaryWeight * tectonicIntensity;
  const scaledUpliftWeight = upliftWeight * tectonicIntensity;
  const scaledHillBoundaryWeight = hillBoundaryWeight * tectonicIntensity;
  const scaledHillConvergentFoothill = hillConvergentFoothill * tectonicIntensity;
  const dimensions = ctx?.dimensions;
  const width = dimensions?.width ?? 0;
  const height = dimensions?.height ?? 0;
  const adapter = ctx?.adapter;
  if (!width || !height || !adapter) {
    return;
  }
  const isWater = createIsWaterTile(ctx, adapter, width, height);
  const terrainWriter = (x, y, terrain) => {
    const isLand = terrain !== COAST_TERRAIN3 && terrain !== OCEAN_TERRAIN3;
    writeHeightfield(ctx, x, y, { terrain, isLand });
  };
  const worldModelEnabled = WorldModel.isEnabled();
  const grainAmount = 5;
  const iFlags = 0;
  adapter.createFractal(MOUNTAIN_FRACTAL, width, height, grainAmount, iFlags);
  adapter.createFractal(HILL_FRACTAL3, width, height, grainAmount, iFlags);
  let landTiles = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!isWater(x, y)) {
        landTiles++;
      }
    }
  }
  const size = width * height;
  const scores = new Float32Array(size);
  const hillScores = new Float32Array(size);
  if (worldModelEnabled) {
    computePlateBasedScores(
      ctx,
      scores,
      hillScores,
      {
        upliftWeight: scaledUpliftWeight,
        fractalWeight,
        boundaryWeight: scaledBoundaryWeight,
        boundaryExponent,
        interiorPenaltyWeight,
        convergenceBonus: scaledConvergenceBonus,
        transformPenalty,
        riftPenalty,
        hillBoundaryWeight: scaledHillBoundaryWeight,
        hillRiftBonus,
        hillConvergentFoothill: scaledHillConvergentFoothill,
        hillInteriorFalloff,
        hillUpliftWeight
      },
      isWater,
      adapter
    );
  } else {
    computeFractalOnlyScores(ctx, scores, hillScores, adapter);
  }
  if (worldModelEnabled && riftDepth > 0) {
    applyRiftDepressions(ctx, scores, hillScores, riftDepth);
  }
  const selectionAdapter = { isWater };
  const mountainTiles = selectTilesAboveThreshold(
    scores,
    width,
    height,
    mountainThreshold,
    selectionAdapter
  );
  const hillTiles = selectTilesAboveThreshold(
    hillScores,
    width,
    height,
    hillThreshold,
    selectionAdapter,
    mountainTiles
  );
  for (const i of mountainTiles) {
    const x = i % width;
    const y = Math.floor(i / width);
    terrainWriter(x, y, MOUNTAIN_TERRAIN);
  }
  for (const i of hillTiles) {
    const x = i % width;
    const y = Math.floor(i / width);
    terrainWriter(x, y, HILL_TERRAIN);
  }
}
function computePlateBasedScores(ctx, scores, hillScores, options, isWaterCheck, adapter) {
  const dims = ctx?.dimensions;
  const width = dims?.width ?? 0;
  const height = dims?.height ?? 0;
  const upliftPotential = WorldModel.upliftPotential;
  const boundaryType = WorldModel.boundaryType;
  const boundaryCloseness = WorldModel.boundaryCloseness;
  const riftPotential = WorldModel.riftPotential;
  if (!upliftPotential || !boundaryType) {
    computeFractalOnlyScores(ctx, scores, hillScores, adapter);
    return;
  }
  const boundaryGate = 0.2;
  const falloffExponent = options.boundaryExponent || 2.5;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx2(x, y, width);
      const uplift = upliftPotential ? upliftPotential[i] / 255 : 0;
      const bType = boundaryType[i];
      const closenessRaw = boundaryCloseness ? boundaryCloseness[i] / 255 : 0;
      const rift = riftPotential ? riftPotential[i] / 255 : 0;
      const fractalMtn = adapter.getFractalHeight(MOUNTAIN_FRACTAL, x, y) / 65535;
      const fractalHill = adapter.getFractalHeight(HILL_FRACTAL3, x, y) / 65535;
      let mountainScore = uplift * options.upliftWeight + fractalMtn * options.fractalWeight;
      if (closenessRaw > boundaryGate) {
        const normalized = (closenessRaw - boundaryGate) / (1 - boundaryGate);
        const intensity = Math.pow(normalized, falloffExponent);
        if (options.boundaryWeight > 0) {
          const foothillNoise = 0.5 + fractalMtn * 0.5;
          mountainScore += intensity * options.boundaryWeight * foothillNoise;
        }
        if (bType === BOUNDARY_TYPE.convergent) {
          const peakNoise = 0.3 + fractalMtn * 0.7;
          mountainScore += intensity * options.convergenceBonus * peakNoise;
        } else if (bType === BOUNDARY_TYPE.divergent) {
          mountainScore *= Math.max(0, 1 - intensity * options.riftPenalty);
        } else if (bType === BOUNDARY_TYPE.transform) {
          mountainScore *= Math.max(0, 1 - intensity * options.transformPenalty);
        }
      }
      if (options.interiorPenaltyWeight > 0) {
        const interiorPenalty = (1 - closenessRaw) * options.interiorPenaltyWeight;
        mountainScore = Math.max(0, mountainScore - interiorPenalty);
      }
      scores[i] = Math.max(0, mountainScore);
      let hillScore = fractalHill * options.fractalWeight + uplift * options.hillUpliftWeight;
      if (closenessRaw > boundaryGate) {
        const normalized = (closenessRaw - boundaryGate) / (1 - boundaryGate);
        const hillIntensity = Math.sqrt(normalized);
        const foothillExtent = 0.4 + fractalHill * 0.6;
        if (options.hillBoundaryWeight > 0) {
          hillScore += hillIntensity * options.hillBoundaryWeight * foothillExtent;
        }
        if (bType === BOUNDARY_TYPE.divergent) {
          hillScore += hillIntensity * rift * options.hillRiftBonus * foothillExtent;
        } else if (bType === BOUNDARY_TYPE.convergent) {
          hillScore += hillIntensity * options.hillConvergentFoothill * foothillExtent;
        }
      }
      if (options.hillInteriorFalloff > 0) {
        hillScore -= (1 - closenessRaw) * options.hillInteriorFalloff;
      }
      hillScores[i] = Math.max(0, hillScore);
    }
  }
}
function computeFractalOnlyScores(ctx, scores, hillScores, adapter) {
  const dims = ctx?.dimensions;
  const width = dims?.width ?? 0;
  const height = dims?.height ?? 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx2(x, y, width);
      scores[i] = adapter.getFractalHeight(MOUNTAIN_FRACTAL, x, y) / 65535;
      hillScores[i] = adapter.getFractalHeight(HILL_FRACTAL3, x, y) / 65535;
    }
  }
}
function applyRiftDepressions(ctx, scores, hillScores, riftDepth) {
  const dims = ctx?.dimensions;
  const width = dims?.width ?? 0;
  const height = dims?.height ?? 0;
  const riftPotential = WorldModel.riftPotential;
  const boundaryType = WorldModel.boundaryType;
  if (!riftPotential || !boundaryType) return;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = idx2(x, y, width);
      const rift = riftPotential[i] / 255;
      const bType = boundaryType[i];
      if (bType === BOUNDARY_TYPE.divergent) {
        const depression = rift * riftDepth;
        scores[i] = Math.max(0, scores[i] - depression);
        hillScores[i] = Math.max(0, hillScores[i] - depression * 0.5);
      }
    }
  }
}
function createIsWaterTile(ctx, adapter, width, height) {
  const landMask = ctx?.buffers?.heightfield?.landMask || null;
  return (x, y) => {
    if (landMask) {
      const i = y * width + x;
      if (i >= 0 && i < landMask.length) {
        return landMask[i] === 0;
      }
    }
    return adapter.isWater(x, y);
  };
}
function selectTilesAboveThreshold(scores, width, height, threshold, adapter, excludeSet = null) {
  const selected = /* @__PURE__ */ new Set();
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (adapter.isWater(x, y)) continue;
      if (excludeSet && excludeSet.has(i)) continue;
      if (scores[i] > threshold) {
        selected.add(i);
      }
    }
  }
  return selected;
}
var MOUNTAIN_TERRAIN2 = 5;
var VOLCANO_FEATURE = 1;
function idx22(x, y, width) {
  return y * width + x;
}
function clamp2(value, min, max) {
  if (typeof max === "number" && max >= min) {
    if (value < min) return min;
    if (value > max) return max;
    return value;
  }
  return Math.max(value, min);
}
function isTooCloseToExisting(x, y, placed, minSpacing) {
  for (const p of placed) {
    const dx = Math.abs(x - p.x);
    const dy = Math.abs(y - p.y);
    const dist = Math.max(dx, dy);
    if (dist < minSpacing) {
      return true;
    }
  }
  return false;
}
function layerAddVolcanoesPlateAware(ctx, options = {}) {
  const {
    enabled = true,
    baseDensity = 1 / 170,
    minSpacing = 3,
    boundaryThreshold = 0.35,
    boundaryWeight = 1.2,
    convergentMultiplier = 2.4,
    transformMultiplier = 1.1,
    divergentMultiplier = 0.35,
    hotspotWeight = 0.12,
    shieldPenalty = 0.6,
    randomJitter = 0.08,
    minVolcanoes = 5,
    maxVolcanoes = 40
  } = options;
  const dimensions = ctx?.dimensions;
  const width = dimensions?.width ?? 0;
  const height = dimensions?.height ?? 0;
  const adapter = ctx?.adapter;
  if (!width || !height || !adapter) {
    return;
  }
  if (!enabled) {
    return;
  }
  const worldEnabled = WorldModel.isEnabled();
  const boundaryCloseness = WorldModel.boundaryCloseness;
  const boundaryType = WorldModel.boundaryType;
  const shieldStability = WorldModel.shieldStability;
  if (!worldEnabled || !boundaryCloseness || !boundaryType) {
    return;
  }
  let landTiles = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!adapter.isWater(x, y)) landTiles++;
    }
  }
  const rawDesired = Math.round(landTiles * Math.max(0, baseDensity));
  const targetVolcanoes = clamp2(
    Math.max(minVolcanoes | 0, rawDesired),
    minVolcanoes | 0,
    maxVolcanoes > 0 ? maxVolcanoes | 0 : rawDesired
  );
  if (targetVolcanoes <= 0) {
    return;
  }
  const candidates = [];
  const hotspotBase = Math.max(0, hotspotWeight);
  const threshold = Math.max(0, Math.min(1, boundaryThreshold));
  const shieldWeight = Math.max(0, Math.min(1, shieldPenalty));
  const jitter = Math.max(0, randomJitter);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) continue;
      if (adapter.getFeatureType(x, y) === VOLCANO_FEATURE) continue;
      const i = idx22(x, y, width);
      const closeness = boundaryCloseness[i] / 255;
      const shield = shieldStability ? shieldStability[i] / 255 : 0;
      const bType = boundaryType[i] | 0;
      let weight = 0;
      let boundaryBand = 0;
      if (closeness >= threshold) {
        boundaryBand = (closeness - threshold) / Math.max(1e-3, 1 - threshold);
        const base = boundaryBand * Math.max(0, boundaryWeight);
        let multiplier = 1;
        if (bType === BOUNDARY_TYPE.convergent) multiplier = Math.max(0, convergentMultiplier);
        else if (bType === BOUNDARY_TYPE.transform) multiplier = Math.max(0, transformMultiplier);
        else if (bType === BOUNDARY_TYPE.divergent) multiplier = Math.max(0, divergentMultiplier);
        weight += base * multiplier;
      } else {
        const interiorBand = 1 - closeness;
        weight += hotspotBase * interiorBand;
      }
      if (weight <= 0) continue;
      if (shieldWeight > 0) {
        const penalty = shield * shieldWeight;
        weight *= Math.max(0, 1 - penalty);
      }
      if (jitter > 0) {
        const randomScale = adapter.getRandomNumber(1e3, "VolcanoJitter") / 1e3;
        weight += randomScale * jitter;
      }
      if (weight > 0) {
        candidates.push({ x, y, weight, closeness, boundaryType: bType });
      }
    }
  }
  if (candidates.length === 0) {
    return;
  }
  candidates.sort((a, b) => b.weight - a.weight);
  const placed = [];
  const minSpacingClamped = Math.max(1, minSpacing | 0);
  for (const candidate of candidates) {
    if (placed.length >= targetVolcanoes) break;
    if (adapter.getFeatureType(candidate.x, candidate.y) === VOLCANO_FEATURE) continue;
    if (isTooCloseToExisting(candidate.x, candidate.y, placed, minSpacingClamped)) continue;
    writeHeightfield(ctx, candidate.x, candidate.y, {
      terrain: MOUNTAIN_TERRAIN2,
      isLand: true
    });
    const featureData = {
      Feature: VOLCANO_FEATURE,
      Direction: -1,
      Elevation: 0
    };
    adapter.setFeatureType(candidate.x, candidate.y, featureData);
    placed.push({ x: candidate.x, y: candidate.y });
  }
}
var PLOT_TAG = {
  NONE: 0,
  LANDMASS: 1,
  WATER: 2,
  EAST_LANDMASS: 3,
  WEST_LANDMASS: 4,
  EAST_WATER: 5,
  WEST_WATER: 6
};
function addPlotTagsSimple(height, width, eastContinentLeftCol, adapter, terrainBuilder) {
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      terrainBuilder.setPlotTag(x, y, PLOT_TAG.NONE);
      const isLand = !adapter.isWater(x, y);
      if (isLand) {
        terrainBuilder.addPlotTag(x, y, PLOT_TAG.LANDMASS);
        if (x >= eastContinentLeftCol) {
          terrainBuilder.addPlotTag(x, y, PLOT_TAG.EAST_LANDMASS);
        } else {
          terrainBuilder.addPlotTag(x, y, PLOT_TAG.WEST_LANDMASS);
        }
      } else {
        terrainBuilder.addPlotTag(x, y, PLOT_TAG.WATER);
        if (x >= eastContinentLeftCol - 1) {
          terrainBuilder.addPlotTag(x, y, PLOT_TAG.EAST_WATER);
        } else {
          terrainBuilder.addPlotTag(x, y, PLOT_TAG.WEST_WATER);
        }
      }
    }
  }
}
function inBounds(x, y, width, height) {
  return x >= 0 && x < width && y >= 0 && y < height;
}
function clamp3(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
function resolveAdapter(ctx) {
  if (ctx && ctx.adapter) {
    const engineAdapter = ctx.adapter;
    return {
      isWater: (x, y) => engineAdapter.isWater(x, y),
      isMountain: (x, y) => engineAdapter.isMountain(x, y),
      isCoastalLand: () => false,
      // Not on base interface - computed locally
      isAdjacentToShallowWater: () => false,
      // Not on base interface - computed locally
      isAdjacentToRivers: (x, y, radius) => engineAdapter.isAdjacentToRivers(x, y, radius),
      getRainfall: (x, y) => engineAdapter.getRainfall(x, y),
      setRainfall: (x, y, rf) => engineAdapter.setRainfall(x, y, rf),
      getElevation: (x, y) => engineAdapter.getElevation(x, y),
      getLatitude: (x, y) => engineAdapter.getLatitude(x, y),
      getRandomNumber: (max, label) => engineAdapter.getRandomNumber(max, label)
    };
  }
  return {
    isWater: () => {
      throw new Error("ClimateEngine: No adapter available");
    },
    isMountain: () => {
      throw new Error("ClimateEngine: No adapter available");
    },
    isCoastalLand: () => false,
    isAdjacentToShallowWater: () => false,
    isAdjacentToRivers: () => false,
    getRainfall: () => 0,
    setRainfall: () => {
    },
    getElevation: () => 0,
    getLatitude: () => 0,
    getRandomNumber: (max) => Math.floor(Math.random() * max)
  };
}
function createClimateRuntime(width, height, ctx) {
  const adapter = resolveAdapter(ctx);
  const rainfallBuf = ctx?.buffers?.climate?.rainfall || null;
  const idx4 = (x, y) => y * width + x;
  const readRainfall = (x, y) => {
    if (ctx && rainfallBuf) {
      return rainfallBuf[idx4(x, y)] | 0;
    }
    return adapter.getRainfall(x, y);
  };
  const writeRainfall = (x, y, rainfall) => {
    const clamped = clamp3(rainfall, 0, 200);
    if (ctx) {
      writeClimateField(ctx, x, y, { rainfall: clamped });
    } else {
      adapter.setRainfall(x, y, clamped);
    }
  };
  const rand = (max, label) => {
    if (ctx) {
      return ctxRandom(ctx, label || "ClimateRand", max);
    }
    return adapter.getRandomNumber(max, label || "ClimateRand");
  };
  return {
    adapter,
    readRainfall,
    writeRainfall,
    rand,
    idx: idx4
  };
}
function distanceToNearestWater(x, y, maxR, adapter, width, height) {
  for (let r = 1; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          if (adapter.isWater(nx, ny)) return r;
        }
      }
    }
  }
  return -1;
}
function hasUpwindBarrier(x, y, dx, dy, steps, adapter, width, height) {
  for (let s = 1; s <= steps; s++) {
    const nx = x + dx * s;
    const ny = y + dy * s;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) break;
    if (!adapter.isWater(nx, ny)) {
      if (adapter.isMountain && adapter.isMountain(nx, ny)) return s;
      const elev = adapter.getElevation(nx, ny);
      if (elev >= 500) return s;
    }
  }
  return 0;
}
function hasUpwindBarrierWM(x, y, steps, adapter, width, height, worldModel) {
  const U = worldModel.windU;
  const V = worldModel.windV;
  if (!U || !V) return 0;
  let cx = x;
  let cy = y;
  for (let s = 1; s <= steps; s++) {
    const i = cy * width + cx;
    let ux = 0;
    let vy = 0;
    if (i >= 0 && i < U.length) {
      const u = U[i] | 0;
      const v = V[i] | 0;
      if (Math.abs(u) >= Math.abs(v)) {
        ux = u === 0 ? 0 : u > 0 ? 1 : -1;
        vy = 0;
      } else {
        ux = 0;
        vy = v === 0 ? 0 : v > 0 ? 1 : -1;
      }
      if (ux === 0 && vy === 0) {
        const lat = Math.abs(adapter.getLatitude(cx, cy));
        ux = lat < 30 || lat >= 60 ? -1 : 1;
        vy = 0;
      }
    } else {
      const lat = Math.abs(adapter.getLatitude(cx, cy));
      ux = lat < 30 || lat >= 60 ? -1 : 1;
      vy = 0;
    }
    const nx = cx + ux;
    const ny = cy + vy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) break;
    if (!adapter.isWater(nx, ny)) {
      if (adapter.isMountain && adapter.isMountain(nx, ny)) return s;
      const elev = adapter.getElevation(nx, ny);
      if (elev >= 500) return s;
    }
    cx = nx;
    cy = ny;
  }
  return 0;
}
function applyClimateBaseline(width, height, ctx = null) {
  console.log("Building enhanced rainfall patterns...");
  if (ctx) {
    syncClimateField(ctx);
  }
  const runtime = createClimateRuntime(width, height, ctx);
  const { adapter, readRainfall, writeRainfall, rand } = runtime;
  const tunables = getTunables();
  const climateCfg = tunables.CLIMATE_CFG || {};
  const baselineCfg = climateCfg.baseline || {};
  const bands = baselineCfg.bands || {};
  const blend = baselineCfg.blend || {};
  const orographic = baselineCfg.orographic || {};
  const coastalCfg = baselineCfg.coastal || {};
  const noiseCfg = baselineCfg.noise || {};
  const BASE_AREA = 1e4;
  const sqrt = Math.min(
    2,
    Math.max(0.6, Math.sqrt(Math.max(1, width * height) / BASE_AREA))
  );
  const equatorPlus = Math.round(12 * (sqrt - 1));
  const noiseBase = Number.isFinite(noiseCfg?.baseSpanSmall) ? noiseCfg.baseSpanSmall : 3;
  const noiseSpan = sqrt > 1 ? noiseBase + Math.round(
    Number.isFinite(noiseCfg?.spanLargeScaleFactor) ? noiseCfg.spanLargeScaleFactor : 1
  ) : noiseBase;
  const isCoastalLand = (x, y) => {
    if (adapter.isCoastalLand) return adapter.isCoastalLand(x, y);
    if (adapter.isWater(x, y)) return false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue;
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        if (adapter.isWater(nx, ny)) return true;
      }
    }
    return false;
  };
  const isAdjacentToShallowWater = (x, y) => {
    if (adapter.isAdjacentToShallowWater)
      return adapter.isAdjacentToShallowWater(x, y);
    return false;
  };
  const rollNoise = () => rand(noiseSpan * 2 + 1, "RainNoise") - noiseSpan;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (adapter.isWater(x, y)) continue;
      const base = readRainfall(x, y);
      const elevation = adapter.getElevation(x, y);
      const lat = Math.abs(adapter.getLatitude(x, y));
      const b0 = Number.isFinite(bands.deg0to10) ? bands.deg0to10 : 120;
      const b1 = Number.isFinite(bands.deg10to20) ? bands.deg10to20 : 104;
      const b2 = Number.isFinite(bands.deg20to35) ? bands.deg20to35 : 75;
      const b3 = Number.isFinite(bands.deg35to55) ? bands.deg35to55 : 70;
      const b4 = Number.isFinite(bands.deg55to70) ? bands.deg55to70 : 60;
      const b5 = Number.isFinite(bands.deg70plus) ? bands.deg70plus : 45;
      let bandRain = 0;
      if (lat < 10) bandRain = b0 + equatorPlus;
      else if (lat < 20) bandRain = b1 + Math.floor(equatorPlus * 0.6);
      else if (lat < 35) bandRain = b2;
      else if (lat < 55) bandRain = b3;
      else if (lat < 70) bandRain = b4;
      else bandRain = b5;
      const baseW = Number.isFinite(blend?.baseWeight) ? blend.baseWeight : 0.6;
      const bandW = Number.isFinite(blend?.bandWeight) ? blend.bandWeight : 0.4;
      let currentRainfall = Math.round(base * baseW + bandRain * bandW);
      const hi1T = Number.isFinite(orographic?.hi1Threshold) ? orographic.hi1Threshold : 350;
      const hi1B = Number.isFinite(orographic?.hi1Bonus) ? orographic.hi1Bonus : 8;
      const hi2T = Number.isFinite(orographic?.hi2Threshold) ? orographic.hi2Threshold : 600;
      const hi2B = Number.isFinite(orographic?.hi2Bonus) ? orographic.hi2Bonus : 7;
      if (elevation > hi1T) currentRainfall += hi1B;
      if (elevation > hi2T) currentRainfall += hi2B;
      const coastalBonus = Number.isFinite(coastalCfg.coastalLandBonus) ? coastalCfg.coastalLandBonus : 24;
      const shallowBonus = Number.isFinite(coastalCfg.shallowAdjBonus) ? coastalCfg.shallowAdjBonus : 16;
      if (isCoastalLand(x, y)) currentRainfall += coastalBonus;
      if (isAdjacentToShallowWater(x, y)) currentRainfall += shallowBonus;
      currentRainfall += rollNoise();
      writeRainfall(x, y, currentRainfall);
    }
  }
}
function refineClimateEarthlike(width, height, ctx = null, options = {}) {
  const runtime = createClimateRuntime(width, height, ctx);
  const { adapter, readRainfall, writeRainfall } = runtime;
  const worldModel = ctx && ctx.worldModel ? ctx.worldModel : WorldModel;
  const tunables = getTunables();
  const climateCfg = tunables.CLIMATE_CFG || {};
  const refineCfg = climateCfg.refine || {};
  const storyMoisture = climateCfg.story;
  const storyRain = storyMoisture?.rainfall || {};
  const orogenyCache = options?.orogenyCache || null;
  const StoryTags = getStoryTags();
  const inBounds2 = (x, y) => inBounds(x, y, width, height);
  console.log(
    `[Climate Refinement] Using ${ctx ? "MapContext adapter" : "direct engine calls"}`
  );
  {
    const waterGradient = refineCfg.waterGradient || {};
    const maxR = (waterGradient?.radius ?? 5) | 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (adapter.isWater(x, y)) continue;
        let rf = readRainfall(x, y);
        const dist = distanceToNearestWater(x, y, maxR, adapter, width, height);
        if (dist >= 0) {
          const elev = adapter.getElevation(x, y);
          let bonus = Math.max(0, maxR - dist) * (waterGradient?.perRingBonus ?? 5);
          if (elev < 150) bonus += waterGradient?.lowlandBonus ?? 3;
          rf += bonus;
          writeRainfall(x, y, rf);
        }
      }
    }
  }
  {
    const orographic = refineCfg.orographic || {};
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (adapter.isWater(x, y)) continue;
        const baseSteps = (orographic?.steps ?? 4) | 0;
        let steps = baseSteps;
        try {
          const DIR = tunables.FOUNDATION_DIRECTIONALITY || {};
          const coh = Math.max(0, Math.min(1, DIR?.cohesion ?? 0));
          const interplay = DIR.interplay;
          const windC = Math.max(0, Math.min(1, interplay?.windsFollowPlates ?? 0));
          const extra = Math.round(coh * windC);
          steps = Math.max(1, baseSteps + extra);
        } catch {
          steps = baseSteps;
        }
        let barrier = 0;
        const worldModelEnabled = WorldModel.isEnabled() && WorldModel.windU && WorldModel.windV;
        if (worldModelEnabled) {
          barrier = hasUpwindBarrierWM(
            x,
            y,
            steps,
            adapter,
            width,
            height,
            WorldModel
          );
        } else {
          const lat = Math.abs(adapter.getLatitude(x, y));
          const dx = lat < 30 || lat >= 60 ? -1 : 1;
          const dy = 0;
          barrier = hasUpwindBarrier(x, y, dx, dy, steps, adapter, width, height);
        }
        if (barrier) {
          const rf = readRainfall(x, y);
          const reduction = (orographic?.reductionBase ?? 8) + barrier * (orographic?.reductionPerStep ?? 6);
          writeRainfall(x, y, rf - reduction);
        }
      }
    }
  }
  {
    const riverCorridor = refineCfg.riverCorridor || {};
    const lowBasinCfg = refineCfg.lowBasin || {};
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (adapter.isWater(x, y)) continue;
        let rf = readRainfall(x, y);
        const elev = adapter.getElevation(x, y);
        if (adapter.isAdjacentToRivers(x, y, 1)) {
          rf += elev < 250 ? riverCorridor?.lowlandAdjacencyBonus ?? 14 : riverCorridor?.highlandAdjacencyBonus ?? 10;
        }
        let lowBasinClosed = true;
        const basinRadius = lowBasinCfg?.radius ?? 2;
        for (let dy = -basinRadius; dy <= basinRadius && lowBasinClosed; dy++) {
          for (let dx = -basinRadius; dx <= basinRadius; dx++) {
            if (dx === 0 && dy === 0) continue;
            const nx = x + dx;
            const ny = y + dy;
            if (inBounds2(nx, ny)) {
              if (adapter.getElevation(nx, ny) < elev + 20) {
                lowBasinClosed = false;
                break;
              }
            }
          }
        }
        if (lowBasinClosed && elev < 200) rf += lowBasinCfg?.delta ?? 6;
        writeRainfall(x, y, rf);
      }
    }
  }
  {
    const riftR = storyRain?.riftRadius ?? 2;
    const riftBoost = storyRain?.riftBoost ?? 8;
    if (StoryTags.riftLine.size > 0 && riftR > 0 && riftBoost !== 0) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (adapter.isWater(x, y)) continue;
          let nearRift = false;
          for (let dy = -riftR; dy <= riftR && !nearRift; dy++) {
            for (let dx = -riftR; dx <= riftR; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (!inBounds2(nx, ny)) continue;
              if (StoryTags.riftLine.has(`${nx},${ny}`)) {
                nearRift = true;
                break;
              }
            }
          }
          if (nearRift) {
            const rf = readRainfall(x, y);
            const elev = adapter.getElevation(x, y);
            const penalty = Math.max(0, Math.floor((elev - 200) / 150));
            const delta = Math.max(0, riftBoost - penalty);
            writeRainfall(x, y, rf + delta);
          }
        }
      }
    }
  }
  {
    const storyTunables = tunables.FOUNDATION_CFG?.story || {};
    const orogenyTunables = storyTunables.orogeny || {};
    if (tunables.STORY_ENABLE_OROGENY && orogenyCache !== null) {
      const windwardSet = orogenyCache.windward;
      const leeSet = orogenyCache.lee;
      const hasWindward = (windwardSet?.size ?? 0) > 0;
      const hasLee = (leeSet?.size ?? 0) > 0;
      if (hasWindward || hasLee) {
        const windwardBoost = orogenyTunables?.windwardBoost ?? 5;
        const leeAmp = orogenyTunables?.leeDrynessAmplifier ?? 1.2;
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            if (adapter.isWater(x, y)) continue;
            let rf = readRainfall(x, y);
            const key = `${x},${y}`;
            if (hasWindward && windwardSet && windwardSet.has(key)) {
              rf = clamp3(rf + windwardBoost, 0, 200);
            }
            if (hasLee && leeSet && leeSet.has(key)) {
              const baseSubtract = 8;
              const extra = Math.max(0, Math.round(baseSubtract * (leeAmp - 1)));
              rf = clamp3(rf - (baseSubtract + extra), 0, 200);
            }
            writeRainfall(x, y, rf);
          }
        }
      }
    }
  }
  {
    const paradiseDelta = storyRain?.paradiseDelta ?? 6;
    const volcanicDelta = storyRain?.volcanicDelta ?? 8;
    const radius = 2;
    const hasParadise = StoryTags.hotspotParadise.size > 0;
    const hasVolcanic = StoryTags.hotspotVolcanic.size > 0;
    if (hasParadise || hasVolcanic) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          if (adapter.isWater(x, y)) continue;
          let nearParadise = false;
          let nearVolcanic = false;
          for (let dy = -radius; dy <= radius && (!nearParadise || !nearVolcanic); dy++) {
            for (let dx = -radius; dx <= radius; dx++) {
              if (dx === 0 && dy === 0) continue;
              const nx = x + dx;
              const ny = y + dy;
              if (!inBounds2(nx, ny)) continue;
              const key = `${nx},${ny}`;
              if (!nearParadise && hasParadise && StoryTags.hotspotParadise.has(key))
                nearParadise = true;
              if (!nearVolcanic && hasVolcanic && StoryTags.hotspotVolcanic.has(key))
                nearVolcanic = true;
              if (nearParadise && nearVolcanic) break;
            }
          }
          if (nearParadise || nearVolcanic) {
            const rf = readRainfall(x, y);
            let delta = 0;
            if (nearParadise) delta += paradiseDelta;
            if (nearVolcanic) delta += volcanicDelta;
            writeRainfall(x, y, rf + delta);
          }
        }
      }
    }
  }
}
function resolveAdapter2(ctx) {
  if (ctx && ctx.adapter) {
    const engineAdapter = ctx.adapter;
    return {
      isWater: (x, y) => engineAdapter.isWater(x, y),
      isCoastalLand: () => false,
      // Not on base interface - computed locally if needed
      isAdjacentToRivers: (x, y, radius) => engineAdapter.isAdjacentToRivers(x, y, radius),
      getLatitude: (x, y) => engineAdapter.getLatitude(x, y),
      getElevation: (x, y) => engineAdapter.getElevation(x, y),
      getRainfall: (x, y) => engineAdapter.getRainfall(x, y),
      setBiomeType: () => {
      },
      // Placeholder - setBiomeType not on base interface
      getRandomNumber: (max, label) => engineAdapter.getRandomNumber(max, label),
      designateBiomes: () => {
      },
      // Placeholder - designateBiomes not on base interface
      getBiomeGlobals: () => ({
        tundra: 0,
        tropical: 1,
        grassland: 2,
        plains: 3,
        desert: 4,
        snow: 5
      })
    };
  }
  return {
    isWater: () => false,
    isCoastalLand: () => false,
    isAdjacentToRivers: () => false,
    getLatitude: () => 0,
    getElevation: () => 0,
    getRainfall: () => 0,
    setBiomeType: () => {
    },
    getRandomNumber: (max) => Math.floor(Math.random() * max),
    designateBiomes: () => {
    },
    getBiomeGlobals: () => ({
      tundra: 0,
      tropical: 1,
      grassland: 2,
      plains: 3,
      desert: 4,
      snow: 5
    })
  };
}
function designateEnhancedBiomes(iWidth, iHeight, ctx) {
  console.log("Creating enhanced biome diversity (climate-aware)...");
  const adapter = resolveAdapter2(ctx ?? null);
  const globals = adapter.getBiomeGlobals();
  adapter.designateBiomes(iWidth, iHeight);
  const tunables = getTunables();
  const foundationCfg = tunables.FOUNDATION_CFG || {};
  const biomesCfg = foundationCfg.biomes || {};
  const corridorPolicy = foundationCfg.corridors || {};
  const StoryTags = getStoryTags();
  const _tundra = biomesCfg.tundra || {};
  const TUNDRA_LAT_MIN = Number.isFinite(_tundra.latMin) ? _tundra.latMin : 70;
  const TUNDRA_ELEV_MIN = Number.isFinite(_tundra.elevMin) ? _tundra.elevMin : 850;
  const TUNDRA_RAIN_MAX = Number.isFinite(_tundra.rainMax) ? _tundra.rainMax : 90;
  const _tcoast = biomesCfg.tropicalCoast || {};
  const TCOAST_LAT_MAX = Number.isFinite(_tcoast.latMax) ? _tcoast.latMax : 18;
  const TCOAST_RAIN_MIN = Number.isFinite(_tcoast.rainMin) ? _tcoast.rainMin : 105;
  const _rv = biomesCfg.riverValleyGrassland || {};
  const RV_LAT_MAX = Number.isFinite(_rv.latMax) ? _rv.latMax : 50;
  const RV_RAIN_MIN = Number.isFinite(_rv.rainMin) ? _rv.rainMin : 75;
  const _rs = biomesCfg.riftShoulder || {};
  const RS_GRASS_LAT_MAX = Number.isFinite(_rs.grasslandLatMax) ? _rs.grasslandLatMax : 50;
  const RS_GRASS_RAIN_MIN = Number.isFinite(_rs.grasslandRainMin) ? _rs.grasslandRainMin : 75;
  const RS_TROP_LAT_MAX = Number.isFinite(_rs.tropicalLatMax) ? _rs.tropicalLatMax : 18;
  const RS_TROP_RAIN_MIN = Number.isFinite(_rs.tropicalRainMin) ? _rs.tropicalRainMin : 100;
  const LAND_BIAS_STRENGTH = Math.max(
    0,
    Math.min(1, corridorPolicy?.land?.biomesBiasStrength ?? 0.6)
  );
  const RIVER_BIAS_STRENGTH = Math.max(
    0,
    Math.min(1, corridorPolicy?.river?.biomesBiasStrength ?? 0.5)
  );
  const getRandom = (label, max) => {
    if (ctx) {
      return ctxRandom(ctx, label, max);
    }
    return adapter.getRandomNumber(max, label);
  };
  for (let y = 0; y < iHeight; y++) {
    for (let x = 0; x < iWidth; x++) {
      if (adapter.isWater(x, y)) continue;
      const lat = Math.abs(adapter.getLatitude(x, y));
      const elevation = adapter.getElevation(x, y);
      const rainfall = adapter.getRainfall(x, y);
      if ((lat > TUNDRA_LAT_MIN || elevation > TUNDRA_ELEV_MIN) && rainfall < TUNDRA_RAIN_MAX) {
        adapter.setBiomeType(x, y, globals.tundra);
        continue;
      }
      if (lat < TCOAST_LAT_MAX && adapter.isCoastalLand(x, y) && rainfall > TCOAST_RAIN_MIN) {
        adapter.setBiomeType(x, y, globals.tropical);
      }
      if (adapter.isAdjacentToRivers(x, y, 1) && rainfall > RV_RAIN_MIN && lat < RV_LAT_MAX) {
        adapter.setBiomeType(x, y, globals.grassland);
      }
      if (StoryTags.corridorLandOpen && StoryTags.corridorLandOpen.has(`${x},${y}`)) {
        if (rainfall > 80 && lat < 55 && getRandom("Corridor Land-Open Biome", 100) < Math.round(LAND_BIAS_STRENGTH * 100)) {
          adapter.setBiomeType(x, y, globals.grassland);
        }
      }
      if (StoryTags.corridorRiverChain && StoryTags.corridorRiverChain.has(`${x},${y}`)) {
        if (rainfall > 75 && lat < 55 && getRandom("Corridor River-Chain Biome", 100) < Math.round(RIVER_BIAS_STRENGTH * 100)) {
          adapter.setBiomeType(x, y, globals.grassland);
        }
      }
      {
        if (!(StoryTags.corridorLandOpen?.has?.(`${x},${y}`) || StoryTags.corridorRiverChain?.has?.(`${x},${y}`))) {
          let edgeAttr = null;
          for (let ddy = -1; ddy <= 1 && !edgeAttr; ddy++) {
            for (let ddx = -1; ddx <= 1; ddx++) {
              if (ddx === 0 && ddy === 0) continue;
              const nx = x + ddx;
              const ny = y + ddy;
              const nk = `${nx},${ny}`;
              if (!StoryTags) continue;
              if (StoryTags.corridorLandOpen?.has?.(nk) || StoryTags.corridorRiverChain?.has?.(nk)) {
                const attr = StoryTags.corridorAttributes?.get?.(nk);
                if (attr && attr.edge) edgeAttr = attr;
              }
            }
          }
          if (edgeAttr && edgeAttr.edge) {
            const edgeCfg = edgeAttr.edge;
            const forestRimChance = Math.max(
              0,
              Math.min(1, edgeCfg.forestRimChance ?? 0)
            );
            if (forestRimChance > 0 && rainfall > 90 && getRandom("Corr Forest Rim", 100) < Math.round(forestRimChance * 100)) {
              const target = lat < 22 && rainfall > 110 ? globals.tropical : globals.grassland;
              adapter.setBiomeType(x, y, target);
            }
            const hillRimChance = Math.max(
              0,
              Math.min(1, edgeCfg.hillRimChance ?? 0)
            );
            const mountainRimChance = Math.max(
              0,
              Math.min(1, edgeCfg.mountainRimChance ?? 0)
            );
            const escarpmentChance = Math.max(
              0,
              Math.min(1, edgeCfg.escarpmentChance ?? 0)
            );
            const reliefChance = Math.max(
              0,
              Math.min(1, hillRimChance + mountainRimChance + escarpmentChance)
            );
            if (reliefChance > 0 && getRandom("Corr Relief Rim", 100) < Math.round(reliefChance * 100)) {
              const elev = adapter.getElevation(x, y);
              const target = (lat > 62 || elev > 800) && rainfall < 95 ? globals.tundra : globals.plains;
              adapter.setBiomeType(x, y, target);
            }
          }
        }
      }
      {
        const cKey = `${x},${y}`;
        const attr = StoryTags.corridorAttributes?.get?.(cKey);
        const cKind = attr?.kind || StoryTags.corridorKind && StoryTags.corridorKind.get(cKey);
        const biomesCfgCorridor = attr?.biomes;
        if ((cKind === "land" || cKind === "river") && biomesCfgCorridor) {
          const strength = cKind === "land" ? LAND_BIAS_STRENGTH : RIVER_BIAS_STRENGTH;
          if (strength > 0 && getRandom("Corridor Kind Bias", 100) < Math.round(strength * 100)) {
            const entries = Object.keys(biomesCfgCorridor);
            let totalW = 0;
            for (const k of entries) totalW += Math.max(0, biomesCfgCorridor[k] || 0);
            if (totalW > 0) {
              let roll = getRandom("Corridor Kind Pick", totalW);
              let chosen = entries[0];
              for (const k of entries) {
                const w = Math.max(0, biomesCfgCorridor[k] || 0);
                if (roll < w) {
                  chosen = k;
                  break;
                }
                roll -= w;
              }
              let target = null;
              if (chosen === "desert") target = globals.desert;
              else if (chosen === "plains") target = globals.plains;
              else if (chosen === "grassland") target = globals.grassland;
              else if (chosen === "tropical") target = globals.tropical;
              else if (chosen === "tundra") target = globals.tundra;
              else if (chosen === "snow") target = globals.snow;
              if (target != null) {
                let ok = true;
                if (target === globals.desert && rainfall > 110) ok = false;
                if (target === globals.tropical && !(lat < 25 && rainfall > 95))
                  ok = false;
                if (target === globals.tundra && !(lat > 60 || elevation > 800))
                  ok = false;
                if (target === globals.snow && !(lat > 70 || elevation > 900))
                  ok = false;
                if (ok) {
                  adapter.setBiomeType(x, y, target);
                }
              }
            }
          }
        }
      }
      if (tunables.STORY_ENABLE_RIFTS && StoryTags.riftShoulder.size > 0) {
        const key = `${x},${y}`;
        if (StoryTags.riftShoulder.has(key)) {
          if (lat < RS_GRASS_LAT_MAX && rainfall > RS_GRASS_RAIN_MIN) {
            adapter.setBiomeType(x, y, globals.grassland);
          } else if (lat < RS_TROP_LAT_MAX && rainfall > RS_TROP_RAIN_MIN) {
            adapter.setBiomeType(x, y, globals.tropical);
          }
        }
      }
    }
  }
}
function resolveAdapter3(ctx) {
  if (ctx && ctx.adapter) {
    const engineAdapter = ctx.adapter;
    return {
      isWater: (x, y) => engineAdapter.isWater(x, y),
      getFeatureType: (x, y) => engineAdapter.getFeatureType(x, y),
      getBiomeType: () => 0,
      // Not on base interface
      getElevation: (x, y) => engineAdapter.getElevation(x, y),
      getRainfall: (x, y) => engineAdapter.getRainfall(x, y),
      getLatitude: (x, y) => engineAdapter.getLatitude(x, y),
      canHaveFeature: (x, y, featureIndex) => engineAdapter.canHaveFeature(x, y, featureIndex),
      setFeatureType: (x, y, featureData) => engineAdapter.setFeatureType(x, y, featureData),
      getRandomNumber: (max, label) => engineAdapter.getRandomNumber(max, label),
      addFeatures: () => {
      },
      // Not on base interface
      getFeatureTypeIndex: () => -1,
      // Not on base interface
      getBiomeGlobal: () => -1,
      // Not on base interface
      getNoFeatureConstant: () => -1
      // Not on base interface
    };
  }
  return {
    isWater: () => false,
    getFeatureType: () => -1,
    getBiomeType: () => 0,
    getElevation: () => 0,
    getRainfall: () => 0,
    getLatitude: () => 0,
    canHaveFeature: () => false,
    setFeatureType: () => {
    },
    getRandomNumber: (max) => Math.floor(Math.random() * max),
    addFeatures: () => {
    },
    getFeatureTypeIndex: () => -1,
    getBiomeGlobal: () => -1,
    getNoFeatureConstant: () => -1
  };
}
function addDiverseFeatures(iWidth, iHeight, ctx) {
  console.log("Adding diverse terrain features...");
  const adapter = resolveAdapter3(ctx ?? null);
  const inBounds2 = (x, y) => inBounds(x, y, iWidth, iHeight);
  adapter.addFeatures(iWidth, iHeight);
  const tunables = getTunables();
  const foundationCfg = tunables.FOUNDATION_CFG || {};
  const storyTunables = foundationCfg.story || {};
  const featuresCfg = storyTunables.features || {};
  const densityCfg = foundationCfg.featuresDensity || {};
  const StoryTags = getStoryTags();
  const reefIndex = adapter.getFeatureTypeIndex("FEATURE_REEF");
  const rainforestIdx = adapter.getFeatureTypeIndex("FEATURE_RAINFOREST");
  const forestIdx = adapter.getFeatureTypeIndex("FEATURE_FOREST");
  const taigaIdx = adapter.getFeatureTypeIndex("FEATURE_TAIGA");
  const g_GrasslandBiome = adapter.getBiomeGlobal("grassland");
  const g_TropicalBiome = adapter.getBiomeGlobal("tropical");
  const g_TundraBiome = adapter.getBiomeGlobal("tundra");
  const NO_FEATURE = adapter.getNoFeatureConstant();
  const getRandom = (label, max) => {
    if (ctx) {
      return ctxRandom(ctx, label, max);
    }
    return adapter.getRandomNumber(max, label);
  };
  const paradiseReefChance = featuresCfg?.paradiseReefChance ?? 18;
  if (tunables.STORY_ENABLE_HOTSPOTS && reefIndex !== -1 && StoryTags.hotspotParadise.size > 0 && paradiseReefChance > 0) {
    for (const key of StoryTags.hotspotParadise) {
      const [cx, cy] = key.split(",").map(Number);
      for (let dy = -2; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (!inBounds2(nx, ny)) continue;
          if (!adapter.isWater(nx, ny)) continue;
          if (adapter.getFeatureType(nx, ny) !== NO_FEATURE) continue;
          if (getRandom("Paradise Reef", 100) < paradiseReefChance) {
            const canPlace = adapter.canHaveFeature(nx, ny, reefIndex);
            if (canPlace) {
              adapter.setFeatureType(nx, ny, {
                Feature: reefIndex,
                Direction: -1,
                Elevation: 0
              });
            }
          }
        }
      }
    }
  }
  if (reefIndex !== -1 && StoryTags.passiveShelf && StoryTags.passiveShelf.size > 0) {
    const shelfMult = densityCfg?.shelfReefMultiplier ?? 0.6;
    const shelfReefChance = Math.max(
      1,
      Math.min(100, Math.floor((paradiseReefChance || 18) * shelfMult))
    );
    for (const key of StoryTags.passiveShelf) {
      const [sx, sy] = key.split(",").map(Number);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = sx + dx;
          const ny = sy + dy;
          if (!inBounds2(nx, ny)) continue;
          if (!adapter.isWater(nx, ny)) continue;
          if (adapter.getFeatureType(nx, ny) !== NO_FEATURE) continue;
          if (getRandom("Shelf Reef", 100) < shelfReefChance) {
            const canPlace = adapter.canHaveFeature(nx, ny, reefIndex);
            if (canPlace) {
              adapter.setFeatureType(nx, ny, {
                Feature: reefIndex,
                Direction: -1,
                Elevation: 0
              });
            }
          }
        }
      }
    }
  }
  const baseVolcanicForestChance = featuresCfg?.volcanicForestChance ?? 22;
  const baseVolcanicTaigaChance = featuresCfg?.volcanicTaigaChance ?? 25;
  const volcanicForestChance = Math.min(100, baseVolcanicForestChance + 6);
  const volcanicTaigaChance = Math.min(100, baseVolcanicTaigaChance + 5);
  const rainforestExtraChance = densityCfg?.rainforestExtraChance ?? 55;
  const forestExtraChance = densityCfg?.forestExtraChance ?? 30;
  const taigaExtraChance = densityCfg?.taigaExtraChance ?? 35;
  for (let y = 0; y < iHeight; y++) {
    for (let x = 0; x < iWidth; x++) {
      if (adapter.isWater(x, y)) continue;
      if (adapter.getFeatureType(x, y) !== NO_FEATURE) continue;
      const biome = adapter.getBiomeType(x, y);
      const elevation = adapter.getElevation(x, y);
      const rainfall = adapter.getRainfall(x, y);
      const plat = Math.abs(adapter.getLatitude(x, y));
      if (tunables.STORY_ENABLE_HOTSPOTS && StoryTags.hotspotVolcanic.size > 0) {
        let nearVolcanic = false;
        for (let vdy = -1; vdy <= 1 && !nearVolcanic; vdy++) {
          for (let vdx = -1; vdx <= 1; vdx++) {
            if (vdx === 0 && vdy === 0) continue;
            const vx = x + vdx;
            const vy = y + vdy;
            if (!inBounds2(vx, vy)) continue;
            if (StoryTags.hotspotVolcanic.has(`${vx},${vy}`)) {
              nearVolcanic = true;
              break;
            }
          }
        }
        if (nearVolcanic) {
          if (forestIdx !== -1 && rainfall > 95 && (biome === g_GrasslandBiome || biome === g_TropicalBiome)) {
            if (getRandom("Volcanic Forest", 100) < volcanicForestChance) {
              const canPlace = adapter.canHaveFeature(x, y, forestIdx);
              if (canPlace) {
                adapter.setFeatureType(x, y, {
                  Feature: forestIdx,
                  Direction: -1,
                  Elevation: 0
                });
                continue;
              }
            }
          }
          if (taigaIdx !== -1 && plat >= 55 && biome === g_TundraBiome && elevation < 400 && rainfall > 60) {
            if (getRandom("Volcanic Taiga", 100) < volcanicTaigaChance) {
              const canPlace = adapter.canHaveFeature(x, y, taigaIdx);
              if (canPlace) {
                adapter.setFeatureType(x, y, {
                  Feature: taigaIdx,
                  Direction: -1,
                  Elevation: 0
                });
                continue;
              }
            }
          }
        }
      }
      if (rainforestIdx !== -1 && biome === g_TropicalBiome && rainfall > 130) {
        if (getRandom("Extra Jungle", 100) < rainforestExtraChance) {
          const canPlace = adapter.canHaveFeature(x, y, rainforestIdx);
          if (canPlace) {
            adapter.setFeatureType(x, y, {
              Feature: rainforestIdx,
              Direction: -1,
              Elevation: 0
            });
            continue;
          }
        }
      }
      if (forestIdx !== -1 && biome === g_GrasslandBiome && rainfall > 100) {
        if (getRandom("Extra Forest", 100) < forestExtraChance) {
          const canPlace = adapter.canHaveFeature(x, y, forestIdx);
          if (canPlace) {
            adapter.setFeatureType(x, y, {
              Feature: forestIdx,
              Direction: -1,
              Elevation: 0
            });
            continue;
          }
        }
      }
      if (taigaIdx !== -1 && biome === g_TundraBiome && elevation < 300) {
        if (getRandom("Extra Taiga", 100) < taigaExtraChance) {
          const canPlace = adapter.canHaveFeature(x, y, taigaIdx);
          if (canPlace) {
            adapter.setFeatureType(x, y, {
              Feature: taigaIdx,
              Direction: -1,
              Elevation: 0
            });
            continue;
          }
        }
      }
    }
  }
}
function resolveAdapter4() {
  return {
    addFloodplains: (minLength, maxLength) => {
      const tb = TerrainBuilder;
      if (typeof TerrainBuilder !== "undefined" && tb.addFloodplains) {
        tb.addFloodplains(minLength, maxLength);
      }
    },
    recalculateFertility: () => {
      if (typeof FertilityBuilder !== "undefined" && FertilityBuilder?.recalculate) {
        FertilityBuilder.recalculate();
      }
    }
  };
}
function resolveNaturalWonderCount(mapInfo, wondersPlusOne) {
  if (!mapInfo || typeof mapInfo.NumNaturalWonders !== "number") {
    return 1;
  }
  if (wondersPlusOne) {
    return Math.max(mapInfo.NumNaturalWonders + 1, mapInfo.NumNaturalWonders);
  }
  return mapInfo.NumNaturalWonders;
}
function getPlacementConfig() {
  try {
    const tunables = getTunables();
    const foundationCfg = tunables.FOUNDATION_CFG;
    if (foundationCfg && typeof foundationCfg === "object" && "placement" in foundationCfg) {
      return foundationCfg.placement || {};
    }
  } catch {
  }
  return {};
}
function runPlacement(iWidth, iHeight, options = {}) {
  console.log("[SWOOPER_MOD] === runPlacement() CALLED ===");
  console.log(`[SWOOPER_MOD] Map size: ${iWidth}x${iHeight}`);
  const { mapInfo, wondersPlusOne, floodplains, starts } = options;
  const placementCfg = getPlacementConfig();
  const adapter = resolveAdapter4();
  const startPositions = [];
  try {
    const useWondersPlusOne = typeof wondersPlusOne === "boolean" ? wondersPlusOne : typeof placementCfg.wondersPlusOne === "boolean" ? placementCfg.wondersPlusOne : true;
    const wonders = resolveNaturalWonderCount(mapInfo, useWondersPlusOne);
    addNaturalWonders(iWidth, iHeight, wonders);
  } catch (err) {
    console.log("[Placement] addNaturalWonders failed:", err);
  }
  try {
    const floodplainsCfg = floodplains || placementCfg.floodplains || {};
    const minLen = typeof floodplainsCfg.minLength === "number" ? floodplainsCfg.minLength : 4;
    const maxLen = typeof floodplainsCfg.maxLength === "number" ? floodplainsCfg.maxLength : 10;
    adapter.addFloodplains(minLen, maxLen);
  } catch (err) {
    console.log("[Placement] addFloodplains failed:", err);
  }
  try {
    generateSnow(iWidth, iHeight);
  } catch (err) {
    console.log("[Placement] generateSnow failed:", err);
  }
  try {
    generateResources(iWidth, iHeight);
  } catch (err) {
    console.log("[Placement] generateResources failed:", err);
  }
  try {
    if (!starts) {
      console.log("[Placement] Start placement skipped (no starts config provided).");
    } else {
      const {
        playersLandmass1,
        playersLandmass2,
        westContinent,
        eastContinent,
        startSectorRows,
        startSectorCols,
        startSectors
      } = starts;
      const totalPlayers = playersLandmass1 + playersLandmass2;
      console.log(`[START_DEBUG] === Beginning Start Placement ===`);
      console.log(
        `[START_DEBUG] Players: ${totalPlayers} total (${playersLandmass1} landmass1, ${playersLandmass2} landmass2)`
      );
      console.log(
        `[START_DEBUG] Continents: west=${JSON.stringify(westContinent)}, east=${JSON.stringify(eastContinent)}`
      );
      console.log(
        `[START_DEBUG] Sectors: ${startSectorRows}x${startSectorCols} grid, ${startSectors.length} sectors chosen`
      );
      const pos = assignStartPositions(
        playersLandmass1,
        playersLandmass2,
        westContinent,
        eastContinent,
        startSectorRows,
        startSectorCols,
        startSectors
      );
      const successCount = pos ? pos.filter((p) => p !== void 0 && p >= 0).length : 0;
      console.log(
        `[START_DEBUG] Result: ${successCount}/${totalPlayers} civilizations placed successfully`
      );
      if (successCount < totalPlayers) {
        console.log(
          `[START_DEBUG] WARNING: ${totalPlayers - successCount} civilizations failed to find valid start locations!`
        );
      }
      console.log(`[START_DEBUG] === End Start Placement ===`);
      if (Array.isArray(pos)) {
        startPositions.push(...pos);
      }
      if (successCount === totalPlayers) {
        console.log("[Placement] Start positions assigned successfully");
      } else {
        console.log(
          `[Placement] Start positions assignment incomplete: ${totalPlayers - successCount} failures`
        );
      }
    }
  } catch (err) {
    console.log("[Placement] assignStartPositions failed:", err);
  }
  try {
    generateDiscoveries(iWidth, iHeight, startPositions);
    console.log("[Placement] Discoveries generated successfully");
  } catch (err) {
    console.log("[Placement] generateDiscoveries failed:", err);
  }
  try {
    adapter.recalculateFertility();
  } catch (err) {
    console.log("[Placement] FertilityBuilder.recalculate failed:", err);
  }
  try {
    assignAdvancedStartRegions();
  } catch (err) {
    console.log("[Placement] assignAdvancedStartRegions failed:", err);
  }
  return startPositions;
}

// ../../packages/mapgen-core/dist/chunk-3RG5ZIWI.js
var __require2 = /* @__PURE__ */ ((x) => typeof __require !== "undefined" ? __require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof __require !== "undefined" ? __require : a)[b]
}) : x)(function(x) {
  if (typeof __require !== "undefined") return __require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});

// ../../packages/mapgen-core/dist/index.js
function timeStart(label) {
  console.log(`[SWOOPER_MOD] Starting: ${label}`);
  return { label, start: Date.now() };
}
function timeEnd(timer) {
  const elapsed = Date.now() - timer.start;
  console.log(`[SWOOPER_MOD] Completed: ${timer.label} (${elapsed}ms)`);
  return elapsed;
}
function resolveOrchestratorAdapter() {
  return {
    getGridWidth: () => typeof GameplayMap !== "undefined" ? GameplayMap.getGridWidth() : 0,
    getGridHeight: () => typeof GameplayMap !== "undefined" ? GameplayMap.getGridHeight() : 0,
    getMapSize: () => typeof GameplayMap !== "undefined" ? GameplayMap.getMapSize() : 0,
    lookupMapInfo: (mapSize) => typeof GameInfo !== "undefined" && GameInfo?.Maps?.lookup ? GameInfo.Maps.lookup(mapSize) : null,
    setMapInitData: (params) => {
      if (typeof engine !== "undefined" && engine?.call) {
        engine.call("SetMapInitData", params);
      }
    },
    isWater: (x, y) => typeof GameplayMap !== "undefined" ? GameplayMap.isWater(x, y) : true,
    validateAndFixTerrain: () => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.validateAndFixTerrain) {
        TerrainBuilder.validateAndFixTerrain();
      }
    },
    recalculateAreas: () => {
      if (typeof AreaBuilder !== "undefined" && AreaBuilder?.recalculateAreas) {
        AreaBuilder.recalculateAreas();
      }
    },
    stampContinents: () => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.stampContinents) {
        TerrainBuilder.stampContinents();
      }
    },
    buildElevation: () => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.buildElevation) {
        TerrainBuilder.buildElevation();
      }
    },
    modelRivers: (minLength, maxLength, navigableTerrain) => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.modelRivers) {
        TerrainBuilder.modelRivers(minLength, maxLength, navigableTerrain);
      }
    },
    defineNamedRivers: () => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.defineNamedRivers) {
        TerrainBuilder.defineNamedRivers();
      }
    },
    storeWaterData: () => {
      if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.storeWaterData) {
        TerrainBuilder.storeWaterData();
      }
    },
    generateLakes: (width, height, tilesPerLake) => {
      try {
        const mod = __require2("/base-standard/maps/elevation-terrain-generator.js");
        if (mod?.generateLakes) {
          mod.generateLakes(width, height, tilesPerLake);
        }
      } catch {
        console.log("[MapOrchestrator] generateLakes not available");
      }
    },
    expandCoasts: (width, height) => {
      try {
        const mod = __require2("/base-standard/maps/elevation-terrain-generator.js");
        if (mod?.expandCoasts) {
          mod.expandCoasts(width, height);
        }
      } catch {
        console.log("[MapOrchestrator] expandCoasts not available");
      }
    },
    chooseStartSectors: (players1, players2, rows, cols, humanNearEquator) => {
      try {
        const mod = __require2("/base-standard/maps/assign-starting-plots.js");
        if (mod?.chooseStartSectors) {
          return mod.chooseStartSectors(players1, players2, rows, cols, humanNearEquator);
        }
      } catch {
        console.log("[MapOrchestrator] chooseStartSectors not available");
      }
      return [];
    },
    needHumanNearEquator: () => {
      try {
        const mod = __require2("/base-standard/maps/map-utilities.js");
        if (mod?.needHumanNearEquator) {
          return mod.needHumanNearEquator();
        }
      } catch {
        console.log("[MapOrchestrator] needHumanNearEquator not available");
      }
      return false;
    }
  };
}
var MapOrchestrator = class {
  config;
  adapter;
  stageResults = [];
  constructor(config = {}) {
    this.config = config;
    this.adapter = resolveOrchestratorAdapter();
  }
  /**
   * Handle RequestMapInitData event.
   * Sets map dimensions and latitude parameters.
   */
  requestMapData(initParams) {
    const prefix = this.config.logPrefix || "[SWOOPER_MOD]";
    console.log(`${prefix} === RequestMapInitData ===`);
    const params = {
      width: initParams?.width ?? 84,
      height: initParams?.height ?? 54,
      topLatitude: initParams?.topLatitude ?? 80,
      bottomLatitude: initParams?.bottomLatitude ?? -80,
      wrapX: initParams?.wrapX ?? true,
      wrapY: initParams?.wrapY ?? false
    };
    console.log(`${prefix} Map dimensions: ${params.width} x ${params.height}`);
    console.log(`${prefix} Latitude range: ${params.bottomLatitude} to ${params.topLatitude}`);
    this.adapter.setMapInitData(params);
  }
  /**
   * Handle GenerateMap event.
   * Runs the full generation pipeline.
   */
  generateMap() {
    const prefix = this.config.logPrefix || "[SWOOPER_MOD]";
    console.log(`${prefix} === GenerateMap ===`);
    this.stageResults = [];
    const startPositions = [];
    const iWidth = this.adapter.getGridWidth();
    const iHeight = this.adapter.getGridHeight();
    const uiMapSize = this.adapter.getMapSize();
    const mapInfo = this.adapter.lookupMapInfo(uiMapSize);
    if (!mapInfo) {
      console.error(`${prefix} Failed to lookup map info`);
      return { success: false, stageResults: this.stageResults, startPositions };
    }
    console.log(`${prefix} Map size: ${iWidth}x${iHeight}`);
    const targetPlates = Math.max(8, Math.round(iWidth * iHeight * 25e-4));
    console.log(`${prefix} Auto-scaling: Setting plate count to ${targetPlates} for size ${iWidth}x${iHeight}`);
    const currentConfig = getConfig();
    const newConfig = {
      ...currentConfig,
      foundation: {
        ...currentConfig.foundation || {},
        plates: {
          ...currentConfig.foundation?.plates || {},
          count: targetPlates
        }
      }
    };
    setConfig(newConfig);
    resetTunables();
    const tunables = getTunables();
    console.log(`${prefix} Tunables rebound successfully`);
    const stageFlags = this.resolveStageFlags();
    const foundationCfg = tunables.FOUNDATION_CFG || {};
    const landmassCfg = tunables.LANDMASS_CFG || {};
    const mountainsCfg = foundationCfg.mountains || {};
    const volcanosCfg = foundationCfg.volcanoes || {};
    const mountainOptions = this.buildMountainOptions(mountainsCfg);
    const volcanoOptions = this.buildVolcanoOptions(volcanosCfg);
    let ctx = null;
    try {
      const layerAdapter = this.createLayerAdapter(iWidth, iHeight);
      ctx = createExtendedMapContext(
        { width: iWidth, height: iHeight },
        layerAdapter,
        {
          toggles: {
            STORY_ENABLE_HOTSPOTS: stageFlags.storyHotspots,
            STORY_ENABLE_RIFTS: stageFlags.storyRifts,
            STORY_ENABLE_OROGENY: stageFlags.storyOrogeny,
            STORY_ENABLE_SWATCHES: stageFlags.storySwatches,
            STORY_ENABLE_PALEO: false,
            STORY_ENABLE_CORRIDORS: stageFlags.storyCorridorsPre || stageFlags.storyCorridorsPost
          }
        }
      );
    } catch (err) {
      console.error(`${prefix} Failed to create context:`, err);
      return { success: false, stageResults: this.stageResults, startPositions };
    }
    if (stageFlags.foundation && ctx) {
      this.initializeFoundation(ctx, tunables);
    }
    const iNumPlayers1 = mapInfo.PlayersLandmass1 ?? 4;
    const iNumPlayers2 = mapInfo.PlayersLandmass2 ?? 4;
    const iStartSectorRows = mapInfo.StartSectorRows ?? 4;
    const iStartSectorCols = mapInfo.StartSectorCols ?? 4;
    const bHumanNearEquator = this.adapter.needHumanNearEquator();
    const startSectors = this.adapter.chooseStartSectors(
      iNumPlayers1,
      iNumPlayers2,
      iStartSectorRows,
      iStartSectorCols,
      bHumanNearEquator
    );
    console.log(`${prefix} Start sectors chosen successfully`);
    let westContinent = this.createDefaultContinentBounds(iWidth, iHeight, "west");
    let eastContinent = this.createDefaultContinentBounds(iWidth, iHeight, "east");
    if (stageFlags.landmassPlates && ctx) {
      const stageResult = this.runStage("landmassPlates", () => {
        const plateResult = createPlateDrivenLandmasses(iWidth, iHeight, ctx, {
          landmassCfg,
          geometry: landmassCfg.geometry
        });
        if (!plateResult?.windows?.length) {
          throw new Error("Plate-driven landmass generation failed (no windows)");
        }
        let windows = plateResult.windows.slice();
        const separationResult = applyPlateAwareOceanSeparation({
          width: iWidth,
          height: iHeight,
          windows,
          landMask: plateResult.landMask,
          context: ctx,
          adapter: ctx.adapter
        });
        windows = separationResult.windows;
        windows = applyLandmassPostAdjustments(windows, landmassCfg.geometry, iWidth, iHeight);
        if (windows.length >= 2) {
          const first = windows[0];
          const last = windows[windows.length - 1];
          if (first && last) {
            westContinent = this.windowToContinentBounds(first, 0);
            eastContinent = this.windowToContinentBounds(last, 1);
          }
        }
        this.adapter.validateAndFixTerrain();
        this.adapter.recalculateAreas();
        this.adapter.stampContinents();
        const terrainBuilder = {
          setPlotTag: (x, y, tag) => {
            if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.setPlotTag) {
              TerrainBuilder.setPlotTag(x, y, tag);
            }
          },
          addPlotTag: (x, y, tag) => {
            if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.addPlotTag) {
              TerrainBuilder.addPlotTag(x, y, tag);
            }
          }
        };
        addPlotTagsSimple(iHeight, iWidth, eastContinent.west, ctx.adapter, terrainBuilder);
      });
      this.stageResults.push(stageResult);
    }
    if (stageFlags.coastlines && ctx) {
      const stageResult = this.runStage("coastlines", () => {
        this.adapter.expandCoasts(iWidth, iHeight);
      });
      this.stageResults.push(stageResult);
    }
    if (stageFlags.storySeed && ctx) {
      const stageResult = this.runStage("storySeed", () => {
        resetStoryTags();
        console.log(`${prefix} Imprinting continental margins (active/passive)...`);
      });
      this.stageResults.push(stageResult);
    }
    if (stageFlags.coastlines && ctx) {
      const stageResult = this.runStage("ruggedCoasts", () => {
        addRuggedCoasts(iWidth, iHeight, ctx);
      });
      this.stageResults.push(stageResult);
    }
    if (stageFlags.islands && ctx) {
      const stageResult = this.runStage("islands", () => {
        addIslandChains(iWidth, iHeight, ctx);
      });
      this.stageResults.push(stageResult);
    }
    if (stageFlags.mountains && ctx) {
      const stageResult = this.runStage("mountains", () => {
        layerAddMountainsPhysics(ctx, mountainOptions);
      });
      this.stageResults.push(stageResult);
    }
    if (stageFlags.volcanoes && ctx) {
      const stageResult = this.runStage("volcanoes", () => {
        layerAddVolcanoesPlateAware(ctx, volcanoOptions);
      });
      this.stageResults.push(stageResult);
    }
    if (stageFlags.lakes && ctx) {
      const iTilesPerLake = Math.max(10, (mapInfo.LakeGenerationFrequency ?? 5) * 2);
      const stageResult = this.runStage("lakes", () => {
        this.adapter.generateLakes(iWidth, iHeight, iTilesPerLake);
        syncHeightfield(ctx);
      });
      this.stageResults.push(stageResult);
    }
    this.adapter.recalculateAreas();
    this.adapter.buildElevation();
    if (stageFlags.climateBaseline && ctx) {
      const stageResult = this.runStage("climateBaseline", () => {
        applyClimateBaseline(iWidth, iHeight, ctx);
      });
      this.stageResults.push(stageResult);
    }
    if (stageFlags.rivers && ctx) {
      const navigableRiverTerrain = 3;
      const stageResult = this.runStage("rivers", () => {
        this.adapter.modelRivers(5, 15, navigableRiverTerrain);
        this.adapter.validateAndFixTerrain();
        syncHeightfield(ctx);
        syncClimateField(ctx);
        this.adapter.defineNamedRivers();
      });
      this.stageResults.push(stageResult);
    }
    if (stageFlags.climateRefine && ctx) {
      const stageResult = this.runStage("climateRefine", () => {
        refineClimateEarthlike(iWidth, iHeight, ctx);
      });
      this.stageResults.push(stageResult);
    }
    if (stageFlags.biomes && ctx) {
      const stageResult = this.runStage("biomes", () => {
        designateEnhancedBiomes(iWidth, iHeight);
      });
      this.stageResults.push(stageResult);
    }
    if (stageFlags.features && ctx) {
      const stageResult = this.runStage("features", () => {
        addDiverseFeatures(iWidth, iHeight, ctx);
        this.adapter.validateAndFixTerrain();
        syncHeightfield(ctx);
        this.adapter.recalculateAreas();
      });
      this.stageResults.push(stageResult);
    }
    this.adapter.storeWaterData();
    if (stageFlags.placement) {
      const stageResult = this.runStage("placement", () => {
        const positions = runPlacement(iWidth, iHeight, {
          mapInfo,
          wondersPlusOne: true,
          floodplains: { minLength: 4, maxLength: 10 },
          starts: {
            playersLandmass1: iNumPlayers1,
            playersLandmass2: iNumPlayers2,
            westContinent,
            eastContinent,
            startSectorRows: iStartSectorRows,
            startSectorCols: iStartSectorCols,
            startSectors
          }
        });
        startPositions.push(...positions);
      });
      this.stageResults.push(stageResult);
    }
    console.log(`${prefix} === GenerateMap COMPLETE ===`);
    const success = this.stageResults.every((r) => r.success);
    return { success, stageResults: this.stageResults, startPositions };
  }
  // ==========================================================================
  // Private Helpers
  // ==========================================================================
  resolveStageFlags() {
    return {
      foundation: stageEnabled("foundation"),
      landmassPlates: stageEnabled("landmassPlates"),
      coastlines: stageEnabled("coastlines"),
      storySeed: stageEnabled("storySeed"),
      storyHotspots: stageEnabled("storyHotspots"),
      storyRifts: stageEnabled("storyRifts"),
      storyOrogeny: stageEnabled("storyOrogeny"),
      storyCorridorsPre: stageEnabled("storyCorridorsPre"),
      islands: stageEnabled("islands"),
      mountains: stageEnabled("mountains"),
      volcanoes: stageEnabled("volcanoes"),
      lakes: stageEnabled("lakes"),
      climateBaseline: stageEnabled("climateBaseline"),
      storySwatches: stageEnabled("storySwatches"),
      rivers: stageEnabled("rivers"),
      storyCorridorsPost: stageEnabled("storyCorridorsPost"),
      climateRefine: stageEnabled("climateRefine"),
      biomes: stageEnabled("biomes"),
      features: stageEnabled("features"),
      placement: stageEnabled("placement")
    };
  }
  runStage(name, fn) {
    const timer = timeStart(name);
    try {
      fn();
      const durationMs = timeEnd(timer);
      return { stage: name, success: true, durationMs };
    } catch (err) {
      const durationMs = timeEnd(timer);
      const errorMessage = err instanceof Error ? err.message : String(err);
      console.error(`[MapOrchestrator] Stage "${name}" failed:`, err);
      return { stage: name, success: false, durationMs, error: errorMessage };
    }
  }
  initializeFoundation(ctx, tunables) {
    const prefix = this.config.logPrefix || "[SWOOPER_MOD]";
    try {
      if (!WorldModel.init()) {
        throw new Error("WorldModel initialization failed");
      }
      ctx.worldModel = WorldModel;
      const foundationCfg = tunables.FOUNDATION_CFG || {};
      const foundationContext = createFoundationContext(
        WorldModel,
        {
          dimensions: ctx.dimensions,
          config: {
            seed: foundationCfg.seed || {},
            plates: tunables.FOUNDATION_PLATES,
            dynamics: tunables.FOUNDATION_DYNAMICS,
            surface: foundationCfg.surface || {},
            policy: foundationCfg.policy || {},
            diagnostics: foundationCfg.diagnostics || {}
          }
        }
      );
      ctx.foundation = foundationContext;
      console.log(`${prefix} Foundation context initialized`);
      return foundationContext;
    } catch (err) {
      console.error(`${prefix} Failed to initialize foundation:`, err);
      return null;
    }
  }
  createLayerAdapter(width, height) {
    if (this.config.createAdapter) {
      return this.config.createAdapter(width, height);
    }
    try {
      const adaptersModule = __require2("./core/adapters.js");
      if (adaptersModule?.CivEngineAdapter) {
        return new adaptersModule.CivEngineAdapter(width, height);
      }
    } catch {
    }
    return this.createFallbackAdapter(width, height);
  }
  createFallbackAdapter(width, height) {
    return {
      width,
      height,
      isWater: (x, y) => typeof GameplayMap !== "undefined" ? GameplayMap.isWater(x, y) : true,
      isMountain: (x, y) => typeof GameplayMap !== "undefined" ? GameplayMap.isMountain(x, y) : false,
      isAdjacentToRivers: () => false,
      getElevation: (x, y) => typeof GameplayMap !== "undefined" ? GameplayMap.getElevation?.(x, y) ?? 0 : 0,
      getTerrainType: (x, y) => typeof GameplayMap !== "undefined" ? GameplayMap.getTerrainType(x, y) : 0,
      getRainfall: (x, y) => typeof GameplayMap !== "undefined" ? GameplayMap.getRainfall?.(x, y) ?? 0 : 0,
      getTemperature: (x, y) => typeof GameplayMap !== "undefined" ? GameplayMap.getTemperature?.(x, y) ?? 15 : 15,
      getLatitude: (x, y) => typeof GameplayMap !== "undefined" ? GameplayMap.getLatitude?.(x, y) ?? 0 : 0,
      setTerrainType: (x, y, t) => {
        if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.setTerrainType) {
          TerrainBuilder.setTerrainType(x, y, t);
        }
      },
      setRainfall: (x, y, r) => {
        if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.setRainfall) {
          TerrainBuilder.setRainfall(x, y, r);
        }
      },
      setElevation: (x, y, e) => {
        if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.setElevation) {
          TerrainBuilder.setElevation(x, y, e);
        }
      },
      getFeatureType: (x, y) => typeof GameplayMap !== "undefined" ? GameplayMap.getFeatureType?.(x, y) ?? -1 : -1,
      setFeatureType: (x, y, data) => {
        if (typeof TerrainBuilder !== "undefined" && TerrainBuilder?.setFeatureType) {
          TerrainBuilder.setFeatureType(x, y, data);
        }
      },
      canHaveFeature: () => true,
      getRandomNumber: (max) => Math.floor(Math.random() * max),
      validateAndFixTerrain: () => this.adapter.validateAndFixTerrain(),
      recalculateAreas: () => this.adapter.recalculateAreas(),
      createFractal: (id, w, h, grain, flags) => {
        const tb = TerrainBuilder;
        if (typeof TerrainBuilder !== "undefined" && tb.createFractal) {
          tb.createFractal(id, w, h, grain, flags);
        }
      },
      getFractalHeight: (id, x, y) => {
        const tb = TerrainBuilder;
        if (typeof TerrainBuilder !== "undefined" && tb.getFractalHeight) {
          return tb.getFractalHeight(id, x, y);
        }
        return 0;
      },
      stampContinents: () => this.adapter.stampContinents(),
      buildElevation: () => this.adapter.buildElevation(),
      modelRivers: (min, max, nav) => this.adapter.modelRivers(min, max, nav),
      defineNamedRivers: () => this.adapter.defineNamedRivers(),
      storeWaterData: () => this.adapter.storeWaterData()
    };
  }
  createDefaultContinentBounds(width, height, side) {
    const avoidSeamOffset = 4;
    const polarWaterRows = 2;
    if (side === "west") {
      return {
        west: avoidSeamOffset,
        east: Math.floor(width / 2) - avoidSeamOffset,
        south: polarWaterRows,
        north: height - polarWaterRows,
        continent: 0
      };
    }
    return {
      west: Math.floor(width / 2) + avoidSeamOffset,
      east: width - avoidSeamOffset,
      south: polarWaterRows,
      north: height - polarWaterRows,
      continent: 1
    };
  }
  windowToContinentBounds(window, continent) {
    return {
      west: window.west,
      east: window.east,
      south: window.south,
      north: window.north,
      continent: window.continent ?? continent
    };
  }
  buildMountainOptions(config) {
    return {
      tectonicIntensity: config.tectonicIntensity ?? 1,
      mountainThreshold: config.mountainThreshold ?? 0.45,
      hillThreshold: config.hillThreshold ?? 0.25,
      upliftWeight: config.upliftWeight ?? 0.75,
      fractalWeight: config.fractalWeight ?? 0.25,
      riftDepth: config.riftDepth ?? 0.3,
      boundaryWeight: config.boundaryWeight ?? 0.6,
      boundaryExponent: config.boundaryExponent ?? 1.4,
      interiorPenaltyWeight: config.interiorPenaltyWeight ?? 0.2,
      convergenceBonus: config.convergenceBonus ?? 0.9,
      transformPenalty: config.transformPenalty ?? 0.3,
      riftPenalty: config.riftPenalty ?? 0.75,
      hillBoundaryWeight: config.hillBoundaryWeight ?? 0.45,
      hillRiftBonus: config.hillRiftBonus ?? 0.5,
      hillConvergentFoothill: config.hillConvergentFoothill ?? 0.25,
      hillInteriorFalloff: config.hillInteriorFalloff ?? 0.2,
      hillUpliftWeight: config.hillUpliftWeight ?? 0.25
    };
  }
  buildVolcanoOptions(config) {
    return {
      enabled: config.enabled ?? true,
      baseDensity: config.baseDensity ?? 1 / 170,
      minSpacing: config.minSpacing ?? 3,
      boundaryThreshold: config.boundaryThreshold ?? 0.35,
      boundaryWeight: config.boundaryWeight ?? 1.2,
      convergentMultiplier: config.convergentMultiplier ?? 2.4,
      transformMultiplier: config.transformMultiplier ?? 1.1,
      divergentMultiplier: config.divergentMultiplier ?? 0.35,
      hotspotWeight: config.hotspotWeight ?? 0.12,
      shieldPenalty: config.shieldPenalty ?? 0.6,
      randomJitter: config.randomJitter ?? 0.08,
      minVolcanoes: config.minVolcanoes ?? 5,
      maxVolcanoes: config.maxVolcanoes ?? 40
    };
  }
};
var VERSION = "0.1.0";

export {
  bootstrap,
  MapOrchestrator,
  VERSION
};
