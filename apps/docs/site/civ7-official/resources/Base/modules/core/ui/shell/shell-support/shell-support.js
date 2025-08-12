/**
 * @file shell-support.ts
 * @copyright 2023, Firaxis Games
 * @description Support functions/classes used by shell screens
 */
import LiveEventManager from '/core/ui/shell/live-event-logic/live-event-logic.js';
// TODO: This is a stopgap measure before the data can be populated via the SetupParameters API.
export function GetCivilizationData() {
    const results = [];
    const playerParameter = GameSetup.findPlayerParameter(GameContext.localPlayerID, 'PlayerCivilization');
    if (playerParameter) {
        // Additional queries.
        const bonusItems = Database.query('config', 'select * from CivilizationItems order by SortIndex') ?? [];
        const tags = Database.query('config', 'select * from CivilizationTags inner join Tags on CivilizationTags.TagType = Tags.TagType inner join TagCategories on Tags.TagCategoryType = TagCategories.TagCategoryType') ?? [];
        const unlocks = Database.query('config', 'select * from CivilizationUnlocks order by SortIndex') ?? [];
        const bias = Database.query('config', 'select * from LeaderCivilizationBias') ?? [];
        const victoryProgress = HallofFame.getCivilizationProgress('RULESET_STANDARD');
        const ageMap = new Map();
        const ageParameter = GameSetup.findGameParameter('Age');
        if (ageParameter) {
            ageParameter.domain.possibleValues?.forEach(v => {
                const ageType = v.value?.toString();
                const ageDomain = GameSetup.resolveString(v.originDomain);
                const ageName = GameSetup.resolveString(v.name);
                ageMap.set(ageType, {
                    AgeDomain: ageDomain,
                    AgeType: ageType,
                    AgeName: ageName
                });
            });
        }
        let leaderType = '';
        let leaderDomain = '';
        const leaderParameter = GameSetup.findPlayerParameter(GameContext.localPlayerID, 'PlayerLeader');
        if (leaderParameter) {
            leaderDomain = GameSetup.resolveString(leaderParameter.value.originDomain) ?? '';
            leaderType = leaderParameter.value.value;
        }
        // Additional filter by current selected leader
        let leaderCivBias = bias.filter(row => row.LeaderType == leaderType && row.LeaderDomain == leaderDomain);
        playerParameter.domain.possibleValues?.forEach((v) => {
            const civID = v.value?.toString();
            const domain = GameSetup.resolveString(v.originDomain);
            const name = GameSetup.resolveString(v.name);
            const desc = GameSetup.resolveString(v.description);
            const valueBonusItems = bonusItems.filter(item => item.CivilizationType == civID && item.CivilizationDomain == domain);
            const valueTags = tags.filter(tag => !tag.HideInDetails && tag.CivilizationType == civID && tag.CivilizationDomain == domain);
            let valueUnlocks = unlocks.filter(unlock => unlock.CivilizationType == civID && unlock.CivilizationDomain == domain);
            // Additional filter on unlocks to cull away any invalid ages.
            valueUnlocks = valueUnlocks.filter(u => u.AgeDomain == null || ageMap.get(u.AgeType)?.AgeDomain == u.AgeDomain);
            // Filter bias by civilization type and domain.
            let civBias = leaderCivBias.filter(row => row.CivilizationType == civID && row.CivilizationDomain == domain && row.ReasonDescription != null);
            let biasText = null;
            if (civBias.length > 0) {
                biasText = '[LIST]';
                for (let b of civBias) {
                    biasText += '[LI]' + Locale.compose(b.ReasonDescription) + '[/LI]';
                }
                biasText += '[/LIST]';
                biasText = Locale.stylize(biasText);
            }
            let formattedUnlockBy = null;
            let civLeaderBias = bias.filter(row => row.CivilizationType == civID && row.CivilizationDomain == domain);
            if (civLeaderBias.length > 0) {
                if (civLeaderBias.length > 1) {
                    formattedUnlockBy = Locale.compose("LOC_ERA_CIV_SELECT_UNLOCKED_BY");
                    civLeaderBias.forEach(unlockNode => {
                        formattedUnlockBy += "[LI] [B]";
                        formattedUnlockBy += Locale.compose("LOC_" + unlockNode.LeaderType + "_NAME");
                        formattedUnlockBy += "[/B]";
                    });
                    formattedUnlockBy += "[/LIST]";
                }
                else {
                    formattedUnlockBy = Locale.compose("LOC_ERA_CIV_SELECT_UNLOCKED_BY_SINGLE", Locale.compose("LOC_" + civLeaderBias[0].LeaderType + "_NAME"));
                }
            }
            let formattedTags = null;
            if (valueTags.length > 0) {
                formattedTags = valueTags.map(t => '[B]' + Locale.compose(t.Name) + '[/B]').join(', ');
            }
            let formattedUnlocks = null;
            if (valueUnlocks.length == 1) {
                const u = valueUnlocks[0];
                if (u.AgeDomain == null) {
                    formattedUnlocks = Locale.stylize('LOC_CREATE_GAME_UNLOCK_ITEM', valueUnlocks[0].Name);
                }
                else {
                    const age = ageMap.get(u.AgeType);
                    if (age) {
                        formattedUnlocks = Locale.stylize('LOC_CREATE_GAME_UNLOCK_ITEM_IN_AGE', u.Name, age.AgeName);
                    }
                    else {
                        formattedUnlocks = Locale.stylize('LOC_CREATE_GAME_UNLOCK_ITEM', valueUnlocks[0].Name);
                    }
                }
            }
            else if (valueUnlocks.length > 1) {
                const content = valueUnlocks.map(u => {
                    if (u.AgeDomain == null) {
                        return Locale.compose('LOC_CREATE_GAME_UNLOCKS_LIST_ITEM', u.Name);
                    }
                    else {
                        const age = ageMap.get(u.AgeType);
                        if (age) {
                            return Locale.compose('LOC_CREATE_GAME_UNLOCKS_LIST_ITEM_IN_AGE', u.Name, age.AgeName);
                        }
                        else {
                            return Locale.compose('LOC_CREATE_GAME_UNLOCKS_LIST_ITEM', u.Name);
                        }
                    }
                }).join('');
                formattedUnlocks = Locale.stylize('LOC_CREATE_GAME_UNLOCKS_LIST', content);
            }
            const ability = valueBonusItems.find(item => item.Kind == "KIND_TRAIT");
            const ability_title = (ability) ? ability.Name : '';
            const ability_text = (ability) ? ability.Description : '';
            const uniqueItems = valueBonusItems.filter(item => item.Kind == 'KIND_BUILDING' || item.Kind == 'KIND_IMPROVEMENT' || item.Kind == 'KIND_UNIT');
            if (civID && name && civID != 'RANDOM') {
                const icon = GameSetup.resolveString(v.icon);
                if (!icon) {
                    console.error(`civ-select-panel: DB icon reference for civ ${name} is null`);
                    return;
                }
                const progress = victoryProgress.find((p) => p.civilizationType == civID);
                let hofText = '';
                if (progress && progress.playCount > 0) {
                    hofText = Locale.compose('LOC_HOF_AUX_CIV_PLAYED_COUNT', progress.playCount);
                }
                else {
                    hofText = Locale.compose('LOC_HOF_AUX_CIV_PLAYED_ZERO');
                }
                // is this leader biased towards this civ?
                let leaderPreference = false;
                const civLeaderBias = leaderCivBias.filter(row => row.CivilizationType == civID && row.CivilizationDomain == domain);
                if (civLeaderBias.length > 0) {
                    leaderPreference = true;
                }
                // check if leader live event is running, then only show preferred civ
                if (LiveEventManager.restrictToPreferredCivs()) {
                    if (!leaderPreference)
                        return;
                    const checkReasonType = civLeaderBias.filter(row => row.ReasonType != 'LOC_REASON_LIVE_EVENT_DESCRIPTION');
                    if (checkReasonType.length > 0)
                        return;
                }
                else { // don't show any event preferred civ bias if not in live event
                    const liveEventReasonType = civLeaderBias.filter(row => row.ReasonType == 'LOC_REASON_LIVE_EVENT_DESCRIPTION');
                    if (liveEventReasonType.length > 0)
                        leaderPreference = false;
                }
                results.push({
                    civID: civID,
                    name: name,
                    desc: desc ?? '',
                    icon: icon ?? '',
                    image: icon ?? '',
                    ability_title: ability_title,
                    ability_text: ability_text,
                    bonus_1_title: uniqueItems[0]?.Name ?? '',
                    bonus_1_icon: uniqueItems[0]?.Icon ?? '',
                    bonus_1_text: uniqueItems[0]?.Description ?? '',
                    bonus_1_kind: uniqueItems[0]?.Kind ?? '',
                    bonus_2_title: uniqueItems[1]?.Name ?? '',
                    bonus_2_icon: uniqueItems[1]?.Icon ?? '',
                    bonus_2_text: uniqueItems[1]?.Description ?? '',
                    bonus_2_kind: uniqueItems[1]?.Kind ?? '',
                    bonus_3_title: uniqueItems[2]?.Name ?? '',
                    bonus_3_icon: uniqueItems[2]?.Icon ?? '',
                    bonus_3_text: uniqueItems[2]?.Description ?? '',
                    bonus_3_kind: uniqueItems[2]?.Kind ?? '',
                    tags: formattedTags,
                    unlocks: formattedUnlocks,
                    hof: hofText,
                    bias: biasText,
                    leaderPrefers: leaderPreference,
                    unlockedBy: formattedUnlockBy ?? ''
                });
            }
        });
    }
    return results;
}
// This is a stopgap measure before the data can be populated via the SetupParameters API.
export function GetLeaderData() {
    const results = [];
    const playerParameter = GameSetup.findPlayerParameter(GameContext.localPlayerID, 'PlayerLeader');
    if (playerParameter) {
        // Additional queries
        const bonusItems = Database.query('config', 'select * from LeaderItems order by SortIndex') ?? [];
        const tags = Database.query('config', 'select * from LeaderTags inner join Tags on LeaderTags.TagType = Tags.TagType inner join TagCategories on Tags.TagCategoryType = TagCategories.TagCategoryType') ?? [];
        const unlocks = Database.query('config', 'select * from LeaderUnlocks order by SortIndex') ?? [];
        const ageMap = new Map();
        const ageParameter = GameSetup.findGameParameter('Age');
        if (ageParameter) {
            ageParameter.domain.possibleValues?.forEach(v => {
                const ageType = v.value?.toString();
                if (ageType) {
                    const ageDomain = GameSetup.resolveString(v.originDomain);
                    if (!ageDomain) {
                        console.error(`shell-support: Failed to find ageDomain for type ${ageType}`);
                        return;
                    }
                    const ageName = GameSetup.resolveString(v.name);
                    if (!ageName) {
                        console.error(`shell-support: Failed to find ageName for type ${ageType}`);
                        return;
                    }
                    const ageData = {
                        ageType,
                        ageDomain,
                        ageName
                    };
                    ageMap.set(ageType, ageData);
                }
            });
        }
        const victoryProgress = HallofFame.getLeaderProgress('RULESET_STANDARD');
        playerParameter.domain.possibleValues?.forEach((v) => {
            const leaderID = v.value?.toString();
            const domain = GameSetup.resolveString(v.originDomain);
            const name = GameSetup.resolveString(v.name);
            const desc = GameSetup.resolveString(v.description);
            const valueBonusItems = bonusItems.filter(item => item.LeaderType == leaderID && item.LeaderDomain == domain);
            const valueTags = tags.filter(tag => !tag.HideInDetails && tag.LeaderType == leaderID && tag.LeaderDomain == domain);
            let valueUnlocks = unlocks.filter(unlock => unlock.LeaderType == leaderID && unlock.LeaderDomain == domain);
            // Additional filter on unlocks to cull away any invalid ages.
            valueUnlocks = valueUnlocks.filter(u => u.AgeDomain == null || ageMap.get(u.AgeType)?.ageDomain == u.AgeDomain);
            let formattedTags = null;
            if (valueTags.length > 0) {
                formattedTags = valueTags.map(t => '[B]' + Locale.compose(t.Name) + '[/B]').join(', ');
            }
            let formattedUnlocks = null;
            if (valueUnlocks.length == 1) {
                const u = valueUnlocks[0];
                if (u.AgeDomain == null) {
                    formattedUnlocks = Locale.stylize('LOC_CREATE_GAME_UNLOCK_ITEM', valueUnlocks[0].Name);
                }
                else {
                    const age = ageMap.get(u.AgeType);
                    if (age) {
                        formattedUnlocks = Locale.stylize('LOC_CREATE_GAME_UNLOCK_ITEM_IN_AGE', u.Name, age.ageName);
                    }
                    else {
                        formattedUnlocks = Locale.stylize('LOC_CREATE_GAME_UNLOCK_ITEM', valueUnlocks[0].Name);
                    }
                }
            }
            else if (valueUnlocks.length > 1) {
                const content = valueUnlocks.map(u => {
                    if (u.AgeDomain == null) {
                        return Locale.compose('LOC_CREATE_GAME_UNLOCKS_LIST_ITEM', u.Name);
                    }
                    else {
                        const age = ageMap.get(u.AgeType);
                        if (age) {
                            return Locale.compose('LOC_CREATE_GAME_UNLOCKS_LIST_ITEM_IN_AGE', u.Name, age.ageName);
                        }
                        else {
                            return Locale.compose('LOC_CREATE_GAME_UNLOCKS_LIST_ITEM', u.Name);
                        }
                    }
                }).join('');
                formattedUnlocks = Locale.stylize('LOC_CREATE_GAME_UNLOCKS_LIST', content);
            }
            const trait = valueBonusItems.find(item => item.Kind == "KIND_TRAIT");
            const ability_title = trait?.Name;
            const ability_text = trait?.Description;
            if (leaderID && name && leaderID != 'RANDOM') {
                const progress = victoryProgress.find((p) => p.leaderType == leaderID);
                let hofText = '';
                if (progress && progress.playCount > 0) {
                    hofText = Locale.compose('LOC_HOF_AUX_LEADER_PLAYED_COUNT', progress.playCount);
                }
                else {
                    hofText = Locale.compose('LOC_HOF_AUX_LEADER_PLAYED_ZERO');
                }
                let icon = GameSetup.resolveString(v.icon);
                if (!icon) {
                    console.error(`leader-select-panel: getLeaderData(): DB icon reference for leader ${name} is null`);
                    icon = "fs://game/base-standard/leader_portrait_unknown.png"; // fallback
                }
                // KWG: This isn't quite correct.  I think we could get a NotValidLocked here too, but that doesn't mean we own it.
                // Maybe just report back that it is disabled?  Or pass back the whole invalid reason?  The caller might want
                // to put up a 'purchase' popup, but we don't want to do that if it is just locked.
                const owns = v.invalidReason != GameSetupDomainValueInvalidReason.NotValidOwnership;
                results.push({
                    leaderID: leaderID,
                    name: name,
                    desc: desc,
                    icon: icon,
                    ability_title: ability_title,
                    ability_text: ability_text,
                    tags: formattedTags,
                    unlocks: formattedUnlocks,
                    hof: hofText,
                    owns: owns
                });
            }
        });
    }
    return results;
}

//# sourceMappingURL=file:///core/ui/shell/shell-support/shell-support.js.map
