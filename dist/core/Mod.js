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
exports.Mod = void 0;
const lodash = __importStar(require("lodash"));
const fs = __importStar(require("node:fs"));
const utils_1 = require("../utils");
const files_1 = require("../files");
class Mod {
    constructor(payload = {}) {
        this.id = 'test';
        this.name = 'test';
        this.version = 1;
        this.description = 'generated by https://github.com/izica/civ7-modding-tool';
        this.authors = 'generated by https://github.com/izica/civ7-modding-tool';
        this.affectsSavedGames = true;
        this.builders = [];
        this.files = [];
        this.fill = (utils_1.fill);
        this.fill(payload);
    }
    /**
     * @description add/link builders to mod
     * @param data
     */
    add(data) {
        if (Array.isArray(data)) {
            this.builders = this.builders.concat(data);
        }
        else {
            this.builders.push(data);
        }
        return this;
    }
    addFiles(data) {
        if (Array.isArray(data)) {
            this.files = this.files.concat(data);
        }
        else {
            this.files.push(data);
        }
        return this;
    }
    // TODO maybe refactoring in feature?
    build(dist = './dist', clear = true) {
        if (clear) {
            fs.mkdirSync(dist, { recursive: true });
            fs.rmSync(dist, { recursive: true });
            fs.mkdirSync(dist, { recursive: true });
        }
        const files = this.builders
            .flatMap(builder => builder.build())
            .concat(this.files)
            .filter(file => !file.isEmpty);
        const criterias = lodash.uniqBy(files.flatMap(file => file.actionGroups.map(actionGroup => actionGroup.criteria)), criteria => criteria.id);
        const actionGroups = {};
        files.forEach(file => {
            file.actionGroups.forEach(actionGroup => {
                if (!actionGroups[actionGroup.id]) {
                    actionGroups[actionGroup.id] = { actionGroup, actions: {} };
                }
                file.actionGroupActions.forEach(actionGroupAction => {
                    var _a;
                    if (!actionGroups[actionGroup.id].actions[actionGroupAction]) {
                        actionGroups[actionGroup.id].actions[actionGroupAction] = [];
                    }
                    (_a = actionGroups[actionGroup.id].actions[actionGroupAction]) === null || _a === void 0 ? void 0 : _a.push(file.modInfoPath);
                });
            });
        });
        const modInfo = new files_1.XmlFile({
            name: `${this.id}.modinfo`,
            path: '/',
            content: {
                _name: 'Mod',
                _attrs: {
                    id: this.id,
                    version: this.version,
                    xmlns: "ModInfo"
                },
                _content: {
                    Properties: {
                        Name: this.name,
                        Description: this.description,
                        Authors: this.authors,
                        Version: this.version,
                        AffectsSavedGames: +this.affectsSavedGames
                    },
                    Dependencies: [{
                            _name: 'Mod',
                            _attrs: {
                                id: 'base-standard',
                                title: 'LOC_MODULE_BASE_STANDARD_NAME'
                            }
                        }],
                    ActionCriteria: criterias.map(criteria => criteria.toXmlElement()),
                    ActionGroups: Object.values(actionGroups).map(({ actionGroup, actions }) => ({
                        _name: 'ActionGroup',
                        _attrs: {
                            id: actionGroup.id,
                            scope: actionGroup.scope,
                            criteria: actionGroup.criteria.id,
                        },
                        _content: {
                            Actions: Object.entries(actions).map(([key, items]) => ({
                                [key]: items.map(item => ({
                                    Item: item
                                }))
                            }))
                        }
                    }))
                }
            }
        });
        modInfo.write(dist);
        files.forEach(file => file.write(dist));
        return [];
    }
}
exports.Mod = Mod;
//# sourceMappingURL=Mod.js.map