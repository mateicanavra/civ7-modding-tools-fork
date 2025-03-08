"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class TypeNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.type = 'TYPE';
        this.kind = constants_1.KIND.CONSTRUCTIBLE;
        this.fill(payload);
    }
}
exports.TypeNode = TypeNode;
//# sourceMappingURL=TypeNode.js.map