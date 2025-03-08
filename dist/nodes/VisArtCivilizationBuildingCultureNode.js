"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisArtCivilizationBuildingCultureNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class VisArtCivilizationBuildingCultureNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.civilizationType = 'CIVILIZATION_';
        this.buildingCulture = constants_1.BUILDING_CULTURES.MED;
        this.fill(payload);
    }
}
exports.VisArtCivilizationBuildingCultureNode = VisArtCivilizationBuildingCultureNode;
//# sourceMappingURL=VisArtCivilizationBuildingCultureNode.js.map