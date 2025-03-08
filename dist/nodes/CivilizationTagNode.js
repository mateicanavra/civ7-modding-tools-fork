"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CivilizationTagNode = void 0;
const BaseNode_1 = require("./BaseNode");
class CivilizationTagNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.civilizationDomain = 'CIVILIZATION_';
        this.civilizationType = 'CIVILIZATION_';
        this.tagType = 'CIVILIZATION_';
        this.fill(payload);
    }
}
exports.CivilizationTagNode = CivilizationTagNode;
//# sourceMappingURL=CivilizationTagNode.js.map