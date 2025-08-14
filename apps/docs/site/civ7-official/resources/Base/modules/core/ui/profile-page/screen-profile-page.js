/**
 * @file screen-profile-page.ts
 * @copyright 2023-2025, Firaxis Games
 * @description Show the player's online progression
 */
import { Audio } from '/core/ui/audio-base/audio-support.js';
import { DropdownSelectionChangeEventName } from '/core/ui/components/fxs-dropdown.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import { MustGetElement, MustGetElements } from '/core/ui/utilities/utilities-dom.js';
import { UnlockableRewardItems, getPlayerCardInfo, getRewardType, updatePlayerProfile, UnlockableRewardType } from '/core/ui/utilities/utilities-liveops.js';
import { ChallengeClass, ChallengeCategorySortIndex as ChallengeCategorySortIndex } from '/core/ui/utilities/utilities-metaprogression.js';
import SaveLoadData from '/core/ui/save-load/model-save-load.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
export var ProfileTabType;
(function (ProfileTabType) {
    ProfileTabType[ProfileTabType["NONE"] = -1] = "NONE";
    ProfileTabType[ProfileTabType["PROGRESS"] = 0] = "PROGRESS";
    ProfileTabType[ProfileTabType["CHALLENGES"] = 1] = "CHALLENGES";
    ProfileTabType[ProfileTabType["CUSTOM"] = 2] = "CUSTOM";
})(ProfileTabType || (ProfileTabType = {}));
/*
interface CompletionItem {
    name: string;
    result: string;
}

interface VictoryItem {
    name: string;
    date: string;
    leaderID: string;
    place: number;
    turns: number;
}
*/
var CurrentSortType;
(function (CurrentSortType) {
    CurrentSortType[CurrentSortType["Challenge"] = 0] = "Challenge";
    CurrentSortType[CurrentSortType["Completed"] = 1] = "Completed";
    CurrentSortType[CurrentSortType["TOTAL"] = 2] = "TOTAL";
})(CurrentSortType || (CurrentSortType = {}));
/*
enum DifficultyFilterType {
    All = 0,
    Scribe,
    Governor,
    Viceroy,
    Sovereign,
    Immortal,
    Deity,

    TOTAL
}

enum SpeedFilterType {
    All = 0,
    Online,
    Quick,
    Standard,
    Epic,
    Marathon,

    TOTAL
}

const difficultyFilterNames: string[] = [
    "LOC_PROFILE_HOF_DIFFICULTY_ALL",
    "LOC_DIFFICULTY_SETTLER_NAME",
    "LOC_DIFFICULTY_PRINCE_NAME",
    "LOC_DIFFICULTY_KING_NAME",
    "LOC_DIFFICULTY_EMPEROR_NAME",
    "LOC_DIFFICULTY_IMMORTAL_NAME",
    "LOC_DIFFICULTY_DEITY_NAME"
]

const speedFilterNames: string[] = [
    "LOC_PROFILE_HOF_DIFFICULTY_ALL",
    "LOC_GAMESPEED_ONLINE_NAME",
    "LOC_GAMESPEED_QUICK_NAME",
    "LOC_GAMESPEED_STANDARD_NAME",
    "LOC_GAMESPEED_EPIC_NAME",
    "LOC_GAMESPEED_MARATHON_NAME",
]
*/
let legendPathItems = [];
/*
// TODO: temporary debug data
const historyItems: HistoryItem[] = [
    { score: 9999, game: 452, leader: "Harriet Tubman", civilization: "Prussia", civIconURL: "prussia_icon", era: "Modern", startType: "Advanced Start", turns: 34, outcome: "Defeat", outcomeType: "Nobody Won", date: "1/1/2030 12:23 AM" },
    { score: 8888, game: 375, leader: "Benjamin Franklin", civilization: "Qing", civIconURL: "qing_icon", era: "Modern", startType: "Advanced Start", turns: 325, outcome: "Victory", outcomeType: "Scientific", date: "12/31/2029 1:29 AM" },
    { score: 7777, game: 239, leader: "Jose Rizal", civilization: "Khmer", civIconURL: "khmer_icon", era: "Antiquity", startType: "Game Start", turns: 312, outcome: "Victory", outcomeType: "Scientific", date: "12/30/2029 9:45 PM" },
    { score: 6666, game: 73, leader: "Harriet Tubman", civilization: "Egypt", civIconURL: "egypt_icon", era: "Antiquity", startType: "Game Start", turns: 225, outcome: "Victory", outcomeType: "Economic", date: "11/22/2024 11:47 PM" },
    { score: 555, game: 73, leader: "Augustus", civilization: "Persia", civIconURL: "persia_icon", era: "Antiquity", startType: "Game Start", turns: 101, outcome: "Victory", outcomeType: "Cultural", date: "5/22/2024 1:32 AM" },
    { score: 14444, game: 1021, leader: "Ibn Battuta", civilization: "Inca", civIconURL: "inca_icon", era: "Antiquity", startType: "Game Start", turns: 78, outcome: "Victory", outcomeType: "Score", date: "7/22/2024 4:33 PM" },
    { score: 33, game: 8, leader: "Isabella", civilization: "Rome", civIconURL: "rome_icon", era: "Antiquity", startType: "Game Start", turns: 47, outcome: "Victory", outcomeType: "Militaristic", date: "01/22/2025 6:56 AM" },
]

const completionItems: CompletionItem[] = [
    { name: "Ages completed", result: "745" },
    { name: "Unique Civ/Leader Combo", result: "22" },
    { name: "Turns Played", result: "113152" },
    { name: "Favorite Leader", result: "Benjamin Franklin" },
    { name: "Leaders Played", result: "16" },
    { name: "Attribute Points Spent", result: "1112" },
    { name: "Civilizations Played", result: "22" },
    { name: "Favorite Attribute", result: "Economic" },
]

const victoryItems: VictoryItem[] = [
    { name: "Fastest Antiquity Culture victory", date: "11/29/2029", leaderID: "LEADER_AMINA", place: 1, turns: 3 },
    { name: "Fastest Antiquity Economic victory", date: "11/29/2029", leaderID: "LEADER_ASHOKA", place: 3, turns: 1 },
    { name: "Fastest Antiquity Cultural victory", date: "11/29/2029", leaderID: "LEADER_AUGUSTUS", place: 2, turns: 57 },
    { name: "Fastest Antiquity Military victory", date: "11/29/2029", leaderID: "LEADER_HARRIET_TUBMAN", place: 5, turns: 79 },
]
*/
export const ScreenProfilePageExternalStatus = {
    isGameCreationDomainInitialized: false
};
export class ScreenProfilePage extends Panel {
    get didChangeUserProfile() {
        return (this.selectedBannerId !== this.currentProfile.BannerId ||
            this.selectedBadgeId !== this.currentProfile.BadgeId ||
            this.selectedTitleLocKey !== this.currentProfile.TitleLocKey ||
            this.selectedPortraitBorder !== this.currentProfile.PortraitBorder ||
            this.selectedBackgroundColor !== this.currentProfile.BackgroundColor ||
            this.getFoundationLevel() !== this.currentProfile.FoundationLevel);
    }
    populateLeaderboardDropDownList() {
        this.eventItems = [];
        const AllLeaderboardData = Online.Leaderboard.getDisplayableLeaderboardInfo();
        AllLeaderboardData.forEach(LeaderboardData => {
            let item = {
                label: "LOC_" + LeaderboardData.eventNameLocKey,
                id: LeaderboardData.leaderboardID
            };
            this.eventItems.push(item);
        });
    }
    getIndexByEventName(eventName) {
        const index = this.eventItems.findIndex(item => item.label === eventName);
        return index !== -1 ? index : 0;
    }
    constructor(root) {
        super(root);
        this.closeButtonListener = () => {
            /** Only populate to cloud when the player closed the "Your Progress" panel*/
            this.updateProfile();
            this.close();
        };
        this.userProfileReadyListener = this.refreshLeaderboard.bind(this); // Refresh leaderboard content when the user profiles are ready 
        this.leaderboardFetchedListener = this.refreshLeaderboard.bind(this); // Refresh leaderboard content when the leaderboard is fetched
        this.engineInputListener = this.onEngineInput.bind(this);
        this.navigationInputListener = this.onNavigateInput.bind(this);
        this.progressLeaderSelectedListener = this.onClickedProgressLeaderButton.bind(this);
        this.challengeTabSelectedListener = this.onChallengeTabSelected.bind(this);
        this.challengeLeaderSelectedListener = this.onChallengeCategorySelected.bind(this);
        this.challengeSortLeftListener = this.challengeSortLeft.bind(this);
        this.challengeSortRightListener = this.challengeSortRight.bind(this);
        this.badgeSelectListener = this.onClickedBadge.bind(this);
        this.bannerSelectListener = this.onClickedBanner.bind(this);
        this.titleSelectListener = this.onClickedTitle.bind(this);
        this.borderSelectListener = this.onClickedBorder.bind(this);
        this.colorSelectListener = this.onClickedColor.bind(this);
        // private markAllAsSeenListener = this.onClickedMarkAllAsSeen.bind(this);
        /*
            private hofLeaderClickedListener = this.onClickedHOFLeader.bind(this);
            private hofCivSelectedListener = this.onSelectedHOFCiv.bind(this);
            private hofAgeSelectedListener = this.onSelectedHOFAge.bind(this);
            private hofDifficultyUpListener = this.onClickedHOFDiffUp.bind(this);
            private hofDifficultyDownListener = this.onClickedHOFDiffDown.bind(this);
            private hofSpeedUpListener = this.onClickedHOFSpeedUp.bind(this);
            private hofSpeedDownListener = this.onClickedHOFSpeedDown.bind(this);
        */
        this.challengeTabItems = [];
        this.challengeGroups = [];
        // list of the current selected challenges to be shown
        this.currentChallengesToShow = [];
        this.challengesContainerList = [];
        this.onlyChallenges = false;
        this.onlyLeaderboards = false;
        this.focusTab = ProfileTabType.NONE;
        this.noCustomize = false;
        this.currentSortType = CurrentSortType.Challenge;
        this.currentChallengeGroup = "";
        this.currentHOFGroup = "";
        this.currentlySelectedMainTab = "";
        this.currentlySelectedCustomizeTab = "";
        this.sortTextLocale = ["LOC_METAPROGRESSION_SORT_BY_CHALLENGES", "LOC_METAPROGRESSION_SORT_BY_COMPLETED"];
        this.cardInfo = getPlayerCardInfo();
        this.challengeSortHslot = document.createElement("fxs-hslot");
        this.cancelRewardsUpdate = false;
        this.rewardsUpdateBusy = false;
        this.isOfflineMemento = !Network.supportsSSO() && Online.Metaprogression.supportsMemento();
        /*
        private civData: CivData[] = [];
        private selectedHOFCiv: ComponentRoot<CivButton> = null!;
        private difficultyFilter: DifficultyFilterType = DifficultyFilterType.All;
        private speedFilter: SpeedFilterType = SpeedFilterType.All;
    */
        /**
         * currentProfile is the user profile we retrived after lauching the game
         */
        this.currentProfile = Online.UserProfile.getUserProfileData();
        this.eventItems = [];
        /**
         * Store the local changes of player profile
         */
        this.selectedBannerId = this.currentProfile.BannerId;
        this.selectedBadgeId = this.currentProfile.BadgeId;
        this.selectedTitleLocKey = this.currentProfile.TitleLocKey;
        this.selectedPortraitBorder = this.currentProfile.PortraitBorder;
        this.selectedBackgroundColor = this.currentProfile.BackgroundColor;
        this.waitRewardsReady = async (rewardsList, ourPathItem) => {
            let done = false;
            // cancel any update in progress
            if (this.rewardsUpdateBusy) {
                this.cancelRewardsUpdate = true;
            }
            while (!done) {
                // if no update is now in progress, launch a new one and exit
                if (!this.rewardsUpdateBusy) {
                    this.populateRewards(rewardsList, ourPathItem);
                    done = true;
                }
                else {
                    await new Promise(f => setTimeout(f, 33)); // wait 2 frames and try again
                }
            }
        };
        this.populateRewards = async (rewardsList, ourPathItem) => {
            let rewardNum = 0;
            let startingReward = 0;
            const itemsPerUpdate = 20;
            this.rewardsUpdateBusy = true;
            // >>> 0 converts to uint32 so the types match.
            const rewardTypeBanner = Database.makeHash("UNLOCKABLEREWARD_TYPE_BANNER") >>> 0;
            while (rewardNum < ourPathItem.rewards.length && !this.cancelRewardsUpdate) {
                while (rewardNum < ourPathItem.rewards.length && rewardNum < startingReward + itemsPerUpdate && !this.cancelRewardsUpdate) {
                    const reward = ourPathItem.rewards[rewardNum];
                    const rewardType = getRewardType(reward.gameItemID);
                    if (rewardType != undefined) {
                        // TODO: use real text here when it's available from the server
                        const itemContainer = document.createElement("div");
                        itemContainer.classList.add("profile-progress-list-item", "ml-2", "mr-4", "mb-2", "flex-auto");
                        let rewardURL = reward.reward;
                        if (rewardType == rewardTypeBanner || Online.UserProfile.getUnlockableRewardTypeIDString(rewardType) == "UNLOCKABLEREWARD_TYPE_BANNER") {
                            rewardURL = 'fs://game/prof_banner.png';
                        }
                        let itemHTML = `
					<fxs-hslot>
						<div class="font-title-base text-accent-1 w-4 mx-4 self-center">${reward.level.toString()}</div>
						<div class="profile-reward bg-contain bg-no-repeat h-28 w-28 mx-1 self-center" style="background-image: url('${rewardURL}')"></div>
						<fxs-vslot class="flex profile-reward-right-item justify-center profile-reward-text flex-auto ml-2">
							<div class="font-title-base text-header-4 pointer-events-auto" role="paragraph" data-l10n-id="${reward.title}"></div>
							<div class="font-body-sm text-accent-1 pointer-events-auto" role="paragraph" data-l10n-id="${reward.desc}"></div>
							${rewardType == UnlockableRewardType.Memento ? `<div class="font-body-sm text-accent-1 pointer-events-auto" role="paragraph" data-l10n-id="LOC_${reward.gameItemID}_FUNCTIONAL_DESCRIPTION"></div>` : ""}
						</fxs-vslot>`;
                        if (reward.locked) {
                            itemHTML = itemHTML + `
							<fxs-vslot class="flex justify-center">
								<div class="bg-cover bg-no-repeat h-24 w-24 pointer-events-none" style="background-image: url('prof_locked.png')"></div>
							</fxs-vslot>`;
                        }
                        itemHTML = itemHTML + `</fxs-hslot>`;
                        itemContainer.innerHTML = itemHTML;
                        rewardsList.appendChild(itemContainer);
                    }
                    else {
                        console.error("screen-profile-page.ts: populateRewards - reward is undefined");
                    }
                    rewardNum++; // must advance, else we will get stuck in a loop.
                }
                if (!this.cancelRewardsUpdate && rewardNum < ourPathItem.rewards.length) {
                    startingReward = rewardNum;
                    await new Promise(f => setTimeout(f, 33)); // do a batch every 2 frames
                }
            }
            this.rewardsUpdateBusy = false;
            this.cancelRewardsUpdate = false;
        };
        this.animateInType = this.animateOutType = AnchorType.RelativeToRight;
        this.enableOpenSound = true;
        this.enableCloseSound = true;
        this.Root.setAttribute("data-audio-group-ref", "profile-screen");
    }
    ;
    onAttach() {
        super.onAttach();
        engine.on("DNAUserProfileCacheReady", this.userProfileReadyListener);
        engine.on("DNALeaderboardFetched", this.leaderboardFetchedListener);
        Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.Legends, MenuAction: TelemetryMenuActionType.Load });
    }
    onDetach() {
        Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.Legends, MenuAction: TelemetryMenuActionType.Exit });
        this.Root.removeEventListener('engine-input', this.engineInputListener);
        this.Root.removeEventListener('navigate-input', this.navigationInputListener);
        engine.off("DNAUserProfileCacheReady", this.userProfileReadyListener);
        engine.off("DNALeaderboardFetched", this.leaderboardFetchedListener);
        super.onDetach();
    }
    onReceiveFocus() {
        super.onReceiveFocus();
        if (this.slotGroup) {
            FocusManager.setFocus(this.slotGroup);
        }
        else {
            console.error("screen-profile-page: onReceiveFocus - slot group not found for focus!");
        }
        this.generalNavTrayUpdate();
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
    setPanelOptions(options) {
        const profileOptions = options;
        const isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
        this.onlyChallenges = profileOptions.onlyChallenges;
        this.onlyLeaderboards = profileOptions.onlyLeaderboards;
        if (profileOptions.focusTab) {
            this.focusTab = profileOptions.focusTab;
        }
        if (profileOptions.noCustomize) {
            this.noCustomize = profileOptions.noCustomize;
        }
        const titleFrame = MustGetElement(".profile-main-frame", this.Root);
        titleFrame.setAttribute("frame-style", "none");
        titleFrame.setAttribute("title", Locale.compose("LOC_METAPROGRESSION_PANEL_TITLE"));
        if (isMobileViewExperience) {
            titleFrame.setAttribute("outside-safezone-mode", "full");
            titleFrame.setAttribute("frame-style", "f1");
        }
        this.createContents();
        const closeButton = document.createElement('fxs-close-button');
        closeButton.addEventListener('action-activate', this.closeButtonListener);
        titleFrame.appendChild(closeButton);
        if (this.onlyChallenges) {
            titleFrame.setAttribute("subtitle", Locale.compose("LOC_METAPROGRESSION_CHALLENGES_PANEL_SUB_TITLE"));
            // Don't show the main tab control since there's only one option
            const mainTab = MustGetElement(".profile-main-tab", this.Root);
            mainTab.classList.add("hidden");
        }
        else if (this.onlyLeaderboards) {
            titleFrame.setAttribute("subtitle", Locale.compose("LOC_PROFILE_TAB_LEADERBOARDS"));
            // Don't show the main tab control since there's only one option
            const mainTab = MustGetElement(".profile-main-tab", this.Root);
            mainTab.classList.add("hidden");
            this.updateLeaderboardContent(Online.Leaderboard.getActiveEventLeaderboardID());
        }
        else {
            titleFrame.setAttribute("subtitle", Locale.compose("LOC_METAPROGRESSION_PANEL_SUB_TITLE"));
        }
    }
    generalNavTrayUpdate() {
        NavTray.clear();
        NavTray.addOrUpdateGenericBack();
    }
    refreshLeaderboard() {
        if (Online.Leaderboard.isLeaderboardAvailable()) {
            const dropDownList = MustGetElement("fxs-dropdown", this.Root);
            const selectedItemIndexAttr = dropDownList.getAttribute("selected-item-index");
            if (selectedItemIndexAttr !== null) {
                const index = parseInt(selectedItemIndexAttr, 10);
                this.updateLeaderboardContent(this.eventItems[index].id);
            }
        }
    }
    setupProgressUI(frag) {
        const isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
        const outerSlot = document.createElement("fxs-hslot");
        outerSlot.classList.add("profile-progress-main-hslot", "pt-8", "size-full");
        outerSlot.style.setProperty("max-width", Layout.pixels(1700));
        const ourPathItem = legendPathItems[0];
        if (legendPathItems.length == 0) {
            console.error("screen-profile-page: no legend path data found, can't continue");
            return;
        }
        const progressVslot = document.createElement("fxs-vslot");
        progressVslot.classList.add("items-center", "justify-end", "pl-8", "pr-2");
        const leaderNameContainer = document.createElement("div");
        leaderNameContainer.classList.add("flow-column", "justify-end");
        const leaderName = document.createElement("fxs-header");
        leaderName.classList.add("profile-progress-leader-name", "font-title-xl", "self-center", "text-center");
        if (this.isOfflineMemento) {
            leaderName.setAttribute("title", "LOC_METAPROGRESSION_FOUNDATION_SELECT_LEADER");
            leaderName.setAttribute("filigree-style", "h4");
            leaderName.setAttribute("font-fit-mode", "shrink");
            leaderName.setAttribute("wrap", "nowrap");
            leaderName.classList.add("mb-1", "w-96");
            leaderNameContainer.classList.add("h-10");
        }
        else {
            leaderName.setAttribute("title", ourPathItem.mainTitleLoc);
            leaderName.classList.add("mb-1", "w-128", "mt-10");
            leaderNameContainer.classList.add("h-20");
        }
        leaderNameContainer.appendChild(leaderName);
        progressVslot.appendChild(leaderNameContainer);
        const leftGradientBox = document.createElement("div");
        leftGradientBox.classList.add("profile-progress-left", "profile-gradient-box", "flex-auto");
        const scrollable = document.createElement("fxs-scrollable");
        scrollable.classList.add("flex-auto", "m-4");
        scrollable.setAttribute("handle-gamepad-pan", "false");
        scrollable.setAttribute("attached-scrollbar", "true");
        leftGradientBox.appendChild(scrollable);
        progressVslot.appendChild(leftGradientBox);
        const spatialSlot = document.createElement("fxs-spatial-slot");
        spatialSlot.classList.add("flex", "flex-row", "flex-wrap");
        scrollable.appendChild(spatialSlot);
        if (!this.isOfflineMemento) {
            const { BadgeId } = Online.UserProfile.getUserProfileData();
            const currentBadge = UnlockableRewardItems.getBadge(BadgeId);
            const topBadgeRow = document.createElement("div");
            topBadgeRow.classList.add("profile-badge-row", "mt-5", "pointer-events-auto");
            const leaderButton = document.createElement("fxs-activatable");
            leaderButton.classList.add("profile-leader-button", "relative", "w-32", "h-32", "self-center", "pointer-events-auto", "profile-leader-button-selected");
            leaderButton.setAttribute("tabindex", "-1");
            leaderButton.setAttribute("data-leader-index", "0");
            leaderButton.innerHTML = `
				<div class="profile-leader-button-image absolute inset-0"></div>
				<progression-badge class="absolute inset-x-5 inset-y-16" badge-size="base" data-badge-url="${currentBadge.url}" data-badge-progression-level="99"></progression-badge>
				<div class="profile-leader-laurels absolute inset-0 bg-cover bg-no-repeat"></div>
				<div class="profile-leader-button-ring-selected absolute -inset-5"></div>
				<fxs-ring-meter class="absolute inset-0" ring-class="liveops-progress-leader" tabindex="0" min-value="0" max-value="${legendPathItems[0].nextLevelXP}" value="${legendPathItems[0].currentXP}"></fxs-ring-meter>
				<div class="absolute bottom-3 inset-x-16 flex flex-row justify-center">
					<div class="profile-leader-button-level-circle bg-cover bg-no-repeat min-w-8 min-h-8 font-body-sm text-center">${legendPathItems[0].currentLevel}</div>
				</div>
			`;
            leaderButton.addEventListener("action-activate", this.progressLeaderSelectedListener);
            topBadgeRow.appendChild(leaderButton);
            spatialSlot.appendChild(topBadgeRow);
            const filigreeRow = document.createElement("div");
            filigreeRow.classList.add("profile-badge-row", "pt-5", "self-center");
            const topRowFiligree = document.createElement("div");
            topRowFiligree.classList.add("filigree-shell-small", "ml-5", "self-center", "bg-cover", "bg-no-repeat");
            filigreeRow.appendChild(topRowFiligree);
            spatialSlot.appendChild(filigreeRow);
        }
        outerSlot.appendChild(progressVslot);
        const playerParameter = GameSetup.findPlayerParameter(GameContext.localPlayerID, 'PlayerLeader');
        const showUnownedContent = false; //Configuration.getUser().showUnownedContent;
        for (let i = 0; i < legendPathItems.length; i++) {
            if (legendPathItems[i].mainTitleLoc.includes("LOC_LEADER")) {
                const leaderID = legendPathItems[i].mainTitleLoc.substring(4, legendPathItems[i].mainTitleLoc.length - 5);
                let isLocked = false;
                if (playerParameter && playerParameter.domain.possibleValues) {
                    const match = playerParameter.domain.possibleValues.find(l => l.value?.toString() == leaderID);
                    // There are two ways invalid leaders are treated: either they aren't in the Game Setup parameter list at all,
                    // or they're present but invalidReason is set.
                    if (!match) {
                        continue;
                    }
                    else {
                        if (match.invalidReason == GameSetupDomainValueInvalidReason.NotValidOwnership) {
                            if (!showUnownedContent) {
                                continue;
                            }
                            isLocked = true;
                        }
                        else if (match.invalidReason != GameSetupDomainValueInvalidReason.Valid) {
                            continue;
                        }
                    }
                }
                const leaderButton = document.createElement("fxs-activatable");
                leaderButton.classList.add("profile-leader-button", "relative", "m-2", "pointer-events-auto");
                leaderButton.setAttribute("tabindex", "-1");
                leaderButton.setAttribute("data-leader-index", i.toString());
                leaderButton.innerHTML = `
					<div class="profile-leader-button-image"></div>
					<fxs-icon class="absolute inset-0 ${isLocked ? "profile-leader-icon-locked" : ""}" data-icon-context="circle_mask" data-icon-id="${leaderID}"></fxs-icon>
					<div class="profile-leader-button-ring-selected absolute -inset-5"></div>
					
				`;
                leaderButton.addEventListener("action-activate", this.progressLeaderSelectedListener);
                spatialSlot.appendChild(leaderButton);
            }
        }
        const progressRightColumn = document.createElement("fxs-vslot");
        progressRightColumn.classList.add("profile-progress-right-column", "items-center", "justify-end", "flex-auto", "mr-8");
        progressRightColumn.classList.toggle("ml-4", !isMobileViewExperience);
        progressRightColumn.classList.toggle("ml-3", isMobileViewExperience);
        if (this.isOfflineMemento) {
            const progHeader = document.createElement("progression-header");
            progHeader.classList.add("profile-customize-progression-header", "mt-10", "mb-2", "w-full");
            progHeader.whenComponentCreated(c => c.Root.removeAttribute("tabindex"));
            progHeader.setAttribute("player-card-style", "large");
            progHeader.setAttribute("data-player-info", JSON.stringify(this.cardInfo));
            progressRightColumn.appendChild(progHeader);
        }
        else {
            const progressLeaderStats = document.createElement("fxs-header");
            progressLeaderStats.classList.add("profile-progress-leader-stats", "font-title-xl", "secondary-1", "self-center", "flex-row", "flex");
            const progressStatsText = Locale.compose("LOC_PROFILE_PROGRESS_HEADER", ourPathItem.currentLevel, ourPathItem.currentXP, ourPathItem.nextLevelXP);
            progressLeaderStats.setAttribute("title", progressStatsText);
            progressRightColumn.appendChild(progressLeaderStats);
        }
        const rightColGradientBox = document.createElement("div");
        rightColGradientBox.classList.add("profile-progress-right", "profile-gradient-box", "flex-auto", "w-full");
        progressRightColumn.appendChild(rightColGradientBox);
        this.progressRightScrollable = document.createElement("fxs-scrollable");
        this.progressRightScrollable.classList.add("m-4");
        this.progressRightScrollable.classList.add("flex-auto");
        this.progressRightScrollable.setAttribute("handle-gamepad-pan", "true");
        this.progressRightScrollable.setAttribute("attached-scrollbar", "true");
        this.progressRightScrollable.componentCreatedEvent.on(scrollable => scrollable.setEngineInputProxy(this.Root));
        rightColGradientBox.appendChild(this.progressRightScrollable);
        const rightColContentVslot = document.createElement("fxs-vslot");
        rightColContentVslot.classList.add("profile-progress-rewards-list");
        this.progressRightScrollable.appendChild(rightColContentVslot);
        this.generateRewardsList(rightColContentVslot, ourPathItem);
        outerSlot.appendChild(progressRightColumn);
        frag.appendChild(outerSlot);
    }
    onClickedProgressLeaderButton(clickEvent) {
        if (clickEvent.target) {
            const button = clickEvent.target;
            const leaderIndex = button.getAttribute("data-leader-index");
            this.updateProfile();
            if (leaderIndex) {
                const selectedIndex = parseInt(leaderIndex);
                // remove the highlight ring from the previous selection
                const oldSelection = this.Root.querySelector(".profile-leader-button-selected");
                if (oldSelection) {
                    oldSelection.classList.remove("profile-leader-button-selected");
                }
                // and add it to the new one
                button.classList.add("profile-leader-button-selected");
                this.refreshProgressRewards(selectedIndex);
            }
        }
    }
    refreshProgressRewards(selectedIndex) {
        const rewardsList = MustGetElement(".profile-progress-rewards-list", this.Root);
        const nameElement = MustGetElement(".profile-progress-leader-name", this.Root);
        const ourPathItem = legendPathItems[selectedIndex];
        if (!this.isOfflineMemento) {
            const statsHeader = MustGetElement(".profile-progress-leader-stats", this.Root);
            const progressStatsText = Locale.compose("LOC_PROFILE_PROGRESS_HEADER", ourPathItem.currentLevel, ourPathItem.currentXP, ourPathItem.nextLevelXP);
            statsHeader.setAttribute("title", progressStatsText);
        }
        nameElement.setAttribute("title", ourPathItem.mainTitleLoc);
        // reset the scroll bar position to the top
        if (this.progressRightScrollable) {
            this.progressRightScrollable.setAttribute("scrollpercent", "1");
            this.progressRightScrollable.setAttribute("scrollpercent", "0");
        }
        this.generateRewardsList(rewardsList, ourPathItem);
    }
    generateRewardsList(rewardsList, ourPathItem) {
        while (rewardsList.children.length > 0) {
            rewardsList.removeChild(rewardsList.children[0]);
        }
        this.waitRewardsReady(rewardsList, ourPathItem);
    }
    setupCustomizeUI(frag) {
        const isMobileViewExperience = UI.getViewExperience() == UIViewExperience.Mobile;
        const outerSlot = document.createElement("fxs-vslot");
        outerSlot.classList.add("profile-customize-outer-slot", "size-full");
        const leftVslot = document.createElement("fxs-vslot");
        leftVslot.classList.add("flex", "h-full", "w-1\\/2");
        const customizeItems = [];
        customizeItems.push({ label: "LOC_PROFILE_TAB_BADGES", id: "badges", className: "m-2" });
        customizeItems.push({ label: "LOC_PROFILE_TAB_BANNERS", id: "banners", className: "m-2" });
        customizeItems.push({ label: "LOC_PROFILE_TAB_TITLES", id: "titles", className: "m-2" });
        customizeItems.push({ label: "LOC_PROFILE_TAB_BORDERS", id: "borders", className: "m-2" });
        customizeItems.push({ label: "LOC_PROFILE_TAB_COLORS", id: "colors", className: "m-2" });
        const customizeTabControl = document.createElement("fxs-tab-bar");
        customizeTabControl.setAttribute("tab-for", "fxs-vslot");
        customizeTabControl.setAttribute("alt-controls", "true");
        customizeTabControl.classList.add("px-8", "mt-6", "w-full", "self-center");
        customizeTabControl.style.setProperty("max-width", Layout.pixels(1700));
        const customizeSlotGroup = document.createElement("fxs-slot-group");
        customizeSlotGroup.classList.add("flex-auto");
        this.cardInfo = getPlayerCardInfo(undefined, undefined, true);
        // If there is no leader id available, try loading it from the last saved game
        if (!this.cardInfo.LeaderID) {
            this.cardInfo.LeaderID = this.getLastSaveLeaderID();
        }
        for (const item of customizeItems) {
            const customizeContainer = document.createElement("fxs-slot");
            customizeContainer.classList.add("profile-customize-tab-container", "relative", "flex-auto");
            customizeContainer.classList.add(item.id);
            customizeContainer.setAttribute("id", item.id);
            const innerVslot = document.createElement("fxs-vslot");
            innerVslot.classList.add("profile-inner-vslot", "w-full");
            const outerHslot = document.createElement("fxs-hslot");
            outerHslot.classList.add("self-center", "w-full", "px-8", "flex-auto");
            outerHslot.style.setProperty("max-width", Layout.pixels(1700));
            innerVslot.appendChild(outerHslot);
            const leftVslot = document.createElement("fxs-vslot");
            leftVslot.classList.add("items-center");
            outerHslot.appendChild(leftVslot);
            const titleText = document.createElement("fxs-header");
            titleText.classList.add("mt-8");
            if (isMobileViewExperience) {
                titleText.setAttribute("filigree-style", "h4");
            }
            else {
                titleText.setAttribute("filigree-style", "none");
            }
            leftVslot.appendChild(titleText);
            const mainContentHslot = document.createElement("fxs-hslot");
            mainContentHslot.classList.add("flex-auto");
            leftVslot.appendChild(mainContentHslot);
            const leftGradient = document.createElement("div");
            leftGradient.classList.add("profile-customize-badges-outline-left", "profile-gradient-box");
            mainContentHslot.appendChild(leftGradient);
            const leftScrollable = document.createElement("fxs-scrollable");
            leftScrollable.setAttribute("attached-scrollbar", "true");
            leftScrollable.setAttribute("handle-gamepad-pan", "false");
            leftScrollable.classList.add("flex-auto", "m-2");
            leftGradient.appendChild(leftScrollable);
            const spatialSlot = document.createElement("fxs-spatial-slot");
            spatialSlot.classList.add("flex", "flex-row", "flex-wrap", "justify-center");
            leftScrollable.appendChild(spatialSlot);
            const rightVslot = document.createElement("fxs-vslot");
            rightVslot.classList.add("ml-8", "flex-auto");
            rightVslot.classList.toggle("ml-8", !isMobileViewExperience);
            rightVslot.classList.toggle("ml-5", isMobileViewExperience);
            outerHslot.appendChild(rightVslot);
            const progHeader = document.createElement("progression-header");
            progHeader.classList.add("profile-customize-progression-header", "mt-16");
            progHeader.classList.toggle("mb-8", !isMobileViewExperience);
            progHeader.classList.toggle("mb-2", isMobileViewExperience);
            progHeader.whenComponentCreated(c => c.Root.removeAttribute("tabindex"));
            progHeader.setAttribute("player-card-style", "large");
            progHeader.setAttribute("data-player-info", JSON.stringify(this.cardInfo));
            rightVslot.appendChild(progHeader);
            const customizeRight = document.createElement("div");
            customizeRight.classList.add("profile-customize-right", "flex-auto", "items-stretch", "p-2", "flow-column", "border-primary-1", "border-2");
            rightVslot.appendChild(customizeRight);
            const rightScrollable = document.createElement("fxs-scrollable");
            rightScrollable.setAttribute("handle-gamepad-pan", "true");
            rightScrollable.setAttribute("attached-scrollbar", "true");
            rightScrollable.componentCreatedEvent.on(scrollable => scrollable.setEngineInputProxy(this.Root));
            const scrollDiv = document.createElement("div");
            rightScrollable.appendChild(scrollDiv);
            customizeRight.appendChild(rightScrollable);
            // const markAllDiv = document.createElement("div");
            // markAllDiv.classList.add("w-full", "relative", "profile-customize-markall");
            // innerVslot.appendChild(markAllDiv);
            // const markAllButton = document.createElement("fxs-button");
            // markAllButton.classList.add("profile-customize-badges-markall", "self-center");
            // markAllButton.setAttribute("caption", "LOC_PROFILE_MARK_AS_SEEN");
            // markAllButton.setAttribute("action-key", "sys-menu");
            // markAllButton.addEventListener("action-activate", this.markAllAsSeenListener);
            // markAllDiv.appendChild(markAllButton);
            switch (item.id) {
                case "badges":
                    titleText.setAttribute("title", "LOC_PROFILE_SELECT_BADGE");
                    for (let badge = 0; badge < UnlockableRewardItems.badgeRewardItems.length; badge++) {
                        const thisBadge = UnlockableRewardItems.badgeRewardItems[badge];
                        const activatable = document.createElement("fxs-activatable");
                        activatable.classList.add("profile-customize-container", "relative", "h-28", "w-28", "pointer-events-auto");
                        if (thisBadge.isLocked) {
                            activatable.classList.add("profile-customize-locked");
                        }
                        activatable.setAttribute("tabindex", "-1");
                        activatable.setAttribute("data-badge-info", JSON.stringify(thisBadge));
                        activatable.innerHTML = `
								<div class="absolute inset-0 bg-cover bg-no-repeat pointer-events-none" style="background-image: url('fs://game/prof_btn_bk.png')"></div>
								<div class="profile-customize-highlight absolute inset-0 bg-cover bg-no-repeat pointer-events-none"></div>
								<div class="profile-customize-select absolute inset-0 bg-cover bg-no-repeat pointer-events-none"></div>
								<div class="absolute inset-4 bg-cover bg-no-repeat h-20 w-20 pointer-events-none" style="background-image: url('${thisBadge.url}.png')"></div>
								<div class="profile-customize-new-icon absolute inset-x-20 inset-y-0 bg-cover bg-no-repeat h-8 w-8 pointer-events-none" style="background-image: url('prof_new.png')"></div>
								<div class="profile-customize-locked-icon absolute inset-x-9 inset-y-18 bg-cover bg-no-repeat h-10 w-10 pointer-events-none" style="background-image: url('prof_locked.png')"></div>							
							`;
                        if (thisBadge.url == this.cardInfo.BadgeURL) {
                            activatable.classList.add("profile-customize-selected", "profile-customize-badge-selected");
                        }
                        activatable.addEventListener("action-activate", this.badgeSelectListener);
                        activatable.addEventListener("mouseover", this.badgeSelectListener);
                        activatable.addEventListener("focus", this.badgeSelectListener);
                        spatialSlot.appendChild(activatable);
                    }
                    if (UnlockableRewardItems.badgeRewardItems.length <= 0) {
                        console.error("screen-profile-page.ts: setupCostomizeUI - no badge reward items found!");
                        break;
                    }
                    const badgeItem = UnlockableRewardItems.badgeRewardItems[0];
                    // TODO: only one description is offered from the server, so either this needs to be made a single wrapping field or a second line added to the live data.
                    const isDefaultBadgeEquipped = UnlockableRewardItems.badgeRewardItems[0].url == this.cardInfo.BadgeURL;
                    scrollDiv.innerHTML = `
							<div role="paragraph" class="flex flex-col pointer-events-auto">
								<div class="profile-customize-badge-image mt-4 w-16 h-16 bg-cover bg-no-repeat self-center" style="background-image: url('${badgeItem.url}.png')"></div>
								<div class="profile-customize-badge-title font-title-2xl text-accent-2 self-center" data-l10n-id="LOC_${badgeItem.gameItemId}_NAME"></div>
								<div class="profile-customize-badge-desc1 font-body-base text-accent-2 self-center" data-l10n-id="${badgeItem.description}"></div>
								<div class="profile-customize-badge-desc2 font-body-base text-accent-2 self-center" data-l10n-id="${badgeItem.unlockCondition}"></div>
							</div>
							<p class="profile-customize-badge-equipped ${isDefaultBadgeEquipped ? "" : "hidden"} font-body-base text-accent-2 self-center mt-4" data-l10n-id="LOC_PROFILE_EQUIPPED"></p>
							<fxs-hslot class="profile-customize-badge-locked hidden self-center">
								<p class="font-body-base text-accent-2 self-center" data-l10n-id="LOC_PROFILE_LOCKED"></p>
								<div class="bg-cover bg-no-repeat h-10 w-10 pointer-events-none" style="background-image: url('prof_locked.png')"></div>
							</fxs-hslot>
						`;
                    break;
                case "banners":
                    titleText.setAttribute("title", "LOC_PROFILE_SELECT_BANNER");
                    for (let banner = 0; banner < UnlockableRewardItems.bannerRewardItems.length; banner++) {
                        const thisBanner = UnlockableRewardItems.bannerRewardItems[banner];
                        const activatable = document.createElement("fxs-activatable");
                        activatable.classList.add("profile-customize-container", "relative", "h-18", "profile-w-100", "pointer-events-auto");
                        if (thisBanner.isLocked) {
                            activatable.classList.add("profile-customize-locked");
                        }
                        activatable.setAttribute("tabindex", "-1");
                        activatable.setAttribute("data-banner-info", JSON.stringify(thisBanner));
                        activatable.innerHTML = `
								<div class="absolute inset-0 bg-cover bg-no-repeat pointer-events-none" style="background-image: url('${thisBanner.url}')"></div>
								<div class="profile-customize-highlight absolute inset-0 bg-cover bg-no-repeat pointer-events-none"></div>
								<div class="profile-customize-select absolute inset-0 bg-cover bg-no-repeat pointer-events-none"></div>
								<div class="profile-customize-new-icon absolute inset-y-3 bg-cover bg-no-repeat h-14 w-14 pointer-events-none" style="background-image: url('prof_new.png')"></div>
								<div class="profile-customize-locked-icon absolute inset-y-3 bg-cover bg-no-repeat h-14 w-14 pointer-events-none" style="background-image: url('prof_locked.png')"></div>						
							`;
                        if (thisBanner.url == this.cardInfo.BackgroundURL) {
                            activatable.classList.add("profile-customize-selected", "profile-customize-banner-selected");
                        }
                        activatable.addEventListener("action-activate", this.bannerSelectListener);
                        activatable.addEventListener("mouseover", this.bannerSelectListener);
                        activatable.addEventListener("focus", this.bannerSelectListener);
                        spatialSlot.appendChild(activatable);
                    }
                    if (UnlockableRewardItems.bannerRewardItems.length <= 0) {
                        console.error("screen-profile-page.ts: setupCustomizeUI - no banner reward items found!");
                        break;
                    }
                    // TODO: only one description is offered from the server, so either this needs to be made a single wrapping field or a second line added to the live data.
                    const bannerItem = UnlockableRewardItems.bannerRewardItems[0];
                    const isDefaultBannerEquipped = UnlockableRewardItems.bannerRewardItems[0].gameItemId == this.cardInfo.BannerId;
                    scrollDiv.innerHTML = `
							<div role="paragraph" class="flex flex-col pointer-events-auto">
								<div class="profile-customize-banner-image mt-4 profile-w-100 h-18 bg-cover bg-no-repeat self-center" style="background-image: url('${bannerItem.url}.png')"></div>
								<div class="profile-customize-banner-title font-title-2xl text-accent-2 self-center" data-l10n-id="LOC_${bannerItem.gameItemId}_NAME"></div>
								<div class="profile-customize-banner-desc1 font-body-base text-accent-2 self-center" data-l10n-id="${bannerItem.description}"></div>
								<div class="profile-customize-banner-desc2 font-body-base text-accent-2 self-center" data-l10n-id="${bannerItem.unlockCondition}"></div>
							</div>
							<p class="profile-customize-banner-equipped ${isDefaultBannerEquipped ? "" : "hidden"} font-body-base text-accent-2 self-center mt-4" data-l10n-id="LOC_PROFILE_EQUIPPED"></p>
							<fxs-hslot class="profile-customize-banner-locked hidden self-center">
								<p class="font-body-base text-accent-2 self-center" data-l10n-id="LOC_PROFILE_LOCKED"></p>
								<div class="bg-cover bg-no-repeat h-10 w-10 pointer-events-none" style="background-image: url('prof_locked.png')"></div>
							</fxs-hslot>
						`;
                    break;
                case "titles":
                    {
                        titleText.setAttribute("title", "LOC_PROFILE_SELECT_TITLE");
                        for (let title = 0; title < UnlockableRewardItems.titleRewardItems.length; title++) {
                            const thisTitle = UnlockableRewardItems.titleRewardItems[title];
                            const activatable = document.createElement("fxs-activatable");
                            activatable.classList.add("profile-customize-container", "relative", "h-16", "profile-w-100", "pointer-events-auto");
                            if (thisTitle.isLocked) {
                                activatable.classList.add("profile-customize-locked");
                            }
                            activatable.setAttribute("tabindex", "-1");
                            activatable.setAttribute("data-title-info", JSON.stringify(thisTitle));
                            activatable.innerHTML = `
								<div class="profile-customize-title-bg absolute inset-0 bg-cover bg-no-repeat pointer-events-none"></div>
								<div class="profile-customize-highlight absolute inset-0 bg-cover bg-no-repeat pointer-events-none"></div>
								<div class="profile-customize-select absolute inset-0 bg-cover bg-no-repeat pointer-events-none"></div>
								<div class="absolute inset-0 ml-2 mt-1 font-body-base text-accent-1 pointer-events-none" data-l10n-id="${thisTitle.locKey}"></div>
								<div class="profile-customize-new-icon absolute inset-x-20 inset-y-0 bg-cover bg-no-repeat h-8 w-8 pointer-events-none" style="background-image: url('prof_new.png')"></div>
								<div class="profile-customize-locked-icon absolute bottom-px bg-cover bg-no-repeat h-10 w-10 pointer-events-none" style="background-image: url('prof_locked.png')"></div>					
							`;
                            if (thisTitle.locKey == this.cardInfo.playerTitle) {
                                activatable.classList.add("profile-customize-selected", "profile-customize-title-selected");
                            }
                            activatable.addEventListener("action-activate", this.titleSelectListener);
                            activatable.addEventListener("mouseover", this.titleSelectListener);
                            activatable.addEventListener("focus", this.titleSelectListener);
                            spatialSlot.appendChild(activatable);
                        }
                        if (UnlockableRewardItems.titleRewardItems.length <= 0) {
                            console.error("screen-profile-page.ts: setupCustomizeUI - no title reward items found!");
                            break;
                        }
                        const titleItem = UnlockableRewardItems.titleRewardItems[0];
                        // TODO: no description is offered from the server for titles, hook it up when it exists.
                        const isDefaultTitleEquipped = UnlockableRewardItems.titleRewardItems[0].locKey == this.cardInfo.TitleLocKey;
                        scrollDiv.innerHTML = `
								<div role="paragraph" class="flex flex-col pointer-events-auto">
									<div class="profile-customize-title-title font-title-2xl text-accent-2 self-center" data-l10n-id="LOC_${titleItem.gameItemId}_NAME"></div>
									<div class="profile-customize-title-desc1 font-body-base text-accent-2 self-center" data-l10n-id="${titleItem.unlockCondition}"></div>
									<div class="profile-customize-title-desc2 font-body-base text-accent-2 self-center" data-l10n-id="LOC_${titleItem.gameItemId}_NAME"></div>
								</div>
							<p class="profile-customize-title-equipped ${isDefaultTitleEquipped ? "" : "hidden"} font-body-base text-accent-2 self-center mt-4" data-l10n-id="LOC_PROFILE_EQUIPPED"></p>
							<fxs-hslot class="profile-customize-title-locked hidden self-center">
								<p class="font-body-base text-accent-2 self-center" data-l10n-id="LOC_PROFILE_LOCKED"></p>
								<div class="bg-cover bg-no-repeat h-10 w-10 pointer-events-none" style="background-image: url('prof_locked.png')"></div>
							</fxs-hslot>
						`;
                    }
                    break;
                case "borders":
                    titleText.setAttribute("title", "LOC_PROFILE_SELECT_BORDER");
                    for (let border = 0; border < UnlockableRewardItems.borderRewardItems.length; border++) {
                        const thisBorder = UnlockableRewardItems.borderRewardItems[border];
                        const activatable = document.createElement("fxs-activatable");
                        activatable.classList.add("profile-customize-container", "relative", "h-52", "w-52", "pointer-events-auto");
                        activatable.classList.toggle("h-52", !isMobileViewExperience);
                        activatable.classList.toggle("w-52", !isMobileViewExperience);
                        activatable.classList.toggle("h-28", isMobileViewExperience);
                        activatable.classList.toggle("w-28", isMobileViewExperience);
                        if (thisBorder.isLocked) {
                            activatable.classList.add("profile-customize-locked");
                        }
                        activatable.setAttribute("tabindex", "-1");
                        activatable.setAttribute("data-border-info", JSON.stringify(thisBorder));
                        activatable.innerHTML = `
								<div class="absolute inset-0 bg-cover bg-no-repeat pointer-events-none" style="background-image: url('fs://game/prof_btn_bk.png')"></div>
								<div class="profile-customize-highlight absolute inset-0 bg-cover bg-no-repeat pointer-events-none"></div>
								<div class="profile-customize-select absolute inset-0 bg-cover bg-no-repeat pointer-events-none"></div>
								<div class="absolute inset-0 bg-cover bg-no-repeat ${isMobileViewExperience ? 'h-28 w-28' : 'h-52 w-52'} pointer-events-none" style="background-image: url('${thisBorder.url}.png')"></div>
								<div class="profile-customize-new-icon absolute ${isMobileViewExperience ? 'inset-x-20 h-8 w-8' : 'inset-x-38 h-14 w-14'} inset-y-0 bg-cover bg-no-repeat pointer-events-none" style="background-image: url('prof_new.png')"></div>
								<div class="profile-customize-locked-icon absolute ${isMobileViewExperience ? 'inset-x-9 inset-y-18 h-10 w-10' : 'inset-x-20 inset-y-40 h-12 w-12'} bg-cover bg-no-repeat pointer-events-none" style="background-image: url('prof_locked.png')"></div>					
							`;
                        if (thisBorder.url == this.cardInfo.BorderURL) {
                            activatable.classList.add("profile-customize-selected", "profile-customize-border-selected");
                        }
                        activatable.addEventListener("action-activate", this.borderSelectListener);
                        activatable.addEventListener("mouseover", this.borderSelectListener);
                        activatable.addEventListener("focus", this.borderSelectListener);
                        spatialSlot.appendChild(activatable);
                    }
                    if (UnlockableRewardItems.borderRewardItems.length <= 0) {
                        console.error("screen-profile-page.ts: setupCustomizeUI - no border reward items found!");
                        break;
                    }
                    const borderItem = UnlockableRewardItems.borderRewardItems[0];
                    // TODO: there is no server data for borders right now
                    const isDefaultBorderEquipped = UnlockableRewardItems.borderRewardItems[0].url == this.cardInfo.BorderURL;
                    scrollDiv.innerHTML = `
								<div role="paragraph" class="flex flex-col pointer-events-auto">
									<div class="profile-customize-border-image mt-2 w-16 h-16 bg-cover bg-no-repeat self-center" style="background-image: url('${borderItem.url}.png')"></div>
									<div class="profile-customize-border-title font-title-2xl text-accent-2 self-center" data-l10n-id="${borderItem.name}"></div>
									<div class="profile-customize-border-desc1 font-body-base text-accent-2 self-center" data-l10n-id="${borderItem.desc1}"></div>
									<div class="profile-customize-border-desc2 font-body-base text-accent-2 self-center" data-l10n-id="${borderItem.unlockCondition}"></div>
								</div>
							<p class="profile-customize-border-equipped ${isDefaultBorderEquipped ? "" : "hidden"} font-body-base text-accent-2 self-center mt-4" data-l10n-id="LOC_PROFILE_EQUIPPED"></p>
							<fxs-hslot class="profile-customize-border-locked hidden self-center">
								<p class="font-body-base text-accent-2 self-center" data-l10n-id="LOC_PROFILE_LOCKED"></p>
								<div class="bg-cover bg-no-repeat h-10 w-10 pointer-events-none" style="background-image: url('prof_locked.png')"></div>
							</fxs-hslot>
						`;
                    break;
                case "colors":
                    titleText.setAttribute("title", "LOC_PROFILE_SELECT_COLOR");
                    const { colorRewardItems } = UnlockableRewardItems;
                    for (let color = 0; color < colorRewardItems.length; color++) {
                        const thisColor = colorRewardItems[color];
                        const activatable = document.createElement("fxs-activatable");
                        activatable.classList.add("profile-customize-container", "relative", "h-25", "profile-width-200", "pointer-events-auto");
                        if (thisColor.isLocked) {
                            activatable.classList.add("profile-customize-locked");
                        }
                        activatable.setAttribute("tabindex", "-1");
                        activatable.setAttribute("data-color-info", JSON.stringify(thisColor));
                        activatable.innerHTML = `
								<div class="profile-customize-color-bg absolute inset-0 bg-cover bg-no-repeat pointer-events-none"></div>
								<div class="profile-width-200 absolute inset-0 bg-cover bg-no-repeat h-25 pointer-events-none opacity-30" style="background-color: ${thisColor.color}"></div>
								<div class="profile-customize-highlight absolute inset-0 bg-cover bg-no-repeat pointer-events-none"></div>									
								<div class="profile-customize-select absolute inset-0 bg-cover bg-no-repeat pointer-events-none"></div>
								<div class="profile-customize-new-icon absolute inset-x-40 inset-y-0 bg-cover bg-no-repeat h-10 w-10 pointer-events-none" style="background-image: url('prof_new.png')"></div>
								<div class="profile-customize-locked-icon absolute inset-x-19 inset-y-12 bg-cover bg-no-repeat h-12 w-12 pointer-events-none" style="background-image: url('prof_locked.png')"></div>				
							`;
                        if (thisColor.color == this.cardInfo.BackgroundColor) {
                            activatable.classList.add("profile-customize-selected", "profile-customize-color-selected");
                        }
                        activatable.addEventListener("action-activate", this.colorSelectListener);
                        activatable.addEventListener("mouseover", this.colorSelectListener);
                        activatable.addEventListener("focus", this.colorSelectListener);
                        spatialSlot.appendChild(activatable);
                    }
                    if (UnlockableRewardItems.colorRewardItems.length <= 0) {
                        console.error("screen-profile-page.ts: setupCustomizeUI - no color reward items found!");
                        break;
                    }
                    const colorItem = UnlockableRewardItems.colorRewardItems[0];
                    // TODO: there is no server data for colors right now
                    const isDefaultColorEquipped = colorRewardItems[0].color == this.cardInfo.BackgroundColor;
                    scrollDiv.innerHTML = `
							<div role="paragraph" class="flex flex-col pointer-events-auto">
								<div class="profile-customize-color-title font-title-2xl text-accent-2 self-center mt-4" data-l10n-id="LOC_${colorItem.name}_NAME"></div>
								<div class="profile-customize-color-desc1 font-body-base text-accent-2 self-center" data-l10n-id="${colorItem.unlockCondition}"></div>
							</div>
							<p class="profile-customize-color-equipped ${isDefaultColorEquipped ? "" : "hidden"} font-body-base text-accent-2 self-center mt-4" data-l10n-id="LOC_PROFILE_EQUIPPED"></p>
							<fxs-hslot class="profile-customize-color-locked hidden self-center">
								<p class="font-body-base text-accent-2 self-center" data-l10n-id="LOC_PROFILE_LOCKED"></p>
								<div class="bg-cover bg-no-repeat h-10 w-10 pointer-events-none" style="background-image: url('prof_locked.png')"></div>
							</fxs-hslot>
						`;
                    break;
            }
            customizeContainer.appendChild(innerVslot);
            customizeSlotGroup.appendChild(customizeContainer);
        }
        customizeTabControl.setAttribute("tab-items", JSON.stringify(customizeItems));
        customizeTabControl.addEventListener("tab-selected", (e) => {
            this.currentlySelectedCustomizeTab = customizeItems[e.detail.index].id;
            customizeSlotGroup.setAttribute('selected-slot', this.currentlySelectedCustomizeTab);
            e.stopPropagation();
        });
        const tabControlContainer = document.createElement("div");
        tabControlContainer.classList.add("w-full", "px-10");
        tabControlContainer.appendChild(customizeTabControl);
        outerSlot.appendChild(tabControlContainer);
        outerSlot.appendChild(customizeSlotGroup);
        frag.appendChild(outerSlot);
    }
    onClickedMarkAllAsSeen() {
        // TODO: mark all badges/borders/titles/banners/colors as seen when the backend supports that status
        // (use this.currentlySelectedMainTab to determine which type of thing is being requested)
    }
    onClickedBadge(clickEvent) {
        if (clickEvent.target) {
            const badge = clickEvent.target;
            const isAClick = !(clickEvent.type == "mouseover" || clickEvent.type == "focus");
            if (isAClick) {
                this.changeSelectionHighlight("badge", badge);
            }
            this.updateBadgeDisplay(badge, isAClick);
            // TODO: mark this badge as seen when the backend supports that status
        }
    }
    updateBadgeDisplay(selected, updateServer) {
        const badgeInfoJSON = selected.getAttribute("data-badge-info");
        if (badgeInfoJSON) {
            const badge = JSON.parse(badgeInfoJSON);
            const { url, gameItemId, description, unlockCondition, isLocked } = badge;
            this.updateLockEquipStatus("badge", isLocked, updateServer || this.cardInfo.BadgeURL == url);
            const iconElement = MustGetElement(".profile-customize-badge-image", this.Root);
            const nameElement = MustGetElement(".profile-customize-badge-title", this.Root);
            const desc1Element = MustGetElement(".profile-customize-badge-desc1", this.Root);
            const desc2Element = MustGetElement(".profile-customize-badge-desc2", this.Root);
            const badgeLoc = `LOC_${gameItemId}_NAME`;
            iconElement.style.backgroundImage = `url('${url}.png')`;
            nameElement.setAttribute("data-l10n-id", badgeLoc);
            desc1Element.setAttribute("data-l10n-id", description);
            desc2Element.setAttribute("data-l10n-id", unlockCondition);
            if (updateServer && !isLocked) {
                const headers = MustGetElements("progression-header", this.Root);
                this.cardInfo.BadgeURL = url;
                for (let i = 0; i < headers.length; i++) {
                    headers[i].setAttribute("data-player-info", JSON.stringify(this.cardInfo));
                }
                this.selectedBadgeId = gameItemId;
            }
        }
    }
    onClickedBanner(clickEvent) {
        if (clickEvent.target) {
            const banner = clickEvent.target;
            const isAClick = !(clickEvent.type == "mouseover" || clickEvent.type == "focus");
            if (isAClick) {
                this.changeSelectionHighlight("banner", banner);
            }
            this.updateBannerDisplay(banner, isAClick);
            // TODO: mark this banner as seen when the backend supports that status
        }
    }
    updateBannerDisplay(selected, updateServer) {
        const bannerInfoJSON = selected.getAttribute("data-banner-info");
        if (bannerInfoJSON) {
            const banner = JSON.parse(bannerInfoJSON);
            const { url, gameItemId, description, unlockCondition, isLocked } = banner;
            this.updateLockEquipStatus("banner", isLocked, updateServer || this.cardInfo.BackgroundURL == url);
            const iconElement = MustGetElement(".profile-customize-banner-image", this.Root);
            const nameElement = MustGetElement(".profile-customize-banner-title", this.Root);
            const desc1Element = MustGetElement(".profile-customize-banner-desc1", this.Root);
            const desc2Element = MustGetElement(".profile-customize-banner-desc2", this.Root);
            const bannerLoc = `LOC_${gameItemId}_NAME`;
            iconElement.style.backgroundImage = `url('${url}.png')`;
            nameElement.setAttribute("data-l10n-id", bannerLoc);
            desc1Element.setAttribute("data-l10n-id", description);
            desc2Element.setAttribute("data-l10n-id", unlockCondition);
            if (updateServer && !isLocked) {
                const headers = MustGetElements("progression-header", this.Root);
                this.cardInfo.BackgroundURL = url;
                for (let i = 0; i < headers.length; i++) {
                    headers[i].setAttribute("data-player-info", JSON.stringify(this.cardInfo));
                }
                this.selectedBannerId = gameItemId;
            }
        }
    }
    onClickedTitle(clickEvent) {
        if (clickEvent.target) {
            const title = clickEvent.target;
            const isAClick = !(clickEvent.type == "mouseover" || clickEvent.type == "focus");
            if (isAClick) {
                this.changeSelectionHighlight("title", title);
            }
            this.updateTitleDisplay(title, !(clickEvent.type == "mouseover" || clickEvent.type == "focus"));
            // TODO: mark this title as seen when the backend supports that status
        }
    }
    updateTitleDisplay(selected, updateServer) {
        const titleInfoJSON = selected.getAttribute("data-title-info");
        if (titleInfoJSON) {
            const title = JSON.parse(titleInfoJSON);
            const { locKey, unlockCondition, isLocked } = title;
            this.updateLockEquipStatus("title", isLocked, updateServer || this.cardInfo.playerTitle == locKey);
            const nameElement = MustGetElement(".profile-customize-title-title", this.Root);
            const desc1Element = MustGetElement(".profile-customize-title-desc1", this.Root);
            const desc2Element = MustGetElement(".profile-customize-title-desc2", this.Root);
            nameElement.setAttribute("data-l10n-id", locKey);
            desc1Element.setAttribute("data-l10n-id", "");
            desc2Element.setAttribute("data-l10n-id", unlockCondition);
            if (updateServer && !isLocked) {
                const headers = MustGetElements("progression-header", this.Root);
                this.cardInfo.playerTitle = locKey;
                for (let i = 0; i < headers.length; i++) {
                    headers[i].setAttribute("data-player-info", JSON.stringify(this.cardInfo));
                }
                this.selectedTitleLocKey = locKey;
            }
        }
    }
    onClickedBorder(clickEvent) {
        if (clickEvent.target) {
            const border = clickEvent.target;
            const isAClick = !(clickEvent.type == "mouseover" || clickEvent.type == "focus");
            if (isAClick) {
                this.changeSelectionHighlight("border", border);
            }
            this.updateBorderDisplay(border, isAClick);
            // TODO: mark this border as seen when the backend supports that status
        }
    }
    updateBorderDisplay(selected, updateServer) {
        const borderInfoJSON = selected.getAttribute("data-border-info");
        if (borderInfoJSON) {
            const border = JSON.parse(borderInfoJSON);
            this.updateLockEquipStatus("border", border.isLocked, updateServer || this.cardInfo.BorderURL == border.url);
            const iconElement = MustGetElement(".profile-customize-border-image", this.Root);
            const nameElement = MustGetElement(".profile-customize-border-title", this.Root);
            const desc1Element = MustGetElement(".profile-customize-border-desc1", this.Root);
            const desc2Element = MustGetElement(".profile-customize-border-desc2", this.Root);
            iconElement.style.backgroundImage = `url('${border.url}.png')`;
            nameElement.setAttribute("data-l10n-id", border.name);
            desc1Element.setAttribute("data-l10n-id", border.desc1);
            desc2Element.setAttribute("data-l10n-id", border.unlockCondition);
            if (updateServer && !border.isLocked) {
                const headers = MustGetElements("progression-header", this.Root);
                this.cardInfo.BorderURL = border.url;
                for (let i = 0; i < headers.length; i++) {
                    headers[i].setAttribute("data-player-info", JSON.stringify(this.cardInfo));
                }
                const portraits = MustGetElements("progression-portrait", this.Root);
                for (const portrait of portraits) {
                    portrait.setAttribute("data-border-url", border.url);
                }
                this.selectedPortraitBorder = border.gameItemId;
            }
        }
    }
    onClickedColor(clickEvent) {
        if (clickEvent.target) {
            const color = clickEvent.target;
            const isAClick = !(clickEvent.type == "mouseover" || clickEvent.type == "focus");
            if (isAClick) {
                this.changeSelectionHighlight("color", color);
            }
            this.updateColorDisplay(color, isAClick);
            // TODO: mark this color as seen when the backend supports that status
        }
    }
    updateColorDisplay(selected, updateServer) {
        const colorInfoJSON = selected.getAttribute("data-color-info");
        if (colorInfoJSON) {
            const color = JSON.parse(colorInfoJSON);
            this.updateLockEquipStatus("color", color.isLocked, updateServer || this.cardInfo.BackgroundColor == color.color);
            const nameElement = MustGetElement(".profile-customize-color-title", this.Root);
            const desc1Element = MustGetElement(".profile-customize-color-desc1", this.Root);
            const colorLoc = `LOC_${color.name}_NAME`;
            nameElement.setAttribute("data-l10n-id", colorLoc);
            desc1Element.setAttribute("data-l10n-id", color.unlockCondition);
            if (updateServer && !color.isLocked) {
                const headers = MustGetElements("progression-header", this.Root);
                this.cardInfo.BackgroundColor = color.color;
                for (let i = 0; i < headers.length; i++) {
                    headers[i].setAttribute("data-player-info", JSON.stringify(this.cardInfo));
                }
                this.selectedBackgroundColor = color.color;
            }
        }
    }
    changeSelectionHighlight(customizeType, selectedElement) {
        const customizedClass = `profile-customize-${customizeType}-selected`;
        const oldSelection = this.Root.querySelector(`.${customizedClass}`);
        if (oldSelection) {
            oldSelection.classList.remove("profile-customize-selected");
            oldSelection.classList.remove(customizedClass);
        }
        selectedElement.classList.add("profile-customize-selected");
        selectedElement.classList.add(customizedClass);
    }
    updateLockEquipStatus(customizeType, isLocked, isEquipped) {
        const lockElement = MustGetElement(`.profile-customize-${customizeType}-locked`, this.Root);
        const equippedElement = MustGetElement(`.profile-customize-${customizeType}-equipped`, this.Root);
        lockElement.classList.toggle("hidden", !isLocked);
        equippedElement.classList.toggle("hidden", !isEquipped);
    }
    /*private setupHallOfFameUI(frag: DocumentFragment) {
        const outermostVslot = document.createElement("fxs-vslot");

        const hofItems: TabItem[] = [];
        hofItems.push({ label: "LOC_PROFILE_TAB_OVERVIEW", id: "general", className: "m-2" });
        hofItems.push({ label: "LOC_PROFILE_TAB_LEADERS", id: "leaders", className: "m-2" });
        hofItems.push({ label: "LOC_PROFILE_TAB_CIVILIZATIONS", id: "civilizations", className: "m-2" });
        hofItems.push({ label: "LOC_PROFILE_TAB_HISTORY", id: "history", className: "m-2" });

        const hofTabControl = document.createElement("fxs-tab-bar");
        hofTabControl.classList.add("self-center", "mt-6");
        hofTabControl.setAttribute("tab-for", "fxs-vslot");
        hofTabControl.setAttribute("alt-controls", "true");
        const statsSlotGroup = document.createElement("fxs-slot-group");

        outermostVslot.appendChild(hofTabControl);
        outermostVslot.appendChild(statsSlotGroup);
        frag.appendChild(outermostVslot);

        hofItems.forEach(item => {
            const statsContainer = document.createElement("fxs-slot");
            statsContainer.classList.add("profile-stats-tab-container", item.id, "self-center");
            statsContainer.setAttribute("id", item.id);

            const innerVslot = document.createElement("fxs-vslot");
            innerVslot.classList.add("profile-inner-vslot", "mt-8");
            switch (item.id) {
                case "general":
                    {
                        const outerSlot = document.createElement("fxs-vslot");
                        outerSlot.classList.add("profile-progress-main-hslot", "h-full", "mt-24");
                        innerVslot.appendChild(outerSlot);

                        const controlBar = document.createElement("fxs-hslot");
                        controlBar.classList.add("w-full");
                        controlBar.setAttribute("data-navrule-left", "inv");
                        controlBar.setAttribute("data-navrule-right", "inv");
                        outerSlot.appendChild(controlBar);

                        // the left sort type control (difficulty sort)
                        const leftSortHslot = document.createElement("fxs-hslot");
                        leftSortHslot.classList.add("relative", "w-1\\/2", "justify-center", "profile-hof-difficulty-sort");
                        leftSortHslot.setAttribute("data-navrule-left", "inv");
                        leftSortHslot.setAttribute("data-navrule-right", "inv");
                        controlBar.appendChild(leftSortHslot);

                        const leftSort = document.createElement("fxs-activatable");
                        leftSort.classList.add("profile-challenges-sort-arrow", "profile-challenges-sort-left", "img-arrow", "w-8", "h-12", "pointer-events-auto");
                        leftSort.addEventListener("action-activate", this.hofDifficultyDownListener);
                        leftSortHslot.appendChild(leftSort);

                        const sortText = document.createElement("div");
                        sortText.classList.add("profile-hof-left-sort-text", "font-body", "text-base", "text-accent-1", "self-center");
                        sortText.setAttribute("tabindex", "-1");
                        sortText.innerHTML = Locale.compose("LOC_PROFILE_DIFFICULTY", difficultyFilterNames[this.difficultyFilter]);
                        leftSortHslot.appendChild(sortText);

                        const rightSort = document.createElement("fxs-activatable");
                        rightSort.classList.add("profile-challenges-sort-arrow", "profile-challenges-sort-left", "img-arrow", "w-8", "h-12", "pointer-events-auto", "-scale-x-100");
                        rightSort.addEventListener("action-activate", this.hofDifficultyUpListener);
                        leftSortHslot.appendChild(rightSort);

                        // the right sort type control (speed sort)
                        const rightSortHslot = document.createElement("fxs-hslot");
                        rightSortHslot.classList.add("relative", "w-1\\/2", "justify-center", "profile-hof-speed-sort");
                        rightSortHslot.setAttribute("data-navrule-left", "inv");
                        rightSortHslot.setAttribute("data-navrule-right", "inv");
                        controlBar.appendChild(rightSortHslot);

                        const rightLeftSort = document.createElement("fxs-activatable");
                        rightLeftSort.classList.add("profile-challenges-sort-arrow", "profile-challenges-sort-left", "img-arrow", "w-8", "h-12", "pointer-events-auto");
                        rightLeftSort.addEventListener("action-activate", this.hofSpeedDownListener);
                        rightSortHslot.appendChild(rightLeftSort);

                        const rightSortText = document.createElement("div");
                        rightSortText.classList.add("profile-hof-right-sort-text", "font-body", "text-base", "text-accent-1", "self-center");
                        rightSortText.setAttribute("tabindex", "-1");
                        rightSortText.innerHTML = Locale.compose("LOC_PROFILE_GAME_SPEED", speedFilterNames[this.speedFilter]);
                        rightSortHslot.appendChild(rightSortText);

                        const rightRightSort = document.createElement("fxs-activatable");
                        rightRightSort.classList.add("profile-challenges-sort-arrow", "profile-challenges-sort-left", "img-arrow", "w-8", "h-12", "pointer-events-auto", "-scale-x-100");
                        rightRightSort.addEventListener("action-activate", this.hofSpeedUpListener);
                        rightSortHslot.appendChild(rightRightSort);

                        const gradientFrame = document.createElement("div");
                        gradientFrame.classList.add("profile-gradient-box", "profile-hof-general-gradient-box");
                        outerSlot.appendChild(gradientFrame);

                        const generalScrollable = document.createElement("fxs-scrollable");
                        generalScrollable.classList.add("profile-hof-general-scrollable");
                        generalScrollable.setAttribute("handle-gamepad-pan", "-1");
                        gradientFrame.appendChild(generalScrollable);

                        const generalScrollableContent = document.createElement("fxs-vslot");
                        generalScrollableContent.classList.add("profile-hof-general-scrollable-content")
                        generalScrollable.appendChild(generalScrollableContent);

                        generalScrollableContent.insertAdjacentHTML('afterbegin', `
                            <div class="font-title-2xl text-center text-accent-1" data-l10n-id="LOC_PROFILE_COMPLETION"></div>
                            <div class="w-32 h-4 bg-cover bg-no-repeat filigree-shell-small self-center"></div>
                        `);

                        this.populateHOFCompletions(generalScrollableContent);

                        generalScrollableContent.insertAdjacentHTML('beforeend', `
                            <div class="font-title-2xl text-center text-accent-1" data-l10n-id="LOC_PROFILE_VICTORIES"></div>
                            <div class="w-32 h-4 bg-cover bg-no-repeat filigree-shell-small self-center"></div>
                        `);

                        this.populateHOFVictories(generalScrollableContent);
                    }
                    break;

                case "leaders":
                    {
                        const outerSlot = document.createElement("fxs-hslot");
                        outerSlot.classList.add("profile-progress-main-hslot", "profile-hof-leaders-main-hslot", "h-full", "w-full", "mt-24");
                        innerVslot.appendChild(outerSlot);

                        const progressVslot = document.createElement("fxs-vslot");
                        outerSlot.appendChild(progressVslot);

                        const leftGradientBox = document.createElement("div");
                        leftGradientBox.classList.add("profile-progress-left", "profile-gradient-box");
                        progressVslot.appendChild(leftGradientBox);

                        const scrollable = document.createElement("fxs-scrollable");
                        scrollable.classList.add("profile-progress-left-scrollable");
                        leftGradientBox.appendChild(scrollable);

                        const spatialSlot = document.createElement("fxs-spatial-slot");
                        spatialSlot.classList.add("flex", "flex-row", "flex-wrap");
                        scrollable.appendChild(spatialSlot);

                        let firstLeader: LegendPathItem | null = null;
                        for (let i: number = 0; i < legendPathItems.length; i++) {
                            if (legendPathItems[i].mainTitleLoc.includes("LOC_LEADER")) {
                                // TODO: we need the leader ID in the legendPathItems
                                const leaderID: string = legendPathItems[i].mainTitleLoc.substring(4, legendPathItems[i].mainTitleLoc.length - 5);
                                const leaderButton = document.createElement("fxs-activatable");

                                if (firstLeader == null) {
                                    firstLeader = legendPathItems[i];

                                    leaderButton.classList.add("profile-leader-button-selected", "profile-hof-leader-button-selected");
                                }

                                leaderButton.classList.add("profile-leader-button", "relative", "m-2", "pointer-events-auto");
                                leaderButton.setAttribute("tabindex", "-1");
                                leaderButton.setAttribute("data-leader-locname", legendPathItems[i].mainTitleLoc);
                                leaderButton.innerHTML = `
                                    <div class="profile-leader-button-image", "absolute", "inset-0"></div>
                                    <fxs-icon class="absolute inset-0" data-icon-context="LEADER" data-icon-id="${leaderID}"></fxs-icon>
                                    <div class="profile-leader-button-ring-selected absolute -inset-5"></div>
                                    <div class="absolute -bottom-1 inset-x-0 flex flex-row justify-center">
                                        <div class="leader-button-level-circle font-body-sm text-center">${legendPathItems[i].currentLevel}</div>
                                    </div>
                                `;
                                leaderButton.addEventListener("action-activate", this.hofLeaderClickedListener);
                                spatialSlot.appendChild(leaderButton);
                            }
                        }

                        const rightGradientBox = document.createElement("div");
                        rightGradientBox.classList.add("profile-progress-left", "ml-24");
                        outerSlot.appendChild(rightGradientBox);

                        const rightScrollable = document.createElement("fxs-scrollable");
                        rightScrollable.classList.add("profile-progress-left-scrollable");
                        rightGradientBox.appendChild(rightScrollable);

                        const rightVSlot = document.createElement("fxs-vslot");
                        rightScrollable.appendChild(rightVSlot);

                        const firstLeaderName: string = firstLeader ? firstLeader.mainTitleLoc : "";
                        rightVSlot.insertAdjacentHTML('afterbegin', `
                            <div class="font-title-lg font-accent-1 text-center">Victories</div>
                            <div class="w-32 h-4 bg-cover bg-no-repeat filigree-shell-small self-center"></div>
                            <div class="font-title-lg font-accent-1 text-center profile-hof-leader-name" data-l10n-id="${firstLeaderName}"></div>
                            <div class="font-body-base font-primary-1 text-center profile-hof-times-used">Times Used: 4</div>
                            <div class="font-body-base font-primary-1 text-center profile-hof-times-used">Total Victories: 12</div>
                        `);

                        const innerFrame = document.createElement("fxs-inner-frame");
                        innerFrame.classList.add("profile-hof-leader-victory-list");
                        rightVSlot.insertAdjacentElement('beforeend', innerFrame);

                        const topSpacer = document.createElement("div");
                        topSpacer.classList.add("mt-4");
                        innerFrame.insertAdjacentElement('beforeend', topSpacer);

                        for (let i: number = 0; i < victoryItems.length; i++) {
                            this.populateHOFLeaderVictory(innerFrame, victoryItems[i]);
                        }

                        innerFrame.insertAdjacentHTML('beforeend', `<div class="h-2 w-full"></div>`);
                    }
                    break;

                case "civilizations":
                    {
                        const outerSlot = document.createElement("fxs-hslot");
                        outerSlot.classList.add("profile-progress-main-hslot", "profile-hof-civ-main-hslot", "h-full", "w-full", "mt-24");
                        innerVslot.appendChild(outerSlot);

                        const progressVslot = document.createElement("fxs-vslot");
                        outerSlot.appendChild(progressVslot);

                        const leftGradientBox = document.createElement("fxs-vslot");
                        leftGradientBox.classList.add("profile-progress-left", "profile-gradient-box", "profile-hof-civs-left");
                        progressVslot.appendChild(leftGradientBox);

                        leftGradientBox.appendChild(this.createAgeSelector());

                        const scrollable = document.createElement("fxs-scrollable");
                        scrollable.classList.add("profile-hof-civs-left-scrollable", "mx-6");
                        leftGradientBox.appendChild(scrollable);

                        const spatialSlot = document.createElement("fxs-spatial-slot");
                        spatialSlot.classList.add("profile-hof-civ-list", "flex", "flex-row", "flex-wrap");
                        scrollable.appendChild(spatialSlot);

                        const ageParameter = GameSetup.findGameParameter('Age');
                        const ages = [...ageParameter?.domain.possibleValues ?? []];
                        const sortedAges = ages.sort((a, b) => a.sortIndex - b.sortIndex);
                        const startingAge = sortedAges[0].value as string;
                        GameSetup.setGameParameterValue('Age', startingAge);

                        this.insertCivButtons(spatialSlot);

                        const rightGradientBox = document.createElement("div");
                        rightGradientBox.classList.add("profile-progress-left", "ml-24");
                        outerSlot.appendChild(rightGradientBox);

                        const rightScrollable = document.createElement("fxs-scrollable");
                        rightScrollable.classList.add("profile-progress-left-scrollable");
                        rightGradientBox.appendChild(rightScrollable);

                        const rightVSlot = document.createElement("fxs-vslot");
                        rightScrollable.appendChild(rightVSlot);

                        rightVSlot.insertAdjacentHTML('afterbegin', `
                            <div class="font-title-lg font-accent-1 text-center">Victories</div>
                            <div class="w-32 h-4 bg-cover bg-no-repeat filigree-shell-small self-center"></div>
                            <div class="font-title-lg font-accent-1 text-center profile-hof-civ-name" data-l10n-id="${this.civData[0].name}"></div>
                            <div class="font-body-base font-primary-1 text-center profile-hof-times-used">Times Used: 4</div>
                            <div class="font-body-base font-primary-1 text-center profile-hof-times-used">Total Victories: 12</div>
                        `);

                        const innerFrame = document.createElement("fxs-inner-frame");
                        innerFrame.classList.add("profile-hof-leader-victory-list");
                        rightVSlot.insertAdjacentElement('beforeend', innerFrame);

                        const topSpacer = document.createElement("div");
                        topSpacer.classList.add("mt-4");
                        innerFrame.insertAdjacentElement('beforeend', topSpacer);

                        for (let i: number = 0; i < victoryItems.length; i++) {
                            this.populateHOFLeaderVictory(innerFrame, victoryItems[i]);
                        }

                        innerFrame.insertAdjacentHTML('beforeend', `<div class="h-2 w-full"></div>`);
                    }
                    break;

                case "history":
                    {
                        const header = document.createElement("div");
                        header.classList.add("w-full", "mt-16", "h-6");
                        header.innerHTML = `
                            <fxs-hslot class="w-full">
                                <div class="profile-hof-history-gamecol font-body-sm text-body text-center" data-l10n-id="LOC_PROFILE_GAME"></div>
                                <div class="profile-hof-history-portraitcol self-center"></div>
                                <div class="profile-hof-history-civiconcol ml-6"></div>
                                <div class="profile-hof-history-leadercivcol ml-8"></div>
                                <div class="profile-hof-history-scorecol font-body-sm text-body text-right" data-l10n-id="LOC_GENERIC_SCORE"></div>
                                <div class="profile-hof-history-agecol ml-16"></div>
                                <div class="w-18 font-body-sm text-body text-right" data-l10n-id="LOC_PROFILE_GENERIC_TURNS"></div>
                            </fxs-hslot>
                        `;
                        innerVslot.appendChild(header);

                        const scrollable = document.createElement("fxs-scrollable");
                        scrollable.classList.add("profile-hof-history-scrollable");
                        innerVslot.appendChild(scrollable);

                        const innerFrame = document.createElement("fxs-inner-frame");
                        innerFrame.classList.add("profile-hof-history-inner-frame", "w-full");
                        scrollable.appendChild(innerFrame);

                        const topSpacer = document.createElement("div");
                        topSpacer.classList.add("h-6", "w-full");
                        innerFrame.appendChild(topSpacer);

                        for (const item of historyItems) {
                            innerFrame.appendChild(this.createHistoryCard(item));

                            const divHslot = document.createElement("fxs-hslot");
                            divHslot.classList.add("w-full");

                            const leftHalf = document.createElement("div");
                            leftHalf.classList.add("w-1\\/2", "h-5", "bg-cover", "bg-no-repeat", "profile-full-divider");
                            divHslot.appendChild(leftHalf);

                            const rightHalf = document.createElement("div");
                            rightHalf.classList.add("w-1\\/2", "h-5", "bg-cover", "bg-no-repeat", "-scale-x-100", "profile-full-divider");
                            divHslot.appendChild(rightHalf);
                            innerFrame.appendChild(divHslot);
                        }
                    }
                    break;
            }

            statsContainer.appendChild(innerVslot);
            statsSlotGroup.appendChild(statsContainer);
        });

        hofTabControl.setAttribute("tab-items", JSON.stringify(hofItems));
        hofTabControl.addEventListener("tab-selected", (e: TabSelectedEvent) => {
            this.currentHOFGroup = hofItems[e.detail.index].id;
            this.generalNavTrayUpdate();
            this.updateProfile();
            if (this.currentHOFGroup == "general") {
                NavTray.addOrUpdateShellAction1("LOC_PROFILE_HOF_DIFFICULTY_HELP");
                NavTray.addOrUpdateShellAction2("LOC_PROFILE_HOF_SPEED_HELP");
            }
            statsSlotGroup.setAttribute('selected-slot', this.currentHOFGroup);
            e.stopPropagation();
        });
    }

    private onClickedHOFDiffUp(_event: ActionActivateEvent) {
        if ((this.difficultyFilter + 1) < DifficultyFilterType.TOTAL) {
            this.difficultyFilter++;
            this.refreshHOFGeneral();
        }
    }

    private onClickedHOFDiffDown(_event: ActionActivateEvent) {
        if (this.difficultyFilter > 0) {
            this.difficultyFilter--;
            this.refreshHOFGeneral();
        }
    }

    private onClickedHOFSpeedUp(_event: ActionActivateEvent) {
        if ((this.speedFilter + 1) < SpeedFilterType.TOTAL) {
            this.speedFilter++;
            this.refreshHOFGeneral();
        }
    }

    private onClickedHOFSpeedDown(_event: ActionActivateEvent) {
        if (this.speedFilter > 0) {
            this.speedFilter--;
            this.refreshHOFGeneral();
        }
    }

    private refreshHOFGeneral() {
        const generalScrollable = MustGetElement(".profile-hof-general-scrollable-content");
        const diffSortName = MustGetElement(".profile-hof-left-sort-text");
        const speedSortName = MustGetElement(".profile-hof-right-sort-text");

        diffSortName.innerHTML = Locale.compose("LOC_PROFILE_DIFFICULTY", difficultyFilterNames[this.difficultyFilter]);
        speedSortName.innerHTML = Locale.compose("LOC_PROFILE_GAME_SPEED", speedFilterNames[this.speedFilter]);

        console.log(`speed sort is ${speedFilterNames[this.speedFilter]}`);

        generalScrollable.innerHTML = "";

        generalScrollable.insertAdjacentHTML('afterbegin', `
            <div class="font-title-2xl text-center text-accent-1" data-l10n-id="LOC_PROFILE_COMPLETION"></div>
            <div class="w-32 h-4 bg-cover bg-no-repeat filigree-shell-small self-center"></div>
        `);

        this.populateHOFCompletions(generalScrollable);

        generalScrollable.insertAdjacentHTML('beforeend', `
            <div class="font-title-2xl text-center text-accent-1" data-l10n-id="LOC_PROFILE_VICTORIES"></div>
            <div class="w-32 h-4 bg-cover bg-no-repeat filigree-shell-small self-center"></div>
        `);

        this.populateHOFVictories(generalScrollable);
    }

    private getAgeSelectorBgName(ageId: string) {
        return `url("fs://game/${ageId.toLowerCase().replace("age_", "shell_")}-select.png")`;
    }

    private createAgeSelector() {
        const ageParameter = GameSetup.findGameParameter('Age');
        const ages = [...ageParameter?.domain.possibleValues ?? []];
        const sortedAges = ages.sort((a, b) => a.sortIndex - b.sortIndex);
        const ageItems: OrnateDropdownItem[] = [];

        const ageSelector = document.createElement('fxs-selector-ornate');
        ageSelector.classList.add('mx-6', "mt-12", "pointer-events-auto", "profile-hof-age-select");

        let pickFirst: boolean = true;
        for (const [index, age] of sortedAges.entries()) {
            const name = GameSetup.resolveString(age.name) || "";
            const description = GameSetup.resolveString(age.description) || "";
            const ageId = age.value as string;

            if (pickFirst) {
                ageSelector.setAttribute("selected-item-index", index.toString());
                pickFirst = false;
            }

            ageItems.push({ label: name, description: description, image: this.getAgeSelectorBgName(ageId) });
        }

        ageSelector.componentCreatedEvent.on((component) => component.updateSelectorItems(ageItems));

        ageSelector.addEventListener("dropdown-selection-change", (ev) => {
            const selectedAge = sortedAges[ev.detail.selectedIndex].value as string;

            GameSetup.setGameParameterValue('Age', selectedAge);

            const civList = MustGetElement(".profile-hof-civ-list", this.Root);
            civList.innerHTML = "";
            this.insertCivButtons(civList);
        });

        ageSelector.addEventListener("mouseover", this.hofAgeSelectedListener);
        ageSelector.addEventListener("focus", this.hofAgeSelectedListener);
        ageSelector.setAttribute("tabindex", "-1");

        return ageSelector;
    }

    private insertCivButtons(parent: HTMLElement) {

        this.civData = GetCivilizationData();

        for (const civ of this.civData) {
            const civButton = document.createElement("civ-button");
            civButton.classList.add("relative", "m-3", "profile-hof-civ-buttons");
            civButton.setAttribute("tabindex", "-1");
            civButton.addEventListener("mouseover", this.hofCivSelectedListener);
            civButton.addEventListener("focus", this.hofCivSelectedListener);
            civButton.componentCreatedEvent.on(c => c.civData = civ);
            parent.appendChild(civButton);
        }
    }

    private onSelectedHOFCiv(event: Event) {
        this.doHOFCivSelected(event.target as ComponentRoot<CivButton>);
    }

    private doHOFCivSelected(civButton: ComponentRoot<CivButton> | undefined) {
        if (civButton) {
            if (this.selectedHOFCiv != civButton) {
                if (this.selectedHOFCiv) {
                    this.selectedHOFCiv.component.isSelected = false;
                }

                this.selectedHOFCiv?.classList.remove('selected');
                this.selectedHOFCiv = civButton;
                this.selectedHOFCiv.classList.add('selected');
                this.selectedHOFCiv.component.isSelected = true;

                const nameElement = MustGetElement(".profile-hof-civ-name", this.Root);
                const selectedCiv = this.selectedHOFCiv?.maybeComponent?.civData;
                if (selectedCiv) {
                    nameElement.setAttribute("data-l10n-id", selectedCiv.name);
                }
            }
        }
    }

    private onSelectedHOFAge() {
        if (this.selectedHOFCiv) {
            this.selectedHOFCiv?.classList.remove('selected');
            this.selectedHOFCiv = null!;
        }
    }

    private populateHOFCompletions(parent: HTMLElement) {
        let completionNum: number = 0;

        // TODO: Apply the filters.  Currently we don't have the data to do so.

        const innerFrame = document.createElement("fxs-inner-frame");
        innerFrame.classList.add("profile-hof-general-half-inner-frame", "ml-16");

        innerFrame.insertAdjacentHTML('beforeend', `<div class="mt-4"></div>`);

        while (completionNum < completionItems.length) {

            // are there are least 2 items left?
            if (completionItems.length > (completionNum + 1)) {
                innerFrame.insertAdjacentHTML('beforeend', `
                    <fxs-activatable class="w-full profile-hof-general-completion flex flex-row", tabindex="-1">
                        <fxs-hslot class="w-1\\/2 justify-center">
                            <fxs-vslot class="profile-hof-general-half-content">
                                <fxs-hslot class="justify-between">
                                    <div class="font-body-base text-primary-1" data-l10n-id="${completionItems[completionNum].name}"></div>
                                    <div class="font-body-base text-primary-1" data-l10n-id="${completionItems[completionNum].result}"></div>
                                </fxs-hslot>
                            </fxs-vslot>
                        </fxs-hslot>
                        <fxs-hslot class="w-1\\/2 justify-center">
                            <fxs-vslot class="profile-hof-general-half-content">
                                <fxs-hslot class="justify-between">
                                    <div class="font-body-base text-primary-1" data-l10n-id="${completionItems[completionNum + 1].name}"></div>
                                    <div class="font-body-base text-primary-1" data-l10n-id="${completionItems[completionNum + 1].result}"></div>
                                </fxs-hslot>
                            </fxs-vslot>
                        </fxs-hslot>
                    </fxs-activatable>
                    <fxs-hslot>
                        <div class="w-1\\/4 h-5 bg-cover bg-no-repeat profile-half-divider"></div>
                        <div class="w-1\\/4 h-5 bg-cover bg-no-repeat profile-half-divider -scale-x-100""></div>
                        <div class="w-1\\/4 h-5 bg-cover bg-no-repeat profile-half-divider"></div>
                        <div class="w-1\\/4 h-5 bg-cover bg-no-repeat profile-half-divider -scale-x-100"></div>
                    </fxs-hslot>
                `);
                completionNum += 2;
            } else {
                innerFrame.insertAdjacentHTML('beforeend', `
                    <fxs-activatable class="w-full profile-hof-general-completion flex flex-row", tabindex="-1">
                        <fxs-hslot class="w-1\\/2 justify-center">
                            <fxs-vslot class="profile-hof-general-half-content">
                                <fxs-hslot class="justify-between">
                                    <div class="font-body-base text-primary-1" data-l10n-id="${completionItems[completionNum].name}"></div>
                                    <div class="font-body-base text-primary-1" data-l10n-id="${completionItems[completionNum].result}"></div>
                                </fxs-hslot>
                            </fxs-vslot>
                        </fxs-hslot>
                    </fxs-activatable>
                    <fxs-hslot>
                        <div class="w-1\\/2 h-5 bg-cover bg-no-repeat profile-half-divider"></div>
                        <div class="w-1\\/2 h-5 bg-cover bg-no-repeat profile-half-divider -scale-x-100"></div>
                    </fxs-hslot>
                `);
                completionNum++;
            }
        }

        // pad out the bottom so there's more even visual spacing
        innerFrame.insertAdjacentHTML('beforeend', `<div class="h-2 w-full"></div>`);

        parent.appendChild(innerFrame);
    }

    private populateHOFVictories(parent: HTMLElement) {
        let victoryNum: number = 0;

        // TODO: Apply the filters.  Currently we don't have the data to do so.

        const innerFrame = document.createElement("fxs-inner-frame");
        innerFrame.classList.add("profile-hof-general-half-inner-frame", "ml-16");

        while (victoryNum < victoryItems.length) {
            const placeString = Locale.stylize("LOC_UI_ORDINAL_" + victoryItems[victoryNum].place.toString());
            const turnsString = Locale.stylize("LOC_PROFILE_TURNS", victoryItems[victoryNum].turns);

            innerFrame.insertAdjacentHTML('beforeend', `
                    <fxs-activatable class="profile-hof-general-full-outer h-32 w-full justify-around flex flex-row" tabindex="-1">
                        <progression-portrait class="profile-hof-general-portrait w-24 h-24" portrait-level="base" data-leader-id="${victoryItems[victoryNum].leaderID}"></progression-portrait>
                        <div class="profile-hof-general-icon w-24 h-14 bg-contain bg-no-repeat self-center" style="background-image: url('fs://game/egypt_icon.png')"></div>
                        <fxs-vslot class="profile-hof-general-nameplace w-200 mt-8">
                            <div class="font-body-base text-primary-1" data-l10n-id="${victoryItems[victoryNum].name}"></div>
                            <div class="font-body-base text-primary-1">${placeString}</div>
                        </fxs-vslot>
                        <div class="profile-hof-general-turns font-body-base text-primary-1 w-48 mt-10">${turnsString}</div>
                        <div class="profile-hof-general-date font-body-base text-primary-1 w-48 mt-10" data-l10n-id="${victoryItems[victoryNum].date}"></div>
                    </fxs-activatable>
                    <fxs-hslot>
                        <div class="w-1\\/2 h-5 bg-cover bg-no-repeat profile-full-divider"></div>
                        <div class="w-1\\/2 h-5 bg-cover bg-no-repeat profile-full-divider -scale-x-100"></div>
                    </fxs-hslot>
            `);
            victoryNum++;
        }

        innerFrame.insertAdjacentHTML('beforeend', `<div class="h-2 w-full"></div>`);

        parent.appendChild(innerFrame);
    }

    private onClickedHOFLeader(event: ActionActivateEvent) {
        const target = event.target as HTMLElement;

        const previousSelection = MustGetElement(".profile-hof-leader-button-selected", this.Root);
        previousSelection.classList.remove("profile-leader-button-selected", "profile-hof-leader-button-selected");
        target.classList.add("profile-leader-button-selected", "profile-hof-leader-button-selected");

        const leaderLoc = target.getAttribute("data-leader-locname");
        const leaderName = MustGetElement(".profile-hof-leader-name", this.Root);
        if (leaderLoc) {
            leaderName.setAttribute("data-l10n-id", leaderLoc);
        }

        const victoryList = MustGetElement(".profile-hof-leader-victory-list", this.Root);
        victoryList.innerHTML = "";

        const topSpacer = document.createElement("div");
        topSpacer.classList.add("mt-4");
        victoryList.insertAdjacentElement('beforeend', topSpacer);

        for (let i: number = 0; i < victoryItems.length; i++) {
            this.populateHOFLeaderVictory(victoryList, victoryItems[i]);
        }

        victoryList.insertAdjacentHTML('beforeend', `<div class="h-2 w-full"></div>`);
    }

    private populateHOFLeaderVictory(parent: HTMLElement, victory: VictoryItem) {
        const statItem = document.createElement("fxs-activatable");
        statItem.classList.add("w-full", "profile-hof-general-completion", "flex", "flex-row");
        statItem.setAttribute("tabindex", "-1");
        statItem.innerHTML = `
            <fxs-hslot class="ml-10 w-full">
                <fxs-vslot class="profile-hof-general-half-content w=full">
                    <fxs-hslot class="justify-between w-full">
                        <div class="font-body-base text-primary-1" data-l10n-id="${victory.name}"></div>
                        <div class="font-body-base text-primary-1" data-l10n-id="${victory.turns}"></div>
                    </fxs-hslot>
                    <fxs-hslot>
                        <div class="w-1\\/2 h-5 bg-cover bg-no-repeat profile-half-divider"></div>
                        <div class="w-1\\/2 h-5 bg-cover bg-no-repeat profile-half-divider -scale-x-100"></div>
                    </fxs-hslot>
                </fxs-vslot>
            </fxs-hslot>
        `;
        parent.insertAdjacentElement('beforeend', statItem);
    }

    private createHistoryCard(item: HistoryItem): DocumentFragment {
        const fragment = document.createDocumentFragment();

        const itemCard = document.createElement("fxs-activatable");
        itemCard.classList.add("profile-hof-history-card", "w-full", "h-32");
        itemCard.setAttribute("tabindex", "-1");

        itemCard.innerHTML = `
            <fxs-hslot class="w-full">
                <div class="profile-hof-history-gamecol self-center font-body-sm text-body text-center" data-l10n-id="${item.game}"></div>
                <progression-portrait class="profile-hof-history-portraitcol h-24 self-center" portrait-level="base" data-leader-id="LEADER_AMINA"></progression-portrait>
                <div class="profile-hof-history-civiconcol h-14 ml-6 self-center bg-contain bg-no-repeat" style="background-image: url('fs://game/${item.civIconURL}.png')"></div>
                <fxs-vslot class="profile-hof-history-leadercivcol ml-8 self-center">
                    <div class="font-title-sm text-header-4" data-l10n-id="${item.leader}"></div>
                    <div class="font-body-sm text-body" data-l10n-id="${item.civilization}"></div>
                </fxs-vslot>
                <div class="w-18 self-center font-body-sm text-body text-right" data-l10n-id="${item.score.toString()}"></div>
                <fxs-vslot class="profile-hof-history-agecol ml-16 self-center">
                    <div class="font-title-sm text-header-4" data-l10n-id="${item.era}"></div>
                    <div class="font-body-sm text-body" data-l10n-id="${item.startType}"></div>
                </fxs-vslot>
                <div class="w-18 self-center font-body-sm text-body text-right" data-l10n-id="${item.turns.toString()}"></div>
                <fxs-vslot class="w-20 ml-16 self-center">
                    <div class="font-title-sm text-header-4" data-l10n-id="${item.outcome}"></div>
                </fxs-vslot>
                <div class="profile-hof-history-datecol self-center font-body-sm text-body text-right" data-l10n-id="${item.date}"></div>
            </fxs-hslot>
        `;

        fragment.appendChild(itemCard);

        return fragment;
    }
*/
    setupLeaderboardUI(frag) {
        const outerVslot = document.createElement("fxs-vslot");
        outerVslot.classList.add("profile-leaderboards-outer-vslot");
        const controlStrip = document.createElement("fxs-hslot");
        controlStrip.classList.add("profile-leaderboards-control-strip");
        controlStrip.removeAttribute("tabindex");
        const eventDropdown = document.createElement("fxs-dropdown");
        eventDropdown.setAttribute("optionID", "events");
        eventDropdown.setAttribute("dropdown-items", JSON.stringify(this.eventItems));
        const currentLiveEvent = "LOC_" + Online.LiveEvent.getCurrentLiveEvent();
        const currentLiveEvnetIndex = this.getIndexByEventName(currentLiveEvent).toString();
        eventDropdown.setAttribute("selected-item-index", currentLiveEvnetIndex);
        controlStrip.appendChild(eventDropdown);
        const componentRoot = eventDropdown;
        waitUntilValue(() => componentRoot.maybeComponent).then((component) => {
            component.Root.addEventListener(DropdownSelectionChangeEventName, (event) => {
                const index = event.detail.selectedIndex;
                Online.Leaderboard.fetchByLeaderboardID(this.eventItems[index].id, false); //MMG_TODO: Eventually need to be true (fetch with player score). False for now due to a DCL bug returning 404
                this.updateLeaderboardContent(this.eventItems[index].id);
            });
        });
        outerVslot.appendChild(controlStrip);
        const header = this.createLeaderboardHeader();
        outerVslot.appendChild(header);
        const userArea = document.createElement("div");
        userArea.classList.add("profile-leaderboards-user");
        outerVslot.appendChild(userArea);
        const scrollable = document.createElement("fxs-scrollable");
        scrollable.setAttribute("attached-scrollbar", "true");
        scrollable.classList.add("flex-auto");
        const scrollVslot = document.createElement("fxs-vslot");
        scrollVslot.classList.add("profile-leaderboards-scrollable-vslot");
        scrollable.appendChild(scrollVslot);
        outerVslot.appendChild(scrollable);
        frag.appendChild(outerVslot);
    }
    setupChallengeUI(frag) {
        const challengeOuter = document.createElement("fxs-slot");
        challengeOuter.classList.add("profile-challenges-outer", "pt-8", "flex-auto", "size-full");
        challengeOuter.setAttribute("tabindex", "-1");
        const outerVSlot = document.createElement("fxs-vslot");
        outerVSlot.classList.add("w-full", "flex-auto");
        const challengesTabControl = document.createElement("fxs-tab-bar");
        challengesTabControl.classList.add("w-full", "mx-4", "self-center");
        challengesTabControl.setAttribute("tab-for", "fxs-vslot");
        if (!this.onlyChallenges) {
            challengesTabControl.setAttribute("alt-controls", "true");
        }
        this.challengesSlotGroup = document.createElement("fxs-slot-group");
        this.challengesSlotGroup.classList.add("profile-challenges-slot-group", "relative", "flex-auto");
        var totalChallenges = 0;
        var totalCompletedChallenges = 0;
        this.challengeGroups.forEach(item => {
            this.challengeTabItems.push({ label: Locale.compose(item.name), id: item.name, className: "m-2" });
            totalChallenges += item.totalChallenges;
            totalCompletedChallenges += item.completion;
        });
        if (this.challengeTabItems.length > 0) {
            this.currentChallengeGroup = this.challengeTabItems[0].id;
        }
        this.buildChallengesContainer();
        challengesTabControl.setAttribute("tab-items", JSON.stringify(this.challengeTabItems));
        challengesTabControl.addEventListener("tab-selected", this.challengeTabSelectedListener);
        const challengeControlBar = document.createElement("fxs-hslot");
        challengeControlBar.classList.add("profile-challenges-control-bar", "justify-between", "self-center");
        let completionText = "";
        if (this.challengeTabItems.length > 0) {
            const slotId = this.challengeTabItems[0].id;
            const slotItem = this.challengeGroups.find(x => x.name == slotId);
            if (slotItem) {
                completionText = Locale.stylize("LOC_PROFILE_NUMBER_COMPLETE", slotItem.completion, slotItem.totalChallenges);
            }
        }
        const leftScrollableContainer = document.createElement("div");
        leftScrollableContainer.classList.add("profile-challenges-left-scrollable-container");
        leftScrollableContainer.innerHTML = `
			<p class="profile-challenges-left-completion font-body text-base text-accent-1 self-center top-3 mt-4">${completionText}</p>
		`;
        challengeControlBar.appendChild(leftScrollableContainer);
        const rightScrollableContainer = document.createElement("div");
        challengeControlBar.appendChild(rightScrollableContainer);
        this.challengeSortHslot.setAttribute('data-navrule-down', 'stop');
        this.challengeSortHslot.setAttribute('data-navrule-up', 'stop');
        this.challengeSortHslot.classList.add("relative", "self-center");
        rightScrollableContainer.appendChild(this.challengeSortHslot);
        const leftSort = document.createElement("fxs-activatable");
        leftSort.classList.add("profile-challenges-sort-arrow", "profile-challenges-sort-left", "img-arrow", "w-8", "h-12", "pointer-events-auto");
        leftSort.setAttribute("data-audio-group-ref", "audio-pager");
        leftSort.addEventListener("action-activate", this.challengeSortLeftListener);
        this.challengeSortHslot.appendChild(leftSort);
        const sortText = document.createElement("p");
        sortText.classList.add("profile-challenges-sort-text", "font-body", "text-base", "text-accent-1", "self-center");
        sortText.setAttribute("tabindex", "-1");
        sortText.setAttribute("data-l10n-id", this.sortTextLocale[this.currentSortType]);
        this.challengeSortHslot.appendChild(sortText);
        const rightSort = document.createElement("fxs-activatable");
        rightSort.setAttribute("data-audio-group-ref", "audio-pager");
        rightSort.classList.add("profile-challenges-sort-arrow", "profile-challenges-sort-left", "img-arrow", "w-8", "h-12", "pointer-events-auto", "-scale-x-100");
        rightSort.addEventListener("action-activate", this.challengeSortRightListener);
        this.challengeSortHslot.appendChild(rightSort);
        const tabControlContainer = document.createElement("div");
        tabControlContainer.classList.add("w-full", "px-10");
        tabControlContainer.appendChild(challengesTabControl);
        outerVSlot.appendChild(tabControlContainer);
        outerVSlot.appendChild(challengeControlBar);
        if (this.challengesSlotGroup) {
            outerVSlot.appendChild(this.challengesSlotGroup);
        }
        challengeOuter.appendChild(outerVSlot);
        frag.appendChild(challengeOuter);
    }
    challengeSortLeft() {
        this.setChallengeSortType(Math.abs(this.currentSortType - 1) % CurrentSortType.TOTAL);
    }
    challengeSortRight() {
        this.setChallengeSortType((this.currentSortType + 1) % CurrentSortType.TOTAL);
    }
    setChallengeSortType(newSortType) {
        const sortText = MustGetElement(".profile-challenges-sort-text", this.Root);
        this.currentSortType = newSortType;
        sortText.setAttribute("data-l10n-id", this.sortTextLocale[this.currentSortType]);
        this.buildCurrentChallengeToShowList();
        waitForLayout(() => FocusManager.setFocus(this.challengeSortHslot));
    }
    onChallengeTabSelected(e) {
        const slotId = this.challengeTabItems[e.detail.index].id;
        const slotLabel = this.challengeTabItems[e.detail.index].label;
        const slotItem = this.challengeGroups.find(x => x.name == slotId);
        const leftCompletion = MustGetElement(".profile-challenges-left-completion", this.Root);
        this.buildChallengesContainer();
        this.challengesSlotGroup?.setAttribute('selected-slot', slotId);
        this.currentChallengeGroup = slotId;
        if (slotItem && slotLabel) {
            leftCompletion.innerHTML = Locale.compose("LOC_PROFILE_NUMBER_COMPLETE", slotItem.completion, slotItem.totalChallenges);
        }
        ;
        this.updateProfile();
        e.stopPropagation();
    }
    onChallengeCategorySelected(clickEvent) {
        if (clickEvent.target) {
            const title = clickEvent.target;
            let categoryName = title.getAttribute('data-category-name');
            let groupName = this.challengeGroups.find(group => group.name == this.currentChallengeGroup);
            if (groupName) {
                const RightColumItems = MustGetElements(".profile-challenges-rcitem-outer", this.Root);
                for (let item = 0; item < RightColumItems.length; item++) {
                    RightColumItems[item].remove();
                }
                let selectedChallengeLists = groupName.categories.find(category => category.name == categoryName);
                if (selectedChallengeLists) {
                    this.currentChallengesToShow = selectedChallengeLists.challenges;
                    this.buildCurrentChallengeToShowList();
                }
            }
        }
    }
    createContents() {
        if (UI.isInShell() && !ScreenProfilePageExternalStatus.isGameCreationDomainInitialized && !Configuration.getGame().isNetworkMultiplayer) {
            // Reset game setup to force a leader domain update, while in shell where mods can be enabled/disabled
            Configuration.editGame()?.reset(GameModeTypes.SINGLEPLAYER);
            GameSetup.setPlayerParameterValue(GameContext.localPlayerID, 'PlayerLeader', "RANDOM");
        }
        legendPathItems = [];
        Online.Metaprogression.getLegendPathsData().forEach(item => {
            const progressItem = {
                progressItemType: item.legendPathType,
                mainTitleLoc: item.legendPathLoc,
                currentLevel: item.currentLevel,
                currentXP: item.currentXp,
                nextLevelXP: item.nextLevelXp,
                prevLevelXP: item.prevLevelXp,
                maxLevel: item.maxLevel,
                rewards: [],
                leaderId: item.leaderTypeName
            };
            if (item.rewards && item.rewards.length > 0) {
                progressItem.rewards = item.rewards;
            }
            legendPathItems.push(progressItem);
        });
        if (Network.supportsSSO()) {
            Online.Leaderboard.fetchActiveEventLeaderboard();
            this.populateLeaderboardDropDownList();
            // Build Challenge groups and lists
            this.challengeGroups = [];
            for (const challengeClassValue in ChallengeClass) {
                if (isNaN(Number(challengeClassValue))) { // Check if enum value is not a number (to avoid iterating over reverse mappings)
                    const challengeClass = ChallengeClass[challengeClassValue];
                    const categories = [];
                    // Push the ChallengeGroup object for current challengeClass
                    this.challengeGroups.push({
                        class: challengeClass,
                        name: Locale.compose(`LOC_METAPROGRESSION_${challengeClassValue}`),
                        completion: 0,
                        totalChallenges: 0,
                        categories: categories
                    });
                }
            }
            // Get Challenge data from C++
            Online.Metaprogression.getChallengeData().forEach(item => {
                var challengeItem = {
                    dnaID: item.dnaID,
                    name: item.name,
                    description: item.description,
                    completed: item.completed,
                    xp: item.xp,
                    difficulty: item.difficulty,
                    sortIndex: item.sortIndex,
                    hidden: item.hidden,
                    rewardURL: item.rewardURL,
                    challengeClass: item.challengeClass,
                    challengeCategory: item.challengeCategory,
                    maxCompletions: item.maxCompletions,
                    numOfCompletions: item.numOfCompletions
                };
                if (!challengeItem.hidden) {
                    this.addChallenge(challengeItem);
                }
            });
            // Sort the categories of all challenge classes by their index
            for (const item of this.challengeGroups) {
                this.sortChallengeCategories(item);
            }
        }
        this.Root.addEventListener('engine-input', this.engineInputListener);
        this.Root.addEventListener('navigate-input', this.navigationInputListener);
        const tabContainer = MustGetElement('.profile-tab-container', this.Root);
        const tabControlWrapper = document.createElement('div');
        tabControlWrapper.classList.add('h-16');
        const tabControl = document.createElement("fxs-tab-bar");
        tabControl.classList.add("profile-main-tab", "self-center");
        tabControl.classList.toggle("profile-main-tab-left-shift", !this.isOfflineMemento);
        tabControl.setAttribute("tab-for", "screen-profile-page");
        this.slotGroup = document.createElement("fxs-slot-group");
        this.slotGroup.classList.add("flex-auto");
        const profileItems = [];
        // pushing tab items in order depending on the panel option
        // if panel options are set to either onlyChallenges or onlyLeaderboards, then only push the item corresponding to it
        if (!this.onlyChallenges && !this.onlyLeaderboards) {
            if (this.isOfflineMemento) {
                profileItems.push({ label: "LOC_METAPROGRESSION_PATH_FOUNDATION", id: "progress" });
            }
            else {
                profileItems.push({ label: "LOC_PROFILE_TAB_PROGRESS", id: "progress" });
            }
        }
        if (!this.onlyLeaderboards && Network.supportsSSO()) {
            profileItems.push({ label: "LOC_PROFILE_TAB_CHALLENGES", id: "challenges" });
        }
        if (!this.onlyChallenges && !this.onlyLeaderboards) {
            if (!this.noCustomize) {
                profileItems.push({ label: "LOC_PROFILE_TAB_CUSTOMIZE", id: "customize" });
            }
            /*profileItems.push({ label: "LOC_PROFILE_TAB_HALL_OF_FAME", id: "halloffame" });*/
        }
        // we're disabling leaderboards for now
        if (!this.onlyChallenges && Network.supportsSSO() && Online.Leaderboard.isLeaderboardAvailable()) {
            profileItems.push({ label: "LOC_PROFILE_TAB_LEADERBOARDS", id: "leaderboards" });
        }
        for (const item of profileItems) {
            const container = document.createElement("fxs-slot");
            container.classList.add(item.id, "profile-tab-container", "flex-col", "items-center", "relative", "flex", "size-full", "self-center", "pointer-events-auto");
            container.setAttribute("id", item.id);
            this.slotGroup.appendChild(container);
        }
        tabControl.setAttribute("tab-items", JSON.stringify(profileItems));
        /**
         * Sets up a tab item by populating its content if it's empty.
         * @param selector - The CSS selector for the tab item.
         * @param setupFunc - The function that sets up the content of the tab item.
         */
        const setupTabItem = (selector, setupFunc) => {
            const element = this.Root.querySelector(selector);
            // populate the content if it's empty
            if (element?.childElementCount == 0) {
                const frag = document.createDocumentFragment();
                setupFunc(frag);
                element.appendChild(frag);
            }
        };
        tabControl.addEventListener("tab-selected", (e) => {
            this.currentlySelectedMainTab = profileItems[e.detail.index].id;
            if (!this.isOfflineMemento) {
                const topPlayerCard = MustGetElement(".profile-top-player-card", this.Root);
                topPlayerCard.classList.toggle("hidden", (this.currentlySelectedMainTab == "customize"));
            }
            const slotId = profileItems[e.detail.index].id;
            this.generalNavTrayUpdate();
            Telemetry.sendUIMenuAction({ Menu: TelemetryMenuType.Legends, MenuAction: TelemetryMenuActionType.Select, Item: slotId });
            if (slotId == "leaderboards") {
                setupTabItem("#leaderboards", (frag) => { this.setupLeaderboardUI(frag); });
                // reset the content and the drop-down menu to the active live event 
                const dropDownList = MustGetElement("fxs-dropdown", this.Root);
                const currentLiveEvent = "LOC_" + Online.LiveEvent.getCurrentLiveEvent();
                const currentLiveEvnetIndex = this.getIndexByEventName(currentLiveEvent).toString();
                dropDownList.setAttribute("selected-item-index", currentLiveEvnetIndex);
                this.updateLeaderboardContent(Online.Leaderboard.getActiveEventLeaderboardID());
            }
            else if (slotId == "challenges") {
                setupTabItem("#challenges", (frag) => { this.setupChallengeUI(frag); });
                const currentFocusClassList = FocusManager.getFocus().classList;
                if (currentFocusClassList.contains("profile-challenges-sort-text") ||
                    currentFocusClassList.contains("profile-hof-left-sort-text")) {
                    if (this.challengesSlotGroup) {
                        FocusManager.setFocus(this.challengesSlotGroup);
                    }
                    NavTray.addOrUpdateShellAction2("LOC_PROFILE_CHALLENGE_HELP");
                }
            }
            /*else if (slotId == "halloffame") {
                setupTabItem("#halloffame", (frag) => { this.setupHallOfFameUI(frag) });
            }*/
            else if (this.currentlySelectedMainTab == "customize") {
                setupTabItem("#customize", (frag) => { this.setupCustomizeUI(frag); });
            }
            /** Update the player card on the right side of "customize" panel based on local changes*/
            if (this.currentlySelectedMainTab == "customize") {
                const headerElements = this.Root.querySelectorAll("progression-header");
                const portraits = this.Root.querySelectorAll("progression-portrait");
                this.updateProfile();
                const playerInfo = getPlayerCardInfo(undefined, undefined, true);
                // If there is no leader id available, try loading it from the last saved game
                if (!playerInfo.LeaderID) {
                    playerInfo.LeaderID = this.getLastSaveLeaderID();
                }
                const jsonString = JSON.stringify(playerInfo);
                for (const headerElement of headerElements) {
                    headerElement.setAttribute("data-player-info", jsonString);
                }
                const currentBorder = UnlockableRewardItems.getBorder(playerInfo.PortraitBorder);
                for (const portrait of portraits) {
                    portrait.setAttribute("data-border-url", currentBorder?.url);
                }
            }
            this.slotGroup?.setAttribute('selected-slot', this.currentlySelectedMainTab);
            e.stopPropagation();
        });
        //use macrotask to unblock the UI
        setTimeout(() => {
            if (this.isOfflineMemento) {
                setupTabItem("#progress", (frag) => { this.setupProgressUI(frag); });
            }
            else if (this.onlyChallenges) {
                setupTabItem("#challenges", (frag) => { this.setupChallengeUI(frag); });
            }
            else if (this.onlyLeaderboards) {
                setupTabItem("#leaderboards", (frag) => { this.setupLeaderboardUI(frag); });
            }
            else {
                setupTabItem("#progress", (frag) => { this.setupProgressUI(frag); });
                if (this.focusTab != ProfileTabType.NONE) {
                    const element = this.Root.querySelector("fxs-tab-bar");
                    const focusTab = this.focusTab;
                    element?.setAttribute("selected-tab-index", focusTab.toString());
                }
            }
        });
        if (!this.isOfflineMemento) {
            const progressionCard = document.createElement("progression-header");
            progressionCard.classList.add("absolute", "right-16", "-top-4", "profile-top-player-card");
            progressionCard.setAttribute("player-card-style", "mini");
            progressionCard.setAttribute("data-player-info", JSON.stringify(getPlayerCardInfo()));
            tabContainer.appendChild(progressionCard);
        }
        tabControlWrapper.appendChild(tabControl);
        tabContainer.appendChild(tabControlWrapper);
        tabContainer.appendChild(this.slotGroup);
        FocusManager.setFocus(this.slotGroup);
    }
    getLastSaveLeaderID() {
        const saves = SaveLoadData.saves;
        if (saves && saves.length > 0) {
            const lastSave = saves.reduce((prev, cur) => prev.saveTime > cur.saveTime ? prev : cur, saves[0]);
            return lastSave.leaderIconUrl;
        }
        return "";
    }
    updateLeaderboardContent(leaderboardId) {
        const userArea = MustGetElement(".profile-leaderboards-user", this.Root);
        const scrollable = MustGetElement(".profile-leaderboards-scrollable-vslot", this.Root);
        // clear the user data
        while (userArea.childNodes.length > 0) {
            userArea.removeChild(userArea.childNodes[0]);
        }
        // clear any existing nodes in the scroll region
        while (scrollable.childNodes.length > 0) {
            scrollable.removeChild(scrollable.childNodes[0]);
        }
        /** Get leaderboard data of the active event */
        const entries = Online.Leaderboard.getLeaderboardEntriesByID(leaderboardId);
        const leaderboardItems = [];
        // The local user, who is always displayed on top
        const playerEntry = Online.Leaderboard.getUserLeaderboardEntryByID(leaderboardId);
        // See if leaderboard is the same as currently playing the live event 
        const isCurrentlyPlayingLiveEvent = Online.Metaprogression.isPlayingActiveEvent() && leaderboardId == Online.Leaderboard.getActiveEventLeaderboardID();
        const userItem = { place: playerEntry.playerRanking, name: playerEntry.playerName, title: "Example Data", score: parseInt(playerEntry.playerScore), date: playerEntry.playerAchievedTime, leader: playerEntry.playerLeaderName, civilization: playerEntry.playerCivilizationName };
        const userEntry = this.createLeaderboard(userItem, isCurrentlyPlayingLiveEvent);
        userArea.appendChild(userEntry);
        let currentLeaderboardPlace = 1;
        /** Process retrieved leaderboard data */
        for (const entry of entries) {
            // Everyone else goes in the scroll area
            const currentPlayerName = entry.playerName;
            const currentPlayerScore = entry.playerScore;
            const tempItem = { place: entry.playerRanking, name: currentPlayerName, title: "Haunted Hollow", score: parseInt(currentPlayerScore), date: entry.playerAchievedTime, leader: entry.playerLeaderName, civilization: entry.playerCivilizationName };
            leaderboardItems.push(tempItem);
            currentLeaderboardPlace++;
        }
        /** Populate leaderboard items from data */
        leaderboardItems.forEach(item => {
            const leaderboard = this.createLeaderboard(item, isCurrentlyPlayingLiveEvent);
            scrollable.appendChild(leaderboard);
        });
    }
    addChallenge(item) {
        const showUnownedContent = Configuration.getUser().showUnownedContent;
        const playerParameter = GameSetup.findPlayerParameter(GameContext.localPlayerID, 'PlayerLeader');
        this.challengeGroups.forEach(group => {
            if (group.class == item.challengeClass) {
                let found = false;
                let challengeCompleted = item.completed ? 1 : 0;
                group.completion += challengeCompleted;
                group.totalChallenges += 1;
                for (let i = 0; i < group.categories.length; i++) {
                    let categoryItem = group.categories[i];
                    if (categoryItem.category == item.challengeCategory) {
                        found = true;
                        group.categories[i].challenges.push(item);
                        group.categories[i].completion += challengeCompleted;
                        break;
                    }
                }
                if (!found) {
                    const categoryData = Online.Metaprogression.getChallengeCategoryData(item.challengeCategory);
                    let categoryLoc = categoryData.locName;
                    // Leader category values have a different prefix that can be found in "LeaderText.xml"
                    let leaderId = "";
                    var addChallenge = true;
                    if (item.challengeClass == ChallengeClass.CHALLENGE_CLASS_LEADER) {
                        leaderId = categoryData.id.slice(19); // strip "CHALLENGE_CATEGORY_".
                        if (!showUnownedContent && playerParameter && playerParameter.domain.possibleValues) {
                            const match = playerParameter.domain.possibleValues.find(l => l.value?.toString() == leaderId);
                            if (match && match.invalidReason == GameSetupDomainValueInvalidReason.NotValidOwnership) {
                                addChallenge = false;
                                group.totalChallenges -= 1;
                            }
                        }
                    }
                    if (addChallenge) {
                        group.categories.push({
                            url: categoryData.iconUrl,
                            category: item.challengeCategory,
                            name: Locale.compose(categoryLoc),
                            leaderId: leaderId,
                            completion: challengeCompleted,
                            challenges: [item]
                        });
                    }
                }
            }
        });
    }
    getFoundationLevel() {
        const legendPath = legendPathItems.find(x => x.mainTitleLoc.includes("FOUNDATION"));
        if (legendPath) {
            return legendPath?.currentLevel;
        }
        else {
            console.error("Cannot find foundation legend path.");
            return 1;
        }
    }
    updateProfile() {
        if (this.didChangeUserProfile) {
            updatePlayerProfile({
                BadgeId: this.selectedBadgeId,
                BannerId: this.selectedBannerId,
                TitleLocKey: this.selectedTitleLocKey,
                PortraitBorder: this.selectedPortraitBorder,
                BackgroundColor: this.selectedBackgroundColor,
                LeaderLevel: this.getFoundationLevel(),
            });
        }
    }
    onEngineInput(inputEvent) {
        if (inputEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (inputEvent.isCancelInput()) {
            /** Only populate to cloud when the player closed the "Your Progress" panel*/
            this.updateProfile();
            this.close();
            inputEvent.stopPropagation();
            inputEvent.preventDefault();
        }
        if (this.currentlySelectedMainTab == "customize") {
            if (inputEvent.detail.name == 'sys-menu') {
                this.onClickedMarkAllAsSeen();
            }
        }
        else if (this.currentlySelectedMainTab == "challenges") {
            if (inputEvent.detail.name == 'shell-action-2') {
                let canJump = true;
                if (!FocusManager.getFocus().classList.contains("profile-challenges-sort-text")) {
                    const sortControl = MustGetElement(".profile-challenges-sort-text", this.Root);
                    FocusManager.setFocus(sortControl);
                    NavTray.addOrUpdateShellAction2("LOC_PROFILE_CHALLENGE_RETURN");
                    canJump = false;
                }
                if (canJump && FocusManager.getFocus().classList.contains("profile-challenges-sort-text")) {
                    NavTray.addOrUpdateShellAction2("LOC_PROFILE_CHALLENGE_HELP");
                    if (this.challengesSlotGroup) {
                        FocusManager.setFocus(this.challengesSlotGroup);
                    }
                }
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
            }
        }
        if (this.currentlySelectedMainTab == "halloffame" && this.currentHOFGroup == "general") {
            if (inputEvent.detail.name == 'shell-action-1') {
                if (!FocusManager.getFocus().classList.contains("profile-hof-left-sort-text")) {
                    const sortControl = MustGetElement(".profile-hof-left-sort-text", this.Root);
                    FocusManager.setFocus(sortControl);
                }
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
            }
            else if (inputEvent.detail.name == 'shell-action-2') {
                if (!FocusManager.getFocus().classList.contains("profile-hof-right-sort-text")) {
                    const sortControl = MustGetElement(".profile-hof-right-sort-text", this.Root);
                    NavTray.addOrUpdateShellAction2("LOC_PROFILE_CHALLENGE_RETURN");
                    FocusManager.setFocus(sortControl);
                }
                if (FocusManager.getFocus().classList.contains("profile-hof-right-sort-text")) {
                    if (this.challengesSlotGroup) {
                        FocusManager.setFocus(this.challengesSlotGroup);
                    }
                    NavTray.addOrUpdateShellAction2("LOC_PROFILE_CHALLENGE_HELP");
                }
                inputEvent.stopPropagation();
                inputEvent.preventDefault();
            }
        }
    }
    onNavigateInput(navEvent) {
        if (navEvent.detail.status != InputActionStatuses.FINISH) {
            return;
        }
        if (this.currentlySelectedMainTab == "challenges") {
            if (FocusManager.getFocus().classList.contains("profile-challenges-sort-text")) {
                if (navEvent.detail.name == "nav-left") {
                    Audio.playSound("data-audio-activate", "audio-pager");
                    this.challengeSortLeft();
                    navEvent.stopPropagation();
                    navEvent.preventDefault();
                }
                else if (navEvent.detail.name == "nav-right") {
                    Audio.playSound("data-audio-activate", "audio-pager");
                    this.challengeSortRight();
                    navEvent.stopPropagation();
                    navEvent.preventDefault();
                }
            }
        }
        /*
        else if (this.currentlySelectedMainTab == "halloffame" && this.currentHOFGroup == "general") {
            if (navEvent.detail.name == "nav-left") {
                if (FocusManager.getFocus().classList.contains("profile-hof-left-sort-text")) {
                    this.onClickedHOFDiffDown(null!);
                } else {
                    this.onClickedHOFSpeedDown(null!);
                }
                navEvent.stopPropagation();
                navEvent.preventDefault();
            }
            else if (navEvent.detail.name == "nav-right") {
                if (FocusManager.getFocus().classList.contains("profile-hof-left-sort-text")) {
                    this.onClickedHOFDiffUp(null!);
                } else {
                    this.onClickedHOFSpeedUp(null!);
                }
                navEvent.stopPropagation();
                navEvent.preventDefault();
            }
        }
*/
    }
    populateChallengesTab(tab, container, sortChallenges = false) {
        const hslot = document.createElement('fxs-hslot');
        hslot.classList.add('justify-between');
        const leftScrollableContainer = document.createElement('div');
        leftScrollableContainer.classList.add("profile-challenges-left-scrollable-container", "m-2");
        const leftVslot = document.createElement('fxs-vslot');
        leftVslot.setAttribute('data-navrule-up', 'stop');
        const leftScrollable = document.createElement('fxs-scrollable');
        leftScrollable.setAttribute("handle-gamepad-pan", "false");
        leftScrollable.setAttribute("attached-scrollbar", "true");
        leftScrollable.classList.add("flex-auto");
        leftVslot.appendChild(leftScrollable);
        leftScrollableContainer.appendChild(leftVslot);
        hslot.appendChild(leftScrollableContainer);
        const rightScrollableContainer = document.createElement('div');
        rightScrollableContainer.className = 'm-2';
        const rightVslot = document.createElement('fxs-vslot');
        this.challengeRightScrollable = document.createElement('fxs-scrollable');
        this.challengeRightScrollable.componentCreatedEvent.on(scrollable => scrollable.setEngineInputProxy(this.Root));
        this.challengeRightScrollable.setAttribute("attached-scrollbar", "true");
        this.challengeRightScrollable.className = "flex-auto";
        this.challengeRightScrollable.setAttribute("handle-gamepad-pan", "true");
        let isLeader = false;
        for (let category = 0; category < tab.categories.length; category++) {
            const categoryData = tab.categories[category];
            if (categoryData.leaderId != "") {
                isLeader = true;
            }
            const categoryItem = document.createElement('fxs-activatable');
            categoryItem.setAttribute("tabindex", "-1");
            categoryItem.setAttribute("data-audio-group-ref", "profile-screen");
            categoryItem.className = 'profile-challenges-lcitem-outer profile-challenges-item-card profile-customize-title-bg p-2 mb-2 bg-contain bg-no-repeat pointer-events-auto';
            categoryItem.tabIndex = -1;
            categoryItem.setAttribute('data-category-name', categoryData.name);
            const categoryHslot = document.createElement('fxs-hslot');
            categoryHslot.className = 'w-full';
            // Create the content inside the category item
            if (isLeader) {
                const legendPath = legendPathItems.find(x => x.leaderId == tab.categories[category].leaderId);
                const dataLeaderLevel = legendPath?.currentLevel ?? 1;
                const progressionPortrait = document.createElement('progression-portrait');
                progressionPortrait.className = 'w-16 h-16';
                progressionPortrait.setAttribute('portrait-level', 'base');
                progressionPortrait.setAttribute('data-leader-id', legendPath ? legendPath.leaderId : "");
                progressionPortrait.setAttribute('data-border-url', 'fs://game/chal_available.png');
                progressionPortrait.setAttribute('data-leader-level', dataLeaderLevel.toString());
                categoryHslot.appendChild(progressionPortrait);
            }
            else {
                const categoryIcon = document.createElement('div');
                categoryIcon.className = 'profile-challenges-lcitem-icon bg-contain bg-no-repeat w-16 h-16';
                categoryIcon.style.backgroundImage = `url(fs://game/${categoryData.url}.png)`;
                categoryHslot.appendChild(categoryIcon);
            }
            const categoryVslot = document.createElement('fxs-vslot');
            categoryVslot.classList.add("flex-auto");
            const titleDiv = document.createElement('div');
            titleDiv.className = 'font-title-base text-accent-1 uppercase';
            titleDiv.textContent = categoryData.name;
            const completionDiv = document.createElement('div');
            completionDiv.classList.add('font-body-base', 'text-accent-2');
            completionDiv.textContent = `${tab.categories[category].completion} / ${tab.categories[category].challenges.length}`;
            categoryVslot.appendChild(titleDiv);
            categoryVslot.appendChild(completionDiv);
            categoryHslot.appendChild(categoryVslot);
            categoryItem.appendChild(categoryHslot);
            // filter the challenges when the leader was selected
            categoryItem.addEventListener('action-activate', this.challengeLeaderSelectedListener);
            leftScrollable.appendChild(categoryItem);
        }
        let buildCategoriesLength = tab.categories.length;
        if (isLeader) {
            const defaultLeaderIndex = 0;
            if (buildCategoriesLength >= 1 && tab.categories[defaultLeaderIndex].challenges) {
                buildCategoriesLength = 1;
            }
        }
        if (!sortChallenges && buildCategoriesLength > 0) {
            this.currentChallengesToShow = tab.categories[0].challenges;
        }
        else {
            this.currentChallengesToShow = [];
        }
        this.buildCurrentChallengeToShowList();
        rightVslot.appendChild(this.challengeRightScrollable);
        rightScrollableContainer.appendChild(rightVslot);
        hslot.appendChild(rightScrollableContainer);
        container.appendChild(hslot);
    }
    /* Gets the selected challenges to show and builds the list*/
    buildCurrentChallengeToShowList() {
        const scrollableContent = this.challengeRightScrollable?.querySelector(".fxs-scrollable-content");
        if (scrollableContent) {
            scrollableContent.innerHTML = "";
        }
        else if (this.challengeRightScrollable) {
            this.challengeRightScrollable.innerHTML = "";
        }
        // sort before building
        this.sortChallengeList(this.currentChallengesToShow);
        for (let challenge = 0; challenge < this.currentChallengesToShow.length; challenge++) {
            const challengeItem = this.currentChallengesToShow[challenge];
            const isRepeatable = challengeItem.maxCompletions > 1;
            const checkURL = (isRepeatable ? challengeItem.numOfCompletions >= challengeItem.maxCompletions : challengeItem.completed) ? "fs://game/chal_check.png" : "fs://game/chal_available.png";
            const difficultyURL = "fs://game/chal_difficulty_" + challengeItem.difficulty.toString();
            const challengeDiv = document.createElement('p');
            challengeDiv.className = 'profile-challenges-rcitem-outer profile-challenges-item-card profile-customize-title-bg mb-2 mr-2 bg-contain bg-no-repeat pointer-events-auto ';
            challengeDiv.tabIndex = -1;
            const challengeHslot = document.createElement('fxs-hslot');
            challengeHslot.className = 'w-full justify-between';
            const challengeHslotInner = document.createElement('fxs-hslot');
            const checkDiv = document.createElement('div');
            checkDiv.className = 'w-8 h-8 bg-cover self-center mx-2';
            checkDiv.style.backgroundImage = `url('${checkURL}')`;
            const challengeVslot = document.createElement('fxs-vslot');
            challengeVslot.className = 'profile-challenges-rcitem-text p-2';
            const challengeNameDiv = document.createElement('div');
            challengeNameDiv.className = 'font-title-base text-accent-1 uppercase';
            challengeNameDiv.textContent = challengeItem.name;
            const challengeProgressDiv = document.createElement("div");
            challengeProgressDiv.classList.add('profile-challenges-completition-progress', "font-title-base", "tracking-100", "text-secondary", "mt-5");
            challengeProgressDiv.innerHTML = Locale.compose("LOC_PROFILE_CHALLENGE_REPEATABLE_PROGRESS", challengeItem.numOfCompletions, challengeItem.maxCompletions);
            const challengeDescriptionDiv = document.createElement('div');
            challengeDescriptionDiv.className = 'font-body-base text-accent-2';
            challengeDescriptionDiv.textContent = challengeItem.description;
            challengeVslot.appendChild(challengeNameDiv);
            challengeVslot.appendChild(challengeDescriptionDiv);
            if (isRepeatable) {
                challengeVslot.appendChild(challengeProgressDiv);
            }
            challengeHslotInner.appendChild(checkDiv);
            challengeHslotInner.appendChild(challengeVslot);
            const xpDiv = document.createElement('div');
            xpDiv.className = 'font-body-base text-accent-1 text-sm self-center mr-2';
            xpDiv.setAttribute('data-l10n-id', `${Locale.compose("LOC_METAPROGRESSION_XP", challengeItem.xp)}`);
            const difficultyDiv = document.createElement('div');
            difficultyDiv.className = 'w-8 h-8 bg-cover bg-repeat-none self-center';
            difficultyDiv.style.backgroundImage = `url('${difficultyURL}')`;
            const rightHslot = document.createElement('fxs-hslot');
            rightHslot.className = 'mr-2';
            rightHslot.appendChild(xpDiv);
            rightHslot.appendChild(difficultyDiv);
            challengeHslot.appendChild(challengeHslotInner);
            challengeHslot.appendChild(rightHslot);
            challengeDiv.appendChild(challengeHslot);
            this.challengeRightScrollable?.appendChild(challengeDiv);
            if (scrollableContent) {
                scrollableContent.appendChild(challengeDiv);
            }
            else {
                this.challengeRightScrollable?.appendChild(challengeDiv);
            }
        }
    }
    /**
     * Builds the current selected challenge UI cards for the currently selected challenge tab.
     * If sortChallenges is set to true, it will only rebuild the challenge container with the challenges
     * in the current category (useful for refreshing the challenges when sorting)
     */
    buildChallengesContainer(sortChallenges = false) {
        this.challengesContainerList = [];
        for (const item of this.challengeGroups) {
            if (item.name != this.currentChallengeGroup) {
                continue;
            }
            const challengesContainer = document.createElement("fxs-slot");
            challengesContainer.classList.add("profile-customize-tab-container", item.name, "h-full");
            challengesContainer.setAttribute("id", item.name);
            const innerVslot = document.createElement("fxs-vslot");
            innerVslot.classList.add("profile-challenges-inner-vslot", "relative", "flex", "w-full");
            const frame = document.createElement("div");
            frame.classList.add("profile-challenges-frame", "profile-gradient-box", "self-center", "flex-auto");
            this.populateChallengesTab(item, frame, sortChallenges);
            innerVslot.appendChild(frame);
            challengesContainer.appendChild(innerVslot);
            this.challengesSlotGroup?.appendChild(challengesContainer);
            this.challengesContainerList.push(challengesContainer);
        }
        waitForLayout(() => {
            if (this.challengesSlotGroup) {
                FocusManager.setFocus(this.challengesSlotGroup);
            }
        });
    }
    /* Sorts the provided challenge list */
    sortChallengeList(challenges) {
        switch (this.currentSortType) {
            case CurrentSortType.Challenge:
                challenges.sort((a, b) => {
                    if (a.sortIndex < b.sortIndex)
                        return -1;
                    if (a.sortIndex > b.sortIndex)
                        return 1;
                    return 0;
                });
                break;
            case CurrentSortType.Completed:
                challenges.sort((a, b) => {
                    if (a.completed && !b.completed)
                        return -1;
                    if (!a.completed && b.completed)
                        return 1;
                    return 0;
                });
                break;
        }
    }
    sortChallengeCategories(challengeGroup) {
        challengeGroup.categories.sort((a, b) => {
            if (ChallengeCategorySortIndex[a.category] < ChallengeCategorySortIndex[b.category])
                return -1;
            if (ChallengeCategorySortIndex[a.category] > ChallengeCategorySortIndex[b.category])
                return 1;
            return 0;
        });
    }
    createLeaderboardHeader() {
        const fragment = document.createDocumentFragment();
        const outerBox = document.createElement("div");
        outerBox.setAttribute("tabindex", "-1");
        outerBox.classList.add("profile-leaderboard-outer-box");
        const positionBox = document.createElement("fxs-hslot");
        positionBox.classList.add("leaderboard-position-box");
        const posInnerBox = document.createElement("fxs-hslot");
        posInnerBox.classList.add("leaderboard-pos-inner-box");
        const position = document.createElement("div");
        position.classList.add("leaderboard-text", "font-body");
        position.innerHTML = Locale.compose("LOC_GENERIC_POSITION");
        posInnerBox.appendChild(position);
        positionBox.appendChild(posInnerBox);
        outerBox.appendChild(positionBox);
        const nameBox = document.createElement("fxs-hslot");
        nameBox.classList.add("leaderboard-name-box");
        const name = document.createElement("div");
        name.classList.add("leaderboard-text", "font-body");
        name.innerHTML = Locale.compose("LOC_GENERIC_PLAYER_NAME");
        nameBox.appendChild(name);
        outerBox.appendChild(nameBox);
        const scoreBox = document.createElement("fxs-hslot");
        scoreBox.classList.add("leaderboard-score-box");
        const score = document.createElement("div");
        score.classList.add("leaderboard-text", "font-body");
        score.innerHTML = Locale.compose("LOC_GENERIC_SCORE");
        scoreBox.appendChild(score);
        outerBox.appendChild(scoreBox);
        const dateBox = document.createElement("fxs-hslot");
        dateBox.classList.add("leaderboard-date-box");
        const date = document.createElement("div");
        date.classList.add("leaderboard-text", "font-body");
        date.innerHTML = Locale.compose("LOC_GENERIC_DATE");
        dateBox.appendChild(date);
        outerBox.appendChild(dateBox);
        const leaderBox = document.createElement("fxs-hslot");
        leaderBox.classList.add("leaderboard-leader-box");
        const leader = document.createElement("div");
        leader.classList.add("leaderboard-text", "font-body");
        leader.innerHTML = Locale.compose("LOC_GENERIC_LEADER");
        leaderBox.appendChild(leader);
        outerBox.appendChild(leaderBox);
        const civBox = document.createElement("fxs-hslot");
        civBox.classList.add("leaderboard-civ-box");
        const civ = document.createElement("div");
        civ.classList.add("leaderboard-text", "font-body");
        civ.innerHTML = Locale.compose("LOC_GENERIC_CIVILIZATION");
        civBox.appendChild(civ);
        outerBox.appendChild(civBox);
        fragment.appendChild(outerBox);
        return fragment;
    }
    createLeaderboard(item, isCurrentlyPlaying) {
        const fragment = document.createDocumentFragment();
        const outerBox = document.createElement("div");
        outerBox.classList.add("profile-leaderboard-outer-box");
        outerBox.classList.add("profile-leaderboard-outer-box-item");
        outerBox.setAttribute("tabindex", "-1");
        const positionBox = document.createElement("fxs-hslot");
        positionBox.classList.add("leaderboard-position-box");
        const posInnerBox = document.createElement("fxs-hslot");
        posInnerBox.classList.add("leaderboard-pos-inner-box");
        const position = document.createElement("div");
        position.classList.add("leaderboard-text", "font-body");
        if (item.place == 0) {
            position.innerHTML = "-";
        }
        else {
            position.innerHTML = item.place.toString();
        }
        posInnerBox.appendChild(position);
        positionBox.appendChild(posInnerBox);
        outerBox.appendChild(positionBox);
        const nameBox = document.createElement("fxs-hslot");
        nameBox.classList.add("leaderboard-name-box");
        const name = document.createElement("div");
        name.classList.add("leaderboard-name-text", "font-body");
        name.innerHTML = item.name;
        nameBox.appendChild(name);
        outerBox.appendChild(nameBox);
        const scoreBox = document.createElement("fxs-hslot");
        scoreBox.classList.add("leaderboard-score-box");
        const score = document.createElement("div");
        score.classList.add("leaderboard-text", "font-body");
        if (item.score == 0) {
            score.innerHTML = "-";
        }
        else {
            score.innerHTML = item.score.toString();
        }
        scoreBox.appendChild(score);
        outerBox.appendChild(scoreBox);
        const dateBox = document.createElement("fxs-hslot");
        dateBox.classList.add("leaderboard-date-box");
        const date = document.createElement("div");
        date.classList.add("leaderboard-text", "font-body");
        date.innerHTML = item.date;
        dateBox.appendChild(date);
        outerBox.appendChild(dateBox);
        const leaderBox = document.createElement("fxs-hslot");
        leaderBox.classList.add("leaderboard-leader-box");
        const leader = document.createElement("div");
        leader.classList.add("leaderboard-text", "font-body");
        leader.setAttribute("data-l10n-id", item.leader);
        leaderBox.appendChild(leader);
        outerBox.appendChild(leaderBox);
        const civBox = document.createElement("fxs-hslot");
        civBox.classList.add("leaderboard-civ-box");
        const civ = document.createElement("div");
        civ.classList.add("leaderboard-text", "font-body");
        civ.setAttribute("data-l10n-id", item.civilization);
        civBox.appendChild(civ);
        outerBox.appendChild(civBox);
        if (isCurrentlyPlaying) {
            // MMG_TODO: Highlight the current event instead of bolding the text
            name.style.fontWeight = "bold";
            date.style.fontWeight = "bold";
            leader.style.fontWeight = "bold";
            civ.style.fontWeight = "bold";
        }
        fragment.appendChild(outerBox);
        return fragment;
    }
}
Controls.define('screen-profile-page', {
    createInstance: ScreenProfilePage,
    description: 'Profile Page screen.',
    classNames: ['screen-profile-page', 'fullscreen', 'pointer-events-auto'],
    requires: ['civ-button'],
    styles: ['fs://game/core/ui/profile-page/screen-profile-page.css'],
    content: ['fs://game/core/ui/profile-page/screen-profile-page.html'],
    attributes: [],
    tabIndex: -1
});

//# sourceMappingURL=file:///core/ui/profile-page/screen-profile-page.js.map
