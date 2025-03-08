"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CivilizationNode = void 0;
const BaseNode_1 = require("./BaseNode");
class CivilizationNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.civilizationType = 'CIVILIZATION_CUSTOM';
        this.adjective = null;
        this.capitalName = null;
        this.fullName = null;
        this.name = null;
        this.domain = null;
        this.startingCivilizationLevelType = 'CIVILIZATION_LEVEL_FULL_CIV';
        this.aiTargetCityPercentage = null;
        this.description = null;
        this.randomCityNameDepth = null;
        this.uniqueCultureProgressionTree = null;
        this.fill(payload);
    }
}
exports.CivilizationNode = CivilizationNode;
//# sourceMappingURL=CivilizationNode.js.map