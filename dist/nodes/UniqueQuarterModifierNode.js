"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UniqueQuarterModifierNode = void 0;
const BaseNode_1 = require("./BaseNode");
class UniqueQuarterModifierNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.uniqueQuarterType = 'QUARTER_';
        this.modifierId = null;
        this.fill(payload);
    }
}
exports.UniqueQuarterModifierNode = UniqueQuarterModifierNode;
//# sourceMappingURL=UniqueQuarterModifierNode.js.map