"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstructibleAdjacencyNode = void 0;
const BaseNode_1 = require("./BaseNode");
class ConstructibleAdjacencyNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.constructibleType = 'BUILDING_';
        this.requiresActivation = null;
        this.yieldChangeId = null;
        this.fill(payload);
    }
}
exports.ConstructibleAdjacencyNode = ConstructibleAdjacencyNode;
//# sourceMappingURL=ConstructibleAdjacencyNode.js.map