"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StartBiasRiverNode = void 0;
const BaseNode_1 = require("./BaseNode");
class StartBiasRiverNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.civilizationType = null;
        this.leaderType = null;
        this.score = 5;
        this.fill(payload);
    }
}
exports.StartBiasRiverNode = StartBiasRiverNode;
//# sourceMappingURL=StartBiasRiverNode.js.map