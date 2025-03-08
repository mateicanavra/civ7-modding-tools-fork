"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraitModifierNode = void 0;
const BaseNode_1 = require("./BaseNode");
class TraitModifierNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.traitType = 'TRAIT_';
        this.modifierId = 'MOD_';
        this.fill(payload);
    }
}
exports.TraitModifierNode = TraitModifierNode;
//# sourceMappingURL=TraitModifierNode.js.map