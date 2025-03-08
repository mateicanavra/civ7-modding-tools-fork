"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TypeTagNode = void 0;
const BaseNode_1 = require("./BaseNode");
class TypeTagNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.tag = 'TAG';
        this.type = 'TYPE';
        this.fill(payload);
    }
}
exports.TypeTagNode = TypeTagNode;
//# sourceMappingURL=TypeTagNode.js.map