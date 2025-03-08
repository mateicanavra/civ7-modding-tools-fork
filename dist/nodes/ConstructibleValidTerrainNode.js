"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstructibleValidTerrainNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class ConstructibleValidTerrainNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.constructibleType = 'BUILDING_';
        this.terrainType = constants_1.TERRAIN.FLAT;
        this.fill(payload);
    }
}
exports.ConstructibleValidTerrainNode = ConstructibleValidTerrainNode;
//# sourceMappingURL=ConstructibleValidTerrainNode.js.map