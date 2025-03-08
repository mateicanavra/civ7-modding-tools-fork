"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CivilizationItemNode = void 0;
const BaseNode_1 = require("./BaseNode");
const constants_1 = require("../constants");
class CivilizationItemNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.civilizationDomain = null;
        this.civilizationType = 'CIVILIZATION_';
        this.type = null;
        this.kind = constants_1.KIND.UNIT;
        this.name = null;
        this.description = null;
        this.icon = null;
        this.fill(payload);
    }
}
exports.CivilizationItemNode = CivilizationItemNode;
//# sourceMappingURL=CivilizationItemNode.js.map