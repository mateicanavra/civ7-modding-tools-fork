"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitAbilityModifierNode = void 0;
const BaseNode_1 = require("./BaseNode");
class UnitAbilityModifierNode extends BaseNode_1.BaseNode {
    constructor(options = {}) {
        super(options);
        this.unitAbilityType = options.unitAbilityType || '';
        this.modifierId = options.modifierId || '';
    }
}
exports.UnitAbilityModifierNode = UnitAbilityModifierNode;
//# sourceMappingURL=UnitAbilityModifierNode.js.map