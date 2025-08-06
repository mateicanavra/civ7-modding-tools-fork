"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitAbilityNode = void 0;
const BaseNode_1 = require("./BaseNode");
class UnitAbilityNode extends BaseNode_1.BaseNode {
    constructor(options = {}) {
        super(options);
        this.unitAbilityType = options.unitAbilityType || '';
        this.name = options.name || '';
        this.description = options.description || '';
    }
    toXmlElement() {
        return super.toXmlElement();
    }
}
exports.UnitAbilityNode = UnitAbilityNode;
//# sourceMappingURL=UnitAbilityNode.js.map