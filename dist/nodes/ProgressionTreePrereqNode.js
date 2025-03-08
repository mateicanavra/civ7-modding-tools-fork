"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProgressionTreePrereqNode = void 0;
const BaseNode_1 = require("./BaseNode");
class ProgressionTreePrereqNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.node = 'NODE_';
        this.prereqNode = 'NODE_';
        this.fill(payload);
    }
}
exports.ProgressionTreePrereqNode = ProgressionTreePrereqNode;
//# sourceMappingURL=ProgressionTreePrereqNode.js.map