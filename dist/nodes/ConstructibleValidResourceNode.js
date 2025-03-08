"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConstructibleValidResourceNode = void 0;
const constants_1 = require("../constants");
const BaseNode_1 = require("./BaseNode");
class ConstructibleValidResourceNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.constructibleType = 'BUILDING_';
        this.resourceType = constants_1.RESOURCE.GOLD;
        this.rate = null;
        this.fill(payload);
    }
}
exports.ConstructibleValidResourceNode = ConstructibleValidResourceNode;
//# sourceMappingURL=ConstructibleValidResourceNode.js.map