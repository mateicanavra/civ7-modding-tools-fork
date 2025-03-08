"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TraditionNode = void 0;
const BaseNode_1 = require("./BaseNode");
class TraditionNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.traditionType = 'TRADITION_';
        this.name = 'Name';
        this.description = 'Description';
        this.isCrisis = null;
        this.fill(payload);
    }
}
exports.TraditionNode = TraditionNode;
//# sourceMappingURL=TraditionNode.js.map