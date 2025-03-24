import { CivilizationUnlockBuilder, LeaderUnlockBuilder, AGE } from "civ7-modding-tools";
import { ACTION_GROUP_BUNDLE } from "../config";
import { civilization } from "../civilizations/dacia";

// Civilization unlocks
export const civilizationUnlockToMongolia = new CivilizationUnlockBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_EXPLORATION,
    from: {
        civilizationType: civilization.civilization.civilizationType,
        ageType: AGE.ANTIQUITY,
    },
    to: { civilizationType: "CIVILIZATION_MONGOLIA", ageType: AGE.MODERN },
});

export const civilizationUnlockToPrussia = new CivilizationUnlockBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_EXPLORATION,
    from: {
        civilizationType: civilization.civilization.civilizationType,
        ageType: AGE.ANTIQUITY,
    },
    to: { civilizationType: "CIVILIZATION_PRUSSIA", ageType: AGE.MODERN },
});

// Leader unlock
export const leaderCatherineUnlock = new LeaderUnlockBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_EXPLORATION,
    leaderUnlock: {
        leaderType: "LEADER_CATHERINE",
        type: civilization.civilization.civilizationType,
        ageType: AGE.EXPLORATION,
    },
    leaderCivilizationBias: {
        bias: 6,
    },
    localizations: [
        {
            tooltip: `[B]Catherine[/B] ruled [B]Dacia[/B].`,
        },
    ],
});

export const allUnlocks = [
    civilizationUnlockToMongolia,
    civilizationUnlockToPrussia,
    leaderCatherineUnlock
]; 