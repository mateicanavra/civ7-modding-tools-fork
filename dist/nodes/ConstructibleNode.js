"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstructibleNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class ConstructibleNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.constructibleClass = constants_1.CONSTRUCTIBLE_CLASS.BUILDING;
        this.constructibleType = 'BUILDING_';
        this.cost = 1;
        this.name = 'test';
        this.population = 1;
        this.adjacentDistrict = null;
        this.adjacentLake = null;
        this.adjacentRiver = null;
        this.adjacentTerrain = null;
        this.age = null;
        this.archaeology = null;
        this.canBeHidden = null;
        this.costProgressionModel = null;
        this.costProgressionParam1 = null;
        this.defense = null;
        this.description = null;
        this.discovery = null;
        this.districtDefense = null;
        this.existingDistrictOnly = null;
        this.immuneDamage = null;
        this.inRailNetwork = null;
        this.militaryDomain = null;
        this.noFeature = null;
        this.noRiver = null;
        this.productionBoostOverRoute = null;
        this.repairable = null;
        this.requiresAppealPlacement = null;
        this.requiresDistantLands = null;
        this.requiresHomeland = null;
        this.requiresUnlock = null;
        this.riverPlacement = null;
        this.tooltip = null;
        this.victoryItem = null;
        this.fill(payload);
    }
}
exports.ConstructibleNode = ConstructibleNode;
//# sourceMappingURL=ConstructibleNode.js.map