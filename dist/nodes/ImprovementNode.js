"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImprovementNode = void 0;
const BaseNode_1 = require("./BaseNode");
class ImprovementNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.constructibleType = `IMPROVEMENT_`;
        this.adjacentSeaResource = null;
        this.airSlots = null;
        this.barbarianCamp = null;
        this.buildInLine = null;
        this.buildOnFrontier = null;
        this.canBuildOnNonDistrict = null;
        this.canBuildOutsideTerritory = null;
        this.cityBuildable = null;
        this.defenseModifier = null;
        this.discoveryType = null;
        this.dispersalGold = null;
        this.domain = null;
        this.grantFortification = null;
        this.icon = null;
        this.ignoreNaturalYields = null;
        this.improvementOnRemove = null;
        this.mustBeAppealing = null;
        this.onePerSettlement = null;
        this.removeOnEntry = null;
        this.resourceTier = null;
        this.sameAdjacentValid = null;
        this.traitType = null;
        this.unitBuildable = null;
        this.weaponSlots = null;
        this.workable = null;
        this.fill(payload);
    }
}
exports.ImprovementNode = ImprovementNode;
//# sourceMappingURL=ImprovementNode.js.map