"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartBiasFeatureClassNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class StartBiasFeatureClassNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.civilizationType = null;
        this.leaderType = null;
        this.featureClassType = constants_1.FEATURE_CLASS.VEGETATED;
        this.score = 5;
        this.fill(payload);
    }
}
exports.StartBiasFeatureClassNode = StartBiasFeatureClassNode;
//# sourceMappingURL=StartBiasFeatureClassNode.js.map