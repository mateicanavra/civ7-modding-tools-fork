/**
 * @file utilities-liveops.ts
 * @copyright 2024, Firaxis Games
 * @description Helpers for Live Operations.
 */
/// BEGIN Debug switches
const DEBUG_LOG_MISSING_IDS = false; // (false) Log an error when a badge or banner is not found
/// END Debug switches
export var UnlockableRewardType;
(function (UnlockableRewardType) {
    UnlockableRewardType[UnlockableRewardType["Badge"] = 3801327255] = "Badge";
    UnlockableRewardType[UnlockableRewardType["Banner"] = 2340454002] = "Banner";
    UnlockableRewardType[UnlockableRewardType["Border"] = 602451426] = "Border";
    UnlockableRewardType[UnlockableRewardType["Title"] = 928356065] = "Title";
    UnlockableRewardType[UnlockableRewardType["Memento"] = 4287908646] = "Memento";
    UnlockableRewardType[UnlockableRewardType["StrategyCard"] = 456188808] = "StrategyCard";
    UnlockableRewardType[UnlockableRewardType["AtrributeNode"] = 2269616578] = "AtrributeNode";
    UnlockableRewardType[UnlockableRewardType["Color"] = 2050336355] = "Color";
    UnlockableRewardType[UnlockableRewardType["Slot"] = 2901129264] = "Slot";
})(UnlockableRewardType || (UnlockableRewardType = {}));
/**
 * Memoizes the result of a function and returns a new function that caches the result. Wrap functions in OnlineLibrary with arrow functions to save the context.
 * The cached result is returned if available and not forced to update.
 * @param fn - The function to memoize.
 * @returns A new function that caches the result of the original function. The first argument is a boolean that forces the function to update the cache. The rest of the arguments are passed to the original function.
 */
const memoize = (fn) => {
    const cache = new Map();
    return (forceUpdate = false, ...args) => {
        const key = JSON.stringify(args);
        if (!forceUpdate && cache.has(key)) {
            return cache.get(key);
        }
        const result = fn(...args);
        cache.set(key, result);
        return result;
    };
};
class AuthUpdateListener {
    constructor() {
        engine.on("OwnershipAuthorizationChanged", this.updatePerms, this);
        engine.on("LiveEventActiveUpdated", this.activeLiveEventListener);
        engine.on("ForceUpdateToCachedData", forceCacheUpdate, this);
    }
    updatePerms() {
        UnlockableRewardItems.updatePermissions();
    }
    activeLiveEventListener() {
        //re-populate the reward list so we can get event rewards
        UnlockableRewardItems.populateRewardList();
    }
}
export const authListener = new AuthUpdateListener();
const memoRewards = memoize(() => Online.UserProfile.getRewardEntries());
const memoMyPlayerProfile = memoize(() => Online.UserProfile.getUserProfileData());
const memoPlayerProfile = memoize((friendId, platformUsername) => Online.UserProfile.getOthersUserProfile(friendId, platformUsername));
class RewardItems {
    constructor() {
        this.bannerRewardItems = [];
        this.badgeRewardItems = [];
        this.titleRewardItems = [];
        this.colorRewardItems = [];
        this.borderRewardItems = [];
        this.populateRewardList();
    }
    getBadge(id) {
        const badge = this.badgeRewardItems.find((badge) => badge.gameItemId === id);
        if (badge) {
            return badge;
        }
        else {
            if (DEBUG_LOG_MISSING_IDS)
                console.error(`Badge with id ${id} not found`);
            return this.badgeRewardItems[0];
        }
    }
    getBanner(id) {
        const banner = this.bannerRewardItems.find((banner) => banner.gameItemId === id);
        if (banner) {
            return banner;
        }
        else {
            if (DEBUG_LOG_MISSING_IDS)
                console.error(`Banner with id ${id} not found`);
            return this.bannerRewardItems[0];
        }
    }
    getTitle(id) {
        const titleItem = this.titleRewardItems.find((title) => title.gameItemId === id);
        if (titleItem) {
            return titleItem;
        }
        else {
            if (DEBUG_LOG_MISSING_IDS)
                console.error(`Title with id ${id} not found`);
            return this.titleRewardItems[0];
        }
    }
    getColor(id) {
        const colorItem = this.colorRewardItems.find((color) => color.color === id);
        if (colorItem) {
            return colorItem;
        }
        else {
            if (DEBUG_LOG_MISSING_IDS)
                console.error(`Color with id ${id} not found`);
            return this.colorRewardItems[0];
        }
    }
    getBorder(id) {
        const border = this.borderRewardItems.find((border) => border.gameItemId === id);
        if (border) {
            return border;
        }
        else {
            if (DEBUG_LOG_MISSING_IDS)
                console.error(`Border with id ${id} not found`);
            return this.borderRewardItems[0];
        }
    }
    updatePermissions() {
        const rewards = Online.UserProfile.getRewardEntries();
        const updateRewards = (reward, itemList) => {
            for (const item of itemList) {
                if (item.gameItemId == reward.gameItemID) {
                    item.isLocked = reward.isLocked;
                }
            }
        };
        for (const reward of rewards) {
            updateRewards(reward, this.bannerRewardItems);
            updateRewards(reward, this.badgeRewardItems);
            updateRewards(reward, this.titleRewardItems);
            updateRewards(reward, this.colorRewardItems);
            updateRewards(reward, this.borderRewardItems);
        }
    }
    /**
     * Populates the reward list with badge, banner, and title items.
     * This function is called in constructor and should not be called multiple times as it will fetch from remote server.
     */
    populateRewardList() {
        // Reset the arrays
        this.bannerRewardItems = [];
        this.badgeRewardItems = [];
        this.titleRewardItems = [];
        this.colorRewardItems = [];
        this.borderRewardItems = [];
        this.badgeRewardItems.push({
            gameItemId: "DEFAULT_BADGE_ID",
            dnaId: "NOT A DNA ITEM",
            url: "fs://game/" + "ba_default",
            description: "",
            unlockCondition: Locale.compose("LOC_METAPROGRESSION_UNLOCK_CONDITION_DEFAULT"),
            isLocked: false,
        });
        this.bannerRewardItems.push({
            gameItemId: "DEFAULT_BANNER_ID",
            dnaId: "NOT A DNA ITEM",
            url: "fs://game/" + "bn_default",
            description: "",
            unlockCondition: Locale.compose("LOC_METAPROGRESSION_UNLOCK_CONDITION_DEFAULT"),
            isLocked: false,
        });
        // default title is build into the game and is not connected to a dnaID
        this.titleRewardItems.push({
            gameItemId: "DEFAULT_TITLE_ID",
            locKey: "LOC_DEFAULT_TITLE_ID_NAME",
            unlockCondition: Locale.compose("LOC_METAPROGRESSION_UNLOCK_CONDITION_DEFAULT"),
            isLocked: false,
        });
        this.borderRewardItems.push({
            gameItemId: "DEFAULT_BORDER_ID",
            name: "LOC_DEFAULT_BORDER_ID_NAME",
            desc1: "LOC_BORDER_DESCRIPTION",
            desc2: "LOC_METAPROGRESSION_UNLOCK_CONDITION_DEFAULT",
            url: "fs://game/port_bor_01",
            id: "defborder",
            unlockCondition: Locale.compose("LOC_METAPROGRESSION_UNLOCK_CONDITION_DEFAULT"),
            new: false,
            isLocked: false
        });
        if (!Network.supportsSSO() && !Online.Metaprogression.supportsMemento()) {
            return;
        }
        const rewards = memoRewards();
        const allLiveEventRewards = getAllLiveEventRewardGameIDs();
        rewards.forEach((reward) => {
            reward.type = reward.type >>> 0;
            // handle special case for live event rewards:
            // only avaliable when 1) reward is for current live event OR 2) reward is already owned
            if (allLiveEventRewards.includes(reward.gameItemID) || reward.gameItemID.includes("_EVENT_")) {
                // (1.1.1) Stop-gap to remove all trace of live event rewards
                // uncomment the following lines to restore live event rewards and remove this early return
                return;
                //const CurrentLiveEventRewards = Online.Achievements.getAvaliableRewardsForLiveEvent(Online.LiveEvent.getCurrentLiveEvent());
                //if (reward.isLocked && CurrentLiveEventRewards.find((r) => r.dnaID == reward.dnaItemID) == undefined) {
                //	return;
                //}
            }
            switch (reward.type) {
                case UnlockableRewardType.Badge:
                    this.badgeRewardItems.push({
                        gameItemId: reward.gameItemID,
                        dnaId: reward.dnaItemID,
                        url: "fs://game/" + reward.iconName,
                        description: "",
                        unlockCondition: reward.unlockCondition,
                        isLocked: reward.isLocked,
                    });
                    break;
                case UnlockableRewardType.Banner:
                    this.bannerRewardItems.push({
                        gameItemId: reward.gameItemID,
                        dnaId: reward.dnaItemID,
                        url: "fs://game/" + reward.iconName,
                        description: "",
                        unlockCondition: reward.unlockCondition,
                        isLocked: reward.isLocked,
                    });
                    break;
                case UnlockableRewardType.Border:
                    this.borderRewardItems.push({
                        gameItemId: reward.gameItemID,
                        url: "fs://game/" + reward.iconName,
                        desc1: reward.description,
                        desc2: "",
                        isLocked: reward.isLocked,
                        new: true,
                        name: reward.name,
                        id: reward.dnaItemID,
                        unlockCondition: reward.unlockCondition,
                    });
                    break;
                case UnlockableRewardType.Title:
                    // create a titleItem for each variant
                    reward.locVariants.forEach((locKey) => {
                        // console.log(
                        // 	`Added New TitleItem lockey: ${locKey.locKey} for gameitemID: ${reward.gameItemID}`
                        // );
                        this.titleRewardItems.push({
                            gameItemId: reward.gameItemID,
                            locKey: locKey.locKey,
                            unlockCondition: reward.unlockCondition,
                            isLocked: reward.isLocked,
                        });
                    });
                    break;
                case UnlockableRewardType.Memento:
                    break;
                case UnlockableRewardType.Color:
                    this.colorRewardItems.push({
                        gameItemId: reward.gameItemID,
                        name: reward.gameItemID,
                        color: reward.rgb,
                        unlockCondition: reward.unlockCondition,
                        isLocked: reward.isLocked,
                        new: true,
                    });
                    break;
                default:
                    break;
            }
        });
    }
}
export var UnlockableRewardItems = new RewardItems();
/**
 * Accessor for default player info. This is used mainly for showing the player info when user is in offline/ logout state.
 * @returns The default player card information.
 */
export function getDefaultPlayerInfo() {
    const defaultPlayerProfile = {
        TitleLocKey: "LOC_DEFAULT_TITLE_ID_NAME",
        BadgeId: "DEFAULT_BADGE_ID",
        twoKName: "",
        twoKId: "",
        firstPartyName: Network.getLocal1PPlayerName(),
        firstPartyType: Network.getLocalHostingPlatform(),
        BannerId: "DEFAULT_BANNER_ID",
        LeaderLevel: 1,
        LeaderID: "",
        FoundationLevel: 1,
        PortraitBorder: "DEFAULT_BORDER_ID",
        BackgroundColor: "",
        BackgroundURL: "fs://game/" + "bn_default",
        InfoIconURL: "fs://game/" + "ba_default",
        Status: "",
        LastSeen: ""
    };
    const currentBadge = UnlockableRewardItems.getBadge(defaultPlayerProfile.BadgeId);
    const currentBackground = UnlockableRewardItems.getBanner(defaultPlayerProfile.BannerId);
    const currentBorder = UnlockableRewardItems.getBorder(defaultPlayerProfile.PortraitBorder);
    const currentBGColor = UnlockableRewardItems.getColor(defaultPlayerProfile.BackgroundColor);
    const playerInfo = {
        ...defaultPlayerProfile,
        BackgroundURL: currentBackground?.url,
        BadgeURL: currentBadge?.url,
        BorderURL: currentBorder?.url,
        BackgroundColor: currentBGColor?.color,
        playerTitle: Locale.compose(defaultPlayerProfile.TitleLocKey),
        FoundationLevel: defaultPlayerProfile.FoundationLevel
    };
    return playerInfo;
}
/**
 * Retrieves the player card information for a given account ID.
 * If no friend ID is provided, it retrieves the player card information for the current player.
 * @param friendId - The friend ID (can be platform account id) of the player. (Optional = undefined or empty will return local player's card info)
 * @param platformUsername - The username of the player. (Optional = undefined or empty will return local player's card info)
 * @param updateCache - Indicates whether to update the cache. Default is false.
 * @returns The player card information.
 */
export function getPlayerCardInfo(friendId, platformUsername, updateCache = false) {
    let cachedPlayerProfile = null;
    if (Network.supportsSSO() || Online.Metaprogression.supportsMemento()) {
        if (!friendId) {
            cachedPlayerProfile = memoMyPlayerProfile(updateCache);
        }
        else {
            cachedPlayerProfile = memoPlayerProfile(updateCache, friendId, platformUsername == undefined ? "" : platformUsername);
        }
    }
    let titleLocKey = "";
    let badgeId = "";
    let bannerId = "";
    let portraitBorder = "";
    let foundationLevel = -1;
    let backgroundColor = "";
    if (cachedPlayerProfile) {
        titleLocKey = cachedPlayerProfile.TitleLocKey;
        badgeId = cachedPlayerProfile.BadgeId;
        bannerId = cachedPlayerProfile.BannerId;
        portraitBorder = cachedPlayerProfile.PortraitBorder;
        foundationLevel = cachedPlayerProfile.FoundationLevel;
        backgroundColor = cachedPlayerProfile.BackgroundColor;
    }
    const currentBadge = UnlockableRewardItems.getBadge(badgeId);
    const currentBackground = UnlockableRewardItems.getBanner(bannerId);
    const currentBorder = UnlockableRewardItems.getBorder(portraitBorder);
    const currentBGColor = UnlockableRewardItems.getColor(backgroundColor);
    let playerInfo = {
        ...cachedPlayerProfile,
        BackgroundURL: currentBackground?.url,
        BadgeURL: currentBadge?.url,
        BorderURL: currentBorder?.url,
        BackgroundColor: currentBGColor?.color,
        playerTitle: Locale.compose(titleLocKey),
        FoundationLevel: foundationLevel
    };
    // TODO: remove this when the C++ side bug that returns the 2K Name for both first party and 2K names is fixed
    if (!friendId) {
        playerInfo.firstPartyName = Network.getLocal1PPlayerName();
        playerInfo.firstPartyType = Network.getLocalHostingPlatform();
        if (Network.supportsSSO()) {
            playerInfo.twoKName = Online.UserProfile.getMyDisplayName();
        }
    }
    return playerInfo;
}
/**
 * Updates the player profile with the provided fields.
 * TwoKName is updated automatically and will be overridden if provided in the updatedFields.
 * @param updatedFields - The fields to update in the player profile.
 * @param updateCache - If true, refetech the cached player profile from the backend.
 */
export function updatePlayerProfile(updatedFields, updateCache = false) {
    let cachedPlayerProfile = memoMyPlayerProfile(updateCache);
    const firstPartyName = Network.getLocal1PPlayerName();
    const twoKName = Online.UserProfile.getMyDisplayName();
    const firstPartyType = Network.getLocalHostingPlatform();
    // Using spread operator to override the updated fields
    cachedPlayerProfile = {
        ...cachedPlayerProfile,
        ...updatedFields,
        firstPartyType,
        firstPartyName,
        twoKName,
    };
    Online.UserProfile.updateUserProfile(cachedPlayerProfile);
    memoMyPlayerProfile(true);
    window.dispatchEvent(new Event('user-profile-updated'));
}
export function forceCacheUpdate() {
    memoRewards(true);
}
export function getRewardType(gameItemID) {
    const rewards = memoRewards();
    const rewardType = rewards.find((reward) => reward.gameItemID === gameItemID)?.type;
    return rewardType;
}
/**
 * Retrieve all possible Live Event Rewards
 */
export function getAllLiveEventRewardGameIDs() {
    let allRewardItems = [];
    const configRewards = Database.query('config', 'select * from LiveEventRewards');
    if (configRewards) {
        for (const r of configRewards) {
            allRewardItems.push(r.Reward);
        }
    }
    return allRewardItems;
}
/**
 * Converts 2K legal text into HTML.
 */
export function parseLegalDocument(textField, inputString) {
    let contentString = "";
    let go = true;
    let startIndex = 0;
    const titleDiv = '<div class="font-title text-xl break-words" style="margin-top: 0.25rem">';
    const subTitleDiv = '<div class="font-title text-lg break-words" style="margin-top: 0.25rem">';
    const bodyDiv = '<div class="font-body text-base break-words" style="margin-top: 0.125rem">';
    let original = "";
    while (go) {
        let sonyIndex = inputString.indexOf("Sony", startIndex);
        let psIndex = inputString.indexOf("PlayStation", startIndex);
        let nextIndex = (sonyIndex < psIndex) && sonyIndex != -1 ? sonyIndex : psIndex;
        const sliceStart = (startIndex == 0) ? 0 : startIndex - 1;
        if (nextIndex > 0) {
            let tempString = inputString.slice(sliceStart, nextIndex);
            original = original + tempString + "\n";
            startIndex = nextIndex + 1;
        }
        else {
            original = original + inputString.slice(sliceStart) + "\n";
            go = false;
        }
    }
    go = true;
    startIndex = 0;
    while (go) {
        const nextIndex = original.indexOf("\n", startIndex);
        if (nextIndex != -1) {
            let tempString = original.slice(startIndex, nextIndex);
            // ****. is a title
            const sectionIndex = tempString.indexOf("****.");
            if (sectionIndex != -1) {
                contentString = contentString + subTitleDiv + tempString.slice(0, sectionIndex) + '</div>';
            }
            else {
                // some translations have lines beginning with "> ", unclear what the intent is so just strip it out
                if (tempString[0] == '>' && tempString[1] == ' ') {
                    tempString = original.slice(startIndex + 2, nextIndex);
                }
                // --- at the start of a line is also treated as a title
                const section2Index = tempString.indexOf("---");
                if (section2Index == 0) {
                    contentString = contentString + titleDiv + tempString.slice(3) + '</div>';
                }
                else {
                    // if it's all upper case, make that a title too
                    if (tempString.toLocaleUpperCase() == tempString) {
                        contentString = contentString + titleDiv + tempString + '</div>';
                    }
                    else {
                        contentString = contentString + bodyDiv + tempString + '</div>';
                    }
                }
            }
            startIndex = nextIndex + 1;
        }
        else {
            go = false;
        }
    }
    textField.innerHTML = contentString;
}

//# sourceMappingURL=file:///core/ui/utilities/utilities-liveops.js.map
