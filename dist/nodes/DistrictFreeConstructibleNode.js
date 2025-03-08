"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistrictFreeConstructibleNode = void 0;
const BaseNode_1 = require("./BaseNode");
class DistrictFreeConstructibleNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.constructibleType = 'CONSTRUCTIBLE_';
        this.districtType = 'DISTRICT_';
        this.featureType = null;
        this.resourceType = null;
        this.terrainType = null;
        this.biomeType = null;
        this.riverType = null;
        this.priority = null;
        this.tier = null;
        this.fill(payload);
    }
}
exports.DistrictFreeConstructibleNode = DistrictFreeConstructibleNode;
//# sourceMappingURL=DistrictFreeConstructibleNode.js.map