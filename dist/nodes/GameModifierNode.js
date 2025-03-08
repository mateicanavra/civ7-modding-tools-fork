"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameModifierNode = void 0;
const BaseNode_1 = require("./BaseNode");
class GameModifierNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.modifierId = null;
        this.fill(payload);
    }
}
exports.GameModifierNode = GameModifierNode;
//# sourceMappingURL=GameModifierNode.js.map