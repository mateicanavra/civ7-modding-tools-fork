"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnlockRewardNode = void 0;
const BaseNode_1 = require("./BaseNode");
class UnlockRewardNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.unlockType = 'UNLOCK_';
        this.name = null;
        this.description = null;
        this.icon = null;
        this.civUnlock = null;
        this.fill(payload);
    }
}
exports.UnlockRewardNode = UnlockRewardNode;
//# sourceMappingURL=UnlockRewardNode.js.map