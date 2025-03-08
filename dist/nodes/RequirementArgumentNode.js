"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequirementArgumentNode = void 0;
const BaseNode_1 = require("./BaseNode");
class RequirementArgumentNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.requirementId = 'REQ_';
        this.name = null;
        this.value = null;
        this.fill(payload);
    }
}
exports.RequirementArgumentNode = RequirementArgumentNode;
//# sourceMappingURL=RequirementArgumentNode.js.map