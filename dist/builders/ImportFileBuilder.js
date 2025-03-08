"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ImportFileBuilder = void 0;
const fs = __importStar(require("node:fs"));
const path = __importStar(require("node:path"));
const files_1 = require("../files");
const constants_1 = require("../constants");
const BaseBuilder_1 = require("./BaseBuilder");
class ImportFileBuilder extends BaseBuilder_1.BaseBuilder {
    constructor(payload = {}) {
        super();
        this.content = '';
        this.name = '';
        this.actionGroups = [];
        this.actionGroupActions = [];
        this.fill(payload);
    }
    build() {
        if (!fs.existsSync(this.content)) {
            return [];
        }
        return [
            new files_1.ImportFile({
                name: this.name ? this.name : path.basename(this.content),
                content: this.content,
                actionGroups: this.actionGroups.length > 0 ? this.actionGroups : [this.actionGroupBundle.shell, this.actionGroupBundle.always],
                actionGroupActions: this.actionGroupActions.length > 0 ? this.actionGroupActions : [constants_1.ACTION_GROUP_ACTION.IMPORT_FILES]
            }),
        ];
    }
}
exports.ImportFileBuilder = ImportFileBuilder;
//# sourceMappingURL=ImportFileBuilder.js.map