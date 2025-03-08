"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstructiblePlunderNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class ConstructiblePlunderNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.constructibleType = 'BUILDING_';
        this.plunderType = constants_1.PLUNDER.HEAL;
        this.amount = 30;
        this.fill(payload);
    }
}
exports.ConstructiblePlunderNode = ConstructiblePlunderNode;
//# sourceMappingURL=ConstructiblePlunderNode.js.map