"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ACTION_GROUP = void 0;
// fix for import loop
const ActionGroupNode_1 = require("../nodes/ActionGroupNode");
const CriteriaNode_1 = require("../nodes/CriteriaNode");
const AGE_1 = require("./AGE");
exports.ACTION_GROUP = {
    SHELL: new ActionGroupNode_1.ActionGroupNode({
        scope: 'shell',
        criteria: new CriteriaNode_1.CriteriaNode({ id: 'always' })
    }),
    GAME: new ActionGroupNode_1.ActionGroupNode({
        scope: 'game',
        criteria: new CriteriaNode_1.CriteriaNode({ id: 'always' })
    }),
    AGE_ANTIQUITY_CURRENT: new ActionGroupNode_1.ActionGroupNode({
        scope: 'game',
        criteria: new CriteriaNode_1.CriteriaNode({
            id: `age-antiquity-current`,
            ages: [AGE_1.AGE.ANTIQUITY]
        })
    }),
    AGE_ANTIQUITY_EXIST: new ActionGroupNode_1.ActionGroupNode({
        scope: 'game',
        criteria: new CriteriaNode_1.CriteriaNode({
            id: `age-antiquity-exist`,
            ages: [AGE_1.AGE.ANTIQUITY, AGE_1.AGE.EXPLORATION, AGE_1.AGE.MODERN]
        })
    }),
    AGE_EXPLORATION_CURRENT: new ActionGroupNode_1.ActionGroupNode({
        scope: 'game',
        criteria: new CriteriaNode_1.CriteriaNode({
            id: `age-exploration-current`,
            ages: [AGE_1.AGE.EXPLORATION]
        })
    }),
    AGE_EXPLORATION_EXIST: new ActionGroupNode_1.ActionGroupNode({
        scope: 'game',
        criteria: new CriteriaNode_1.CriteriaNode({
            id: `age-exploration-exist`,
            ages: [AGE_1.AGE.EXPLORATION, AGE_1.AGE.MODERN]
        })
    }),
    AGE_MODERN_CURRENT: new ActionGroupNode_1.ActionGroupNode({
        scope: 'game',
        criteria: new CriteriaNode_1.CriteriaNode({
            id: `age-modern-current`,
            ages: [AGE_1.AGE.MODERN]
        })
    }),
    AGE_MODERN_EXIST: new ActionGroupNode_1.ActionGroupNode({
        scope: 'game',
        criteria: new CriteriaNode_1.CriteriaNode({
            id: `age-modern-exist`,
            ages: [AGE_1.AGE.MODERN]
        })
    }),
};
//# sourceMappingURL=ACTION_GROUP.js.map