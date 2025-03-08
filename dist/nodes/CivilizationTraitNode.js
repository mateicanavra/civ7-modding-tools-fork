"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CivilizationTraitNode = void 0;
const BaseNode_1 = require("./BaseNode");
class CivilizationTraitNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.traitType = 'TRAIT_';
        this.civilizationType = 'CIVILIZATION_';
        this.fill(payload);
    }
}
exports.CivilizationTraitNode = CivilizationTraitNode;
//# sourceMappingURL=CivilizationTraitNode.js.map