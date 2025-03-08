"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraitNode = void 0;
const BaseNode_1 = require("./BaseNode");
class TraitNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.traitType = 'TRAIT_';
        this.name = null;
        this.description = null;
        this.internalOnly = null;
        this.fill(payload);
    }
}
exports.TraitNode = TraitNode;
//# sourceMappingURL=TraitNode.js.map