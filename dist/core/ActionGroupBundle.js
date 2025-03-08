"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionGroupBundle = void 0;
const nodes_1 = require("../nodes");
const utils_1 = require("../utils");
class ActionGroupBundle {
    constructor(payload = {}) {
        this.shell = new nodes_1.ActionGroupNode();
        this.always = new nodes_1.ActionGroupNode();
        this.current = new nodes_1.ActionGroupNode();
        this.exist = new nodes_1.ActionGroupNode();
        this.fill = (utils_1.fill);
        this.fill(payload);
    }
}
exports.ActionGroupBundle = ActionGroupBundle;
//# sourceMappingURL=ActionGroupBundle.js.map