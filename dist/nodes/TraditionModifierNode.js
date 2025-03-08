"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraditionModifierNode = void 0;
const BaseNode_1 = require("./BaseNode");
class TraditionModifierNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.traditionType = 'TRADITION_';
        this.modifierId = 'Name';
        this.fill(payload);
    }
}
exports.TraditionModifierNode = TraditionModifierNode;
//# sourceMappingURL=TraditionModifierNode.js.map