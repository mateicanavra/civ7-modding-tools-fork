"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fill = fill;
function fill(payload = {}) {
    for (const [key, value] of Object.entries(payload)) {
        if (this.hasOwnProperty(key)) {
            this[key] = value;
        }
    }
    return this;
}
//# sourceMappingURL=fill.js.map