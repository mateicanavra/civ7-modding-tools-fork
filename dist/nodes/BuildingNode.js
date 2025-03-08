"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BuildingNode = void 0;
const BaseNode_1 = require("./BaseNode");
class BuildingNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.constructibleType = 'BUILDING_';
        this.movable = false;
        this.traitType = null;
        this.allowsHolyCity = null;
        this.archaeologyResearch = null;
        this.buildQueue = null;
        this.capital = null;
        this.citizenSlots = null;
        this.cityCenterPriority = null;
        this.defenseModifier = null;
        this.grantFortification = null;
        this.housing = null;
        this.maxPlayerInstances = null;
        this.multiplePerCity = null;
        this.mustPurchase = null;
        this.outerDefenseHitPoints = null;
        this.outerDefenseStrength = null;
        this.purchasable = null;
        this.purchaseYield = null;
        this.town = null;
        this.workable = null;
        this.fill(payload);
    }
}
exports.BuildingNode = BuildingNode;
//# sourceMappingURL=BuildingNode.js.map