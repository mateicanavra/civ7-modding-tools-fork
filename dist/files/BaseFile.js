"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseFile = void 0;
const utils_1 = require("../utils");
const constants_1 = require("../constants");
class BaseFile {
    constructor(payload = {}) {
        this.path = '/';
        this.name = 'file.txt';
        this.content = null;
        this.actionGroups = [];
        this.actionGroupActions = [constants_1.ACTION_GROUP_ACTION.UPDATE_DATABASE];
        this.fill = (utils_1.fill);
        this.fill(payload);
    }
    get modInfoPath() {
        if (this.path.startsWith('/')) {
            return `${this.path}${this.name}`.slice(1);
        }
        return `${this.path}${this.name}`;
    }
    write(dist) {
    }
}
exports.BaseFile = BaseFile;
//# sourceMappingURL=BaseFile.js.map