"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitAdvisoryNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class UnitAdvisoryNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.unitType = 'UNIT_TYPE';
        this.advisoryClassType = constants_1.ADVISORY.CLASS_FOOD;
        this.fill(payload);
    }
}
exports.UnitAdvisoryNode = UnitAdvisoryNode;
//# sourceMappingURL=UnitAdvisoryNode.js.map