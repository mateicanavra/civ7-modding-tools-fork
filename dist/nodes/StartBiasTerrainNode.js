"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartBiasTerrainNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class StartBiasTerrainNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.civilizationType = null;
        this.leaderType = null;
        this.terrainType = constants_1.TERRAIN.FLAT;
        this.score = 5;
        this.fill(payload);
    }
}
exports.StartBiasTerrainNode = StartBiasTerrainNode;
//# sourceMappingURL=StartBiasTerrainNode.js.map