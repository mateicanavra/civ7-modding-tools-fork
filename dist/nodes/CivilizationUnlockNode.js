"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CivilizationUnlockNode = void 0;
const BaseNode_1 = require("./BaseNode");
const constants_1 = require("../constants");
class CivilizationUnlockNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.civilizationDomain = '';
        this.civilizationType = 'CIVILIZATION_';
        this.type = 'CIVILIZATION_';
        this.kind = constants_1.KIND.CIVILIZATION;
        this.name = null;
        this.description = null;
        this.icon = null;
        this.ageDomain = 'StandardAges';
        this.ageType = constants_1.AGE.ANTIQUITY;
        this.fill(payload);
    }
}
exports.CivilizationUnlockNode = CivilizationUnlockNode;
//# sourceMappingURL=CivilizationUnlockNode.js.map