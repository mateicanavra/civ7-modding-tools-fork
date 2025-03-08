"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.VisualRemapNode = void 0;
const node_crypto_1 = require("node:crypto");
const BaseNode_1 = require("./BaseNode");
class VisualRemapNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.id = (0, node_crypto_1.randomUUID)();
        this.displayName = 'LOC_';
        this.kind = 'UNIT';
        this.from = 'UNIT_';
        this.to = 'UNIT_';
        this.fill(payload);
    }
    toXmlElement() {
        return {
            Row: {
                ID: this.id,
                DisplayName: this.displayName,
                Kind: this.kind,
                From: this.from,
                To: this.to
            }
        };
    }
}
exports.VisualRemapNode = VisualRemapNode;
//# sourceMappingURL=VisualRemapNode.js.map