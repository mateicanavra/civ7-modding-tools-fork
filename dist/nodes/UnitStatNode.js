"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitStatNode = void 0;
const BaseNode_1 = require("./BaseNode");
class UnitStatNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.unitType = 'UNIT_TYPE';
        this.bombard = null;
        this.combat = null;
        this.range = null;
        this.rangedCombat = null;
        this.fill(payload);
    }
}
exports.UnitStatNode = UnitStatNode;
//# sourceMappingURL=UnitStatNode.js.map