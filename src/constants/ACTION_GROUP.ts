// fix for import loop
import { ActionGroup } from "../classes/ActionGroup";
import { Criteria } from "../classes/Criteria";

import { AGE } from "./AGE";

export const ACTION_GROUP = {
    SHELL: new ActionGroup({
        scope: 'shell',
        criteria: new Criteria({ id: 'ALWAYS' })
    }),
    GAME: new ActionGroup({
        scope: 'game',
        criteria: new Criteria({ id: 'ALWAYS' })
    }),
    AGE_ANTIQUITY_CURRENT: new ActionGroup({
        scope: 'game',
        criteria: new Criteria({
            id: `${AGE.ANTIQUITY}_CURRENT`,
            ages: [AGE.ANTIQUITY]
        })
    }),
    AGE_ANTIQUITY_EXIST: new ActionGroup({
        scope: 'game',
        criteria: new Criteria({
            id: `${AGE.ANTIQUITY}_EXIST`,
            ages: [AGE.ANTIQUITY, AGE.EXPLORATION, AGE.MODERN]
        })
    }),
    AGE_EXPLORATION_CURRENT: new ActionGroup({
        scope: 'game',
        criteria: new Criteria({
            id: `${AGE.EXPLORATION}_CURRENT`,
            ages: [AGE.EXPLORATION]
        })
    }),
    AGE_EXPLORATION_EXIST: new ActionGroup({
        scope: 'game',
        criteria: new Criteria({
            id: `${AGE.EXPLORATION}_EXIST`,
            ages: [AGE.EXPLORATION, AGE.MODERN]
        })
    }),
    AGE_MODERN_CURRENT: new ActionGroup({
        scope: 'game',
        criteria: new Criteria({
            id: `${AGE.MODERN}_CURRENT`,
            ages: [AGE.MODERN]
        })
    }),
    AGE_MODERN_EXIST: new ActionGroup({
        scope: 'game',
        criteria: new Criteria({
            id: `${AGE.MODERN}_EXIST`,
            ages: [AGE.MODERN]
        })
    }),
} as const;
