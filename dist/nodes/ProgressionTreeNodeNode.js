"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressionTreeNodeNode = void 0;
const BaseNode_1 = require("./BaseNode");
class ProgressionTreeNodeNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.progressionTreeNodeType = 'NODE_';
        this.progressionTree = 'TREE_';
        this.cost = 150;
        this.name = 'LOC_CIVIC__NAME';
        this.iconString = 'cult_aksum';
        this.fill(payload);
    }
}
exports.ProgressionTreeNodeNode = ProgressionTreeNodeNode;
//# sourceMappingURL=ProgressionTreeNodeNode.js.map