"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnlockConfigurationValueNode = void 0;
const BaseNode_1 = require("./BaseNode");
class UnlockConfigurationValueNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.unlockType = 'UNLOCK_';
        this.configurationValue = null;
        this.fill(payload);
    }
}
exports.UnlockConfigurationValueNode = UnlockConfigurationValueNode;
//# sourceMappingURL=UnlockConfigurationValueNode.js.map