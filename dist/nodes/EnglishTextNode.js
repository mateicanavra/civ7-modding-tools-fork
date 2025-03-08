"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EnglishTextNode = void 0;
const BaseNode_1 = require("./BaseNode");
class EnglishTextNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this._name = 'Row';
        this.tag = 'LOC_';
        this.text = 'text';
        this.fill(payload);
    }
    toXmlElement() {
        return {
            _name: this._name,
            _attrs: {
                Tag: this.tag,
            },
            _content: {
                Text: this.text
            }
        };
    }
}
exports.EnglishTextNode = EnglishTextNode;
//# sourceMappingURL=EnglishTextNode.js.map