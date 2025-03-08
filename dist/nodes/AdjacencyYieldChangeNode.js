"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdjacencyYieldChangeNode = void 0;
const node_crypto_1 = require("node:crypto");
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class AdjacencyYieldChangeNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.id = (0, node_crypto_1.randomUUID)();
        this.age = null;
        this.yieldType = constants_1.YIELD.FOOD;
        this.yieldChange = 1;
        this.adjacentBiome = null;
        this.adjacentConstructible = null;
        this.adjacentConstructibleTag = null;
        this.adjacentDistrict = null;
        this.adjacentFeature = null;
        this.adjacentFeatureClass = null;
        this.adjacentLake = null;
        this.adjacentNaturalWonder = null;
        this.adjacentNavigableRiver = null;
        this.adjacentQuarter = null;
        this.adjacentResource = null;
        this.adjacentResourceClass = null;
        this.adjacentRiver = null;
        this.adjacentSeaResource = null;
        this.adjacentTerrain = null;
        this.adjacentUniqueQuarter = null;
        this.adjacentUniqueQuarterType = null;
        this.projectMaxYield = null;
        this.self = null;
        this.tilesRequired = null;
        this.fill(payload);
    }
}
exports.AdjacencyYieldChangeNode = AdjacencyYieldChangeNode;
//# sourceMappingURL=AdjacencyYieldChangeNode.js.map