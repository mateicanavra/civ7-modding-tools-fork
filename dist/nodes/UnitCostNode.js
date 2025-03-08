"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitCostNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class UnitCostNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.unitType = 'UNIT_TYPE';
        this.yieldType = constants_1.YIELD.PRODUCTION;
        this.cost = 1;
        this.fill(payload);
    }
}
exports.UnitCostNode = UnitCostNode;
//# sourceMappingURL=UnitCostNode.js.map