import { VoronoiBuilder } from '../voronoi-builder.js';
import { VoronoiUtils } from '../voronoi-utils.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/diagram.js';
import '../voronoi-hex.js';
import '../../../core/scripts/MathHelpers.js';
import '../heap.js';
import '../kd-tree.js';
import '../voronoi_generators/continent-generator.js';
import '../quadtree.js';
import '../random-pcg-32.js';
import '../voronoi-region.js';
import '../voronoi_generators/map-generator.js';
import '../voronoi_rules/avoid-edge.js';
import '../voronoi_rules/rules-base.js';
import '../voronoi_rules/avoid-other-regions.js';
import '../voronoi_rules/cell-area.js';
import '../voronoi_rules/near-map-center.js';
import '../voronoi_rules/near-neighbor.js';
import '../voronoi_rules/near-plate-boundary.js';
import '../voronoi_rules/near-region-seed.js';
import '../voronoi_rules/neighbors-in-region.js';
import '../voronoi_rules/prefer-latitude.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/voronoi.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/rbtree.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/vertex.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/edge.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/cell.js';
import '../../../core/scripts/external/TypeScript-Voronoi-master/src/halfedge.js';

var MapType = /* @__PURE__ */ ((MapType2) => {
  MapType2[MapType2["Continents"] = 0] = "Continents";
  MapType2[MapType2["Pangaea"] = 1] = "Pangaea";
  return MapType2;
})(MapType || {});
class VoronoiMap {
  m_builder = new VoronoiBuilder();
  m_initialized = false;
  getBuilder() {
    return this.m_builder;
  }
  initInternal(mapSize, generatorType, defaultGeneratorSettings, cellCountMultiple, relaxationSteps) {
    this.m_builder.init(mapSize, generatorType, cellCountMultiple, relaxationSteps);
    if (defaultGeneratorSettings && !this.m_initialized) {
      VoronoiUtils.loadSettingsFromJson(defaultGeneratorSettings, this);
    }
    this.m_initialized = true;
  }
  createDefaultSettings() {
    const settings = {};
    for (const [key, value] of Object.entries(this.getSettingsConfig())) {
      settings[key] = value.default;
    }
    return settings;
  }
}

export { MapType, VoronoiMap };
//# sourceMappingURL=map-common.js.map
