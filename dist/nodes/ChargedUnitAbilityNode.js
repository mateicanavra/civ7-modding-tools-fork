"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChargedUnitAbilityNode = void 0;
const BaseNode_1 = require("./BaseNode");
class ChargedUnitAbilityNode extends BaseNode_1.BaseNode {
    constructor(options = {}) {
        super(options);
        this.unitAbilityType = options.unitAbilityType || '';
        this.rechargeTurns = options.rechargeTurns || 5;
    }
    toXmlElement() {
        return super.toXmlElement();
    }
}
exports.ChargedUnitAbilityNode = ChargedUnitAbilityNode;
//# sourceMappingURL=ChargedUnitAbilityNode.js.map