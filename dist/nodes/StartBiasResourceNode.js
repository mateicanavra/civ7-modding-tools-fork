"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartBiasResourceNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class StartBiasResourceNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.civilizationType = null;
        this.leaderType = null;
        this.resourceType = constants_1.RESOURCE.HORSES;
        this.score = 5;
        this.fill(payload);
    }
}
exports.StartBiasResourceNode = StartBiasResourceNode;
//# sourceMappingURL=StartBiasResourceNode.js.map