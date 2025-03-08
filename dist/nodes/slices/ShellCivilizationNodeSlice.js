"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ShellCivilizationNodeSlice = void 0;
const BaseNode_1 = require("../BaseNode");
class ShellCivilizationNodeSlice extends BaseNode_1.BaseNode {
    constructor(payload = {}) {
        super();
        this.domain = null;
        this.civilizationType = null;
        this.civilizationName = null;
        this.civilizationFullName = null;
        this.civilizationDescription = null;
        this.civilizationIcon = null;
        this.fill(payload);
    }
    static from(civilization) {
        return new ShellCivilizationNodeSlice(Object.assign(Object.assign({}, civilization), { civilizationIcon: civilization.civilizationType, civilizationName: civilization.name, civilizationFullName: civilization.fullName, civilizationDescription: civilization.description }));
    }
}
exports.ShellCivilizationNodeSlice = ShellCivilizationNodeSlice;
//# sourceMappingURL=ShellCivilizationNodeSlice.js.map