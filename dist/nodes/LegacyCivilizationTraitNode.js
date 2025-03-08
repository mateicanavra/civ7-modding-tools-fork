"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacyCivilizationTraitNode = void 0;
const BaseNode_1 = require("./BaseNode");
class LegacyCivilizationTraitNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.traitType = 'TRAIT_';
        this.civilizationType = 'CIVILIZATION_';
        this.fill(payload);
    }
}
exports.LegacyCivilizationTraitNode = LegacyCivilizationTraitNode;
//# sourceMappingURL=LegacyCivilizationTraitNode.js.map