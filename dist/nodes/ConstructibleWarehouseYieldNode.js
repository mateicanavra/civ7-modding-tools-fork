"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstructibleWarehouseYieldNode = void 0;
const BaseNode_1 = require("./BaseNode");
class ConstructibleWarehouseYieldNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.constructibleType = 'BUILDING_';
        this.requiresActivation = null;
        this.yieldChangeId = null;
        this.fill(payload);
    }
}
exports.ConstructibleWarehouseYieldNode = ConstructibleWarehouseYieldNode;
//# sourceMappingURL=ConstructibleWarehouseYieldNode.js.map