"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitUpgradeNode = void 0;
const BaseNode_1 = require("./BaseNode");
class UnitUpgradeNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.unit = 'UNIT_TYPE';
        this.upgradeUnit = 'UNIT_TYPE';
        this.fill(payload);
    }
}
exports.UnitUpgradeNode = UnitUpgradeNode;
//# sourceMappingURL=UnitUpgradeNode.js.map