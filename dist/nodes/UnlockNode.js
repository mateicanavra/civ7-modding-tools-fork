"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnlockNode = void 0;
const BaseNode_1 = require("./BaseNode");
class UnlockNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.unlockType = 'UNLOCK_';
        this.fill(payload);
    }
}
exports.UnlockNode = UnlockNode;
//# sourceMappingURL=UnlockNode.js.map