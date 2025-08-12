/**
 * @file leader-select-model.ts
 * @copyright 2020-2024, Firaxis Games
 * @description Loads and stores leader data for game creation
 */
import { GetAgeMap } from "/core/ui/shell/create-panels/age-civ-select-model.js";
import LiveEventManager from "/core/ui/shell/live-event-logic/live-event-logic.js";
export var OwnershipAction;
(function (OwnershipAction) {
    OwnershipAction[OwnershipAction["None"] = 0] = "None";
    OwnershipAction[OwnershipAction["IncludedWith"] = 1] = "IncludedWith";
    OwnershipAction[OwnershipAction["LinkAccount"] = 2] = "LinkAccount";
})(OwnershipAction || (OwnershipAction = {}));
export var MementoSlotType;
(function (MementoSlotType) {
    MementoSlotType[MementoSlotType["Major"] = 0] = "Major";
    MementoSlotType[MementoSlotType["Minor"] = 1] = "Minor";
})(MementoSlotType || (MementoSlotType = {}));
const funcDescName = GameSetup.findString("FunctionalDescription");
function resolveMemento(value) {
    const funcDescProp = value.additionalProperties?.find(v => v.name === funcDescName);
    return {
        value: value.value.toString(),
        name: GameSetup.resolveString(value.name),
        description: GameSetup.resolveString(value.description),
        functionalDescription: funcDescProp?.value,
        icon: GameSetup.resolveString(value.icon)
    };
}
export function getMementoData() {
    const mementoSlotParameters = GameSetup.getMementoFilteredPlayerParameters(GameContext.localPlayerID);
    const mementoSlotMetadata = Online.Metaprogression.getMementoSlotData();
    const mementoData = [];
    for (const mementoSlotParam of mementoSlotParameters) {
        if (!mementoSlotParam.hidden && mementoSlotParam.invalidReason == GameSetupParameterInvalidReason.Valid) {
            const paramId = GameSetup.resolveString(mementoSlotParam.ID);
            const metadata = mementoSlotMetadata.find(m => m.mementoTypeId == paramId);
            if (metadata) {
                // TODO: Determine locked status and unlock level based on entitlements, when memento slot entitlements are available.
                const isLocked = metadata.displayType == DisplayType.DISPLAY_LOCKED;
                const isMajor = paramId?.startsWith("PlayerMementoMajorSlot");
                const slotData = {
                    gameParameter: GameSetup.resolveString(mementoSlotParam.ID) ?? "",
                    slotType: isMajor ? MementoSlotType.Major : MementoSlotType.Minor,
                    isLocked: isLocked,
                    unlockReason: metadata.unlockTitle,
                    currentMemento: resolveMemento(mementoSlotParam.value),
                    availableMementos: isLocked ? [] : mementoSlotParam.domain.possibleValues.map(resolveMemento)
                };
                mementoData.push(slotData);
            }
            else {
                console.log(`Unable to find memento slot metadata for ${paramId}`);
            }
        }
    }
    return mementoData;
}
function getOwnershipAction(actionName) {
    switch (actionName) {
        case "LOC_LOCKED_INCLUDED_WITH_CONTENT":
            return OwnershipAction.IncludedWith;
        case "LOC_LOCKED_LINK_ACCOUNT":
            return OwnershipAction.LinkAccount;
    }
    return OwnershipAction.None;
}
// This is a stopgap measure before the data can be populated via the SetupParameters API.
export function getLeaderData() {
    const leaderData = [];
    const playerParameter = GameSetup.findPlayerParameter(GameContext.localPlayerID, 'PlayerLeader');
    if (playerParameter) {
        // Additional queries
        const bonusItems = Database.query('config', 'select * from LeaderItems order by SortIndex') ?? [];
        const tags = Database.query('config', 'select * from LeaderTags inner join Tags on LeaderTags.TagType = Tags.TagType inner join TagCategories on Tags.TagCategoryType = TagCategories.TagCategoryType') ?? [];
        const unlocks = Database.query('config', 'select * from LeaderUnlocks order by SortIndex') ?? [];
        // Commenting until table exists in database.
        const ownershipConditions = Database.query('config', 'select * from OwnershipConditions') ?? [];
        const quotes = Database.query('config', 'select * from LeaderQuotes');
        const legendsPaths = Online.Metaprogression.getLegendPathsData();
        const ageMap = GetAgeMap();
        const victoryProgress = HallofFame.getLeaderProgress('RULESET_STANDARD');
        for (const leader of playerParameter.domain.possibleValues ?? []) {
            const leaderID = leader.value?.toString();
            const name = GameSetup.resolveString(leader.name);
            if (!leaderID || !name) {
                continue;
            }
            // Do not show leaders if they don't have a reason for being not-valid
            if (leader.invalidReason == GameSetupDomainValueInvalidReason.NotValid) {
                continue;
            }
            // check if leader live event is running, don't show random leader if so
            if (LiveEventManager.restrictToPreferredCivs() && leaderID == 'RANDOM') {
                continue;
            }
            const domain = GameSetup.resolveString(leader.originDomain);
            const description = GameSetup.resolveString(leader.description) ?? "";
            const leaderQuotes = quotes?.filter(q => q.LeaderType == leaderID);
            const quote = leaderQuotes && leaderQuotes.length > 0
                ? leaderQuotes[0].Quote
                : undefined;
            const valueBonusItems = bonusItems.filter(item => item.LeaderType == leaderID && item.LeaderDomain == domain);
            const valueTags = tags
                .filter(tag => !tag.HideInDetails && tag.LeaderType == leaderID && tag.LeaderDomain == domain)
                .map(tag => Locale.compose(tag.Name));
            const valueUnlocks = unlocks.filter(unlock => unlock.LeaderType == leaderID
                && unlock.LeaderDomain == domain
                && (!unlock.AgeDomain || unlock.AgeDomain == ageMap.get(unlock.AgeType)?.domain));
            const formattedAgeUnlocks = [];
            const formattedUnlocks = [];
            for (const unlock of valueUnlocks) {
                const age = unlock.AgeDomain
                    ? ageMap.get(unlock.AgeType)
                    : undefined;
                if (age) {
                    formattedAgeUnlocks.push(Locale.stylize('LOC_CREATE_GAME_UNLOCK_ITEM_IN_AGE', unlock.Name, age.name));
                }
                else {
                    formattedUnlocks.push(Locale.stylize('LOC_CREATE_GAME_UNLOCK_ITEM', unlock.Name));
                }
            }
            const trait = valueBonusItems.find(item => item.Kind == "KIND_TRAIT");
            const abilityTitle = trait?.Name;
            const abilityText = trait?.Description;
            const progress = victoryProgress.find((p) => p.leaderType == leaderID);
            const playCount = (progress ? progress.playCount : 0);
            let icon = GameSetup.resolveString(leader.icon);
            if (!icon) {
                console.error(`leader-select-panel: getLeaderData(): DB icon reference for leader ${name} is null`);
                icon = "fs://game/base-standard/leader_portrait_unknown.png"; // fallback
            }
            const legendData = legendsPaths.find(item => item.legendPathName == `${leaderID.replace("LEADER_", "LEGEND_PATH_")}`);
            const currentLevel = legendData?.currentLevel ?? 0;
            const nextReward = legendData?.rewards?.find(reward => reward.level > currentLevel);
            const isLocked = leader.invalidReason != GameSetupDomainValueInvalidReason.Valid;
            const isOwned = leader.invalidReason != GameSetupDomainValueInvalidReason.NotValidOwnership;
            let ownershipData = undefined;
            if (!isOwned) {
                const ownershipEntry = ownershipConditions?.find(o => o.ItemType == leaderID);
                if (ownershipEntry) {
                    ownershipData = {
                        reason: ownershipEntry.Action ?? "",
                        action: getOwnershipAction(ownershipEntry.Action)
                    };
                }
                ;
            }
            leaderData.push({
                leaderID: leaderID,
                name: Locale.stylize(name),
                icon: icon,
                description: description ? Locale.stylize(description) : '',
                abilityTitle: abilityTitle ? Locale.stylize(abilityTitle) : '',
                abilityText: abilityText ? Locale.stylize(abilityText) : '',
                ageUnlocks: formattedAgeUnlocks,
                unlocks: formattedUnlocks,
                nextReward: nextReward,
                playCount: playCount,
                level: currentLevel,
                currentXp: legendData?.currentXp ?? 0,
                nextLevelXp: legendData?.nextLevelXp ?? 0,
                prevLevelXp: legendData?.prevLevelXp ?? 0,
                tags: valueTags,
                isLocked: isLocked,
                isOwned: isOwned,
                ownershipData: ownershipData,
                sortIndex: leader.sortIndex,
                quote: quote ? Locale.stylize(quote) : ''
            });
        }
    }
    leaderData.sort((a, b) => {
        if (a.sortIndex != b.sortIndex) {
            return a.sortIndex - b.sortIndex;
        }
        else {
            return Locale.compare(a.name, b.name);
        }
    });
    return leaderData;
}

//# sourceMappingURL=file:///core/ui/shell/create-panels/leader-select-model.js.map
