"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TagNode = void 0;
const BaseNode_1 = require("./BaseNode");
class TagNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.tag = 'TAG';
        this.category = 'CATEGORY';
        this.fill(payload);
    }
}
exports.TagNode = TagNode;
//# sourceMappingURL=TagNode.js.map