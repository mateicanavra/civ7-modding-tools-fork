"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionGroupNode = void 0;
const node_crypto_1 = require("node:crypto");
const BaseNode_1 = require("./BaseNode");
const CriteriaNode_1 = require("./CriteriaNode");
class ActionGroupNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.id = (0, node_crypto_1.randomUUID)();
        this.scope = 'game';
        this.criteria = new CriteriaNode_1.CriteriaNode();
        this.fill(payload);
    }
}
exports.ActionGroupNode = ActionGroupNode;
//# sourceMappingURL=ActionGroupNode.js.map