"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstructibleYieldChangeNode = void 0;
const BaseNode_1 = require("./BaseNode");
const constants_1 = require("../constants");
class ConstructibleYieldChangeNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.constructibleType = 'BUILDING_';
        this.yieldType = constants_1.YIELD.GOLD;
        this.yieldChange = 1;
        this.fill(payload);
    }
}
exports.ConstructibleYieldChangeNode = ConstructibleYieldChangeNode;
//# sourceMappingURL=ConstructibleYieldChangeNode.js.map