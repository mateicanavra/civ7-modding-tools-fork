"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressionTreeNodeUnlockNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class ProgressionTreeNodeUnlockNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.progressionTreeNodeType = 'NODE_';
        this.targetKind = constants_1.KIND.MODIFIER;
        this.targetType = 'MOD_';
        this.unlockDepth = 1;
        this.hidden = null;
        this.aIIgnoreUnlockValue = null;
        this.fill(payload);
    }
}
exports.ProgressionTreeNodeUnlockNode = ProgressionTreeNodeUnlockNode;
//# sourceMappingURL=ProgressionTreeNodeUnlockNode.js.map