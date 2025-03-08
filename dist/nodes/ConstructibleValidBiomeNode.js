"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstructibleValidBiomeNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class ConstructibleValidBiomeNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.constructibleType = 'BUILDING_';
        this.biomeType = constants_1.BIOME.GRASSLAND;
        this.fill(payload);
    }
}
exports.ConstructibleValidBiomeNode = ConstructibleValidBiomeNode;
//# sourceMappingURL=ConstructibleValidBiomeNode.js.map