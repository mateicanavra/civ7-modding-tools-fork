"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisArtCivilizationUnitCultureNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class VisArtCivilizationUnitCultureNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.civilizationType = 'CIVILIZATION_';
        this.unitCulture = constants_1.UNIT_CULTURE.MED;
        this.fill(payload);
    }
}
exports.VisArtCivilizationUnitCultureNode = VisArtCivilizationUnitCultureNode;
//# sourceMappingURL=VisArtCivilizationUnitCultureNode.js.map