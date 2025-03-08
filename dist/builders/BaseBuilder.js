"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseBuilder = void 0;
const core_1 = require("../core");
class BaseBuilder {
    constructor() {
        this.actionGroupBundle = new core_1.ActionGroupBundle();
    }
    fill(payload = {}) {
        for (const [key, value] of Object.entries(payload)) {
            if (this.hasOwnProperty(key)) {
                this[key] = value;
            }
        }
        this.migrate();
        return this;
    }
    migrate() {
        return this;
    }
    // this should return files
    build() {
        return [];
    }
}
exports.BaseBuilder = BaseBuilder;
//# sourceMappingURL=BaseBuilder.js.map