/**
 * @file tutorial-items-exploration.ts
 * @copyright 2020-2024, Firaxis Games
 * @description Defines the sequence of tutorial items for the exploration age.
 */
import { TutorialAnchorPosition } from '/base-standard/ui/tutorial/tutorial-item.js';
import TutorialManager from '/base-standard/ui/tutorial/tutorial-manager.js';
import * as TutorialSupport from '/base-standard/ui/tutorial/tutorial-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
// ---------------------------------------------------------------------------
// Defines for option buttons
//
const calloutBegin = { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_BEGIN", actionKey: "inline-accept", closes: true };
const calloutClose = { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_CLOSE", actionKey: "inline-cancel", closes: true };
const calloutContinue = { callback: () => { }, text: "LOC_TUTORIAL_CALLOUT_CONTINUE", actionKey: "inline-accept", closes: true };
// ---------------------------------------------------------------------------
// Defines for option buttons with a 'nextID' associated
//
// @ts-ignore
function calloutAcceptNext(nextID) { return TutorialSupport.calloutAcceptNext(nextID); }
// @ts-ignore
function calloutBeginNext(nextID) { return TutorialSupport.calloutBeginNext(nextID); }
// @ts-ignore
function calloutCloseNext(nextID) { return TutorialSupport.calloutCloseNext(nextID); }
// @ts-ignore
function calloutContinueNext(nextID) { return TutorialSupport.calloutContinueNext(nextID); }
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
    onActivate: (_item) => {
        InterfaceMode.switchTo("INTERFACEMODE_TUTORIAL_START");
        LensManager.setActiveLens('fxs-default-lens');
    },
    onCleanUp: (_item) => {
        InterfaceMode.switchToDefault();
    },
    onObsoleteCheck: (_item) => {
        if (Online.Metaprogression.isPlayingActiveEvent()) {
            return true;
        }
        return Game.turn > 1;
    },
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        title: Locale.compose("LOC_TUTORIAL_EXPLORATION_WELCOME_TITLE"),
        body: { text: Locale.compose("LOC_TUTORIAL_EXPLORATION_WELCOME_BODY") },
        option1: calloutBegin,
    },
    hiders: [".tut-action-button", ".tut-action-text"],
    inputFilters: [{ inputName: "next-action" }]
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "advancedStart_intro",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        title: "LOC_TUTORIAL_ADVANCED_START_INTRO_TITLE",
        body: {
            text: "LOC_TUTORIAL_ADVANCED_START_INTRO_BODY",
            getLocParams: (_item) => {
                const ageDefinition = GameInfo.Ages.lookup(Game.age);
                if (ageDefinition != null) {
                    return [ageDefinition.Name];
                }
                return ["Error"];
            }
        },
        option1: calloutContinue
    },
    activationCustomEvents: ["interface-mode-changed"],
    onActivateCheck: (_item) => {
        if (InterfaceMode.getCurrent() == "INTERFACEMODE_ADVANCED_START") {
            return Configuration.getGame().previousAgeCount == 0;
        }
        return false;
    },
    runAllTurns: true,
    nextID: "advancedStart_card_choice"
});
TutorialManager.add({
    ID: "advancedStart_bonus_placement",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        title: "LOC_TUTORIAL_ADVANCED_START_BONUS_PLACEMENT_TITLE",
        body: { text: "LOC_TUTORIAL_ADVANCED_START_BONUS_PLACEMENT_BODY" },
        option1: calloutContinue
    },
    activationCustomEvents: ["advanced-start-bonus-placement-started"],
    runAllTurns: true,
    filterPlayers: []
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "advancedStart_card_choice",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        title: "LOC_TUTORIAL_ADVANCED_START_CARD_CHOICE_TITLE",
        body: { text: "LOC_TUTORIAL_ADVANCED_START_CARD_CHOICE_BODY" },
        actionPrompts: [
            {
                kbm: "LOC_TUTORIAL_ADVANCED_TRANSITION_START_KBM",
                gamepad: "LOC_TUTORIAL_ADVANCED_TRANSITION_START_GAMEPAD",
                hybrid: "LOC_TUTORIAL_ADVANCED_TRANSITION_START_KBM",
                touch: "LOC_TUTORIAL_ADVANCED_TRANSITION_START_TOUCH",
                actionName: "inline-confirm"
            },
            {
                kbm: "LOC_TUTORIAL_ADVANCED_TRANSITION_START_KBM",
                gamepad: "LOC_TUTORIAL_ADVANCED_TRANSITION_START_GAMEPAD_ALT",
                hybrid: "LOC_TUTORIAL_ADVANCED_TRANSITION_START_KBM",
                touch: "LOC_TUTORIAL_ADVANCED_TRANSITION_START_TOUCH",
                actionName: "inline-shell-action-1"
            }
        ],
        option1: calloutContinue
    },
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "ageTransition_intro",
    callout: {
        title: "LOC_TUTORIAL_AGE_TRANSITION_INTRO_TITLE",
        body: {
            text: "LOC_TUTORIAL_AGE_TRANSITION_INTRO_BODY",
            getLocParams: (_item) => {
                const ageDefinition = GameInfo.Ages.lookup(Game.age);
                if (ageDefinition != null) {
                    return [ageDefinition.Name];
                }
                return ["Error"];
            }
        },
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        option1: calloutContinue
    },
    runAllTurns: true,
    activationCustomEvents: ["interface-mode-changed"],
    onActivateCheck: (_item) => {
        if (InterfaceMode.getCurrent() == "INTERFACEMODE_ADVANCED_START") {
            return Configuration.getGame().previousAgeCount > 0;
        }
        return false;
    },
    nextID: "ageTransition_card_choice"
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "ageTransition_card_choice",
    callout: {
        title: "LOC_TUTORIAL_AGE_TRANSITION_CARD_CHOICE_TITLE",
        body: { text: "LOC_TUTORIAL_AGE_TRANSITION_CARD_CHOICE_BODY" },
        actionPrompts: [{
                kbm: "LOC_TUTORIAL_ADVANCED_TRANSITION_START_KBM",
                gamepad: "LOC_TUTORIAL_ADVANCED_TRANSITION_START_GAMEPAD",
                hybrid: "LOC_TUTORIAL_ADVANCED_TRANSITION_START_KBM",
                touch: "LOC_TUTORIAL_ADVANCED_TRANSITION_START_TOUCH",
                actionName: "inline-confirm"
            },
            {
                kbm: "LOC_TUTORIAL_ADVANCED_TRANSITION_START_KBM",
                gamepad: "LOC_TUTORIAL_ADVANCED_TRANSITION_START_GAMEPAD_ALT",
                hybrid: "LOC_TUTORIAL_ADVANCED_TRANSITION_START_KBM",
                touch: "LOC_TUTORIAL_ADVANCED_TRANSITION_START_TOUCH",
                actionName: "inline-shell-action-1"
            }
        ],
        anchorPosition: TutorialAnchorPosition.MiddleCenter,
        option1: calloutContinue,
    },
    runAllTurns: true,
    onActivateCheck: (_node) => {
        return Configuration.getGame().previousAgeCount > 0;
    },
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "tutorial_missionary_unlocked",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: "LOC_TUTORIAL_MISSIONARY_AVAILABLE_TITLE",
        body: {
            text: "LOC_TUTORIAL_MISSIONARY_AVAILABLE_BODY",
            getLocParams: (_item) => {
                let missionaryName = "NO_NAME";
                let missionaryIcon = "NO_ICON";
                let religionName = "";
                if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
                    const player = Players.get(GameContext.localPlayerID);
                    if (player && player.Units) {
                        let playerReligion = player.Religion;
                        if (playerReligion != undefined) {
                            religionName = playerReligion.getReligionName();
                        }
                        const cityID = UI.Player.getHeadSelectedCity();
                        const missionary = player.Units.getBuildUnit("UNIT_MISSIONARY");
                        const missionaryDef = GameInfo.Units.lookup(missionary);
                        if (cityID && missionaryDef) {
                            let result = null;
                            result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { UnitType: missionaryDef.$index }, false);
                            if (result.Success) {
                                if (missionaryDef) {
                                    missionaryIcon = "[icon:" + missionaryDef.UnitType + "]";
                                    missionaryName = missionaryDef.Name;
                                }
                            }
                        }
                    }
                }
                return [missionaryIcon, missionaryName, religionName];
            },
        },
        option1: calloutClose,
        /*option2: {
            callback: () => {
                TutorialSupport.OpenCivilopediaAt("");
            },
            text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
            actionKey: "inline-accept",
            closes: true
        },*/
    },
    activationCustomEvents: ["interface-mode-changed"],
    onActivateCheck: (_item) => {
        let missionaryUnlocked = false;
        if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
            const player = Players.get(GameContext.localPlayerID);
            if (player && player.Units) {
                const cityID = UI.Player.getHeadSelectedCity();
                const missionary = player.Units.getBuildUnit("UNIT_MISSIONARY");
                const missionaryDef = GameInfo.Units.lookup(missionary);
                if (cityID && missionaryDef) {
                    let result = null;
                    result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { UnitType: missionaryDef.$index }, false);
                    if (result.Success) {
                        missionaryUnlocked = true;
                    }
                }
            }
        }
        return missionaryUnlocked;
    },
    onActivate: (item) => {
        const buttonHighlights = [];
        const player = Players.get(GameContext.localPlayerID);
        if (player && player.Units) {
            const cityID = UI.Player.getHeadSelectedCity();
            const missionary = player.Units.getBuildUnit("UNIT_MISSIONARY");
            const missionaryDef = GameInfo.Units.lookup(missionary);
            if (cityID && missionaryDef) {
                let result = null;
                result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { UnitType: missionaryDef.$index }, false);
                if (result.Success) {
                    buttonHighlights.push(".production-item[item-type=\"" + missionaryDef.UnitType + "\"]");
                }
            }
        }
        item.highlights = buttonHighlights;
    },
    completionEngineEvents: ["CityProductionChanged", "interface-mode-changed"],
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "tutorial_missionary_trained",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: "LOC_TUTORIAL_MISSIONARY_TRAINED_TITLE",
        body: {
            text: "LOC_TUTORIAL_MISSIONARY_TRAINED_BODY",
            getLocParams: (_item) => {
                let missionaryName = "NO_NAME";
                let missionaryIcon = "NO_ICON";
                let cityName = "NO_CITY";
                const activationEventData = TutorialManager.activatingEvent;
                let player = Players.get(GameContext.localPlayerID);
                if (player) {
                    let thisUnit = Units.get(activationEventData.unit);
                    if (!thisUnit) {
                        if (player.Units) {
                            for (let i = 0; i < player.Units.getUnits().length; i++) {
                                if (player.Units.getUnits()[i].type == "UNIT_MISSIONARY") {
                                    thisUnit = player.Units.getUnits()[i];
                                }
                            }
                        }
                    }
                    if (thisUnit != null) {
                        missionaryName = thisUnit.name;
                        missionaryIcon = "[icon:" + thisUnit.type + "]";
                        if (player.Cities) {
                            for (let i = 0; i < player.Cities.getCityIds().length; i++) {
                                if (player.Cities.getCityIds()[i].id == thisUnit.originCityId) {
                                    let thisCityInfo = Cities.get(player.Cities.getCityIds()[i]);
                                    if (thisCityInfo) {
                                        cityName = thisCityInfo.name;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
                return [missionaryIcon, missionaryName, cityName];
            }
        },
        option1: calloutClose,
        /*option2: {
            callback: () => {
                TutorialSupport.OpenCivilopediaAt("");
            },
            text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
            actionKey: "inline-accept",
            closes: true
        },*/
    },
    activationEngineEvents: ["UnitAddedToMap"],
    onActivateCheck: (node) => {
        const player = Players.get(GameContext.localPlayerID);
        if (player && player.Units) {
            const missionary = player.Units.getBuildUnit("UNIT_MISSIONARY");
            const missionaryDef = GameInfo.Units.lookup(missionary);
            if (missionaryDef) {
                return TutorialSupport.isUnitOfType(node, [missionaryDef.UnitType]);
            }
        }
        return false;
    },
    onActivate: (item) => {
        const activationEventData = TutorialManager.activatingEvent;
        if (activationEventData) {
            Camera.lookAtPlot(activationEventData.location);
            item.highlightPlots = [GameplayMap.getIndexFromLocation(activationEventData.location)];
        }
    },
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "educationUnlocked",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: "LOC_TUTORIAL_EDUCATION_TECH_UNLOCKED_TITLE",
        body: { text: "LOC_TUTORIAL_EDUCATION_TECH_UNLOCKED_BODY" },
        option1: calloutClose,
        option2: {
            callback: () => {
                ContextManager.push("screen-victory-progress", { singleton: true, createMouseGuard: true });
            },
            text: "LOC_TUTORIAL_CALLOUT_VICTORIES",
            actionKey: "inline-accept",
            closes: true
        },
    },
    activationEngineEvents: ["TechNodeCompleted"],
    onActivateCheck: (node) => {
        return TutorialSupport.didTechUnlock(node, "NODE_TECH_EX_EDUCATION");
    },
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "unitDamageAtSea",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: "LOC_TUTORIAL_UNIT_DAMAGED_AT_SEA_TITLE",
        body: { text: "LOC_TUTORIAL_UNIT_DAMAGED_AT_SEA_BODY_ALT" },
        option1: calloutContinue
    },
    activationEngineEvents: ["UnitMoved"],
    onActivateCheck: (_item) => {
        const activationEventData = TutorialManager.activatingEvent;
        if (activationEventData.unit != null) {
            const unit = Units.get(activationEventData.unit);
            if (unit != null) {
                const unitDefinition = GameInfo.Units.lookup(unit.type);
                if (unitDefinition) {
                    if (unitDefinition.Domain == "DOMAIN_SEA") {
                        return true;
                    }
                    if (unitDefinition.Domain == "DOMAIN_LAND" && unit.isEmbarked) {
                        return true;
                    }
                }
            }
        }
        return false;
    },
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "fleetCommanderAvailable",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: "LOC_TUTORIAL_FLEET_COMMANDER_AVAILABLE_TITLE",
        body: {
            text: "LOC_TUTORIAL_FLEET_COMMANDER_AVAILABLE_BODY",
            getLocParams: () => {
                let commanderIcon = "";
                let commanderName = "";
                const player = Players.get(GameContext.localPlayerID);
                if (player && player.Units) {
                    const fleetCommander = player.Units.getBuildUnit("UNIT_FLEET_COMMANDER");
                    const commanderDef = GameInfo.Units.lookup(fleetCommander);
                    if (commanderDef) {
                        commanderIcon = "[icon:" + commanderDef.UnitType + "]";
                        commanderName = commanderDef.Name;
                    }
                }
                return [commanderIcon, commanderName];
            }
        },
        option1: calloutClose,
    },
    activationEngineEvents: ["UnitAddedToMap"],
    onActivateCheck: (_item) => {
        const activationEventData = TutorialManager.activatingEvent;
        if (activationEventData.unit != null) {
            const unit = Units.get(activationEventData.unit);
            if (unit != null) {
                const unitDefinition = GameInfo.Units.lookup(unit.type);
                if (unitDefinition) {
                    if (unitDefinition.Domain == "DOMAIN_SEA" && unit.isCommanderUnit) {
                        return true;
                    }
                }
            }
        }
        return false;
    },
    onActivate: (item) => {
        const activationEventData = TutorialManager.activatingEvent;
        if (activationEventData) {
            Camera.lookAtPlot(activationEventData.location);
            item.highlightPlots = [GameplayMap.getIndexFromLocation(activationEventData.location)];
        }
    },
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "tutorial_found_religion",
    filterPlayers: [],
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: "LOC_TUTORIAL_RELIGION_TITLE",
        body: {
            text: "LOC_TUTORIAL_RELIGION_BODY",
            getLocParams: () => {
                let civAdj = "";
                const player = Players.get(GameContext.localPlayerID);
                if (player) {
                    civAdj = player.civilizationAdjective;
                }
                return [civAdj];
            }
        },
        option1: calloutClose,
    },
    activationEngineEvents: ["NotificationActivated"],
    onActivateCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        if (player) {
            const activationEventData = TutorialManager.activatingEvent;
            if (activationEventData.byUser && activationEventData.id.owner == player.id) {
                const notification = Game.Notifications.find(activationEventData.id);
                if (notification) {
                    if (Game.Notifications.getTypeName(notification.Type) == "NOTIFICATION_CHOOSE_RELIGION") {
                        return true;
                    }
                }
            }
        }
        return false;
    },
    completionCustomEvents: ["interface-mode-changed", "ReligionFounded"],
});
// ------------------------------------------------------------------
TutorialManager.add({
    ID: "tutorial_choose_belief",
    filterPlayers: [],
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: "LOC_TUTORIAL_BELIEF_TITLE",
        body: { text: "LOC_TUTORIAL_BELIEF_BODY" },
        option1: calloutClose,
    },
    activationEngineEvents: ["NotificationActivated"],
    onActivateCheck: (_item) => {
        const player = Players.get(GameContext.localPlayerID);
        if (player) {
            const activationEventData = TutorialManager.activatingEvent;
            if (activationEventData.byUser && activationEventData.id.owner == player.id) {
                const notification = Game.Notifications.find(activationEventData.id);
                if (notification) {
                    if (Game.Notifications.getTypeName(notification.Type) == "NOTIFICATION_CHOOSE_BELIEF") {
                        return true;
                    }
                }
            }
        }
        return false;
    },
    completionCustomEvents: ["interface-mode-changed", "OnContextManagerClose"],
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
TutorialManager.add({
    ID: "tutorial_overbuilding",
    callout: {
        anchorPosition: TutorialAnchorPosition.MiddleRight,
        title: "LOC_TUTORIAL_OVERBUILDING_TITLE",
        body: {
            text: "LOC_TUTORIAL_OVERBUILDING_BODY",
            getLocParams: (_item) => {
                let civAdj = "";
                const player = Players.get(GameContext.localPlayerID);
                if (player) {
                    civAdj = player.civilizationAdjective;
                }
                return [civAdj];
            },
        },
        option1: calloutClose,
    },
    activationCustomEvents: ["interface-mode-changed"],
    onActivateCheck: (_item) => {
        if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
            return true;
        }
        return false;
    },
    completionEngineEvents: ["CityProductionChanged", "interface-mode-changed"],
});
// ------------------------------------------------------------------
TutorialManager.process("exploration items"); // Must appear at end

//# sourceMappingURL=file:///age-exploration/ui/tutorial/tutorial-items-exploration.js.map
