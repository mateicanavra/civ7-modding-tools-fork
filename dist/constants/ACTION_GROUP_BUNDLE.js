"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTION_GROUP_BUNDLE = void 0;
const ActionGroupBundle_1 = require("../core/ActionGroupBundle");
const AGE_1 = require("./AGE");
const ACTION_GROUP_1 = require("./ACTION_GROUP");
exports.ACTION_GROUP_BUNDLE = {
    [AGE_1.AGE.ANTIQUITY]: new ActionGroupBundle_1.ActionGroupBundle({
        shell: ACTION_GROUP_1.ACTION_GROUP.SHELL,
        always: ACTION_GROUP_1.ACTION_GROUP.GAME,
        current: ACTION_GROUP_1.ACTION_GROUP.AGE_ANTIQUITY_CURRENT,
        exist: ACTION_GROUP_1.ACTION_GROUP.AGE_ANTIQUITY_EXIST
    }),
    [AGE_1.AGE.EXPLORATION]: new ActionGroupBundle_1.ActionGroupBundle({
        shell: ACTION_GROUP_1.ACTION_GROUP.SHELL,
        always: ACTION_GROUP_1.ACTION_GROUP.GAME,
        current: ACTION_GROUP_1.ACTION_GROUP.AGE_EXPLORATION_CURRENT,
        exist: ACTION_GROUP_1.ACTION_GROUP.AGE_EXPLORATION_EXIST
    }),
    [AGE_1.AGE.MODERN]: new ActionGroupBundle_1.ActionGroupBundle({
        shell: ACTION_GROUP_1.ACTION_GROUP.SHELL,
        always: ACTION_GROUP_1.ACTION_GROUP.GAME,
        current: ACTION_GROUP_1.ACTION_GROUP.AGE_MODERN_CURRENT,
        exist: ACTION_GROUP_1.ACTION_GROUP.AGE_MODERN_EXIST
    }),
};
//# sourceMappingURL=ACTION_GROUP_BUNDLE.js.map