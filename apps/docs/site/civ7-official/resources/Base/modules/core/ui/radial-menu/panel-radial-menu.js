/**
 * @file panel-radial-menu.ts
 * @copyright 2024-2025, Firaxis Games
 * @description Gamepad enabled menu that allows radial selections.  Supports multiple-menus via tabs.
 */
import { ActiveDeviceTypeChangedEventName } from '/core/ui/input/action-handler.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEventName, NavigateInputEventName } from '/core/ui/input/input-support.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import Panel from '/core/ui/panel-support.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';
import { Layout } from '/core/ui/utilities/utilities-layout.js';
import PopupSequencer from '/base-standard/ui/popup-sequencer/popup-sequencer.js';
// TODO: rearchitect to remove base-standard dependencies (switch to registration model rather than call model)
import { RaiseDiplomacyEvent } from '/base-standard/ui/diplomacy/diplomacy-events.js';
import DiploRibbonData, { RibbonYieldType } from '/base-standard/ui/diplo-ribbon/model-diplo-ribbon.js';
import ResourceAllocation from '/base-standard/ui/resource-allocation/model-resource-allocation.js';
import GreatWorks from '/base-standard/ui/great-works/model-great-works.js';
import AgeScores from '/base-standard/ui/age-scores/model-age-scores.js';
import TutorialManager from '/base-standard/ui/tutorial/tutorial-manager.js';
import PlayerUnlocks from '/base-standard/ui/unlocks/model-unlocks.js';
export var NavigationType;
(function (NavigationType) {
    NavigationType["NONE"] = "";
    NavigationType["CONTEXT"] = "context";
    NavigationType["DIPLOMACY"] = "diplomacy";
    NavigationType["INTERFACE"] = "interface";
    NavigationType["FOCUS"] = "focus";
})(NavigationType || (NavigationType = {}));
const DEFAULT_RADIAL_MENUS = [
    {
        title: "LOC_UI_RADIAL_MENU_MENU_TITLE",
        items: [
            {
                title: "LOC_UI_RADIAL_MENU_DETAILS_AGE_PROGRESS_TITLE",
                subtitle: "",
                icon1: "RADIAL_VICTORIES",
                icon2: "",
                fgColor: "",
                bgColor: "",
                ratio: 1,
                navigation: {
                    type: NavigationType.CONTEXT,
                    value: () => { return "screen-victory-progress"; }
                },
                tutHidderId: "",
                description: () => {
                    return `
						<div class="font-fit-shrink whitespace-nowrap text-accent-3 mt-6 mb-2 ${window.innerHeight > Layout.pixelsToScreenPixels(720) ? "font-title-xl" : "font-title-lg"}">
							${Locale.compose(Game.maxTurns ? "LOC_UI_RADIAL_MENU_AGE_PROGRESS_TURN_RATIO" : "LOC_UI_RADIAL_MENU_AGE_PROGRESS_TURN", Game.turn, Game.maxTurns)}
						</div>
					`;
                }
            },
            {
                title: "LOC_UI_RADIAL_MENU_DETAILS_TECH_TITLE",
                subtitle: "",
                icon1: "RADIAL_TECH",
                icon2: "",
                fgColor: "",
                bgColor: "",
                ratio: 1,
                navigation: {
                    type: NavigationType.CONTEXT,
                    value: () => { return "screen-tech-tree-chooser"; }
                },
                tutHidderId: "hideTech",
                description: () => {
                    const localPlayerId = GameContext.localPlayerID;
                    const localPlayer = Players.getEverAlive()[localPlayerId];
                    const techs = localPlayer.Techs;
                    const turn = techs?.getTurnsLeft().toString();
                    const techTreeType = techs?.getTreeType();
                    const treeObject = techTreeType ? Game.ProgressionTrees.getTree(localPlayerId, techTreeType) : null;
                    const activeNode = treeObject ? treeObject.nodes[treeObject.activeNodeIndex] : undefined;
                    const nodeData = activeNode ? Game.ProgressionTrees.getNode(localPlayerId, activeNode.nodeType) : null;
                    const nodeInfo = activeNode ? GameInfo.ProgressionTreeNodes.lookup(activeNode.nodeType) : null;
                    const techName = Locale.compose(nodeInfo?.Name ?? "") || undefined;
                    const depthNumeral = Locale.toRomanNumeral((nodeData?.depthUnlocked ?? 0) + 1);
                    const renderHeight = window.innerHeight;
                    if (!turn || !techName) {
                        return "";
                    }
                    return `
						<div class="font-body text-accent-4 max-w-full truncate mt-4 ${renderHeight > 720 ? 'text-sm' : 'text-xs'}" data-l10n-id="LOC_UI_CURRENT_STUDY"></div>
						<div class="font-fit-shrink whitespace-nowrap font-bold text-accent-2 uppercase ${renderHeight > 720 ? 'text-base' : 'text-sm'}">${techName}${depthNumeral ? ` ${depthNumeral}` : ''}</div>
						<div class="flow-row">
							<div class="radial-menu__name-filigree-left"></div>
							<div class="radial-menu__name-filigree-right"></div>
						</div>
						<div class="flow-row items-center mt-2">
							<div class="img-turn-icon w-8 h-8 mr-1"></div>
							<div class="flex-auto">
								<div class="font-body text-accent-4 max-w-full truncate ${renderHeight > 720 ? 'text-base' : 'text-sm'}">${turn}</div>
							</div>
						</div>
					`;
                }
            },
            {
                title: "LOC_UI_RADIAL_MENU_DETAILS_CULTURE_TITLE",
                subtitle: "",
                icon1: "RADIAL_CIVICS",
                icon2: "",
                fgColor: "",
                bgColor: "",
                ratio: 1,
                navigation: {
                    type: NavigationType.CONTEXT,
                    value: () => { return "screen-culture-tree-chooser"; }
                },
                tutHidderId: "hideCulture",
                description: () => {
                    const localPlayerId = GameContext.localPlayerID;
                    const localPlayer = Players.getEverAlive()[localPlayerId];
                    const culture = localPlayer.Culture;
                    const turn = culture?.getTurnsLeft().toString();
                    const cultureTreeType = culture?.getActiveTree();
                    const treeObject = cultureTreeType ? Game.ProgressionTrees.getTree(localPlayerId, cultureTreeType) : null;
                    const activeNode = treeObject ? treeObject.nodes[treeObject.activeNodeIndex] : undefined;
                    const nodeData = activeNode ? Game.ProgressionTrees.getNode(localPlayerId, activeNode.nodeType) : null;
                    const nodeInfo = nodeData ? GameInfo.ProgressionTreeNodes.lookup(nodeData.nodeType) : null;
                    const cultureName = Locale.compose(nodeInfo?.Name ?? "") || undefined;
                    const depthNumeral = Locale.toRomanNumeral((nodeData?.depthUnlocked ?? 0) + 1);
                    const renderHeight = window.innerHeight;
                    if (!turn || !cultureName) {
                        return "";
                    }
                    return `
						<div class="font-body text-accent-4 max-w-full truncate mt-4 ${renderHeight > 720 ? 'text-sm' : 'text-xs'}" data-l10n-id="LOC_UI_CURRENT_STUDY"></div>
						<div class="font-fit-shrink whitespace-nowrap font-bold text-accent-2 uppercase ${renderHeight > 720 ? 'text-base' : 'text-sm'}">${cultureName}${depthNumeral ? ` ${depthNumeral}` : ''}</div>
						<div class="flow-row">
							<div class="radial-menu__name-filigree-left"></div>
							<div class="radial-menu__name-filigree-right"></div>
						</div>
						<div class="flow-row items-center mt-2">
							<div class="img-turn-icon w-8 h-8 mr-1"></div>
							<div class="flex-auto">
								<div class="font-body text-accent-4 max-w-full truncate ${renderHeight > 720 ? 'text-base' : 'text-sm'}">${turn}</div>
							</div>
						</div>
					`;
                }
            },
            {
                title: "LOC_UI_RADIAL_MENU_DETAILS_GOVERNMENT_TITLE",
                subtitle: "",
                icon1: "RADIAL_GOVERNMENT",
                icon2: "",
                fgColor: "",
                bgColor: "",
                ratio: 1,
                navigation: {
                    type: NavigationType.CONTEXT,
                    value: () => { return "screen-policies"; },
                    createsMouseGuard: true
                },
                tutHidderId: "hideCulture",
                description: () => {
                    const localPlayerId = GameContext.localPlayerID;
                    const localPlayer = Players.get(localPlayerId);
                    const localPlayerHappiness = localPlayer?.Happiness;
                    const localPlayerStats = localPlayer?.Stats;
                    const happinessPerTurn = localPlayerStats?.getNetYield(YieldTypes.YIELD_HAPPINESS) ?? -1;
                    const isInGoldenAge = localPlayerHappiness?.isInGoldenAge();
                    const goldenAgeTurnsLeft = localPlayerHappiness?.getGoldenAgeTurnsLeft() ?? 0;
                    const nextGoldenAgeThreshold = localPlayerHappiness?.nextGoldenAgeThreshold ?? -1;
                    const happinessTotal = Math.ceil(localPlayerStats?.getLifetimeYield(YieldTypes.YIELD_HAPPINESS) ?? -1) ?? -1;
                    const turnsToNextGoldenAge = happinessPerTurn !== 0 ? Math.ceil((nextGoldenAgeThreshold - happinessTotal) / happinessPerTurn) : 0;
                    const culture = localPlayer?.Culture;
                    const governmentType = culture?.getGovernmentType();
                    const playerGovernment = governmentType ? GameInfo.Governments.lookup(governmentType) : null;
                    const governmentName = Locale.compose(playerGovernment?.Name ?? "");
                    const renderHeight = window.innerHeight;
                    return `
						<div class="font-body text-accent-4 max-w-full truncate mt-4 ${renderHeight > 720 ? 'text-sm' : 'text-xs'}" data-l10n-id="LOC_UI_RADIAL_MENU_DETAILS_GOVERNMENT_GOVERNMENT"></div>
						<div class="font-fit-shrink whitespace-nowrap font-bold text-accent-2 uppercase ${renderHeight > 720 ? 'text-base' : 'text-sm'}">${governmentName || 'LOC_UI_RADIAL_MENU_DETAILS_GOVERNMENT_GOVERNMENT_NONE'}</div>
						<div class="flow-row">
							<div class="radial-menu__name-filigree-left"></div>
							<div class="radial-menu__name-filigree-right"></div>
						</div>
						${isInGoldenAge || turnsToNextGoldenAge > 0 ? `
							<div class="mt-1 flow-column items-center">
								<div class="font-body text-accent-4 max-w-full truncate ${renderHeight > 720 ? 'text-sm' : 'text-xs'}" data-l10n-id="${isInGoldenAge ? 'LOC_UI_RADIAL_MENU_DETAILS_GOVERNMENT_CURRENT_CELEBRATION' : 'LOC_UI_RADIAL_MENU_DETAILS_GOVERNMENT_NEXT_CELEBRATION'}"></div>
								<div class="flow-row items-center">
									<div class="img-turn-icon w-8 h-8 mr-1"></div>
									<div class="flex-auto">
										<div class="font-bold text-accent-2 max-w-full truncate uppercase ${renderHeight > 720 ? 'text-base' : 'text-sm'}">${isInGoldenAge ? goldenAgeTurnsLeft : turnsToNextGoldenAge}</div>
									</div>
								</div>
							</div>
						` : ''}
					`;
                }
            },
            {
                title: "LOC_UI_RADIAL_MENU_DETAILS_RESOURCES_TITLE",
                subtitle: "",
                icon1: "RADIAL_RESOURCES",
                icon2: "",
                fgColor: "",
                bgColor: "",
                ratio: 1,
                navigation: {
                    type: NavigationType.CONTEXT,
                    value: () => { return "screen-resource-allocation"; },
                    createsMouseGuard: true
                },
                tutHidderId: "hideTrade",
                description: () => {
                    const { name = "", type = "" } = ResourceAllocation.latestResource ?? {};
                    const renderHeight = window.innerHeight;
                    if (!name) {
                        return "";
                    }
                    return `
						<div class="font-body text-accent-4 max-w-full truncate mt-4 ${renderHeight > 720 ? 'text-sm' : 'text-xs'}" data-l10n-id="LOC_UI_RADIAL_MENU_DETAILS_RESOURCES_LATEST"></div>
						<div class="flow-row justify-center items-center max-w-full">
							<fxs-icon class="w-8 h-8" data-icon-id="${type}"></fxs-icon>
							<div class="flex-auto">
								<div class="font-fit-shrink whitespace-nowrap font-bold text-accent-2 uppercase ${renderHeight > 720 ? 'text-base' : 'text-sm'}">${name}</div>
							</div>
						</div>
						
						<div class="flow-row">
							<div class="radial-menu__name-filigree-left"></div>
							<div class="radial-menu__name-filigree-right"></div>
						</div>
					`;
                }
            },
            {
                title: "LOC_UI_RADIAL_MENU_DETAILS_GREATWORKS_TITLE",
                subtitle: "",
                icon1: "RADIAL_GREATWORKS",
                icon2: "",
                fgColor: "",
                bgColor: "",
                ratio: 1,
                navigation: {
                    type: NavigationType.CONTEXT,
                    value: () => { return "screen-great-works"; },
                    createsMouseGuard: true
                },
                tutHidderId: "hideGreatWorks",
                description: () => {
                    const { name = "" } = GreatWorks.latestGreatWorkDetails ?? {};
                    let greatWorkVictoryData = null;
                    //TODO: Figure out a more general solution for getting great works-related victory data from here
                    for (let i = 0; i < AgeScores.victories.length; i++) {
                        if (AgeScores.victories[i].victoryType == "VICTORY_MODERN_CULTURE"
                            || AgeScores.victories[i].victoryType == "VICTORY_EXPLORATION_CULTURE"
                            || AgeScores.victories[i].victoryType == "VICTORY_ANTIQUITY_SCIENCE") {
                            greatWorkVictoryData = AgeScores.victories[i];
                            break;
                        }
                    }
                    const { score } = greatWorkVictoryData?.playerData.find(({ playerID }) => playerID == GreatWorks.localPlayer?.id) ?? {};
                    const { scoreNeeded } = greatWorkVictoryData ?? {};
                    const renderHeight = window.innerHeight;
                    return `
						${!!name ? `
							<div class="font-body text-accent-4 max-w-full truncate mt-4 ${renderHeight > 720 ? 'text-sm' : 'text-xs'}" data-l10n-id="LOC_UI_RADIAL_MENU_DETAILS_GREATWORKS_LATEST"></div>
							<div class="font-fit-shrink whitespace-nowrap font-bold text-accent-2 uppercase ${renderHeight > 720 ? 'text-base' : 'text-sm'}">${name}</div>
						` : score != undefined && scoreNeeded ? `
								<div class="flow-column items-center">
									<div class="font-body text-accent-4 max-w-full truncate mt-4 ${renderHeight > 720 ? 'text-sm' : 'text-xs'}" data-l10n-id="LOC_UI_RADIAL_MENU_DETAILS_GREATWORKS_LIBRARY"></div>
									<div class="font-bold text-accent-2 max-w-full truncate uppercase mt-1 ${renderHeight > 720 ? 'text-base' : 'text-sm'}">${Locale.compose("LOC_UI_RADIAL_MENU_DETAILS_GREATWORKS_LIBRARY_VICTORY_PROGRESS", score, scoreNeeded)}</div>
								</div>
							` : ''}
						${!!name || (score != undefined && scoreNeeded) ? `
							<div class="flow-row">
								<div class="radial-menu__name-filigree-left"></div>
								<div class="radial-menu__name-filigree-right"></div>
							</div>
						` : ""}
						${!!name && score != undefined && scoreNeeded ? `
							<div class="flow-column items-center mt-1">
								<div class="font-body text-accent-4 max-w-full truncate ${renderHeight > 720 ? 'text-sm' : 'text-xs'}" data-l10n-id="LOC_UI_RADIAL_MENU_DETAILS_GREATWORKS_LIBRARY"></div>
								<div class="font-bold text-accent-2 max-w-full truncate uppercase ${renderHeight > 720 ? 'text-base' : 'text-sm'}">${Locale.compose("LOC_UI_RADIAL_MENU_DETAILS_GREATWORKS_LIBRARY_VICTORY_PROGRESS", score, scoreNeeded)}</div>
							</div>
						` : ''}
					`;
                }
            },
            {
                title: "LOC_UI_RADIAL_MENU_DETAILS_UNLOCK_TITLE",
                subtitle: "",
                icon1: "RADIAL_UNLOCK",
                icon2: "",
                fgColor: "",
                bgColor: "",
                ratio: 1,
                navigation: {
                    type: NavigationType.CONTEXT,
                    value: () => { return "screen-unlocks"; },
                    useSequencer: true
                },
                tutHidderId: "hideUnlocks",
                description: () => {
                    const rewardPoints = PlayerUnlocks.getLegacyCurrency();
                    const legacyPointsCategories = [
                        CardCategories.CARD_CATEGORY_WILDCARD,
                        CardCategories.CARD_CATEGORY_SCIENTIFIC,
                        CardCategories.CARD_CATEGORY_CULTURAL,
                        CardCategories.CARD_CATEGORY_MILITARISTIC,
                        CardCategories.CARD_CATEGORY_ECONOMIC
                    ];
                    const legacyPointsRewards = legacyPointsCategories.map((category) => ({
                        category,
                        value: rewardPoints.find((rewardPoint) => category == rewardPoint.category)?.value ?? 0
                    }));
                    let maxAgeChrono = -1;
                    for (const e of GameInfo.Ages) {
                        if (e.ChronologyIndex > maxAgeChrono) {
                            maxAgeChrono = e.ChronologyIndex;
                        }
                    }
                    const curAgeChrono = GameInfo.Ages.lookup(Game.age)?.ChronologyIndex ?? -1;
                    if (curAgeChrono === maxAgeChrono) {
                        return "";
                    }
                    return `
						<div class="flow-row">
							<div class="radial-menu__name-filigree-left"></div>
							<div class="radial-menu__name-filigree-right"></div>
						</div>
						<div class="flow-row justify-center w-full">
							<div class="flow-row-wrap mt-1 w-40">
								${legacyPointsRewards.map(({ category, value }) => `
									<div class="flow-row justify-between w-18 -my-0\\.5 mx-1 items-center">
										<div style="background-image: url('${UI.getIconURL(Object.keys(CardCategories).find(key => CardCategories[key] === category) || '')}')" class="size-10 bg-contain bg-no-repeat bg-center"></div>
										<div class="flex-auto flow-row justify-end items-center">
											<div class="font-fit-shrink whitespace-nowrap text-accent-2 ${window.innerHeight > Layout.pixelsToScreenPixels(720) ? 'text-lg' : 'text-base'}" data-l10n-id="${value}"></div>
										</div>
									</div>
								`).join("")}
							</div>
						</div>
					`;
                }
            },
            {
                title: "LOC_UI_RADIAL_MENU_DETAILS_RELIGION_TITLE",
                subtitle: "",
                icon1: "RADIAL_RELIGION",
                icon2: "",
                fgColor: "",
                bgColor: "",
                ratio: 1,
                navigation: {
                    type: NavigationType.CONTEXT,
                    value: () => {
                        if (Game.age == Database.makeHash("AGE_ANTIQUITY")) {
                            const player = Players.get(GameContext.localPlayerID);
                            if (!player) {
                                console.error("panel-radial-menu: religion radial value() - no local player found!");
                                return "";
                            }
                            const playerCulture = player.Culture;
                            if (!playerCulture) {
                                console.error("panel-radial-menu: religion radial value() - no player culture found!");
                                return "";
                            }
                            const playerReligion = player.Religion;
                            if (!playerReligion) {
                                console.error("panel-radial-menu: religion radial value() - no player religion found!");
                                return "";
                            }
                            const numPantheonsToAdd = playerReligion.getNumPantheonsUnlocked();
                            const mustAddPantheons = playerCulture.isNodeUnlocked("NODE_CIVIC_AQ_MAIN_MYSTICISM") && numPantheonsToAdd > 0;
                            if (mustAddPantheons) {
                                return "screen-pantheon-chooser";
                            }
                            else {
                                return "panel-pantheon-complete";
                            }
                        }
                        else if (Game.age == Database.makeHash("AGE_EXPLORATION")) {
                            const localPlayerID = GameContext.localPlayerID;
                            if (Players.isValid(localPlayerID)) {
                                const localPlayer = Players.get(localPlayerID);
                                if (!localPlayer) {
                                    console.error("panel-radial-menu: religion menu icon value() - localPlayer was null!");
                                    return "";
                                }
                                if (localPlayer.Religion?.canCreateReligion()) {
                                    return "panel-religion-picker";
                                }
                                else {
                                    return "panel-belief-picker";
                                }
                            }
                        }
                        return "";
                    }
                },
                tutHidderId: "hideReligion",
                description: () => {
                    const playerReligion = Players.get(GameContext.localPlayerID)?.Religion;
                    if (!playerReligion) {
                        console.error(`Religion radial menu entry: no player religion library for local player!`);
                        return "";
                    }
                    const religionType = playerReligion.getReligionType();
                    const numPantheon = playerReligion.getNumPantheons();
                    const pantheons = playerReligion.getPantheons();
                    const { Name: PantheonName = "", BeliefType = "" } = numPantheon == 1 && pantheons?.[0] ? GameInfo.Beliefs.lookup(pantheons?.[0]) ?? {} : {};
                    const religionDef = GameInfo.Religions.lookup(religionType ?? 0);
                    let religionTypeString = undefined;
                    let religionName = undefined;
                    if (religionDef) {
                        religionTypeString = religionDef.ReligionType;
                        religionName = playerReligion.getReligionName();
                    }
                    const renderHeight = window.innerHeight;
                    if (!PantheonName && !religionName) {
                        return "";
                    }
                    return `
						<div class="font-body text-accent-4 max-w-full truncate mt-4 ${renderHeight > 720 ? 'text-sm' : 'text-xs'}" data-l10n-id="${!BeliefType ? 'LOC_UI_RADIAL_MENU_DETAILS_RELIGION_TITLE' : 'LOC_UI_RADIAL_MENU_DETAILS_RELIGION_PANTHEON'}"></div>
						<div class="font-fit-shrink whitespace-nowrap font-bold text-accent-2 uppercase truncate w-62 text-center ${renderHeight > 720 ? 'text-base' : 'text-sm'}">${PantheonName || religionName}</div>
						<div class="flow-row">
							<div class="radial-menu__name-filigree-left"></div>
							<div class="radial-menu__name-filigree-right"></div>
						</div>
						<div class="img-civics-icon-frame bg-cover w-16 h-16 mt-2 flow-row justify-center items-center">
							<fxs-icon class="w-10 h-10" data-icon-id="${BeliefType || religionTypeString}"></fxs-icon>
						</div>
					`;
                },
                excludedAge: Database.makeHash("AGE_MODERN")
            },
            {
                title: "LOC_UI_RADIAL_MENU_DETAILS_CIVILOPEDIA_TITLE",
                subtitle: "",
                icon1: "RADIAL_CIVILOPEDIA",
                icon2: "",
                fgColor: "",
                bgColor: "",
                ratio: 1,
                navigation: {
                    type: NavigationType.CONTEXT,
                    value: () => { return "screen-civilopedia"; }
                },
                tutHidderId: "",
                description: () => {
                    return ""; // TODO: add 'Latest Discovery' when this will be implemented system side
                }
            },
        ]
    },
    {
        title: "LOC_UI_RADIAL_MENU_LEADER_TITLE",
        items: []
    }
];
const RIBBON_YIELD_TYPE_TO_ICON_ID = {
    [RibbonYieldType.Default]: "YIELD_FOOD",
    [RibbonYieldType.Gold]: "YIELD_GOLD",
    [RibbonYieldType.Culture]: "YIELD_CULTURE",
    [RibbonYieldType.Science]: "YIELD_SCIENCE",
    [RibbonYieldType.Happiness]: "YIELD_HAPPINESS",
    [RibbonYieldType.Diplomacy]: "YIELD_DIPLOMACY",
    [RibbonYieldType.Settlements]: "YIELD_CITIES",
    [RibbonYieldType.Property]: "YIELD_FOOD",
    [RibbonYieldType.Victory]: "YIELD_FOOD",
    [RibbonYieldType.Trade]: "YIELD_TRADES",
};
const RIBBON_YIELD_TYPE_TO_COLOR_CLASS = {
    [RibbonYieldType.Default]: "text-accent-2",
    [RibbonYieldType.Gold]: "text-yield-gold",
    [RibbonYieldType.Culture]: "text-yield-culture",
    [RibbonYieldType.Science]: "text-yield-science",
    [RibbonYieldType.Happiness]: "text-yield-happiness",
    [RibbonYieldType.Diplomacy]: "text-yield-influence",
    [RibbonYieldType.Settlements]: "text-accent-3",
    [RibbonYieldType.Property]: "text-accent-2",
    [RibbonYieldType.Victory]: "text-accent-2",
    [RibbonYieldType.Trade]: "text-accent-3",
};
class PanelRadialMenu extends Panel {
    ;
    constructor(root) {
        super(root);
        this.NAVIGATION_THRESHOLD = .5; // To limit the detection of radial selection to the amplitude of the joystick
        this.MAX_ROTATION_VALUE = (Number.MAX_SAFE_INTEGER + 1) / 128 - 1; // To keep the precision on the arrow rotation to the 2nd decimal
        this.menus = [];
        this.currentMenuIndex = 0;
        this.rotation = 0;
        this.focusDeg = 0;
        this.tabBarSelectedEventListener = this.onTabBarSelected.bind(this);
        this.navigateInputListener = this.onNavigateInput.bind(this);
        this.engineInputListener = this.onEngineInput.bind(this);
        this.activeDeviceChangedListener = this.onActiveDeviceChange.bind(this);
        this.itemActionActivateListener = this.onItemActionActivate.bind(this);
        this.itemFocusListener = this.onItemFocus.bind(this);
        this.itemBlurListener = this.onItemBlur.bind(this);
        this.getTotalRatioOfItems = (items) => {
            if (!items.length) {
                return 1;
            }
            return items.map(({ ratio }) => ratio ?? 1).reduce((result, ratio) => result + ratio);
        };
        this.resolveItemsPositionDeg = (items) => {
            const totalRatio = this.getTotalRatioOfItems(items);
            let nextStartDeg = items.length > 1 ? 0 : 180;
            return items.map(item => {
                const { ratio = 1 } = item;
                const startDeg = nextStartDeg;
                const endDeg = startDeg + (ratio / totalRatio) * 360;
                nextStartDeg = endDeg;
                return {
                    ...item,
                    startDeg: (startDeg + 90) % 360,
                    positionDeg: (((startDeg + endDeg) / 2) + 90) % 360,
                };
            });
        };
        this.resolveItemsOnClickFunction = (items) => {
            return items.map(item => {
                const { navigation = { type: NavigationType.NONE, value: "", createsMouseGuard: false } } = item;
                const { type, value, createsMouseGuard } = navigation;
                let onClickFn = (fn) => () => {
                    this.close();
                    fn();
                };
                let onClick = () => { };
                switch (type) {
                    case NavigationType.CONTEXT:
                        const radialItemValue = value();
                        if (radialItemValue == "") {
                            break;
                        }
                        onClick = onClickFn(() => {
                            if (navigation.useSequencer) {
                                const popupData = {
                                    category: PopupSequencer.getCategory(),
                                    screenId: radialItemValue,
                                    properties: { singleton: true, createMouseGuard: createsMouseGuard },
                                };
                                PopupSequencer.addDisplayRequest(popupData);
                            }
                            else {
                                ContextManager.push(radialItemValue, { singleton: true, createMouseGuard: createsMouseGuard });
                            }
                        });
                        break;
                    case NavigationType.DIPLOMACY:
                        const callback = () => {
                            const playerId = Number.parseInt(value());
                            window.dispatchEvent(new RaiseDiplomacyEvent(playerId));
                        };
                        onClick = onClickFn(callback);
                        break;
                    case NavigationType.INTERFACE:
                        onClick = onClickFn(() => InterfaceMode.switchTo(value()));
                        break;
                    case NavigationType.FOCUS:
                        onClick = onClickFn(() => FocusManager.setFocus(document.querySelector('.harness')?.querySelector(value()) ?? this.Root));
                        break;
                }
                return {
                    ...item,
                    onClick,
                };
            });
        };
        this.resolveItemsIsHidden = (items) => {
            return items.map((item) => ({
                ...item,
                isHidden: item.tutHidderId && TutorialManager.isItemExistInAll(item.tutHidderId) ? !TutorialManager.isItemCompleted(item.tutHidderId) : false
            }));
        };
        this.handleMove = (navigationEvent) => {
            const { detail: { x, y } } = navigationEvent;
            const stickLength = Math.hypot(x, y);
            const focusDeg = stickLength > this.NAVIGATION_THRESHOLD ? ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360 : this.focusDeg;
            this.focusItem(focusDeg);
        };
        this.rotateMenuArrow = (focusDeg) => {
            const diff = this.findAngleDifference(focusDeg, this.focusDeg);
            this.rotation = (this.rotation + diff) % this.MAX_ROTATION_VALUE;
            this.selectedMenuArrowContainer?.style.setProperty("transform", `rotate(${180 - this.rotation}deg)`);
        };
        this.focusItem = (focusDeg) => {
            const focusItemIndex = this.getFirstIndexOfMinValue(this.menus[this.currentMenuIndex]?.items?.map(item => this.findNormalisedAngleDifference(item.positionDeg ?? 0, focusDeg)) ?? []);
            const focusElement = this.selectedMenuItemElements?.[focusItemIndex];
            FocusManager.setFocus(focusElement ?? this.Root);
            return this.menus[this.currentMenuIndex]?.items?.[focusItemIndex];
        };
        this.handleNavigation = (navigationEvent) => {
            if (![InputActionStatuses.FINISH, InputActionStatuses.UPDATE].includes(navigationEvent.detail.status)) {
                return true;
            }
            switch (navigationEvent.detail.name) {
                case 'nav-move':
                    this.handleMove(navigationEvent);
                    return false;
                default:
                    return true;
            }
        };
        this.handleEngineInput = (inputEvent) => {
            if (inputEvent.detail.status != InputActionStatuses.FINISH) {
                return true;
            }
            switch (inputEvent.detail.name) {
                case 'cancel':
                case 'sys-menu':
                    this.close();
                    return false;
                default:
                    return true;
            }
        };
        this.populateLeaderMenu = () => {
            this.menus[1].items = this.resolveItemsOnClickFunction(this.resolveItemsPositionDeg(DiploRibbonData.playerData.map(({ civName, leaderType, civSymbol, canClick, primaryColor, secondaryColor, id, yields }) => ({
                title: Players.get(id)?.name ?? "",
                subtitle: civName,
                icon1: `${leaderType}`,
                icon2: civSymbol,
                ratio: 1,
                fgColor: secondaryColor,
                bgColor: primaryColor,
                navigation: {
                    type: NavigationType.DIPLOMACY,
                    value: () => id.toString(),
                },
                isHidden: !canClick,
                tutHidderId: "",
                description: () => {
                    return `
							<div class="flow-row">
								<div class="radial-menu__name-filigree-left"></div>
								<div class="radial-menu__name-filigree-right"></div>
							</div>
							<div class="flow-row-wrap items-center justify-center my-1">
								${yields.map(({ value, type = RibbonYieldType.Default }) => `
									<div class="flow-row justify-between w-18 -my-0\\.5 mx-1">
										<fxs-icon class="size-7" data-icon-id="${RIBBON_YIELD_TYPE_TO_ICON_ID[type]}"></fxs-icon>
										<div class="flex-auto flow-row justify-end items-center">
											<div class="font-fit-shrink whitespace-nowrap ${window.innerHeight > Layout.pixelsToScreenPixels(720) ? 'font-body-base' : 'font-body-sm'} ${RIBBON_YIELD_TYPE_TO_COLOR_CLASS[type]}" data-l10n-id="${value}"></div>
										</div>
									</div>
								`).join("")}
							</div>
						`;
                }
            }))));
        };
        this.renderMenuStack = (menus) => {
            return `
			<fxs-tab-bar
				class="mb-3 w-128"
				tab-for="panel-radial-menu"
				alt-controls="false"
				tab-items=${JSON.stringify(menus.map(({ title }, index) => ({ id: `${index}`, label: title })))}
			>
			</fxs-tab-bar>
			<fxs-slot-group>
				${menus.map(({ items }, index) => `
					<fxs-slot
						class="relative flow-row justify-center items-center"
						index=${index}
						id=${index}
					>
						<div class="bg-cover bg-center radial-menu__donut"></div>
						<div class="absolute inset-0">
							${this.renderDivision(items)}
						</div>
						<div class="absolute inset-0">
							${this.renderItems(items, index)}
						</div>
						<div class="absolute bg-no-repeat bg-center inset-0 radial-menu__circle"></div>
						<div 
							class="absolute inset-0 hidden menu-items-arrow-container bottom-2\\.5"
							index=${index}
							style="
								transition-property: transform;
								transition-duration: 0.1s;
								transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
							">
							<div
								class="absolute inset-0 flow-row justify-center items-center"
								style="transform:translateX(-29%);"
							>
								<div class="radial-menu__directional"></div>	
							</div>
						</div>
					</fxs-slot>
				`).join("")}
			</fxs-slot-group>
		`;
        };
        this.renderDivision = (items = []) => items.length > 1 ? items.map(({ startDeg = 0 }) => `
		<div 
			class="absolute flow-row justify-center items-center inset-0 bottom-3 left-1 right-1 radial-menu__line-container" 
			style="
				transform:translateX(${![270, 90].includes(startDeg) ? `${100 * 0.4 * Math.cos(startDeg * Math.PI / 180)}%` : `0px`}) translateY(${![0, 180].includes(startDeg) ? `${-100 * 0.4 * Math.sin(startDeg * Math.PI / 180)}%` : `0px`}) rotate(${-(startDeg - 90)}deg);
			"
		>
			<div class="radial-menu__line"></div>	
		</div>
	`).join("") : "";
        this.renderItems = (items = [], menuIndex) => `
		${items?.map(({ title, subtitle = "", icon1 = "", icon2 = "", fgColor = "", bgColor = "", isHidden, positionDeg = 0, description = () => "" }, index) => `
			<div
				class="radial-menu__item absolute inset-0 bottom-3 left-1 right-1 ${isHidden ? "hidden" : ""}"
				index=${index}
			>
				<div 
					class="absolute inset-0 flow-row justify-center items-center"
					style="transform:translateX(${![270, 90].includes(positionDeg) ? `${100 * 0.4 * Math.cos(positionDeg * Math.PI / 180)}%` : `0px`}) translateY(${![0, 180].includes(positionDeg) ? `${-100 * 0.4 * Math.sin(positionDeg * Math.PI / 180)}%` : `0px`});"
				>
					<fxs-activatable
						class="flow-row justify-center items-center radial-menu-item relative ${icon1.includes("LEADER") ? "w-16 h-16" : "w-14 h-14"} ${isHidden ? "hidden" : ""}"
						index=${index}
						menuIndex=${menuIndex}
						tabindex="-1"
					>
						<div 
							class="absolute inset-0 radial-menu__highlight transition-opacity"
							style="transform:translateX(${![270, 90].includes(positionDeg) ? `${-100 * 0.30 * Math.cos(positionDeg * Math.PI / 180)}%` : `0px`}) translateY(${![0, 180].includes(positionDeg) ? `${100 * 0.30 * Math.sin(positionDeg * Math.PI / 180)}%` : `0px`});"
						></div>
						${icon1.includes("LEADER") ? `
							<leader-icon class="${window.innerHeight > Layout.pixelsToScreenPixels(720) ? 'w-16 h-16 bottom-5' : 'w-12 h-12 bottom-4'}" leader="${icon1}" bg-color="${bgColor}" fg-color="${fgColor}" civ-icon-url="${icon2}"></leader-icon>
						` : `
							<fxs-icon class="relative" data-icon-id="${icon1}"></fxs-icon>
						`}
					</fxs-activatable>
				</div>

				<div class="radial-menu__item-description hidden absolute inset-0 flow-column items-center justify-center z-1" menuIndex=${menuIndex} index=${index}>
					<div class="radial-menu__item-description__container flow-column items-center justify-center">
						<div class="font-fit-shrink whitespace-nowrap ${window.innerHeight > Layout.pixelsToScreenPixels(720) ? "font-title-xl" : "font-title-lg"}" data-l10n-id="${title}" style="coh-font-fit-min-size:6px;"></div>
						${subtitle ? `<div class="font-body text-accent-4 font-fit-shrink whitespace-nowrap ${window.innerHeight > Layout.pixelsToScreenPixels(720) ? 'font-title-base' : 'font-title-sm'}" data-l10n-id="${subtitle}"></div>` : ''}
						${description()}
					</div>
				</div>

			</div>
		`).join("")}
	`;
    }
    onInitialize() {
        super.onInitialize();
        this.menus = DEFAULT_RADIAL_MENUS.map(menu => ({
            ...menu,
            items: this.resolveItemsOnClickFunction(this.resolveItemsPositionDeg(this.resolveItemsIsHidden(this.filterMenuItems(menu.items) ?? [])))
        }));
        this.populateLeaderMenu();
        this.Root.innerHTML = this.renderMenuStack(this.menus);
        // The localization attribute will create a p element with cohinline attribute which will override the font-fit-shrink behaviour
        // So we need to add the font-fit-shrink to generated p element that have a font-fit-shrink parent.
        const l10nParagraph = this.Root.querySelectorAll(".font-fit-shrink[data-l10n-id] p[cohinline]");
        l10nParagraph.forEach(element => {
            element.classList.add("font-fit-shrink");
            element.setAttribute("style", "coh-font-fit-min-size: 6px;");
        });
        this.enableOpenSound = true;
        this.enableCloseSound = true;
        this.Root.setAttribute("data-audio-group-ref", "controller-radial");
    }
    onAttach() {
        this.playAnimateInSound();
        this.tabBarElement = MustGetElement("fxs-tab-bar", this.Root);
        this.tabBarElement.addEventListener('tab-selected', this.tabBarSelectedEventListener);
        this.slotGroupElement = MustGetElement("fxs-slot-group", this.Root);
        const radialMenuItems = this.Root.querySelectorAll('.radial-menu-item');
        radialMenuItems?.forEach(elem => {
            elem.addEventListener("action-activate", this.itemActionActivateListener);
            elem.addEventListener("focus", this.itemFocusListener);
            elem.addEventListener("blur", this.itemBlurListener);
            elem.setAttribute("data-audio-group-ref", "controller-radial");
        });
        this.Root.addEventListener(NavigateInputEventName, this.navigateInputListener);
        this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
        window.addEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangedListener);
    }
    filterMenuItems(items) {
        if (items) {
            return items.filter((item) => item.excludedAge != Game.age);
        }
        return undefined;
    }
    onDetach() {
        this.tabBarElement?.removeEventListener('tab-selected', this.tabBarSelectedEventListener);
        this.Root.removeEventListener(NavigateInputEventName, this.navigateInputListener);
        this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
        window.removeEventListener(ActiveDeviceTypeChangedEventName, this.activeDeviceChangedListener);
        super.onDetach();
    }
    onReceiveFocus() {
        FocusManager.setFocus(this.slotGroupElement ?? this.Root);
        NavTray.clear();
        NavTray.addOrUpdateGenericCancel();
        NavTray.addOrUpdateNavBeam("LOC_NAV_RADIAL_BEAM");
        super.onReceiveFocus();
    }
    onLoseFocus() {
        NavTray.clear();
        super.onLoseFocus();
    }
    findNormalisedAngleDifference(angle1, angle2) {
        return Math.abs(this.findAngleDifference(angle1, angle2));
    }
    findAngleDifference(angle1, angle2) {
        const diff = (((angle1 - angle2) + 180) % 360) - 180;
        return diff < -180 ? diff + 360 : diff;
    }
    getFirstIndexOfMinValue(array) {
        return array.reduce((r, v, i, a) => v > a[r] ? r : i, -1);
    }
    onEngineInput(inputEvent) {
        if (!this.handleEngineInput(inputEvent)) {
            inputEvent.stopImmediatePropagation();
            inputEvent.preventDefault();
        }
    }
    onNavigateInput(navigationEvent) {
        if (!this.handleNavigation(navigationEvent)) {
            navigationEvent.stopImmediatePropagation();
            navigationEvent.preventDefault();
        }
    }
    onActiveDeviceChange(event) {
        if (!event.detail.gamepadActive) {
            this.close();
        }
    }
    onTabBarSelected({ detail: { selectedItem: { id } } }) {
        // reset the state of arrow rotation & focus
        this.rotation = 0;
        this.focusDeg = 0;
        // change the selected slot
        this.currentMenuIndex = Number.parseInt(id);
        // update reference to description list and refocus
        this.selectedMenuArrowContainer = this.Root.querySelector(`.menu-items-arrow-container[index='${id}']`) ?? undefined;
        this.selectedMenuArrowContainer?.style.setProperty("transition-duration", "0s");
        this.selectedMenuItemElements = this.Root.querySelectorAll(`.radial-menu-item[menuIndex='${id}']`);
        this.selectedMenuItemDescriptions = this.Root.querySelectorAll(`.radial-menu__item-description[menuIndex='${id}']`);
        this.slotGroupElement?.setAttribute("selected-slot", id);
    }
    onItemActionActivate({ target }) {
        const targetElement = target;
        const isHidden = targetElement?.classList.contains("hidden");
        const index = Number.parseInt(targetElement?.getAttribute("index") ?? "-1");
        if (index >= 0 && !isHidden) {
            this.menus[this.currentMenuIndex]?.items?.[index]?.onClick?.();
        }
    }
    onItemFocus({ target }) {
        const index = Number.parseInt(target.getAttribute("index") ?? "0");
        const { positionDeg = 0 } = this.menus[this.currentMenuIndex]?.items?.[index] ?? {};
        this.rotateMenuArrow(positionDeg);
        this.focusDeg = positionDeg;
        this.selectedMenuArrowContainer?.classList.remove("hidden");
        this.selectedMenuItemDescriptions?.[index]?.classList.remove("hidden");
        waitForLayout(() => this.selectedMenuArrowContainer?.style.setProperty("transition-duration", "0.1s"));
        Audio.playSound("data-audio-focus", "controller-radial");
    }
    onItemBlur({ target }) {
        const index = Number.parseInt(target.getAttribute("index") ?? "0");
        this.selectedMenuItemDescriptions?.[index]?.classList.add("hidden");
    }
}
Controls.define('panel-radial-menu', {
    createInstance: PanelRadialMenu,
    description: 'Radial menu allowing the player to quickly select multiple options.',
    classNames: ["panel-radial-menu", "fullscreen", "flow-column", "justify-center", 'items-center'],
    styles: ["fs://game/core/ui/radial-menu/panel-radial-menu.css"],
    images: [
        "fs://game/radial_donut",
        "fs://game/radial_donut_sm",
        "fs://game/radial_middle_circle",
        "fs://game/radial_middle_circle_sm",
        "fs://game/radial_line",
        "fs://game/radial_line_sm",
        "fs://game/radial_directional",
        "fs://game/radial_directional_sm",
        "fs://game/radial_highlight",
        "fs://game/radial_highlight_sm",
        "fs://game/radial_tabbar-bg",
        //...DEFAULT_RADIAL_MENUS.map(menu => menu.items?.map(item => item.icon1 ?? "") ?? []).flat(),
    ],
    tabIndex: -1
});

//# sourceMappingURL=file:///core/ui/radial-menu/panel-radial-menu.js.map
