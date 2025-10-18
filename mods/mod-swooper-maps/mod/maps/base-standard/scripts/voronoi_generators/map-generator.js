import { kdTree } from '../kd-tree.js';
import { VoronoiUtils, MapSize, RegionCellPosGetter, RegionCell } from '../voronoi-utils.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/voronoi.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/rbtree.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/vertex.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/edge.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/cell.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/diagram.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/halfedge.js';
import '../random-pcg-32.js';

var GeneratorType = /* @__PURE__ */ ((GeneratorType2) => {
  GeneratorType2[GeneratorType2["Continent"] = 0] = "Continent";
  return GeneratorType2;
})(GeneratorType || {});
class GeneratorSettingConfigGroup {
  groupLabel = "";
  key = "";
  childCount;
  // define this to allow this group to contain arrays of settings.
  children = { type: "configs", data: [] };
}
class MapGenerator {
  m_defaultGeneratorSettings = {};
  m_mapSizeOverrides = VoronoiUtils.defaultEnumRecord(MapSize);
  m_generatorSettings = {};
  m_regionCells = [];
  m_diagram;
  // initialized in init()
  m_worldDims = { x: 0, y: 0 };
  m_mapSize = MapSize.Standard;
  m_kdTree = new kdTree(RegionCellPosGetter);
  init(worldDims, diagram, mapSize) {
    this.m_diagram = diagram;
    this.m_worldDims = worldDims;
    this.m_mapSize = mapSize;
    if (Object.entries(this.m_generatorSettings).length === 0) {
      this.m_generatorSettings = VoronoiUtils.clone(this.m_defaultGeneratorSettings);
    }
    VoronoiUtils.deepMerge(this.m_generatorSettings, this.m_mapSizeOverrides[this.m_mapSize]);
    this.m_regionCells = diagram.cells.map((cell, index) => {
      const area = VoronoiUtils.calculateCellArea(cell);
      const regionCell = new RegionCell(cell, index, area);
      return regionCell;
    });
    this.m_kdTree.build(this.m_regionCells);
  }
  logSettings() {
    console.log(
      "generator " + this.getType() + " for map size [" + this.m_mapSize + "] initialized with the following settings:"
    );
    const logObject = (obj, indent, lastKey = "") => {
      if (obj === null) {
        console.log(indent + "null");
      } else if (Array.isArray(obj)) {
        console.log(indent + lastKey + ": [");
        for (let i = 0; i < obj.length; ++i) {
          logObject(obj[i], indent + "  ", i.toString());
        }
        console.log(indent + "]");
      } else if (typeof obj === "object") {
        if (lastKey != "") {
          console.log(indent + lastKey + ": ");
        }
        for (const [key, value] of Object.entries(obj)) {
          if (key[0] === "_") continue;
          logObject(value, indent + "  ", key);
        }
      } else {
        console.log(indent + lastKey + ": " + obj);
      }
    };
    logObject(this.m_generatorSettings, "  ");
    console.log("Rules:");
    const rules = this.getRules();
    for (const ruleSection of Object.keys(rules)) {
      console.log("  " + ruleSection + ":");
      for (const rule of rules[ruleSection]) {
        console.log("    " + rule.name + ": weight: " + rule.weight);
        for (const [key, value] of Object.entries(rule.configValues)) {
          logObject(value, "      ", key);
        }
      }
    }
  }
  buildDefaultSettings(nodes, mapsSizeOverrides) {
    const processConfigNodes = (nodes2) => {
      const out = {};
      for (const node of nodes2) {
        if ("children" in node) {
          if (node.children.type === "configs") {
            if (node.childCount && node.childCount > 0) {
              out["_defaultChild"] = processConfigNodes(node.children.data);
              const arr = [];
              for (let i = 0; i < node.childCount; ++i) {
                arr[i] = processConfigNodes(node.children.data);
              }
              out[node.key] = arr;
            } else {
              out[node.key] = processConfigNodes(node.children.data);
            }
          }
        } else {
          out[node.key] = node.default;
        }
      }
      return out;
    };
    this.m_defaultGeneratorSettings = processConfigNodes(nodes);
    this.m_mapSizeOverrides = mapsSizeOverrides;
  }
  getRegionCells() {
    return this.m_regionCells;
  }
  getKdTree() {
    return this.m_kdTree;
  }
  getSettings() {
    return this.m_generatorSettings;
  }
  getDiagram() {
    return this.m_diagram;
  }
  getPlatesDiagram() {
    return this.m_diagram;
  }
  resetToDefault() {
    this.m_generatorSettings = VoronoiUtils.clone(this.m_defaultGeneratorSettings);
    VoronoiUtils.deepMerge(this.m_generatorSettings, this.m_mapSizeOverrides[this.m_mapSize]);
  }
}

export { GeneratorSettingConfigGroup, GeneratorType, MapGenerator };
//# sourceMappingURL=map-generator.js.map
