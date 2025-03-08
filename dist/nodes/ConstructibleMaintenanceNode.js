"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstructibleMaintenanceNode = void 0;
const BaseNode_1 = require("./BaseNode");
const constants_1 = require("../constants");
class ConstructibleMaintenanceNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.constructibleType = 'BUILDING_';
        this.yieldType = constants_1.YIELD.GOLD;
        this.amount = 1;
        this.fill(payload);
    }
}
exports.ConstructibleMaintenanceNode = ConstructibleMaintenanceNode;
//# sourceMappingURL=ConstructibleMaintenanceNode.js.map