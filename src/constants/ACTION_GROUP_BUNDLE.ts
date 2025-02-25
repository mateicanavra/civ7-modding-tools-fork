import { ActionGroupBundle } from "../classes/ActionGroupBundle";

import { AGE } from "./AGE";
import { ACTION_GROUP } from "./ACTION_GROUP";

export const ACTION_GROUP_BUNDLE = {
    [AGE.ANTIQUITY]: new ActionGroupBundle({
        shell: ACTION_GROUP.SHELL,
        game: ACTION_GROUP.GAME,
        current: ACTION_GROUP.AGE_ANTIQUITY_CURRENT,
        exist: ACTION_GROUP.AGE_ANTIQUITY_EXIST
    }),
    [AGE.EXPLORATION]: new ActionGroupBundle({
        shell: ACTION_GROUP.SHELL,
        game: ACTION_GROUP.GAME,
        current: ACTION_GROUP.AGE_EXPLORATION_CURRENT,
        exist: ACTION_GROUP.AGE_EXPLORATION_EXIST
    }),
    [AGE.MODERN]: new ActionGroupBundle({
        shell: ACTION_GROUP.SHELL,
        game: ACTION_GROUP.GAME,
        current: ACTION_GROUP.AGE_MODERN_CURRENT,
        exist: ACTION_GROUP.AGE_MODERN_EXIST
    }),
} as const;
