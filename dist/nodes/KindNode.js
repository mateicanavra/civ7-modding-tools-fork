"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KindNode = void 0;
const BaseNode_1 = require("./BaseNode");
class KindNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.kind = 'KIND_';
        this.fill(payload);
    }
}
exports.KindNode = KindNode;
//# sourceMappingURL=KindNode.js.map