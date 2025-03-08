"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LegacyCivilizationNode = void 0;
const BaseNode_1 = require("./BaseNode");
class LegacyCivilizationNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.civilizationType = 'CIVILIZATION_';
        this.adjective = 'adjective';
        this.age = 'adjective';
        this.fullName = 'FullName';
        this.name = 'Name';
        this.fill(payload);
    }
}
exports.LegacyCivilizationNode = LegacyCivilizationNode;
//# sourceMappingURL=LegacyCivilizationNode.js.map