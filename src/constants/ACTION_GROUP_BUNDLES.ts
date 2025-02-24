import { ActionGroup, ActionGroupBundle, Criteria } from "../classes";
import { AGES } from "./AGES";
import { TObjectValues } from "../types";

const shell = new ActionGroup({
    scope: 'shell',
    criteria: new Criteria({ id: 'always' })
});

const game = new ActionGroup({
    scope: 'game',
    criteria: new Criteria({ id: 'always' })
});

export const ACTION_GROUP_BUNDLES: Record<TObjectValues<typeof AGES>, ActionGroupBundle> = {
    [AGES.AGE_ANTIQUITY]: new ActionGroupBundle({
        shell,
        game,
        current: new ActionGroup({
            scope: 'game',
            criteria: new Criteria({
                id: 'age-antiquity-current',
                ages: [AGES.AGE_ANTIQUITY]
            })
        }),
        exist: new ActionGroup({
            scope: 'game',
            criteria: new Criteria({
                id: 'age-antiquity-exist',
                isAny: true,
                ages: [AGES.AGE_ANTIQUITY, AGES.AGE_EXPLORATION, AGES.AGE_MODERN]
            })
        })
    }),
    [AGES.AGE_EXPLORATION]: new ActionGroupBundle({
        shell,
        game,
        current: new ActionGroup({
            scope: 'game',
            criteria: new Criteria({
                id: 'age-exploration-current',
                ages: [AGES.AGE_EXPLORATION]
            })
        }),
        exist: new ActionGroup({
            scope: 'game',
            criteria: new Criteria({
                id: 'age-exploration-exist',
                isAny: true,
                ages: [AGES.AGE_EXPLORATION, AGES.AGE_MODERN]
            })
        })
    }),
    [AGES.AGE_MODERN]: new ActionGroupBundle({
        shell,
        game,
        current: new ActionGroup({
            scope: 'game',
            criteria: new Criteria({
                id: 'age-modern-current',
                ages: [AGES.AGE_ANTIQUITY]
            })
        }),
        exist: new ActionGroup({
            scope: 'game',
            criteria: new Criteria({
                id: 'age-modern-exist',
                isAny: true,
                ages: [AGES.AGE_MODERN]
            })
        })
    }),

} as const;