"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IconDefinitionNode = void 0;
const BaseNode_1 = require("./BaseNode");
class IconDefinitionNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.id = 'id';
        this.path = 'path';
        this.fill(payload);
    }
    toXmlElement() {
        return {
            Row: {
                ID: this.id,
                Path: this.path
            }
        };
    }
}
exports.IconDefinitionNode = IconDefinitionNode;
//# sourceMappingURL=IconDefinitionNode.js.map