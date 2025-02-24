import { ActionGroup, ActionGroupBundle, Criteria } from "../classes";
import { AGE } from "./AGE";
import { TObjectValues } from "../types";

const shell = new ActionGroup({
    scope: 'shell',
    criteria: new Criteria({ id: 'always' })
});

const game = new ActionGroup({
    scope: 'game',
    criteria: new Criteria({ id: 'always' })
});

export const ACTION_GROUP_BUNDLE: Record<TObjectValues<typeof AGE>, ActionGroupBundle> = {
    [AGE.ANTIQUITY]: new ActionGroupBundle({
        shell,
        game,
        current: new ActionGroup({
            scope: 'game',
            criteria: new Criteria({
                id: 'age-antiquity-current',
                ages: [AGE.ANTIQUITY]
            })
        }),
        exist: new ActionGroup({
            scope: 'game',
            criteria: new Criteria({
                id: 'age-antiquity-exist',
                isAny: true,
                ages: [AGE.ANTIQUITY, AGE.EXPLORATION, AGE.MODERN]
            })
        })
    }),
    [AGE.EXPLORATION]: new ActionGroupBundle({
        shell,
        game,
        current: new ActionGroup({
            scope: 'game',
            criteria: new Criteria({
                id: 'age-exploration-current',
                ages: [AGE.EXPLORATION]
            })
        }),
        exist: new ActionGroup({
            scope: 'game',
            criteria: new Criteria({
                id: 'age-exploration-exist',
                isAny: true,
                ages: [AGE.EXPLORATION, AGE.MODERN]
            })
        })
    }),
    [AGE.MODERN]: new ActionGroupBundle({
        shell,
        game,
        current: new ActionGroup({
            scope: 'game',
            criteria: new Criteria({
                id: 'age-modern-current',
                ages: [AGE.ANTIQUITY]
            })
        }),
        exist: new ActionGroup({
            scope: 'game',
            criteria: new Criteria({
                id: 'age-modern-exist',
                isAny: true,
                ages: [AGE.MODERN]
            })
        })
    }),

} as const;