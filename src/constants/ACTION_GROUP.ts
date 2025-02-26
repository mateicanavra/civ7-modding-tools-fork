// fix for import loop
import { ActionGroupNode } from "../nodes/ActionGroupNode";
import { CriteriaNode } from "../nodes/CriteriaNode";

import { AGE } from "./AGE";

export const ACTION_GROUP = {
    SHELL: new ActionGroupNode({
        scope: 'shell',
        criteria: new CriteriaNode({ id: 'always' })
    }),
    GAME: new ActionGroupNode({
        scope: 'game',
        criteria: new CriteriaNode({ id: 'always' })
    }),
    AGE_ANTIQUITY_CURRENT: new ActionGroupNode({
        scope: 'game',
        criteria: new CriteriaNode({
            id: `age-antiquity-current`,
            ages: [AGE.ANTIQUITY]
        })
    }),
    AGE_ANTIQUITY_EXIST: new ActionGroupNode({
        scope: 'game',
        criteria: new CriteriaNode({
            id: `age-antiquity-exist`,
            ages: [AGE.ANTIQUITY, AGE.EXPLORATION, AGE.MODERN]
        })
    }),
    AGE_EXPLORATION_CURRENT: new ActionGroupNode({
        scope: 'game',
        criteria: new CriteriaNode({
            id: `age-exploration-current`,
            ages: [AGE.EXPLORATION]
        })
    }),
    AGE_EXPLORATION_EXIST: new ActionGroupNode({
        scope: 'game',
        criteria: new CriteriaNode({
            id: `age-exploration-exist`,
            ages: [AGE.EXPLORATION, AGE.MODERN]
        })
    }),
    AGE_MODERN_CURRENT: new ActionGroupNode({
        scope: 'game',
        criteria: new CriteriaNode({
            id: `age-modern-current`,
            ages: [AGE.MODERN]
        })
    }),
    AGE_MODERN_EXIST: new ActionGroupNode({
        scope: 'game',
        criteria: new CriteriaNode({
            id: `age-modern-exist`,
            ages: [AGE.MODERN]
        })
    }),
} as const;
