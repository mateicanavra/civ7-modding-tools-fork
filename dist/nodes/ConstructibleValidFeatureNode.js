"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstructibleValidFeatureNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class ConstructibleValidFeatureNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.constructibleType = 'BUILDING_';
        this.featureType = constants_1.FEATURE.ICE;
        this.fill(payload);
    }
}
exports.ConstructibleValidFeatureNode = ConstructibleValidFeatureNode;
//# sourceMappingURL=ConstructibleValidFeatureNode.js.map