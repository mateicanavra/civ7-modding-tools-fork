"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CityNameNode = void 0;
const BaseNode_1 = require("./BaseNode");
class CityNameNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.civilizationType = 'CIVILIZATION_';
        this.cityName = null;
        this.fill(payload);
    }
}
exports.CityNameNode = CityNameNode;
//# sourceMappingURL=CityNameNode.js.map