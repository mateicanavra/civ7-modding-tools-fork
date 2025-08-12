/**
 * @file tutorial-items-modern.ts
 * @copyright 2020-2024, Firaxis Games
 * @description Defines the sequence of tutorial items for the modern age.
 *
 * @example To skip a welcome tutorial:  skip: ((): boolean => { return (Configuration.getUser().skipEraWelcomeTutorial == 1); })(),		// evaluated immediately when added bank
 */
import { TutorialAnchorPosition } from '/base-standard/ui/tutorial/tutorial-item.js';
import TutorialManager from '/base-standard/ui/tutorial/tutorial-manager.js';
import * as TutorialSupport from '/base-standard/ui/tutorial/tutorial-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
//import LensManager from '/core/ui/lenses/lens-manager.js'
//import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';
//import PlotCursor from '/core/ui/input/plot-cursor.js'
// ---------------------------------------------------------------------------
// Defines for option buttons
//
const calloutBegin = { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_BEGIN", actionKey: "inline-accept", closes: true };
const calloutClose = { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_CLOSE", actionKey: "inline-cancel", closes: true };
// ---------------------------------------------------------------------------
// Defines for option buttons with a 'nextID' associated
//
// @ts-ignore
//function calloutAcceptNext(nextID: string): TutorialCalloutOptionDefinition { return TutorialSupport.calloutAcceptNext(nextID); }
// @ts-ignore
function calloutBeginNext(nextID) { return TutorialSupport.calloutBeginNext(nextID); }
// @ts-ignore
function calloutCloseNext(nextID) { return TutorialSupport.calloutCloseNext(nextID); }
// @ts-ignore
//function calloutContinueNext(nextID: string): TutorialCalloutOptionDefinition { return TutorialSupport.calloutContinueNext(nextID); }
// ---------------------------------------------------------------------------
// Defines for commonly used UI hiders
//
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "welcome_intro",
    activationEngineEvents: ["GameStarted"],
    filterPlayers: [],
    disable: ["world-input", "unit-flags"],
    runAllTurns: true,
    onObsoleteCheck: (_item) => {
        return Game.turn > 1;
    },
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        title: Locale.compose("LOC_TUTORIAL_MODERN_WELCOME_TITLE"),
        body: { text: Locale.compose("LOC_TUTORIAL_MODERN_WELCOME_BODY") },
        option1: calloutBegin,
    },
    nextID: "welcome_intro2",
    hiders: [".tut-action-button", ".tut-action-text"],
    inputFilters: [{ inputName: "next-action" }]
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "ideologies_unlock",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        title: Locale.compose("LOC_TUTORIAL_IDEOLOGIES_UNLOCK_TITLE"),
        body: {
            text: "LOC_TUTORIAL_IDEOLOGIES_UNLOCK_BODY",
            getLocParams: (_item) => {
                let civicName = "";
                const player = Players.get(GameContext.localPlayerID);
                if (player) {
                    const culture = player.Culture;
                    if (culture != undefined) {
                        let recentResearchNodeType = culture.getLastCompletedNodeType();
                        const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(recentResearchNodeType);
                        if (nodeInfo) {
                            civicName = nodeInfo.Name;
                        }
                    }
                }
                return [civicName];
            }
        },
        option1: calloutBegin,
    },
    activationEngineEvents: ["CultureNodeCompleted"],
    onActivateCheck: (item) => {
        return TutorialSupport.didCivicUnlock(item, "NODE_CIVIC_MO_MAIN_POLITICAL_THEORY");
    },
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "rail_station_unlocked",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: Locale.compose("LOC_TUTORIAL_RAIL_STATION_TITLE"),
        body: { text: Locale.compose("LOC_TUTORIAL_RAIL_STATION_BODY") },
        option1: calloutClose,
    },
    activationCustomEvents: ["interface-mode-changed"],
    onActivateCheck: (_item) => {
        let railstationUnlocked = false;
        if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
            const player = Players.get(GameContext.localPlayerID);
            if (player && player.Units) {
                const cityID = UI.Player.getHeadSelectedCity();
                const RailStationDef = GameInfo.Constructibles.lookup("BUILDING_RAIL_STATION");
                if (cityID && RailStationDef) {
                    let result = null;
                    result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { ConstructibleType: RailStationDef.$index }, false);
                    if (result.Success) {
                        railstationUnlocked = true;
                    }
                }
            }
        }
        return railstationUnlocked;
    },
    completionCustomEvents: ["interface-mode-changed", "CityProductionChanged"],
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "port_unlocked",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: Locale.compose("LOC_TUTORIAL_PORT_TITLE"),
        body: { text: Locale.compose("LOC_TUTORIAL_PORT_BODY") },
        option1: calloutClose,
    },
    activationCustomEvents: ["interface-mode-changed"],
    onActivateCheck: (_item) => {
        let portUnlocked = false;
        if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
            const player = Players.get(GameContext.localPlayerID);
            if (player && player.Units) {
                const cityID = UI.Player.getHeadSelectedCity();
                const factoryDef = GameInfo.Constructibles.lookup("BUILDING_PORT");
                if (cityID && factoryDef) {
                    let result = null;
                    result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { ConstructibleType: factoryDef.$index }, false);
                    if (result.Success) {
                        portUnlocked = true;
                    }
                }
            }
        }
        return portUnlocked;
    },
    completionCustomEvents: ["interface-mode-changed", "CityProductionChanged"],
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "factory_unlocked",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: Locale.compose("LOC_TUTORIAL_FACTORY_TITLE"),
        body: { text: Locale.compose("LOC_TUTORIAL_FACTORY_BODY") },
        option1: calloutClose,
    },
    activationCustomEvents: ["interface-mode-changed"],
    onActivateCheck: (_item) => {
        let factoryUnlocked = false;
        if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
            const player = Players.get(GameContext.localPlayerID);
            if (player && player.Units) {
                const cityID = UI.Player.getHeadSelectedCity();
                const FactoryDef = GameInfo.Constructibles.lookup("BUILDING_FACTORY");
                if (cityID && FactoryDef) {
                    let result = null;
                    result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { ConstructibleType: FactoryDef.$index }, false);
                    if (result.Success) {
                        factoryUnlocked = true;
                    }
                }
            }
        }
        return factoryUnlocked;
    },
    completionCustomEvents: ["interface-mode-changed", "CityProductionChanged"],
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "factory_resources_intro",
    callout: {
        anchorPosition: TutorialAnchorPosition.BottomCenter,
        title: Locale.compose("LOC_TUTORIAL_FACTORY_RESOURCES_TITLE"),
        body: { text: Locale.compose("LOC_TUTORIAL_FACTORY_RESOURCES_BODY") },
        option1: calloutClose,
    },
    activationEngineEvents: ["OnContextManagerOpen_screen-resource-allocation"],
    completionCustomEvents: ["OnContextManagerClose"],
    filterPlayers: []
});
// ------------------------------------------------------------------
// ARCHAEOLOGY
TutorialManager.add({
    ID: "explorerToBuild",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: Locale.compose("LOC_TUTORIAL_NATURAL_HISTORY_CIVIC_UNLOCKED_TITLE"),
        body: {
            text: "LOC_TUTORIAL_NATURAL_HISTORY_CIVIC_UNLOCKED_BODY",
            getLocParams: (_item) => {
                let explorerName = "NO_NAME";
                let explorerIcon = "NO_ICON";
                const player = Players.get(GameContext.localPlayerID);
                if (player && player.Units) {
                    const cityID = UI.Player.getHeadSelectedCity();
                    const explorer = player.Units.getBuildUnit("UNIT_EXPLORER");
                    const explorerDef = GameInfo.Units.lookup(explorer);
                    if (cityID && explorerDef) {
                        let result = null;
                        result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { UnitType: explorerDef.$index }, false);
                        if (result.Success) {
                            if (explorerDef) {
                                explorerIcon = "[icon:" + explorerDef.UnitType + "]";
                                explorerName = explorerDef.Name;
                            }
                        }
                    }
                }
                return [explorerIcon, explorerName];
            },
        },
        option1: calloutClose,
    },
    activationCustomEvents: ["interface-mode-changed"],
    onActivateCheck: (_item) => {
        let explorerUnlocked = false;
        if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
            const player = Players.get(GameContext.localPlayerID);
            if (player && player.Units) {
                const cityID = UI.Player.getHeadSelectedCity();
                const explorer = player.Units.getBuildUnit("UNIT_EXPLORER");
                const explorerDef = GameInfo.Units.lookup(explorer);
                if (cityID && explorerDef) {
                    let result = null;
                    result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { UnitType: explorerDef.$index }, false);
                    if (result.Success) {
                        explorerUnlocked = true;
                    }
                }
            }
        }
        return explorerUnlocked;
    },
    completionCustomEvents: ["interface-mode-changed"]
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "explorerTrained",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: Locale.compose("LOC_TUTORIAL_EXPLORER_TRAINED_TITLE"),
        body: {
            text: "LOC_TUTORIAL_EXPLORER_TRAINED_BODY",
            getLocParams: (_item) => {
                let explorerName = "NO_NAME";
                let explorerIcon = "NO_ICON";
                const activationEventData = TutorialManager.activatingEvent;
                if (activationEventData) {
                    const explorerDef = GameInfo.Units.lookup(activationEventData.unitType);
                    if (explorerDef) {
                        explorerIcon = "[icon:" + explorerDef.UnitType + "]";
                        explorerName = explorerDef.Name;
                    }
                }
                return [explorerIcon, explorerName];
            }
        },
        option1: calloutClose
    },
    activationEngineEvents: ["UnitAddedToMap"],
    onActivateCheck: (node) => {
        return TutorialSupport.isUnitOfType(node, ["UNIT_EXPLORER"]);
    },
    onActivate: (_item) => {
        const activationEventData = TutorialManager.activatingEvent;
        if (activationEventData.location != null) {
            Camera.lookAtPlot(activationEventData.location);
        }
    },
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "ruinsResearched",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: Locale.compose("LOC_TUTORIAL_RUINS_RESEARCHED_TITLE"),
        body: {
            text: "LOC_TUTORIAL_RUINS_RESEARCHED_BODY",
            getLocParams: (_item) => {
                let explorerName = "NO_NAME";
                let explorerIcon = "NO_ICON";
                const player = Players.get(GameContext.localPlayerID);
                if (player && player.Units) {
                    const explorer = player.Units.getBuildUnit("UNIT_EXPLORER");
                    const explorerDef = GameInfo.Units.lookup(explorer);
                    if (explorerDef) {
                        explorerIcon = "[icon:" + explorerDef.UnitType + "]";
                        explorerName = explorerDef.Name;
                    }
                }
                return [explorerIcon, explorerName];
            }
        },
        option1: calloutClose
    },
    activationEngineEvents: ["RuinSitesResearched"],
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "antiquity_artifacts",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: Locale.compose("LOC_TUTORIAL_ANTIQUITY_ARTIFACTS_UNLOCK_TITLE"),
        body: { text: Locale.compose("LOC_TUTORIAL_ANTIQUITY_ARTIFACTS_UNLOCK_BODY") },
        option1: calloutClose,
    },
    activationEngineEvents: ["CultureNodeCompleted"],
    onActivateCheck: (item) => {
        return TutorialSupport.didCivicUnlock(item, "NODE_CIVIC_MO_MAIN_HEGEMONY");
    },
});
// ------------------------------------------------------------------
// COMBAT
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "air_combat_overview",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        title: Locale.compose("LOC_TUTORIAL_AIR_COMBAT_TITLE"),
        body: { text: "LOC_TUTORIAL_AIR_COMBAT_BODY" },
        option1: calloutClose,
        option2: {
            callback: () => {
                TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_ARMY_6_TITLE"));
            },
            text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
            actionKey: "inline-accept",
            closes: true
        },
    },
    activationEngineEvents: ["TechNodeCompleted"],
    onActivateCheck: (item) => {
        return TutorialSupport.didTechUnlock(item, "NODE_TECH_MO_FLIGHT");
    },
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "squadron_commander_overview",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        title: Locale.compose("LOC_TUTORIAL_SQUADRON_COMMANDERS_TITLE"),
        body: { text: "LOC_TUTORIAL_SQUADRON_COMMANDERS_BODY" },
        option1: calloutClose,
        option2: {
            callback: () => {
                TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_ARMY_6_CHAPTER_CONTENT_PARA_1"));
            },
            text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
            actionKey: "inline-accept",
            closes: true
        },
    },
    activationEngineEvents: ["CityProductionChanged"],
    onActivateCheck: (_item) => {
        const activationEventData = TutorialManager.activatingEvent;
        const player = Players.get(GameContext.localPlayerID);
        if (player != null) {
            const city = Cities.get(activationEventData.cityID);
            if (city != null && city.owner == player?.id) {
                if (activationEventData.productionKind == ProductionKind.UNIT) {
                    let prodItem = activationEventData.productionItem;
                    let unitDef = GameInfo.Units.lookup(prodItem);
                    if (unitDef != null) {
                        if (unitDef.PromotionClass == "PROMOTION_CLASS_AIR_COMMANDER") {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    },
});
TutorialManager.add({
    ID: "training_carrier_commander",
    runAllTurns: true,
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: Locale.compose("LOC_TUTORIAL_AIRCRAFT_CARRIER_INTRO_TITLE"),
        body: { text: "LOC_TUTORIAL_AIRCRAFT_CARRIER_INTRO_BODY" },
        option1: calloutClose,
    },
    activationEngineEvents: ["CityProductionChanged"],
    onActivateCheck: (_item) => {
        const activationEventData = TutorialManager.activatingEvent;
        const player = Players.get(GameContext.localPlayerID);
        if (player != null) {
            const city = Cities.get(activationEventData.cityID);
            if (city != null && city.owner == player?.id) {
                if (activationEventData.productionKind == ProductionKind.UNIT) {
                    let prodItem = activationEventData.productionItem;
                    let unitDef = GameInfo.Units.lookup(prodItem);
                    if (unitDef != null) {
                        if (unitDef.PromotionClass == "PROMOTION_CLASS_CARRIER_COMMANDER") {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    },
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "completed_training_carrier_commander",
    runAllTurns: true,
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: Locale.compose("LOC_TUTORIAL_AIRCRAFT_CARRIER_COMPLETED_TITLE"),
        body: { text: "LOC_TUTORIAL_AIRCRAFT_CARRIER_COMPLETED_BODY" },
        option1: calloutClose,
    },
    activationEngineEvents: ["CityProductionCompleted"],
    onActivateCheck: (_item) => {
        const activationEventData = TutorialManager.activatingEvent;
        const player = Players.get(GameContext.localPlayerID);
        if (player != null) {
            const city = Cities.get(activationEventData.cityID);
            if (city != null && city.owner == player?.id) {
                if (activationEventData.productionKind == ProductionKind.UNIT) {
                    let prodItem = activationEventData.productionItem;
                    let unitDef = GameInfo.Units.lookup(prodItem);
                    if (unitDef != null) {
                        if (unitDef.PromotionClass == "PROMOTION_CLASS_CARRIER_COMMANDER") {
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    },
});
// ------------------------------------------------------------------
// GREAT PEOPLE
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "greatPersonAvailable",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: Locale.compose("LOC_TUTORIAL_GREATPERSON_AVAILABLE_TITLE"),
        body: { text: Locale.compose("LOC_TUTORIAL_GREATPERSON_AVAILABLE_BODY") },
        option1: calloutClose,
    },
    activationEngineEvents: ["UnitGreatPersonCreated"],
    onActivateCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        if (player) {
            return true;
        }
        return false;
    }
});
// ------------------------------------------------------------------
TutorialManager.process("modern items"); // Must appear at end of item bank!

//# sourceMappingURL=file:///age-modern/ui/tutorial/tutorial-items-modern.js.map
