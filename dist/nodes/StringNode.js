"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StringNode = void 0;
const BaseNode_1 = require("./BaseNode");
class StringNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this._name = 'String';
        this.context = null;
        this.value = null;
        this.fill(payload);
    }
    toXmlElement() {
        return {
            _name: this._name,
            _attrs: {
                context: this.context,
            },
            _content: this.value
        };
    }
}
exports.StringNode = StringNode;
//# sourceMappingURL=StringNode.js.map