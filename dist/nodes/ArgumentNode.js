"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ArgumentNode = void 0;
const BaseNode_1 = require("./BaseNode");
class ArgumentNode extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this._name = 'Argument';
        this.name = null;
        this.value = null;
        this.fill(payload);
    }
    toXmlElement() {
        return {
            _name: this._name,
            _attrs: {
                name: this.name,
            },
            _content: this.value
        };
    }
}
exports.ArgumentNode = ArgumentNode;
//# sourceMappingURL=ArgumentNode.js.map