"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitReplaceNode = void 0;
const BaseNode_1 = require("./BaseNode");
class UnitReplaceNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.civUniqueUnitType = 'UNIT_TYPE';
        this.replacesUnitType = 'UNIT_TYPE';
        this.fill(payload);
    }
}
exports.UnitReplaceNode = UnitReplaceNode;
//# sourceMappingURL=UnitReplaceNode.js.map