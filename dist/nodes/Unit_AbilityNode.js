"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Unit_AbilityNode = void 0;
const BaseNode_1 = require("./BaseNode");
class Unit_AbilityNode extends BaseNode_1.BaseNode {
    constructor(options = {}) {
        super(options);
        this.unitType = options.unitType || '';
        this.unitAbilityType = options.unitAbilityType || '';
    }
}
exports.Unit_AbilityNode = Unit_AbilityNode;
//# sourceMappingURL=Unit_AbilityNode.js.map