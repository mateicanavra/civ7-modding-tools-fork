import { Voronoi } from '../../core/scripts/external/TypeScript-Voronoi-master/src/voronoi.js';
import { RandomImpl } from './random-pcg-32.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/rbtree.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/vertex.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/edge.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/cell.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/diagram.js';
import '../../core/scripts/external/TypeScript-Voronoi-master/src/halfedge.js';

var MapSize = /* @__PURE__ */ ((MapSize2) => {
  MapSize2[MapSize2["Tiny"] = 0] = "Tiny";
  MapSize2[MapSize2["Small"] = 1] = "Small";
  MapSize2[MapSize2["Standard"] = 2] = "Standard";
  MapSize2[MapSize2["Large"] = 3] = "Large";
  MapSize2[MapSize2["Huge"] = 4] = "Huge";
  return MapSize2;
})(MapSize || {});
const MapDims = {
  [0 /* Tiny */]: { x: 60, y: 38 },
  [1 /* Small */]: { x: 74, y: 46 },
  [2 /* Standard */]: { x: 84, y: 54 },
  [3 /* Large */]: { x: 96, y: 60 },
  [4 /* Huge */]: { x: 106, y: 66 }
};
var RegionType = /* @__PURE__ */ ((RegionType2) => {
  RegionType2[RegionType2["None"] = 0] = "None";
  RegionType2[RegionType2["Ocean"] = 1] = "Ocean";
  RegionType2[RegionType2["Landmass"] = 2] = "Landmass";
  RegionType2[RegionType2["Island"] = 3] = "Island";
  RegionType2[RegionType2["CoastalIsland"] = 4] = "CoastalIsland";
  RegionType2[RegionType2["_Length"] = 5] = "_Length";
  return RegionType2;
})(RegionType || {});
var TerrainType = /* @__PURE__ */ ((TerrainType2) => {
  TerrainType2[TerrainType2["Unknown"] = 0] = "Unknown";
  TerrainType2[TerrainType2["Ocean"] = 1] = "Ocean";
  TerrainType2[TerrainType2["Coast"] = 2] = "Coast";
  TerrainType2[TerrainType2["Flat"] = 3] = "Flat";
  TerrainType2[TerrainType2["Rough"] = 4] = "Rough";
  TerrainType2[TerrainType2["Mountainous"] = 5] = "Mountainous";
  TerrainType2[TerrainType2["Volcano"] = 6] = "Volcano";
  TerrainType2[TerrainType2["NavRiver"] = 7] = "NavRiver";
  TerrainType2[TerrainType2["_Length"] = 8] = "_Length";
  return TerrainType2;
})(TerrainType || {});
var BiomeType = /* @__PURE__ */ ((BiomeType2) => {
  BiomeType2[BiomeType2["Unknown"] = 0] = "Unknown";
  BiomeType2[BiomeType2["Ocean"] = 1] = "Ocean";
  BiomeType2[BiomeType2["Desert"] = 2] = "Desert";
  BiomeType2[BiomeType2["Grassland"] = 3] = "Grassland";
  BiomeType2[BiomeType2["Plains"] = 4] = "Plains";
  BiomeType2[BiomeType2["Tropical"] = 5] = "Tropical";
  BiomeType2[BiomeType2["Tundra"] = 6] = "Tundra";
  BiomeType2[BiomeType2["_Length"] = 7] = "_Length";
  return BiomeType2;
})(BiomeType || {});
var DetailsType = /* @__PURE__ */ ((DetailsType2) => {
  DetailsType2[DetailsType2["None"] = 0] = "None";
  DetailsType2[DetailsType2["MinorRiver"] = 1] = "MinorRiver";
  DetailsType2[DetailsType2["Wet"] = 2] = "Wet";
  DetailsType2[DetailsType2["Vegetated"] = 3] = "Vegetated";
  DetailsType2[DetailsType2["Floodplain"] = 4] = "Floodplain";
  DetailsType2[DetailsType2["Snow"] = 5] = "Snow";
  DetailsType2[DetailsType2["_Length"] = 6] = "_Length";
  return DetailsType2;
})(DetailsType || {});
class RegionCell {
  id = 0;
  cell;
  area = 0;
  landmassId = 0;
  landmassOrder = 0;
  plateId = -1;
  plateOrder = 0;
  elevation = 0;
  terrainType = 0 /* Unknown */;
  biomeType = 0 /* Unknown */;
  detailsType = 0 /* None */;
  regionConsiderationBits = 0n;
  // helps avoid a set lookup when on a region's consideration heap during processing.
  ruleConsideration = false;
  // used by individual rules. Rule should clear back to false after each use.
  currentScore = 0;
  // can hold a current score temporarily, but should be zeroed out between operations.
  constructor(cell, id, area) {
    this.cell = cell;
    this.id = id;
    this.area = area;
  }
  reset() {
    this.landmassId = 0;
    this.landmassOrder = 0;
    this.plateId = -1;
    this.plateOrder = 0;
    this.elevation = 0;
    this.terrainType = 0 /* Unknown */;
    this.biomeType = 0 /* Unknown */;
    this.detailsType = 0 /* None */;
  }
}
const RegionCellPosGetter = (cell) => {
  return { x: cell.cell.site.x, y: cell.cell.site.y };
};
class PlateBoundary {
  pos = { x: 0, y: 0 };
  normal = { x: 0, y: 0 };
  plateSubduction = 0;
  plateSliding = 0;
  id1 = 0;
  id2 = 0;
}
const PlateBoundaryPosGetter = (data) => {
  return { x: data.pos.x, y: data.pos.y };
};
var VoronoiUtils;
((VoronoiUtils2) => {
  function voronoiCentroid(cell) {
    const site = { x: 0, y: 0, id: 0 };
    for (const halfedge of cell.halfedges) {
      site.x += halfedge.getStartpoint().x;
      site.y += halfedge.getStartpoint().y;
    }
    site.x /= cell.halfedges.length;
    site.y /= cell.halfedges.length;
    return site;
  }
  VoronoiUtils2.voronoiCentroid = voronoiCentroid;
  function lloydRelaxation(cells, strength) {
    return cells.map((cell) => {
      const centerSite = voronoiCentroid(cell);
      const newX = cell.site.x + strength * (centerSite.x - cell.site.x);
      const newY = cell.site.y + strength * (centerSite.y - cell.site.y);
      return {
        id: 0,
        x: newX,
        y: newY
      };
    });
  }
  VoronoiUtils2.lloydRelaxation = lloydRelaxation;
  function computeVoronoi(sites, bbox, relaxationSteps) {
    const voronoi = new Voronoi();
    let diagram = voronoi.compute(sites, bbox);
    for (let index = 0; index < relaxationSteps; index++) {
      sites = lloydRelaxation(diagram.cells, 1);
      voronoi.toRecycle = diagram;
      diagram = voronoi.compute(sites, bbox);
    }
    return diagram;
  }
  VoronoiUtils2.computeVoronoi = computeVoronoi;
  function createRandomSites(count, maxX, maxY) {
    return Array.from({ length: count }, () => ({
      id: 0,
      x: RandomImpl.fRand("Voronoi Site X") * maxX,
      y: RandomImpl.fRand("Voronoi Site Y") * maxY
    }));
  }
  VoronoiUtils2.createRandomSites = createRandomSites;
  function dot(dir1, dir2) {
    return dir1.x * dir2.x + dir1.y * dir2.y;
  }
  VoronoiUtils2.dot = dot;
  function crossZ(dir1, dir2) {
    return dir1.x * dir2.y - dir1.y * dir2.x;
  }
  VoronoiUtils2.crossZ = crossZ;
  function lerp(a, b, t) {
    return a + t * (b - a);
  }
  VoronoiUtils2.lerp = lerp;
  function normalize(v) {
    const len = Math.sqrt(v.x * v.x + v.y * v.y);
    return { x: v.x / len, y: v.y / len };
  }
  VoronoiUtils2.normalize = normalize;
  function iLerp(a, b, t) {
    return (t - a) / (b - a);
  }
  VoronoiUtils2.iLerp = iLerp;
  function clamp(a, min, max) {
    const lowerClamp = Math.max(a, min);
    return Math.min(lowerClamp, max);
  }
  VoronoiUtils2.clamp = clamp;
  function pointInsideCell(cell, point) {
    for (const halfEdge of cell.halfedges) {
      const ept1 = halfEdge.getStartpoint();
      const ept2 = halfEdge.getEndpoint();
      const edgeDir = { x: ept2.x - ept1.x, y: ept2.y - ept1.y };
      const ptDir = { x: point.x - ept1.x, y: point.y - ept1.y };
      if (crossZ(edgeDir, ptDir) > 0) {
        return false;
      }
    }
    return true;
  }
  VoronoiUtils2.pointInsideCell = pointInsideCell;
  function calculateCellArea(cell) {
    let area = 0;
    for (const halfedge of cell.halfedges) {
      const pt1 = halfedge.getStartpoint();
      const pt2 = halfedge.getEndpoint();
      area += pt1.x * pt2.y - pt2.x * pt1.y;
    }
    return area * -0.5;
  }
  VoronoiUtils2.calculateCellArea = calculateCellArea;
  function sqDistance(pt1, pt2) {
    const xDiff = pt1.x - pt2.x;
    const yDiff = pt1.y - pt2.y;
    return xDiff * xDiff + yDiff * yDiff;
  }
  VoronoiUtils2.sqDistance = sqDistance;
  function sqDistanceBetweenSites(site1, site2) {
    return sqDistance({ x: site1.x, y: site1.y }, { x: site2.x, y: site2.y });
  }
  VoronoiUtils2.sqDistanceBetweenSites = sqDistanceBetweenSites;
  function distanceBetweenSites(site1, site2) {
    return Math.sqrt(sqDistance({ x: site1.x, y: site1.y }, { x: site2.x, y: site2.y }));
  }
  VoronoiUtils2.distanceBetweenSites = distanceBetweenSites;
  function defaultEnumRecord(e) {
    const obj = {};
    for (const k of Object.values(e)) {
      if (typeof k === "number") obj[k] = {};
    }
    return obj;
  }
  VoronoiUtils2.defaultEnumRecord = defaultEnumRecord;
  function shuffle(arr, count = arr.length) {
    for (let i = 0; i < count; ++i) {
      const idx = RandomImpl.getRandomNumber(arr.length - i, "Shuffle Idx") + i;
      [arr[i], arr[idx]] = [arr[idx], arr[i]];
    }
  }
  VoronoiUtils2.shuffle = shuffle;
  let RegionCellFilterResult;
  ((RegionCellFilterResult2) => {
    RegionCellFilterResult2[RegionCellFilterResult2["Continue"] = 0] = "Continue";
    RegionCellFilterResult2[RegionCellFilterResult2["HaltSuccess"] = 1] = "HaltSuccess";
    RegionCellFilterResult2[RegionCellFilterResult2["HaltFail"] = 2] = "HaltFail";
  })(RegionCellFilterResult = VoronoiUtils2.RegionCellFilterResult || (VoronoiUtils2.RegionCellFilterResult = {}));
  function regionCellAreaFilter(cell, regionCells, maxDistance, filterCallback) {
    const consideringList = [cell.id];
    cell.ruleConsideration = true;
    let filterResult = 0 /* Continue */;
    for (let i = 0; i < consideringList.length; ++i) {
      const considerCell = regionCells[consideringList[i]];
      filterResult = filterCallback(considerCell);
      if (filterResult != 0 /* Continue */) {
        break;
      }
      const neighborIds = considerCell.cell.getNeighborIds();
      for (const neighborId of neighborIds) {
        const neighbor = regionCells[neighborId];
        if (!neighbor.ruleConsideration && VoronoiUtils2.distanceBetweenSites(cell.cell.site, neighbor.cell.site) < maxDistance) {
          neighbor.ruleConsideration = true;
          consideringList.push(neighborId);
        }
      }
    }
    consideringList.forEach((cellId) => regionCells[cellId].ruleConsideration = false);
    return filterResult;
  }
  VoronoiUtils2.regionCellAreaFilter = regionCellAreaFilter;
  function deepMerge(a, b) {
    for (const key in b) {
      if (b[key] && typeof b[key] === "object" && !Array.isArray(b[key]) && typeof a[key] === "object" && a[key] !== null) {
        deepMerge(a[key], b[key]);
      } else if (Array.isArray(a[key]) && Array.isArray(b[key])) {
        const aArr = a[key];
        const bArr = b[key];
        if (aArr.length < bArr.length && "_defaultChild" in a) {
          while (aArr.length < bArr.length) {
            aArr.push(clone(a["_defaultChild"]));
          }
        }
        aArr.length = bArr.length;
        for (let i = 0; i < bArr.length; ++i) {
          deepMerge(aArr[i], bArr[i]);
        }
      } else if (key in a) {
        a[key] = b[key];
      } else {
        console.log("Warning: key " + key + " not in merged object.");
      }
    }
  }
  VoronoiUtils2.deepMerge = deepMerge;
  async function loadTextFromPath(url) {
    if (typeof fetch == "function") {
      try {
        const response = await fetch(url, { cache: "no-cache" });
        if (!response.ok) {
          console.error(`Failed to load ${url}: ${response.statusText}`);
          return null;
        }
        return await response.text();
      } catch (err) {
        console.error(`Error loading ${url}`, err);
        return null;
      }
    } else {
      console.error("Environment does not support fetch().");
      return null;
    }
  }
  VoronoiUtils2.loadTextFromPath = loadTextFromPath;
  async function loadJsonFromPath(url) {
    const text = await loadTextFromPath(url);
    if (text) {
      return JSON.parse(text);
    }
    return null;
  }
  VoronoiUtils2.loadJsonFromPath = loadJsonFromPath;
  async function loadJsFromPath(url) {
    const text = await loadTextFromPath(url);
    if (text) {
      const match = text.match(/export\s+default\s+({[\s\S]*});?\s*$/);
      if (!match) throw new Error("Could not find export default object");
      return JSON.parse(match[1]);
    }
    return null;
  }
  VoronoiUtils2.loadJsFromPath = loadJsFromPath;
  function loadSettingsFromJson(json, map) {
    const configObject = typeof json === "string" ? JSON.parse(json) : json;
    VoronoiUtils2.deepMerge(map.getSettings(), configObject.mapConfig);
    const generator = map.getBuilder().getGenerator();
    generator.resetToDefault();
    VoronoiUtils2.deepMerge(generator.getSettings(), configObject.generatorConfig);
    const rules = generator.getRules();
    for (const [groupKey, groupValue] of Object.entries(configObject.rulesConfig)) {
      const rulesGroup = rules[groupKey];
      for (const [ruleKey, ruleValue] of Object.entries(groupValue)) {
        const ruleKeyParts = ruleKey.split(".");
        for (const rule of rulesGroup) {
          if (rule.name === ruleKeyParts[0]) {
            if (ruleKeyParts[1] === "weight") {
              rule.weight = ruleValue;
            } else {
              rule.configValues[ruleKeyParts[1]] = ruleValue;
            }
            break;
          }
        }
      }
    }
  }
  VoronoiUtils2.loadSettingsFromJson = loadSettingsFromJson;
  function loadSettingsFromJs(jsText, map) {
    const match = jsText.match(/export\s+default\s+({[\s\S]*});?\s*$/);
    if (!match) throw new Error("Could not find export default object");
    return loadSettingsFromJson(match[1], map);
  }
  VoronoiUtils2.loadSettingsFromJs = loadSettingsFromJs;
  function clone(obj) {
    if (typeof structuredClone === "function") {
      return structuredClone(obj);
    } else {
      return JSON.parse(JSON.stringify(obj));
    }
  }
  VoronoiUtils2.clone = clone;
  function getRoundedString(value, precision) {
    return String(parseFloat(value.toFixed(precision)));
  }
  VoronoiUtils2.getRoundedString = getRoundedString;
  function swapAndPop(arr, indexToRemove) {
    arr[indexToRemove] = arr[arr.length - 1];
    arr.pop();
  }
  VoronoiUtils2.swapAndPop = swapAndPop;
  function performanceMarker(label) {
    if (typeof BuildInfo === "undefined") {
      performance.mark(label);
    } else {
      console.log(label);
    }
  }
  VoronoiUtils2.performanceMarker = performanceMarker;
})(VoronoiUtils || (VoronoiUtils = {}));

export { BiomeType, DetailsType, MapDims, MapSize, PlateBoundary, PlateBoundaryPosGetter, RegionCell, RegionCellPosGetter, RegionType, TerrainType, VoronoiUtils };
//# sourceMappingURL=voronoi-utils.js.map
