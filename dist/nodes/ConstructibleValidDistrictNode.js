"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstructibleValidDistrictNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class ConstructibleValidDistrictNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.constructibleType = 'BUILDING_';
        this.districtType = constants_1.DISTRICT.RURAL;
        this.fill(payload);
    }
}
exports.ConstructibleValidDistrictNode = ConstructibleValidDistrictNode;
//# sourceMappingURL=ConstructibleValidDistrictNode.js.map