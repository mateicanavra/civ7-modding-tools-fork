/**
 * @file tutorial-items-antiquity.ts
 * @copyright 2020-2025, Firaxis Games
 * @description Defines the sequence of tutorial items for the antiquity age.
 * 
 * @example To skip a welcome tutorial:  skip: ((): boolean => { return (Configuration.getUser().skipEraWelcomeTutorial == 1); })(),		// evaluated immediately when added bank
 */

import ContextManager from '/core/ui/context-manager/context-manager.js';
import PlotCursor from '/core/ui/input/plot-cursor.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import LensManager from '/core/ui/lenses/lens-manager.js';
import TooltipManager from '/core/ui/tooltips/tooltip-manager.js';

import TutorialItem, { NextItemStatus, TutorialActionPrompt, TutorialAnchorPosition, TutorialCalloutOptionDefinition } from '/base-standard/ui/tutorial/tutorial-item.js';
import TutorialManager from '/base-standard/ui/tutorial/tutorial-manager.js';
import * as TutorialSupport from '/base-standard/ui/tutorial/tutorial-support.js';
import DiplomacyManager from '/base-standard/ui/diplomacy/diplomacy-manager.js'

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
function calloutAcceptNext(nextID: string): TutorialCalloutOptionDefinition { return TutorialSupport.calloutAcceptNext(nextID); }
// @ts-ignore
function calloutBeginNext(nextID: string): TutorialCalloutOptionDefinition { return TutorialSupport.calloutBeginNext(nextID); }
// @ts-ignore
function calloutCloseNext(nextID: string): TutorialCalloutOptionDefinition { return TutorialSupport.calloutCloseNext(nextID); }
// @ts-ignore
function calloutContinueNext(nextID: string): TutorialCalloutOptionDefinition { return TutorialSupport.calloutContinueNext(nextID); }


/**
 * KLUDGE:
 * The event 'UnitMovementPointsChanged' gets called very frequently (at least 2x per unit) and for every unit on the map.
 * This tutorial items only cares about the local player, however, the general tutorial system overhead is significant enough
 * that the frequent false positive calls can cause significant slowdown.
 * 
 * This kludge shims in a new event that is specific to the local player in order to reduce the number of times the tutorial
 * system must process the event.
 */
const LOCAL_PLAYER_UNIT_MOVEMENT_POINTS_CHANGED = 'LocalPlayerUnitMovementPointsChanged';
engine.whenReady.then(() => {
	engine.on('UnitMovementPointsChanged', (data) => {
		if (data.unit.owner == GameContext.localPlayerID) {
			engine.trigger(LOCAL_PLAYER_UNIT_MOVEMENT_POINTS_CHANGED, data);
		}
	});
});

// ------------------------------------------------------------------
// 	Welcome Tutorial Dialog o' Instructions
const welcome0 = {
	ID: "welcome0",
	activationEngineEvents: ["GameStarted"],
	//skip: true, // TODO: uncomment when real content added below: ((): boolean => { return (Configuration.getUser().skipEraWelcomeTutorial == 1); })(),		// evaluated immediately when item is added to the bank	
	filterPlayers: [],
	runAllTurns: true,
	dialog: {
		series: [
			{
				images: [{ image: "fs://game/base-standard/ui/images/tutorial/antiquity_tutorial_overview.png", width: 126, height: 120, x: 103, y: -6 }],
				title: Locale.compose("LOC_TUTORIAL_ANTIQUITY_WELCOME_PAGE_ONE_TITLE"),
				subtitle: Locale.compose("LOC_TUTORIAL_ANTIQUITY_WELCOME_PAGE_ONE_SUBTITLE"),
				body: Locale.stylize(Locale.compose("LOC_TUTORIAL_ANTIQUITY_WELCOME_PAGE_ONE_BODY")),
				backgroundImages: [
					"fs://game/sa_1-3Welcome",
					"fs://game/sa_1-2Welcome",
					"fs://game/sa_1-1Welcome"
				]
			}
			, {
				images: [{ image: "fs://game/base-standard/ui/images/tutorial/antiquity_tutorial_victory_1.png", width: 72, height: 72, x: 48, y: 0 }, { image: "fs://game/base-standard/ui/images/tutorial/antiquity_tutorial_victory_2.png", width: 72, height: 72, x: 126, y: 0 }],
				title: Locale.compose("LOC_TUTORIAL_ANTIQUITY_WELCOME_PAGE_TWO_TITLE"),
				subtitle: Locale.compose("LOC_TUTORIAL_ANTIQUITY_WELCOME_PAGE_TWO_SUBTITLE"),
				body: Locale.stylize(Locale.compose("LOC_TUTORIAL_ANTIQUITY_WELCOME_PAGE_TWO_BODY")),
				backgroundImages: [
					"fs://game/sa_2-3Ages",
					"fs://game/sa_2-2Ages",
					"fs://game/sa_2-1Ages"
				]
			}
			, {
				images: [{ image: "fs://game/base-standard/ui/images/tutorial/antiquity_tutorial_city.png", width: 120, height: 120, x: 106, y: 15 }],
				title: Locale.compose("LOC_TUTORIAL_ANTIQUITY_WELCOME_PAGE_THREE_TITLE"),
				subtitle: Locale.compose("LOC_TUTORIAL_ANTIQUITY_WELCOME_PAGE_THREE_SUBTITLE"),
				body: Locale.stylize(Locale.compose("LOC_TUTORIAL_ANTIQUITY_WELCOME_PAGE_THREE_BODY")),
				backgroundImages: [
					"fs://game/sa_3-3Victories",
					"fs://game/sa_3-2Victories",
					"fs://game/sa_3-1Victories"
				]
			}
			, {
				images: [{ image: "fs://game/base-standard/ui/images/tutorial/antiquity_tutorial_diplomacy_1.png", width: 72, height: 72, x: 150, y: 0 },
				{ image: "fs://game/base-standard/ui/images/tutorial/antiquity_tutorial_land_claim_2.png", width: 72, height: 72, x: 150, y: 60 }],
				title: Locale.compose("LOC_TUTORIAL_ANTIQUITY_WELCOME_PAGE_SEVEN_TITLE"),
				subtitle: Locale.compose("LOC_TUTORIAL_ANTIQUITY_WELCOME_PAGE_SEVEN_SUBTITLE"),
				body: Locale.stylize(Locale.compose("LOC_TUTORIAL_ANTIQUITY_WELCOME_PAGE_SEVEN_BODY")),
				backgroundImages: [
					"fs://game/sa_4-3Challenges",
					"fs://game/sa_4-2Challenges",
					"fs://game/sa_4-1Challenges"
				]
			}
		]
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return Game.turn > 1;
	},
	onActivate: (_item: TutorialItem) => {
		InterfaceMode.switchTo("INTERFACEMODE_TUTORIAL_START", { lazyInit: true });	// Needed lazy init, since loading screen pull has not happened.		
	}
};
TutorialManager.add(welcome0, { isWelcomeInstructions: true });

// ---------------------------------------------------------------------------
//CONTROLLER FTUE: HYBRID
TutorialManager.add({
	ID: "tutorial_hybrid_controller",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_HYBRID_CONTROLLER_TITLE",
		body: {
			text: "LOC_TUTORIAL_HYBRID_CONTROLLER_BODY",
		},
		actionPrompts: [
			{
				kbm: "LOC_TUTORIAL_HYBRID_CONTROLLER_CONFIRM_KBM",
				gamepad: "LOC_TUTORIAL_HYBRID_CONTROLLER_CONFIRM_GAMEPAD",
				hybrid: "LOC_TUTORIAL_HYBRID_CONTROLLER_CONFIRM_HYBRID",
				touch: "LOC_TUTORIAL_HYBRID_CONTROLLER_CONFIRM_TOUCH",
				actionName: "mousebutton-left"
			},
			{
				kbm: "LOC_TUTORIAL_HYBRID_CONTROLLER_CANCEL_KBM",
				gamepad: "LOC_TUTORIAL_HYBRID_CONTROLLER_CANCEL_GAMEPAD",
				hybrid: "LOC_TUTORIAL_HYBRID_CONTROLLER_CANCEL_HYBRID",
				touch: "LOC_TUTORIAL_HYBRID_CONTROLLER_CANCEL_TOUCH",
				actionName: "mousebutton-right"
			},
		],
		option1: calloutContinue,
	},
	activationCustomEvents: ["active-device-type-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		let inputType = Input.getActiveDeviceType()
		if (inputType == InputDeviceType.Hybrid) {
			return true;
		}
		return false
	},
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "welcome_intro",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_WELCOME_TITLE"),
		body: {
			text: Locale.compose("LOC_TUTORIAL_WELCOME_BODY")
		},
		option1: calloutBegin,
	},
	activationEngineEvents: ["GameStarted"],
	filterPlayers: [],
	disable: ["world-input", "unit-flags"],
	runAllTurns: true,
	onActivate: (_item: TutorialItem) => {
		InterfaceMode.switchTo("INTERFACEMODE_TUTORIAL_START");
		LensManager.setActiveLens('fxs-default-lens');
	},
	completionEngineEvents: ["UnitSelectionChanged"],
	onObsoleteCheck: (_item: TutorialItem) => {
		return Game.turn > 1;
	},
	nextID: "welcome_capital",
	hiders: [".tut-action-button", ".tut-action-text", "panel-notification-train"],
	inputFilters: [{ inputName: "next-action" }]
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "welcome_capital",
	isPersistent: true,
	onActivate: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			// Again, make sure the camera is centered on their Settler unit and highlight its plot
			const units: ComponentID[] | undefined = player.Units?.getUnitIds();
			if (units) {
				units.forEach(unitID => {
					const unit: Unit | null = Units.get(unitID);
					if (unit) {
						const unitDef: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
						if (unitDef) {
							if (unitDef.FoundCity == true) {
								const loc: float2 = unit.location;
								_item.highlightPlots = [GameplayMap.getIndexFromLocation(loc)];
								// also need to set the cursor to this plot location for gamepad
								PlotCursor.plotCursorCoords = unit.location;
							}
						}
					}
				});
			}
		}
	},
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleLeft,
		title: Locale.compose("LOC_TUTORIAL_LEADER_AND_CIV_TITLE"),
		body: {
			text: "LOC_TUTORIAL_LEADER_AND_CIV_BODY",
			getLocParams: (_item: TutorialItem) => {
				let leaderName: string = "";
				let civName: string = "";
				let founderName: string = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					const units: ComponentID[] | undefined = player.Units?.getUnitIds();
					if (units) {
						units.forEach(unitID => {
							const unit: Unit | null = Units.get(unitID);
							if (unit) {
								const unitDef: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
								if (unitDef) {
									if (unitDef.FoundCity == true) {
										founderName = unit.name;
									}
								}
							}
						});
					}
					const leaderType: LeaderType = player.leaderType;
					const leader: LeaderDefinition | null = GameInfo.Leaders.lookup(leaderType);
					leaderName = (leader == null) ? "LOC_LEADER_NONE_NAME" : leader.Name;
					civName = player.civilizationAdjective;
				}
				return [leaderName, civName, founderName];
			},
		},
		actionPrompts: [
			{
				kbm: "LOC_TUTORIAL_LEADER_AND_CIV_BODY_KBM",
				gamepad: "LOC_TUTORIAL_LEADER_AND_CIV_BODY_GAMEPAD",
				hybrid: "LOC_TUTORIAL_LEADER_AND_CIV_BODY_KBM",
				touch: "LOC_TUTORIAL_LEADER_AND_CIV_BODY_TOUCH",
				actionName: "inline-confirm"
			}
		],
	},
	completionEngineEvents: ["UnitSelectionChanged"],
	onCompleteCheck: (_item: TutorialItem) => {
		let bFounderSelected: boolean = false;
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			// For this we definitely need to be looking at the Settler
			const units: ComponentID[] | undefined = player.Units?.getUnitIds();
			if (units) {
				units.forEach(unitID => {
					const unit: Unit | null = Units.get(unitID);
					if (unit) {
						const unitDef: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
						if (unitDef) {
							if (unitDef.FoundCity == true) {
								const unitComponentID: ComponentID | null = UI.Player.getHeadSelectedUnit();
								if (unitComponentID?.id == unitID.id) {
									bFounderSelected = true;
								}
							}
						}
					}
				});
			}
		}
		return bFounderSelected;
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		return Game.turn > 1;
	},
	hiders: [".tut-action-button", ".tut-action-text", "panel-notification-train"],
	inputFilters: [{ inputName: "next-action" }]
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "found_city",
	isPersistent: true,
	activationEngineEvents: ["InteractUnitDataUpdated"],
	onActivateCheck: (_item: TutorialItem) => {
		if (TutorialManager.isItemCompleted('welcome_capital')) {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				const playerCities = player.Cities;
				if (playerCities && playerCities.getCities().length == 0) {
					return true;
				}
			}
		}
		return false;
	},
	onActivate: (item: TutorialItem) => {
		waitForLayout(() => { // waits for the layout to be ready and updated
			LensManager.enableLayer("fxs-yields-layer");
			waitUntilValue(() => {
				// make sure we don't have duplicates for this specific highlight
				const highlightLeftover: HTMLElement | null = document.querySelector<HTMLElement>(".tut-circle-highlight");
				if (highlightLeftover) {
					return null;
				}
				return true;
			}).then(() => {
				// if no duplicates, reactivate the overwritten highlight element
				item.activateHighlights();
			}).catch(() => {
				console.warn("found_city: onActivate(): No update for unit-actions happened, the TutorialManager highlight managed it");
			});
		});
	},
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_YOUR_FIRST_CITY_TITLE"),
		body: {
			text: "LOC_TUTORIAL_YOUR_FIRST_CITY_BODY",
			getLocParams: (_item: TutorialItem) => {
				let FounderUnitName: string = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					// For this we definitely need to be looking at the Settler
					const units: ComponentID[] | undefined = player.Units?.getUnitIds();
					if (units) {
						units.forEach(unitID => {
							const unit: Unit | null = Units.get(unitID);
							if (unit) {
								const unitDef: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
								if (unitDef) {
									if (unitDef.FoundCity == true) {
										FounderUnitName = unit.name;
									}
								}
							}
						});
					}
				}
				return [FounderUnitName];
			},
		},
		actionPrompts: [{
			kbm: "LOC_TUTORIAL_YOUR_FIRST_CITY_BODY_KBM",
			gamepad: "LOC_TUTORIAL_YOUR_FIRST_CITY_BODY_GAMEPAD",
			hybrid: "LOC_TUTORIAL_YOUR_FIRST_CITY_BODY_KBM",
			touch: "LOC_TUTORIAL_YOUR_FIRST_CITY_BODY_TOUCH",
			actionName: "inline-confirm"
		}]
	},
	completionEngineEvents: ["CityAddedToMap", "UnitRemovedFromMap"],
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			if (TutorialManager.activatingEventName == "UnitRemovedFromMap") {
				const playerUnits = player.Units;
				if (playerUnits && playerUnits.getUnits().length < 1) {
					return true;
				}
			}

			const playerCities = player.Cities;
			if (playerCities && playerCities.getCities().length > 0) {
				const capital = playerCities.getCapital();
				if (capital) {
					return true;
				}
			}
		}
		return false;
	},
	onCleanUp: (_item: TutorialItem) => {
		LensManager.disableLayer("fxs-yields-layer");
	},
	highlights: [".unit-action-UNITOPERATION_FOUND_CITY"], // need a better way to highlight specific buttons in the unit action UI
	hiders: ["panel-notification-train"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "welcome_city_info",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_CAPITAL_CITY_INFO_TITLE"),
		body: {
			text: "LOC_TUTORIAL_CAPITAL_CITY_INFO_BODY",
			getLocParams: (_item: TutorialItem) => {
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				let cityName: string = " ";
				let civAdjective: string = " ";
				if (player) {
					civAdjective = player.civilizationAdjective;
					const playerCities = player.Cities;
					if (playerCities) {
						const capital = playerCities.getCapital();
						if (capital) {
							cityName = capital.name;
							const loc: float2 = capital.location;
							Camera.lookAtPlot(loc, { zoom: 0.25 });
						}
					}
				}
				return [cityName, civAdjective];
			},
		},
		option1: calloutContinue,
	},
	activationEngineEvents: ["CityAddedToMap"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const playerCities = player.Cities;
			if (playerCities && playerCities.getCities().length > 0) {
				const capital = playerCities.getCapital();
				if (capital) {
					return true;
				}
			}
		}
		return false;
	},
	onCleanUp: () => {
		// The next item is chained so it should start in a blank state context wise
		InterfaceMode.isInDefaultMode() ? Input.setActiveContext(InputContext.World) : InterfaceMode.switchToDefault();
	},
	hiders: [".tut-action-button", ".tut-action-text", "panel-notification-train"],
	inputFilters: [{ inputName: "next-action" }],
	nextID: "tutorial_first_production",
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_first_production",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_PRODUCTION_INTRO_TITLE"),
		body: {
			text: "LOC_TUTORIAL_PRODUCTION_INTRO_BODY"
		},
		actionPrompts: [{
			kbm: "LOC_TUTORIAL_PRODUCTION_INTRO_BODY_KBM",
			gamepad: "LOC_TUTORIAL_PRODUCTION_INTRO_BODY_GAMEPAD",
			hybrid: "LOC_TUTORIAL_PRODUCTION_INTRO_BODY_KBM",
			touch: "LOC_TUTORIAL_PRODUCTION_INTRO_BODY_TOUCH",
			actionName: "inline-next-action"
		}],
	},
	onActivate: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const playerCities = player.Cities;
			if (playerCities) {
				const capital = playerCities.getCapital();
				if (capital) {
					const loc: float2 = capital.location;
					Camera.lookAtPlot(loc, { zoom: 0.25 });
				}
			}
		}
	},
	inputContext: InputContext.World,
	completionCustomEvents: ["interface-mode-changed"],
	onCompleteCheck: (_item: TutorialItem) => {
		if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
			return true;
		}
		return false;
	},
	highlights: [".action-panel__button-next-action"],
	hiders: ["panel-notification-train"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_first_production_choice",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_FIRST_PRODUCTION_TITLE"),
		body: {
			text: "LOC_TUTORIAL_FIRST_PRODUCTION_BODY",
			getLocParams: (_item: TutorialItem) => {
				let Item1Desc: string = "";
				let Item2Desc: string = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					const playerCities = player.Cities;
					if (playerCities) {
						const capital = playerCities.getCapital();
						if (capital) {
							GameInfo.Units.forEach(u => {
								if (u.UnitMovementClass == "UNIT_MOVEMENT_CLASS_RECON") {
									let result: OperationResult | null = null;
									result = Game.CityOperations.canStart(capital.id, CityOperationTypes.BUILD, { UnitType: u.$index }, false);
									if (result.Success) {
										let icon: string = "[icon:" + u.UnitType + "]";
										Item1Desc = Locale.compose("LOC_TUTORIAL_FIRST_PRODUCTION_SCOUT_ITEM_TEXT", u.Name, icon);
									}
								}
								else if (u.CoreClass == "CORE_CLASS_MILITARY") {
									let result: OperationResult | null = null;
									result = Game.CityOperations.canStart(capital.id, CityOperationTypes.BUILD, { UnitType: u.$index }, false);
									if (result.Success) {
										let icon: string = "[icon:" + u.UnitType + "]";
										Item2Desc = Locale.compose("LOC_TUTORIAL_FIRST_PRODUCTION_WARRIOR_ITEM_TEXT", u.Name, icon);
									}
								}
							});
						}
					}
				}
				return [Item1Desc, Item2Desc];
			}
		},
		actionPrompts: [{
			kbm: "LOC_TUTORIAL_FIRST_PRODUCTION_BODY_KBM",
			gamepad: "LOC_TUTORIAL_FIRST_PRODUCTION_BODY_GAMEPAD",
			hybrid: "LOC_TUTORIAL_FIRST_PRODUCTION_BODY_KBM",
			touch: "LOC_TUTORIAL_FIRST_PRODUCTION_BODY_TOUCH",
			actionName: "inline-confirm"
		}],
	},
	onActivate: (item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const playerCities = player.Cities;
			if (playerCities) {
				const capital = playerCities.getCapital();
				if (capital) {
					const buttonHighlights: string[] = [];
					GameInfo.Units.forEach(u => {
						if (u.UnitMovementClass == "UNIT_MOVEMENT_CLASS_RECON") {
							let result: OperationResult | null = null;
							result = Game.CityOperations.canStart(capital.id, CityOperationTypes.BUILD, { UnitType: u.$index }, false);
							if (result.Success) {
								let highlightStr = ".production-item[item-type=\"" + u.UnitType + "\"]";
								buttonHighlights.push(highlightStr);
							}
						}
						else if (u.CoreClass == "CORE_CLASS_MILITARY") {
							let result: OperationResult | null = null;
							result = Game.CityOperations.canStart(capital.id, CityOperationTypes.BUILD, { UnitType: u.$index }, false);
							if (result.Success) {
								let highlightStr = ".production-item[item-type=\"" + u.UnitType + "\"]";
								buttonHighlights.push(highlightStr);
							}
						}
					});
					item.highlights = buttonHighlights;
				}
			}
		}
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
			return true;
		}
		return false;
	},
	completionEngineEvents: ["CityProductionChanged"],
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const playerCities = player.Cities;
			if (playerCities) {
				const capital = playerCities.getCapital();
				if (capital) {
					if (capital.BuildQueue?.currentProductionTypeHash != null) {
						return true;
					}
				}
			}
		}
		return false;
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "end_first_turn",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_END_TURN_TITLE"),
		body: {
			text: "LOC_TUTORIAL_END_TURN_BODY"
		},
		actionPrompts: [
			{
				kbm: "LOC_TUTORIAL_END_TURN_BODY_KBM",
				gamepad: "LOC_TUTORIAL_END_TURN_BODY_GAMEPAD",
				hybrid: "LOC_TUTORIAL_END_TURN_BODY_KBM",
				touch: "LOC_TUTORIAL_END_TURN_BODY_TOUCH",
				actionName: "inline-next-action"
			}
		],
	},
	activationEngineEvents: ["CityProductionChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const playerCities = player.Cities;
			if (playerCities) {
				const capital = playerCities.getCapital();
				if (capital) {
					if (capital.BuildQueue?.currentProductionTypeHash != null) {
						return true;
					}
				}
			}
		}
		return false;
	},
	inputContext: InputContext.World,
	completionEngineEvents: ["PlayerTurnDeactivated"],
	highlights: [".action-panel__button-next-action"],
	nextID: "the_unrevealed_world",
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "the_unrevealed_world",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_UNREVEALED_WORLD_TITLE"),
		body: {
			text: Locale.compose("LOC_TUTORIAL_UNREVEALED_WORLD_BODY")
		},
		option1: calloutContinue,
	},
	onActivate: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const playerCities = player.Cities;
			if (playerCities) {
				const capital = playerCities.getCapital();
				if (capital) {
					const loc: float2 = capital.location;
					Camera.lookAtPlot(loc, { zoom: 0.5 });
				}
			}
		}
	},
	hiders: [".tut-action-button", ".tut-action-text"],
	inputFilters: [{ inputName: "next-action" }]
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "first_unit_explore",
	activationEngineEvents: ["CityProductionCompleted"],
	disable: ["world-city-input"],
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_FIRST_UNIT_MOVE_TITLE"),
		body: {
			text: "LOC_TUTORIAL_FIRST_UNIT_MOVE_BODY",
			getLocParams: (_item: TutorialItem) => {
				let specificUnitDesc: string = "";
				const activationEventData = (TutorialManager.activatingEvent as CityProductionCompleted_EventData);
				if (activationEventData.productionKind == ProductionKind.UNIT) {
					let prodItem = activationEventData.productionItem;
					//Different action suggestion based on unit trained
					let unitDefinition = GameInfo.Units.lookup(prodItem);
					if (unitDefinition) {
						if (unitDefinition.UnitMovementClass == "UNIT_MOVEMENT_CLASS_RECON") {
							const actionPromptsDef: TutorialActionPrompt[] = [{
								actionName: "inline-confirm",
								kbm: "LOC_TUTORIAL_FIRST_UNIT_MOVE_ADD1_KBM",
								gamepad: "LOC_TUTORIAL_FIRST_UNIT_MOVE_ADD1_GAMEPAD",
								hybrid: "LOC_TUTORIAL_FIRST_UNIT_MOVE_ADD1_KBM",
								touch: "LOC_TUTORIAL_FIRST_UNIT_MOVE_ADD1_TOUCH"
							}];
							const prompts: string[] = TutorialSupport.getTutorialPrompts(actionPromptsDef);
							const icon: string = "[icon:" + unitDefinition.UnitType + "]";
							specificUnitDesc = Locale.compose("LOC_TUTORIAL_FIRST_UNIT_MOVE_ADD1", icon, unitDefinition.Name, ...prompts);
						}
						else if (unitDefinition.CoreClass == "CORE_CLASS_MILITARY") {
							const actionPromptsDef: TutorialActionPrompt[] = [{
								actionName: "inline-confirm",
								kbm: "LOC_TUTORIAL_FIRST_UNIT_MOVE_ADD2_KBM",
								gamepad: "LOC_TUTORIAL_FIRST_UNIT_MOVE_ADD2_GAMEPAD",
								hybrid: "LOC_TUTORIAL_FIRST_UNIT_MOVE_ADD2_KBM",
								touch: "LOC_TUTORIAL_FIRST_UNIT_MOVE_ADD2_TOUCH"
							}];
							const prompts: string[] = TutorialSupport.getTutorialPrompts(actionPromptsDef);
							const icon: string = "[icon:" + unitDefinition.UnitType + "]";
							specificUnitDesc = Locale.compose("LOC_TUTORIAL_FIRST_UNIT_MOVE_ADD2", icon, unitDefinition.Name, ...prompts);
						}
					}
				}
				return [specificUnitDesc];
			},
		}
	},
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (!player) {
			return false;
		}
		const units: ComponentID[] | undefined = player.Units?.getUnitIds();
		if (!units) {
			return false;
		}
		for (let i = 0; i < units.length; i++) {	// prefer old-school for() to minimize GC from lambda 
			const unitID = units[i];
			const unit = Units.get(unitID);
			if (!unit) continue;
			if (unit.Movement?.canMove) {
				return true;	// Done, exit.
			}
		}
		return false;
	},
	onActivate: (_item: TutorialItem) => {
		UI.Player.selectNextReadyUnit();
	},
	onCompleteCheck: (_item: TutorialItem) => {
		let bSpentMovementOrSkipOrRemoved: boolean = false;
		const activationEventData = (TutorialManager.activatingEvent);
		let thisUnit = Units.get(activationEventData.unit);
		if (thisUnit) {
			if (TutorialManager.activatingEventName == "UnitActivityChanged") {
				bSpentMovementOrSkipOrRemoved = UnitOperationTypes.SKIP_TURN == activationEventData.operationType;
			} else {
				bSpentMovementOrSkipOrRemoved = thisUnit.Movement != undefined ? !thisUnit.Movement.canMove : false;
			}
		} else {
			bSpentMovementOrSkipOrRemoved = TutorialManager.activatingEventName == "UnitRemovedFromMap";
		}
		return bSpentMovementOrSkipOrRemoved;
	},
	completionEngineEvents: [LOCAL_PLAYER_UNIT_MOVEMENT_POINTS_CHANGED, "UnitRemovedFromMap", "UnitActivityChanged"],
	hiders: [".tut-action-button", ".tut-action-text"],
	inputFilters: [{ inputName: "next-action" }],
	nextID: "unit_movement_completed"
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "unit_movement_completed",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_MOVEMENT_COMPLETED_TITLE"),
		body: {
			text: "LOC_TUTORIAL_MOVEMENT_COMPLETED_BODY",
		},
		option1: calloutContinue,
	},

	nextID: "tutorial_intro_technology",
	hiders: [".tut-action-button", ".tut-action-text"],
	inputFilters: [{ inputName: "next-action" }]
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_intro_technology",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_TECHNOLOGY_INTRO_TITLE"),
		body: {
			text: "LOC_TUTORIAL_TECHNOLOGY_INTRO_BODY",
		},
		actionPrompts: [
			{
				kbm: "LOC_TUTORIAL_TECHNOLOGY_INTRO_BODY_KBM",
				gamepad: "LOC_TUTORIAL_TECHNOLOGY_INTRO_BODY_GAMEPAD",
				hybrid: "LOC_TUTORIAL_TECHNOLOGY_INTRO_BODY_KBM",
				touch: "LOC_TUTORIAL_TECHNOLOGY_INTRO_BODY_TOUCH",
				actionName: "inline-next-action"
			}
		],
	},
	onActivate: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const playerCities = player.Cities;
			if (playerCities) {
				const capital = playerCities.getCapital();
				if (capital) {
					const loc: float2 = capital.location;
					Camera.lookAtPlot(loc, { zoom: 0.25 });
				}
			}
		}
	},
	inputContext: InputContext.World,
	completionCustomEvents: ["OnContextManagerOpen_screen-tech-tree-chooser"],
	highlights: [".action-panel__button-next-action"],
	nextID: "tutorial_choose_first_tech",
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_choose_first_tech",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_CHOOSE_FIRST_TECH_TITLE"),
		body: {
			text: "LOC_TUTORIAL_CHOOSE_FIRST_TECH_BODY"
		},
		actionPrompts: [
			{
				kbm: "LOC_TUTORIAL_CHOOSE_FIRST_TECH_BODY_MORE_INFO_KBM",
				gamepad: "LOC_TUTORIAL_CHOOSE_FIRST_TECH_BODY_MORE_INFO_GAMEPAD",
				hybrid: "LOC_TUTORIAL_CHOOSE_FIRST_TECH_BODY_MORE_INFO_KBM",
				touch: "LOC_TUTORIAL_CHOOSE_FIRST_TECH_BODY_MORE_INFO_TOUCH",
				actionName: "inline-confirm"
			},
			{
				kbm: "LOC_TUTORIAL_CHOOSE_FIRST_TECH_BODY_KBM",
				gamepad: "LOC_TUTORIAL_CHOOSE_FIRST_TECH_BODY_GAMEPAD",
				hybrid: "LOC_TUTORIAL_CHOOSE_FIRST_TECH_BODY_KBM",
				touch: "LOC_TUTORIAL_CHOOSE_FIRST_TECH_BODY_TOUCH",
				actionName: "inline-confirm"
			}
		],
	},
	inputContext: InputContext.Dual,
	completionEngineEvents: ["TechTreeChanged", "TechTargetChanged"],
	nextID: "tutorial_tech_progression",
	highlights: ['.tech-item']
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_tech_progression",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		// TODO: can we highlight the tech progress turn indicator for this item?
		title: Locale.compose("LOC_TUTORIAL_TECH_PROGRESSION_TITLE"),
		body: {
			text: "LOC_TUTORIAL_TECH_PROGRESSION_BODY",
			getLocParams: (_item: TutorialItem) => {
				let techName: LocalizedTextArgument = "";
				let techCost: LocalizedTextArgument = "";
				let amount: LocalizedTextArgument = "";
				let turns: LocalizedTextArgument = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					const techs: PlayerTechs | undefined = player.Techs;
					if (techs) {
						const techTreeType: ProgressionTreeType = techs.getTreeType();
						const treeObject: ProgressionTree | null = Game.ProgressionTrees.getTree(player.id, techTreeType);
						if (treeObject) {
							let currentResearchNode = treeObject.nodes[treeObject.activeNodeIndex]?.nodeType;
							const nodeInfo: ProgressionTreeNodeDefinition | null = GameInfo.ProgressionTreeNodes.lookup(currentResearchNode);
							if (nodeInfo) {
								techName = nodeInfo?.Name ?? '';
								techCost = techs.getNodeCost(currentResearchNode);
								amount = player.Stats?.getNetYield(YieldTypes.YIELD_SCIENCE) ?? 0;
								turns = techs.getTurnsLeft();
							}
						};
					}
				}
				return [techName, techCost, amount, turns];
			}
		},
		option1: calloutContinue,
	},
	onCleanUp: (item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			// at this moment in game there should be only one city
			const cities = player.Cities?.getCities();
			if (!cities) {
				return;
			}
			const hasBuildQueue: boolean = cities.some(city => {
				if (!city || !city.BuildQueue) {
					return;
				}
				return !city.BuildQueue.isEmpty;
			});

			if (hasBuildQueue) {
				// Break the chain
				item.nextID = NextItemStatus.Canceled;
			}
			return;
		}
	},
	highlights: [".ssb__element.tut-tech .ssb-button__turn-counter"], //to bring attention to the turns indicator on the Tech system button.
	hiders: [".tut-action-button", ".tut-action-text"],
	inputFilters: [{ inputName: "next-action" }],
	nextID: "tutorial_choose_continued_production"
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "technology_tree",
	filterPlayers: [],
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_TECH_TREE_TITLE"),
		body: {
			text: Locale.compose("LOC_TUTORIAL_TECH_TREE_BODY")
		},
		option1: calloutContinue,
	},
	activationCustomEvents: ["OnContextManagerOpen_screen-tech-tree"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_choose_continued_production",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_CONTINUED_PRODUCTION_TITLE"),
		body: {
			text: Locale.compose("LOC_TUTORIAL_CONTINUED_PRODUCTION_BODY")
		},
	},
	completionCustomEvents: ["interface-mode-changed"],
	onCompleteCheck: (_item: TutorialItem) => {
		if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
			return true;
		}
		return false;
	},
	highlights: [".action-panel__button-next-action"],
	nextID: "tutorial_choose_second_production",
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_choose_second_production",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_CHOOSE_SECOND_PRODUCTION_TITLE"),
		body: {
			text: "LOC_TUTORIAL_CHOOSE_SECOND_PRODUCTION_BODY",
		}
	},
	onActivate: (item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const buttonHighlights: string[] = [];
			buttonHighlights.push(".production-item[item-type=\"BUILDING_GRANARY\"]");
			//Different unit suggestion based on previous unit trained
			const units: ComponentID[] | undefined = player.Units?.getUnitIds();
			if (units) {
				units.forEach(unitID => {
					const unit: Unit | null = Units.get(unitID);
					if (unit) {
						const unitDef: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
						if (unitDef) {
							let reconUnitDef: any;
							let militaryUnitDef: any;
							const playerCities = player.Cities;
							if (playerCities) {
								const capital = playerCities.getCapital();
								if (capital) {
									GameInfo.Units.forEach(u => {
										let result: OperationResult | null = null;
										result = Game.CityOperations.canStart(capital.id, CityOperationTypes.BUILD, { UnitType: u.$index }, false);
										if (result.Success) {
											if (u.UnitMovementClass == "UNIT_MOVEMENT_CLASS_RECON") {
												reconUnitDef = u;
											}
											else if (u.CoreClass == "CORE_CLASS_MILITARY") {
												militaryUnitDef = u;
											}
										}
									});
								}
							}
							if (unitDef.UnitMovementClass == "UNIT_MOVEMENT_CLASS_RECON") {
								if (militaryUnitDef != null) {
									buttonHighlights.push(".production-item[item-type=\"" + militaryUnitDef.UnitType + "\"]");
								}
							}
							else if (unitDef.CoreClass == "CORE_CLASS_MILITARY") {
								if (reconUnitDef != null) {
									buttonHighlights.push(".production-item[item-type=\"" + reconUnitDef.UnitType + "\"]");
								}
							}
						}
					}
				});
			}
			item.highlights = buttonHighlights;
		}
	},
	completionEngineEvents: ["CityProductionChanged", "interface-mode-changed"],
	onCompleteCheck: (_item: TutorialItem) => {
		let mode: string = InterfaceMode.getCurrent();
		if (mode == "INTERFACEMODE_PLACE_BUILDING") {
			_item.nextID = "tutorial_place_building";
			return true;
		}
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const playerCities = player.Cities;
			if (playerCities) {
				const capital = playerCities.getCapital();
				if (capital) {
					let currentHash = capital.BuildQueue?.currentProductionTypeHash;
					if (currentHash != -1) {
						return true;
					}
				}
			}
		}
		return false;
	},
	hiders: [".food-chooser"], //hide the Growth and Yield panels when first introducing the city screen
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_place_building",
	callout: {
		// TODO: add more iconography and visual reference to the building placement UI
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_PLACE_BUILDING_TITLE"),
		body: {
			text: Locale.compose("LOC_TUTORIAL_PLACE_BUILDING_BODY")
		},
		option1: calloutContinue,
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		let mode: string = InterfaceMode.getCurrent();
		if (mode == "INTERFACEMODE_PLACE_BUILDING") {
			return true;
		}
		return false;
	},
	completionEngineEvents: ["CityProductionQueueChanged"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "first_city_growth",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_CITY_FIRST_GROWTH_TITLE"),
		body: {
			text: Locale.compose("LOC_TUTORIAL_CITY_FIRST_GROWTH_BODY")
		},
	},
	activationEngineEvents: ["CityPopulationChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		const localPlayerID: PlayerId = GameContext.localPlayerID;
		const blockingNotification: Notification | undefined = TutorialSupport.getCurrentTurnBlockingNotification(localPlayerID);
		if (blockingNotification) {
			const notificationTypeName: string | null = Game.Notifications.getTypeName(blockingNotification.Type);
			return notificationTypeName == "NOTIFICATION_NEW_POPULATION";
		}
		return false;
	},
	onActivate: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			UI.Player.deselectAllUnits();
			const playerCities = player.Cities;
			if (playerCities) {
				const capital = playerCities.getCapital();
				if (capital && capital.population > 1) {
					const loc: float2 = capital.location;
					Camera.lookAtPlot(loc, { zoom: 0.25 });
				}
			}
		}
	},
	completionCustomEvents: ["interface-mode-changed"],
	onCompleteCheck: (_item: TutorialItem) => {
		let mode: string = InterfaceMode.getCurrent();
		if (mode == "INTERFACEMODE_ACQUIRE_TILE") {
			return true;
		}
		return false;
	},
	highlights: [".action-panel__button-next-action"],
	nextID: "choose_expansion_plot",
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "choose_expansion_plot",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_CITY_CHOOSE_GROWTH_PLOT_TITLE"),
		body: {
			text: Locale.compose("LOC_TUTORIAL_CITY_CHOOSE_GROWTH_PLOT_BODY")
		},
		option1: calloutContinue,
	},
	completionEngineEvents: ["CityTileOwnershipChanged"],
});

// ------------------------------------------------------------------
TutorialManager.add({
	ID: "explain_gold_income",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_PLAYER_GOLD_INCOME_TITLE"),
		body: {
			text: Locale.compose("LOC_TUTORIAL_PLAYER_GOLD_INCOME_BODY")
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_GOLD_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["PlayerTurnActivated"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			if (player.Treasury && player.Treasury?.goldBalance >= 200) {
				// putting in a turn limiter here because it is possible to get free gold right away and we want to delay this messaging
				if (Game.turn > 5) {
					return true;
				}
			}
		}
		return false;
	},
	// TODO: Would be great to be able to point to the gold entry of the yield banner here
});

// ------------------------------------------------------------------
TutorialManager.add({
	ID: "annexed_first_resource",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_ANNEXED_FIRST_RESOURCE_TITLE"),
		body: {
			text: "LOC_TUTORIAL_ANNEXED_FIRST_RESOURCE_BODY",
			getLocParams: (_item: TutorialItem) => {
				let resourceType: string = "";
				let resourceName: string = "";
				let resourceDesc: string = "";
				let resourceTarget: string = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				const activationEventData = (TutorialManager.activatingEvent as CityAndPosition_EventData);
				if (player && activationEventData.cityID.owner == player.id) {
					const city: City | null = Cities.get(activationEventData.cityID);
					if (city) {
						if (city.Districts) {
							for (const districtId of city.Districts?.getIds()) {
								const district = Districts.get(districtId);
								if (district != null && district.location != null && district.location != city.location) {
									let loc = district.location;
									let resource: ResourceType = GameplayMap.getResourceType(loc.x, loc.y);
									if (resource != ResourceTypes.NO_RESOURCE) {
										let resourceInfo = GameInfo.Resources.lookup(resource);
										if (resourceInfo != null) {
											resourceType = resourceInfo.ResourceType;
											resourceName = resourceInfo.Name;
											resourceDesc = resourceInfo.Tooltip;
											if (resourceInfo.ResourceClassType == "RESOURCECLASS_EMPIRE") {
												resourceTarget = "LOC_TUTORIAL_RESOURCE_EMPIRE_EFFECT";
											}
											else if (resourceInfo.ResourceClassType == "RESOURCECLASS_CITY") {
												resourceTarget = "LOC_TUTORIAL_RESOURCE_CITY_EFFECT";
											}
											else {
												resourceTarget = "LOC_TUTORIAL_RESOURCE_BONUS_EFFECT";
											}
										}
										Camera.lookAtPlot(loc, { zoom: 0.25 });
										_item.highlightPlots = [GameplayMap.getIndexFromLocation(loc)];
									}
								}
							}
						}
					}
				}
				return [resourceType, resourceName, resourceDesc, resourceTarget];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_IMPROVEMENT_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["CityTileOwnershipChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		let bAnnexedResource: boolean = false;
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		const activationEventData = (TutorialManager.activatingEvent as CityAndPosition_EventData);
		if (player && activationEventData.cityID.owner == player.id) {
			const city: City | null = Cities.get(activationEventData.cityID);
			if (city) {
				if (city.Districts) {
					for (const districtId of city.Districts?.getIds()) {
						const district = Districts.get(districtId);
						if (district != null && district.location != null && district.location != city.location) {
							let loc = district.location;
							let resource: ResourceType = GameplayMap.getResourceType(loc.x, loc.y);
							if (resource != ResourceTypes.NO_RESOURCE) {
								let resourceInfo = GameInfo.Resources.lookup(resource);
								if (resourceInfo != null) {
									bAnnexedResource = true;
								}
							}
						}
					}
				}
			}
		}
		return bAnnexedResource;
	},
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_trade_first_resource",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_TRADE_FIRST_RESOURCE_TITLE"),
		body: {
			text: "LOC_TUTORIAL_TRADE_FIRST_RESOURCE_BODY",
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_MERCHANTS_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	runAllTurns: true,
	activationCustomEvents: ["TradeRouteAddedToMap"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player && player.Trade) {
			if (player.Trade.countPlayerTradeRoutes() > 0) {
				return true;
			}
		}
		return false;
	},
	completionCustomEvents: ["interface-mode-changed"],
});
// ------------------------------------------------------------------
//const REVEALED_PLOTS_START_QUEST_NUM: number = 40;
const REVEALED_PLOTS_COMPLETE_QUEST_NUM: number = 100;
// DISABLING EXPLORATION QUEST - leaving completion check in for backwards compatability
/*
TutorialManager.add({
	ID: "tutorial_quest_reveal_map_intro",
	callout: {
		title: Locale.compose("LOC_TUTORIAL_QUEST_INTRO_REVEAL_MAP_TITLE"),
		body: {
			text: "LOC_TUTORIAL_QUEST_INTRO_REVEAL_MAP_BODY",
			getLocParams: (_item: TutorialItem) => {
				return [REVEALED_PLOTS_COMPLETE_QUEST_NUM.toString()];
			},
		},
		option1: calloutAccept,
	},
	activationEngineEvents: ["UnitMoveComplete"],
	onActivateCheck: (_item: TutorialItem) => {
		let bRevealMet: boolean = false;
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerCities: City[] | undefined = player.Cities?.getCities();
			if (playerCities && playerCities.length > 0) {
				let iRevealedCount: number = Visibility.getPlotsRevealedCount(player.id);
				if (iRevealedCount >= REVEALED_PLOTS_START_QUEST_NUM) {
					bRevealMet = true;
				}
			}
		}
		return bRevealMet;
	},
	nextID: "tutorial_quest_reveal_map",
});
*/
// ---------
TutorialManager.add({
	ID: "tutorial_quest_reveal_map",
	quest: {
		title: Locale.compose("LOC_TUTORIAL_QUEST_REVEAL_MAP_TITLE"),
		description: "LOC_TUTORIAL_QUEST_REVEAL_MAP_DESCRIPTION",
		goal: REVEALED_PLOTS_COMPLETE_QUEST_NUM.toString(),
		cancelable: true,
		getCurrentProgress: () => {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				const liveOpsStats: LiveOpsStats | undefined = player.LiveOpsStats;
				let iRevealedCount: number = (liveOpsStats ? liveOpsStats.numPlotsRevealed : 0);
				return iRevealedCount.toString();
			}
			else {
				return "";
			}
		},
		getDescriptionLocParams: () => {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				const liveOpsStats: LiveOpsStats | undefined = player.LiveOpsStats;
				const iRevealedCount: number = (liveOpsStats ? liveOpsStats.numPlotsRevealed : 0);
				const result: string = Locale.toNumber(REVEALED_PLOTS_COMPLETE_QUEST_NUM - iRevealedCount);
				return [REVEALED_PLOTS_COMPLETE_QUEST_NUM, result];
			}

			return [REVEALED_PLOTS_COMPLETE_QUEST_NUM, ""]
		},
		progressType: Locale.compose("LOC_TUTORIAL_QUEST_INTRO_REVEAL_MAP_GOALTYPE"),
	},
	completionEngineEvents: ["UnitMoveComplete"],
	onCompleteCheck: (_item: TutorialItem) => {
		let bRevealMet: boolean = false;
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const liveOpsStats: LiveOpsStats | undefined = player.LiveOpsStats;
			let iRevealedCount: number = (liveOpsStats ? liveOpsStats.numPlotsRevealed : 0);
			if (iRevealedCount >= REVEALED_PLOTS_COMPLETE_QUEST_NUM) {
				bRevealMet = true;
			}
		}
		return bRevealMet;
	},
	nextID: "tutorial_quest_reveal_map_completed",
});
// ---------
TutorialManager.add({
	ID: "tutorial_quest_reveal_map_completed",
	callout: {
		title: Locale.compose("LOC_TUTORIAL_QUEST_INTRO_REVEAL_MAP_COMPLETED_TITLE"),
		body: {
			text: "LOC_TUTORIAL_QUEST_INTRO_REVEAL_MAP_COMPLETED_BODY",
			getLocParams: (_item: TutorialItem) => {
				return [REVEALED_PLOTS_COMPLETE_QUEST_NUM];
			},
		},
		option1: calloutContinue,
	},
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "pantheonUnlocked",
	filterPlayers: [],
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_BELIEF_CLASS_PANTHEON_NAME",
		body: {
			text: "LOC_TUTORIAL_PANTHEON_UNLOCKED_BODY",
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_PANTHEON_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: ["OnContextManagerOpen_screen-pantheon-chooser"],
	completionEngineEvents: ["CultureTreeChanged"],
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerCulture = player.Culture;
			if (playerCulture != null) {
				if (playerCulture.isNodeUnlocked("NODE_CIVIC_AQ_MAIN_MYSTICISM")) {
					return true;
				}
			}
		}
		return false;
	},
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "commanderUnlocked",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_UNIT_ARMY_COMMANDER_NAME",
		body: {
			text: "LOC_TUTORIAL_COMMANDER_UNLOCKED_BODY",
			getLocParams: (_item: TutorialItem) => {
				return [TutorialSupport.getNameOfFirstUnlockedUnitWithTag("UNIT_CLASS_ARMY_COMMANDER")];
			},
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_ARMY_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["TechNodeCompleted", "CultureNodeCompleted"],
	onActivateCheck: (_item: TutorialItem) => {
		// See if a Commander unit was unlocked and make sure the player doesn't already have one.
		const player: PlayerLibrary | null = Players.get(TutorialManager.playerId);
		if (player != null && player.Units != null) {
			if (player.Units.getUnitTypesUnlockedWithTag("UNIT_CLASS_ARMY_COMMANDER", true).length > 0) {
				let bAlreadyHasCommander: boolean = false;
				const units: ComponentID[] | undefined = player.Units?.getUnitIds();
				if (units != undefined) {
					for (let i = 0; i < units.length; ++i) {
						const unit: Unit | null = Units.get(units[i]);
						if (unit != null) {
							const unitDef: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
							if (unitDef != null && unitDef.FormationClass == "FORMATION_CLASS_COMMAND") {
								bAlreadyHasCommander = true;
								break;
							}
						}
					}
					return !bAlreadyHasCommander;
				}
			}
		}
		return false;
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "commander_experience",
	runAllTurns: true,
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_COMMANDER_EXPERIENCE_TITLE"),
		body: {
			text: Locale.compose("LOC_TUTORIAL_COMMANDER_EXPERIENCE_BODY"),
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_ARMY_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["UnitExperienceChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		const activationEventData = (TutorialManager.activatingEvent as Unit_EventData);
		if (activationEventData.unit != null) {
			const unit = Units.get(activationEventData.unit);
			if (unit) {
				if (unit.owner == GameContext.localPlayerID && unit.isArmyCommander) {
					Camera.lookAtPlot(unit.location);
					_item.highlightPlots = [GameplayMap.getIndexFromLocation(unit.location)];
					return true;
				}
			}
		}
		return false;
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "commander_promotion_available",
	runAllTurns: true,
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_COMMANDER_PROMOTION_AVAILABLE_TITLE"),
		body: {
			text: "LOC_TUTORIAL_COMMANDER_PROMOTION_AVAILABLE_BODY",
			getLocParams: (_item: TutorialItem) => {
				let commanderName: string = "";
				const activationEventData = (TutorialManager.activatingEvent as Unit_EventData);
				if (activationEventData.unit != null) {
					const unit = Units.get(activationEventData.unit);
					if (unit) {
						if (unit.owner == GameContext.localPlayerID && unit.isCommanderUnit) {
							commanderName = unit.name;
						}
					}
				}
				return [commanderName];
			}
		},
		actionPrompts: [{
			kbm: "LOC_TUTORIAL_YOUR_FIRST_CITY_BODY_KBM",
			gamepad: "LOC_TUTORIAL_YOUR_FIRST_CITY_BODY_GAMEPAD",
			hybrid: "LOC_TUTORIAL_YOUR_FIRST_CITY_BODY_KBM",
			touch: "LOC_TUTORIAL_YOUR_FIRST_CITY_BODY_TOUCH",
			actionName: "inline-confirm"
		}]
	},
	activationEngineEvents: ["UnitExperienceChanged", "UnitAddedToMap"],
	onActivateCheck: (_item: TutorialItem) => {
		const activationEventData = (TutorialManager.activatingEvent as Unit_EventData);
		if (activationEventData.unit != null) {
			const unit = Units.get(activationEventData.unit);
			if (unit) {
				if (unit.owner == GameContext.localPlayerID && unit.isArmyCommander) {
					if (unit.Experience) {
						if (unit.Experience.getStoredPromotionPoints > 0) {
							Camera.lookAtPlot(unit.location);
							_item.highlightPlots = [GameplayMap.getIndexFromLocation(unit.location)];
							UI.Player.selectUnit(unit.id);
							return true;
						}
					}
				}
			}
		}
		return false;
	},
	completionCustomEvents: ["interface-mode-changed"],
	onCompleteCheck: (_item: TutorialItem) => {
		let mode: string = InterfaceMode.getCurrent();
		if (mode == "INTERFACEMODE_UNIT_PROMOTION") {
			return true;
		}
		return false;
	},
	nextID: "promotion_trees_ui",
	//highlights: ["commander-action-UNITCOMMAND_PROMOTE"], // Not working yet with the commander UI
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "promotion_trees_ui",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_COMMANDER_PROMOTION_TREES_TITLE",
		body: { text: "LOC_TUTORIAL_COMMANDER_PROMOTION_TREES_BODY" },
		option1: calloutContinue,
	},
	completionEngineEvents: ["UnitPromoted"],
})
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "meet_first_independent",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_FIRST_INDEPENDENT_MET_TITLE",
		body: {
			text: "LOC_TUTORIAL_FIRST_INDEPENDENT_MET_BODY",
			getLocParams: (_item: TutorialItem) => {
				let independentLocation: float2 = { x: -1, y: -1 };
				let independentID: PlayerId = PlayerIds.NO_PLAYER;
				let bFromUnit = false;
				let independentText: string = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					const activationEventData = (TutorialManager.activatingEvent as DiplomacyMeet_EventData);
					if (activationEventData.viewingObjectID != null) {
						const unit = Units.get(activationEventData.viewingObjectID);
						if (unit) {
							if (unit.owner == player.id) { //If the player is the one spotting the other player, use the location from the event if valid
								const eventLoc: float2 = activationEventData.location;
								if (eventLoc.x >= 0 && eventLoc.y >= 0) {
									independentID = Game.IndependentPowers.getIndependentPlayerIDAt(eventLoc.x, eventLoc.y);
									independentLocation = eventLoc;
								}
							}
							else {
								const objLoc = unit.location;
								if (objLoc.x >= 0 && objLoc.y >= 0) {
									bFromUnit = true;
									independentID = Game.IndependentPowers.getIndependentPlayerIDFromUnit(activationEventData.viewingObjectID);
									independentLocation = objLoc;
								}
							}
						}
						else {
							const eventLoc: float2 = activationEventData.location;
							if (eventLoc.x >= 0 && eventLoc.y >= 0) {
								independentID = Game.IndependentPowers.getIndependentPlayerIDAt(eventLoc.x, eventLoc.y);
								independentLocation = eventLoc;
							}
						}
						if (independentID == PlayerIds.NO_PLAYER || independentID == 63) { //player 63 is hard-coded as the 'world' player and used for goody huts
							//  If we got here then we probably checked the location for an independent and it was a unit, not owned by an independent player.
							const eventLoc: float2 = activationEventData.location;
							independentID = Game.IndependentPowers.getIndependentPlayerIDWithUnitsAt(eventLoc.x, eventLoc.y);
							bFromUnit = true;
						}
						if (independentID != PlayerIds.NO_PLAYER) {
							let independentName: string | null = Game.IndependentPowers.independentName(independentID);
							let independentDiplo: string = Game.IndependentPowers.getIndependentHostility(independentID, GameContext.localPlayerID);
							if (independentName != null) {
								if (bFromUnit) {
									independentText = Locale.compose("LOC_TUTORIAL_FIRST_INDEPENDENT_MET_UNIT_BODY", independentName, independentDiplo)
								}
								else {
									independentText = Locale.compose("LOC_TUTORIAL_FIRST_INDEPENDENT_MET_VILLAGE_BODY", independentName, independentDiplo)
								}
							}
						}
					}
				}
				Camera.lookAtPlot(independentLocation, { zoom: 0.25 });
				_item.highlightPlots = [GameplayMap.getIndexFromLocation(independentLocation)];
				return [independentText];
			},
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_STATEHOOD_2_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	runAllTurns: true,
	activationEngineEvents: ["DiplomacyMeetIndependents"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const activationEventData = (TutorialManager.activatingEvent as DiplomacyMeet_EventData);
			if (activationEventData.player1 == GameContext.localPlayerID || activationEventData.player2 == GameContext.localPlayerID) {
				return true;
			}
		}
		return false;
	},
});

// ------------------------------------------------------------------
TutorialManager.add({
	ID: "first_meet_player",
	runAllTurns: true,
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_FIRST_MEET_PLAYER_TITLE",
		body: {
			text: "LOC_TUTORIAL_FIRST_MEET_PLAYER_BODY",
			getLocParams: (item: TutorialItem) => {
				const localPlayerID: PlayerId = GameContext.localPlayerID;
				let playerName = "";
				// TODO Deteremine if the use of item.properties.event is preferred over TutorialManager.activatingEvent. If so possibly use for other events as well.
				const activationEventData = (item.properties.event as DiplomacyMeet_EventData);
				if (activationEventData) {
					let player = null;
					if (activationEventData.player1 != localPlayerID) {
						player = Players.get(activationEventData.player1);
					}
					else if (activationEventData.player2 != localPlayerID) {
						player = Players.get(activationEventData.player2);
					}
					if (player) {
						playerName = player.name;
					}
				}
				return [playerName];
			}
		},
		option1: calloutContinue,
	},
	activationEngineEvents: ["DiplomacyMeet"],
	onActivateCheck: (_item: TutorialItem) => {
		let localPlayerPresent = false;
		let bothPlayersMajor = false;
		const activationEventData = (TutorialManager.activatingEvent as DiplomacyMeet_EventData);
		const localPlayerID: PlayerId = GameContext.localPlayerID;
		if (activationEventData.player1 == localPlayerID) {
			localPlayerPresent = true;
			const otherPlayer = Players.get(activationEventData.player2);
			if (otherPlayer && otherPlayer.isMajor) {
				bothPlayersMajor = true;
			}
		}
		else if (activationEventData.player2 == localPlayerID) {
			localPlayerPresent = true;
			const otherPlayer = Players.get(activationEventData.player1);
			if (otherPlayer && otherPlayer.isMajor) {
				bothPlayersMajor = true;
			}
		}
		if (localPlayerPresent && bothPlayersMajor) {
			return true;
		}
		return false;
	},
	completionEngineEvents: ["DiplomacyStatement"],
	onCompleteCheck: (_item: TutorialItem) => {
		return true;
	},
	hiders: [".tut-action-button", ".tut-action-text"],
	inputFilters: [{ inputName: "next-action" }]
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "diplo_diploactions_response",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_DIPLOMATIC_ACTIONS_RESPONSE_TITLE",
		body: {
			text: "LOC_TUTORIAL_DIPLOMATIC_ACTIONS_RESPONSE_BODY"
		},
		option1: calloutContinue,
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") && DiplomacyManager.selectedPlayerID != GameContext.localPlayerID && Players.get(DiplomacyManager.selectedPlayerID)?.isMajor) {
			return true;
		}
		return false;
	},
	completionCustomEvents: ["interface-mode-changed"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "diplo_diploactions",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_DIPLOMATIC_ACTIONS_TITLE",
		body: {
			text: "LOC_TUTORIAL_DIPLOMATIC_ACTIONS_BODY"
		},
		option1: calloutContinue,
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") && DiplomacyManager.selectedPlayerID != GameContext.localPlayerID && Players.get(DiplomacyManager.selectedPlayerID)?.isMajor) {
			return true;
		}
		return false;
	},
	completionCustomEvents: ["interface-mode-changed"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "diplo_relationships",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_RELATIONSHIPS_TITLE",
		body: {
			text: "LOC_TUTORIAL_RELATIONSHIPS_BODY"
		},
		option1: calloutContinue,
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") && DiplomacyManager.selectedPlayerID != GameContext.localPlayerID && Players.get(DiplomacyManager.selectedPlayerID)?.isMajor) {
			return true;
		}
		return false;
	},
	completionCustomEvents: ["interface-mode-changed"],
	highlights: [".player-info__relationship-info-button"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "diplo_initial",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_DIPLOMACY_TITLE",
		body: {
			text: "LOC_TUTORIAL_DIPLOMACY_BODY"
		},
		option1: calloutContinue,
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") && DiplomacyManager.selectedPlayerID != GameContext.localPlayerID && Players.get(DiplomacyManager.selectedPlayerID)?.isMajor) {
			return true;
		}
		return false;
	},
	completionCustomEvents: ["interface-mode-changed"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "diplo_agenda_intro",
	filterPlayers: [],
	runAllTurns: true,
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_DIPLOMACY_AGENDAS_TITLE",
		body: {
			text: "LOC_TUTORIAL_DIPLOMACY_AGENDAS_BODY",
			getLocParams: (item: TutorialItem) => {
				const localPlayerID: PlayerId = GameContext.localPlayerID;
				let leaderName = "";
				// TODO Deteremine if the use of item.properties.event is preferred over TutorialManager.activatingEvent. If so possibly use for other events as well.
				const activationEventData = (item.properties.event as DiplomacyRelationshipLevelChanged_EventData);
				if (activationEventData) {
					if (activationEventData.player2 == localPlayerID) {
						const otherPlayer = Players.get(activationEventData.player1);
						if (otherPlayer && otherPlayer.isMajor) {
							leaderName = otherPlayer.name;
						}
					}
				}
				return [leaderName];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_DIPLOMACY_6_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["DiplomacyRelationshipLevelChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerId = GameContext.localPlayerID;
		let includesPlayer = false;
		const activationEventData = (TutorialManager.activatingEvent as DiplomacyRelationshipLevelChanged_EventData);
		if (activationEventData.reason == DiplomacyFavorGrievanceEventType.HISTORICAL_EVENT_LEADER_AGENDA) {
			if (activationEventData.player2 == player) {
				const otherPlayer = Players.get(activationEventData.player1);
				if (otherPlayer && otherPlayer.isMajor) {
					includesPlayer = true;
				}
			}
		}
		return includesPlayer;
	},
	completionCustomEvents: ["interface-mode-changed"],
});

// ------------------------------------------------------------------
TutorialManager.add({
	ID: "diplo_can_declare_war",
	filterPlayers: [],
	runAllTurns: true,
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_DIPLOMACY_DECLARING_WAR_TITLE",
		body: {
			text: "LOC_TUTORIAL_DIPLOMACY_DECLARING_WAR_BODY",
			getLocParams: (item: TutorialItem) => {
				const localPlayerID: PlayerId = GameContext.localPlayerID;
				let leaderName = "";
				// TODO Deteremine if the use of item.properties.event is preferred over TutorialManager.activatingEvent. If so possibly use for other events as well.
				const activationEventData = (item.properties.event as DiplomacyRelationshipLevelChanged_EventData);
				if (activationEventData) {
					if (activationEventData.player2 == localPlayerID) {
						const otherPlayer = Players.get(activationEventData.player1);
						if (otherPlayer && otherPlayer.isMajor) {
							leaderName = otherPlayer.name;
						}
					}
					else if (activationEventData.player1 == localPlayerID) {
						const otherPlayer = Players.get(activationEventData.player2);
						if (otherPlayer && otherPlayer.isMajor) {
							leaderName = otherPlayer.name;
						}
					}
				}
				return [leaderName];
			}
		},
		option1: calloutContinue,
	},
	activationEngineEvents: ["DiplomacyRelationshipLevelChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerId = GameContext.localPlayerID;
		let includesPlayer = false;
		const activationEventData = (TutorialManager.activatingEvent as DiplomacyRelationshipLevelChanged_EventData);
		if (activationEventData.status == DiplomacyPlayerRelationships.PLAYER_RELATIONSHIP_HOSTILE) {
			if (activationEventData.player2 == player) {
				const otherPlayer = Players.get(activationEventData.player1);
				if (otherPlayer && otherPlayer.isMajor) {
					includesPlayer = true;
				}
			}
			else if (activationEventData.player1 == player) {
				const otherPlayer = Players.get(activationEventData.player2);
				if (otherPlayer && otherPlayer.isMajor) {
					includesPlayer = true;
				}
			}
		}
		return includesPlayer;
	},
	completionCustomEvents: ["interface-mode-changed"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "settler_unit_unlocked",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_SETTLER_UNIT_UNLOCKED_TITLE"),
		body: {
			text: "LOC_TUTORIAL_SETTLER_UNIT_UNLOCKED_BODY",
			getLocParams: (_item: TutorialItem) => {
				let settlerName: string = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player && player.Units) {
					const cityID: ComponentID | null = UI.Player.getHeadSelectedCity();
					const armyCommander = player.Units.getBuildUnit("UNIT_ARMY_COMMANDER");
					const commanderDefinition = GameInfo.Units.lookup(armyCommander);
					for (let i = 0; i < GameInfo.Units.length; ++i) {
						if (GameInfo.Units[i].FoundCity == true) {
							if (cityID && GameInfo.Units[i] != commanderDefinition) { //this check for Legatus. //TODO: alternate FTUE quest for Legatus?
								let result: OperationResult | null = null;
								result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { UnitType: i }, false);
								if (result.Success) {
									settlerName = GameInfo.Units[i].Name;
									break;
								}
							}
						}
					}
				};
				return [settlerName];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_SETTLERS_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
			let bCanTrain: boolean = false;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player && player.Units) {
				const cityID: ComponentID | null = UI.Player.getHeadSelectedCity();
				const armyCommander = player.Units.getBuildUnit("UNIT_ARMY_COMMANDER");
				const commanderDefinition = GameInfo.Units.lookup(armyCommander);
				for (let i = 0; i < GameInfo.Units.length; ++i) {
					if (GameInfo.Units[i].FoundCity == true && GameInfo.Units[i] != commanderDefinition) {
						if (cityID) {
							let result: OperationResult | null = null;
							result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { UnitType: i }, false);
							if (result.Success) {
								bCanTrain = true;
								break;
							}
						}
					}
				}
			};
			return bCanTrain;
		}
		return false;
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		if (TutorialManager.isItemCompleted("first_settler_trained")) {
			return true;
		}
		return false;
	},
	completionEngineEvents: ["CityProductionQueueChanged", "interface-mode-changed"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "choose_first_civic",
	filterPlayers: [],
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_CHOOSE_FIRST_CIVIC_TITLE",
		body: { text: "LOC_TUTORIAL_CHOOSE_FIRST_CIVIC_BODY" },
		actionPrompts: [{
			kbm: "LOC_TUTORIAL_CHOOSE_FIRST_CIVIC_BODY_KBM",
			gamepad: "LOC_TUTORIAL_CHOOSE_FIRST_CIVIC_BODY_GAMEPAD",
			hybrid: "LOC_TUTORIAL_CHOOSE_FIRST_CIVIC_BODY_KBM",
			touch: "LOC_TUTORIAL_CHOOSE_FIRST_CIVIC_BODY_TOUCH",
			actionName: "inline-confirm"
		}],
		option1: calloutClose
	},
	activationCustomEvents: ["OnContextManagerOpen_screen-culture-tree-chooser"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			return true;
		}
		return false;
	},
	completionEngineEvents: ["CultureTreeChanged", "OnContextManagerClose", "CultureTargetChanged"],
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerCulture = player.Culture;
			if (playerCulture != null) {
				if (playerCulture.isNodeUnlocked("NODE_CIVIC_AQ_MAIN_CHIEFDOM")) {
					return true;
				}
			}
		}
		return false;
	},
	onObsoleteCheck: (_item: TutorialItem) => {
		if (TutorialManager.isItemCompleted("hideCulture")) {
			return true;
		}
		return false;
	},
	hiders: [".tut-action-button", ".tut-action-text"],
	inputFilters: [{ inputName: "next-action" }]
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "choose_first_government",
	filterPlayers: [],
	callout: {
		title: Locale.compose("LOC_TUTORIAL_CHOOSE_FIRST_GOVERNMENT_TITLE"),
		body: { text: Locale.compose("LOC_TUTORIAL_CHOOSE_FIRST_GOVERNMENT_BODY") },
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		option1: calloutClose
	},
	activationCustomEvents: ["OnContextManagerOpen_screen-government-picker"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const government: GovernmentType | undefined = player.Culture?.getGovernmentType();
			if (government != undefined && government == -1) {
				return true;
			}
		}
		return false;
	},
	completionEngineEvents: ["GovernmentChanged", "OnContextManagerClose"],
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const government: GovernmentType | undefined = player.Culture?.getGovernmentType();
			if (government != undefined && government != -1) {
				return true;
			}
		}
		return false;
	},
	shouldCalloutHide: () => {
		if (ContextManager.hasInstanceOf("screen-government-picker") && InterfaceMode.isInDefaultMode()) {
			return false;
		}
		return true;
	},
	highlights: ["screen.traditions .block-button"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "slot_first_policy",
	filterPlayers: [],
	callout: {
		anchorPosition: TutorialAnchorPosition.TopCenter,
		title: Locale.compose("LOC_TUTORIAL_CHOOSE_FIRST_POLICY_TITLE"),
		body: { text: Locale.compose("LOC_TUTORIAL_CHOOSE_FIRST_POLICY_BODY") }
	},
	activationCustomEvents: ["OnContextManagerOpen_screen-policies"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const government: GovernmentType | undefined = player.Culture?.getGovernmentType();
			if (government) {
				return government != -1;
			}
		}
		return false;
	},
	completionEngineEvents: ["TraditionChanged", "OnContextManagerClose"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "policy_swap_tutorial",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_POLICY_SWAP_TUTORIAL_TITLE"),
		body: { text: Locale.compose("LOC_TUTORIAL_POLICY_SWAP_TUTORIAL_BODY") },
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_POLICIES_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: ["TraditionChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const numTraditionSlots: number | undefined = player.Culture?.numTraditionSlots;
			if (numTraditionSlots) {
				return numTraditionSlots > 0;
			}
		}
		return false;
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "first_settler_trained",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_FIRST_SETTLER_TRAINED_TITLE"),
		body: {
			text: "LOC_TUTORIAL_FIRST_SETTLER_TRAINED_BODY",
			getLocParams: (_item: TutorialItem) => {
				let settlerName: string = "";
				let civAdj: string = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player && player.Units) {
					const armyCommander = player.Units.getBuildUnit("UNIT_ARMY_COMMANDER");
					const commanderDefinition = GameInfo.Units.lookup(armyCommander);
					civAdj = player.civilizationAdjective;
					const activationEventData = (TutorialManager.activatingEvent as UnitAddedToMap_EventData);
					const unit: Unit | null = Units.get(activationEventData.unit);
					if (unit != null && unit.owner == player?.id) {
						let unitDef: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
						if (unitDef != null) {
							if (unitDef.FoundCity == true && unitDef != commanderDefinition) {
								settlerName = unitDef.Name;
							}
						}
					}
				}
				return [settlerName, civAdj];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_SETTLERS_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["UnitAddedToMap"],
	onActivateCheck: (_item: TutorialItem) => {
		const activationEventData = (TutorialManager.activatingEvent as UnitAddedToMap_EventData);
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player != null && player.Units) {
			const armyCommander = player.Units.getBuildUnit("UNIT_ARMY_COMMANDER");
			const commanderDefinition = GameInfo.Units.lookup(armyCommander);
			const unit: Unit | null = Units.get(activationEventData.unit);
			if (unit != null && unit.owner == player?.id) {
				let unitDef: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
				if (unitDef != null) {
					if (unitDef.FoundCity == true && unitDef != commanderDefinition) {
						return true;
					}
				}
			}
		}
		return false;
	},
	onActivate: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		const activationEventData = (TutorialManager.activatingEvent as UnitAddedToMap_EventData);
		if (player) {
			UI.Player.deselectAllUnits();
			Camera.lookAtPlot(activationEventData.location, { zoom: 0.25 });
		}
	},
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "earn_first_attribute_point",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_EARN_FIRST_ATTRIBUTE_POINT_TITLE"),
		body: { text: "LOC_TUTORIAL_EARN_FIRST_ATTRIBUTE_POINT_BODY" },
		actionPrompts: [
			{
				kbm: "LOC_TUTORIAL_EARN_FIRST_ATTRIBUTE_POINT_BODY_KBM",
				gamepad: "LOC_TUTORIAL_EARN_FIRST_ATTRIBUTE_POINT_BODY_GAMEPAD",
				hybrid: "LOC_TUTORIAL_EARN_FIRST_ATTRIBUTE_POINT_BODY_KBM",
				touch: "LOC_TUTORIAL_EARN_FIRST_ATTRIBUTE_POINT_BODY_TOUCH",
				actionName: "inline-toggle-radial-menu"
			}
		],
	},
	inputContext: InputContext.World,
	activationEngineEvents: ["AttributePointsChanged"],
	completionCustomEvents: ["OnContextManagerOpen_screen-attribute-trees"],
	highlights: [".diplo-ribbon__attribute-button-highlight"],
	nextID: "spend_first_attribute_point",
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "spend_first_attribute_point",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_SPEND_FIRST_ATTRIBUTE_POINT_TITLE"),
		body: { text: Locale.compose("LOC_TUTORIAL_SPEND_FIRST_ATTRIBUTE_POINT_BODY") },
	},
	completionCustomEvents: ["OnContextManagerClose"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "second_settlement_created",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_SECOND_SETTLEMENT_CREATED_TITLE"),
		body: { text: Locale.compose("LOC_TUTORIAL_SECOND_SETTLEMENT_CREATED_BODY") },
		option1: calloutContinue,
	},
	runAllTurns: true,
	activationEngineEvents: ["CityAddedToMap"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const activationEventData = (TutorialManager.activatingEvent as CityAddedToMap_EventData);
			let playerCities: City[] | undefined = player.Cities?.getCities();
			if (playerCities && playerCities.length > 1) {
				const city: City | null = Cities.get(activationEventData.cityID);
				if (city != null) {
					if (city.originalOwner == player.id) {
						return true;
					}
				}
			}
		}
		return false;
	},
	onActivate: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerCities: City[] | undefined = player.Cities?.getCities();
			if (playerCities != undefined) {
				for (let i = 0; i < playerCities.length; ++i) {
					let city: City = playerCities[i];
					if (!city.isCapital && !city.isBeingRazed && city.originalOwner == player.id) {
						Camera.lookAtPlot(city.location);
						_item.highlightPlots = [GameplayMap.getIndexFromLocation(city.location)];
					}
				}
			}
		}
	},
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "first_settlement_conquered",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_FIRST_SETTLEMENT_CAPTURED_TITLE",
		body: {
			text: "LOC_TUTORIAL_FIRST_SETTLEMENT_CAPTURED_BODY",
			getLocParams: (_item: TutorialItem) => {
				let cityName: string = "";
				let civName: string = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					civName = player.name;
					const activationEventData = (TutorialManager.activatingEvent as CityAddedToMap_EventData);
					let playerCities: City[] | undefined = player.Cities?.getCities();
					if (playerCities) {
						const city: City | null = Cities.get(activationEventData.cityID);
						if (city != null) {
							cityName = city.name;
						}
					}
				}
				return [cityName, civName];
			}
		},
	},
	activationEngineEvents: ["CityTransfered"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const activationEventData = (TutorialManager.activatingEvent as CityTransfered_EventData);
			let playerCities: City[] | undefined = player.Cities?.getCities();
			if (playerCities && playerCities.length > 1) {
				const city: City | null = Cities.get(activationEventData.cityID);
				if (city != null) {
					if (city.originalOwner != player.id) {
						if (activationEventData.transferType == CityTransferTypes.BY_COMBAT) {
							return true;
						}
					}
				}
			}
		}
		return false;
	},
	onActivate: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerCities: City[] | undefined = player.Cities?.getCities();
			if (playerCities != undefined) {
				for (let i = 0; i < playerCities.length; ++i) {
					let city: City = playerCities[i];
					if (!city.isCapital) {
						Camera.lookAtPlot(city.location);
						_item.highlightPlots = [GameplayMap.getIndexFromLocation(city.location)];
					}
				}
			}
		}
	},
	completionCustomEvents: ["interface-mode-changed"],
	onCompleteCheck: (_item: TutorialItem) => {
		const selectedCityID = UI.Player.getHeadSelectedCity();
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (selectedCityID && player) {
			const thisCity: City | null = Cities.get(selectedCityID);
			if (thisCity?.isJustConqueredFrom) {
				return true;
			}
		}
		return false;
	},
	highlights: [".action-panel__button-next-action"],
	nextID: "tutorial_city_razing_intro",
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_city_razing_intro",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_FIRST_RAZE_OPTION_TITLE",
		body: {
			text: "LOC_TUTORIAL_FIRST_RAZE_OPTION_BODY",
			getLocParams: (_item: TutorialItem) => {
				let cityName: string = "";
				let civAdj: string = "";
				const selectedCityID = UI.Player.getHeadSelectedCity();
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (selectedCityID && player) {
					const thisCity: City | null = Cities.get(selectedCityID);
					civAdj = player.civilizationAdjective;
					if (thisCity) {
						cityName = thisCity?.name;
					}

				}
				return [cityName, civAdj];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_RAZING_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_city_unrest",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_UNREST_TITLE",
		body: {
			text: "LOC_TUTORIAL_UNREST_BODY",
			getLocParams: (_item: TutorialItem) => {
				let cityName: string = "";
				let civAdj: string = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					let playerCities: City[] | undefined = player.Cities?.getCities();
					civAdj = player.civilizationAdjective;
					if (playerCities) {
						for (let i = 0; i < playerCities.length; ++i) {
							let city = playerCities[i];
							if (city && city.Happiness?.hasUnrest) {
								cityName = city.name;
							}
						}
					}
				}
				return [cityName, civAdj];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_UNHAPPINESS_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["DiplomacyRelationshipLevelChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const activationEventData = (TutorialManager.activatingEvent as DiplomacyRelationshipLevelChanged_EventData);
			if (activationEventData.reason == DiplomacyFavorGrievanceEventType.GRIEVANCE_FROM_CAPTURE_SETTLEMENT) {
				if (activationEventData.player1 == player.id) {
					if (player) {
						let playerCities: City[] | undefined = player.Cities?.getCities();
						if (playerCities) {
							for (let i = 0; i < playerCities.length; ++i) {
								let city = playerCities[i];
								if (city && city.Happiness?.hasUnrest) {
									return true;
								}
							}
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
	ID: "resource_allocation_possible",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_RESOURCE_ALLOCATION_TITLE"),
		body: { text: Locale.compose("LOC_TUTORIAL_RESOURCE_ALLOCATION_BODY") },
		option1: calloutClose,
		option2: {
			callback: () => {
				ContextManager.push("screen-resource-allocation", { singleton: true, createMouseGuard: true })
			},
			text: "LOC_TUTORIAL_CALLOUT_ALLOCATE_RESOURCES",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["CityAddedToMap", "CityTileOwnershipChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		let bAnnexedResource: boolean = false;
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerCities: City[] | undefined = player.Cities?.getCities();
			if (playerCities && playerCities.length >= 2) {
				const activationEventData = (TutorialManager.activatingEvent as CityAndPosition_EventData);
				const thisCity: any = MapCities.getCity(activationEventData.location.x, activationEventData.location.y);
				if (thisCity != null) {
					if (thisCity.Districts) {
						for (const districtId of thisCity.Districts?.getIds()) {
							const district = Districts.get(districtId);
							if (district != null && district.location != null && district.location != thisCity.location) {
								let loc = district.location;
								let resource: ResourceType = GameplayMap.getResourceType(loc.x, loc.y);
								if (resource != ResourceTypes.NO_RESOURCE) {
									let resourceInfo = GameInfo.Resources.lookup(resource);
									if (resourceInfo != null) {
										if (resourceInfo.ResourceClassType != "RESOURCECLASS_EMPIRE") {
											bAnnexedResource = true;
										}
									}
								}
							}
						}
					}
				}
			}
		}
		return bAnnexedResource;
	},
})

// ------------------------------------------------------------------
TutorialManager.add({
	ID: "first_wall_build",
	runAllTurns: true,
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_FIRST_WALL_BUILD_TITLE"),
		body: { text: Locale.compose("LOC_TUTORIAL_FIRST_WALL_BUILD_BODY") },
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_WALLS_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["CityProductionChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		const activationEventData = (TutorialManager.activatingEvent as CityProductionChanged_EventData);
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player != null) {
			const city: City | null = Cities.get(activationEventData.cityID);
			if (city != null && city.owner == player?.id) {
				if (activationEventData.productionKind == ProductionKind.CONSTRUCTIBLE) {
					let prodItem = activationEventData.productionItem;
					let itemDef: ConstructibleDefinition | null = GameInfo.Constructibles.lookup(prodItem);
					if (itemDef != null) {
						if (itemDef.DistrictDefense) {
							return true;
						}
					}
				}
			}
		}
		return false;
	},
})
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "first_walls_constructed",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_FIRST_WALLS_CONSTRUCTED_TITLE"),
		body: {
			text: "LOC_TUTORIAL_FIRST_WALLS_CONSTRUCTED_BODY",
			getLocParams: (_item: TutorialItem) => {
				let settlementType: LocalizedTextArgument = "";
				let settlementName: LocalizedTextArgument = "";
				let fortificationName: LocalizedTextArgument = "";
				let healthBonus: LocalizedTextArgument = "";
				let strengthBonus: LocalizedTextArgument = "";

				const activationEventData = (TutorialManager.activatingEvent as ConstructibleBuildCompleted_EventData);
				let itemDef: ConstructibleDefinition | null = GameInfo.Constructibles.lookup(activationEventData.constructibleType);
				if (itemDef != null && itemDef.DistrictDefense) {
					fortificationName = itemDef.Name;
					let iHealth = GlobalParameters.DISTRICT_FORTIFICATION_DAMAGE;
					let iStrength = GlobalParameters.COMBAT_WALL_DEFENSE_BONUS;
					if (typeof iHealth == 'string') {
						healthBonus = iHealth;
					}
					if (typeof iStrength == 'string') {
						strengthBonus = iStrength;
					}
				}

				const location: float2 = activationEventData.location;
				const cityComponentID: ComponentID | null = GameplayMap.getOwningCityFromXY(location.x, location.y);
				if (cityComponentID != null && cityComponentID.owner == GameContext.localPlayerID) {
					const city: City | null = Cities.get(cityComponentID);
					if (city != null) {
						if (city.isTown) {
							settlementType = "LOC_TUTORIAL_TOWN_NAME";
						}
						else {
							settlementType = "LOC_TUTORIAL_CITY_NAME";
						}
						settlementName = city.name;
					}
				}
				return [settlementType, settlementName, fortificationName, healthBonus, strengthBonus];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_WALLS_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["ConstructibleBuildCompleted"],
	onActivateCheck: (_item: TutorialItem) => {
		const activationEventData = (TutorialManager.activatingEvent as ConstructibleBuildCompleted_EventData);
		if (activationEventData.constructible?.owner == GameContext.localPlayerID) {
			let itemDef: ConstructibleDefinition | null = GameInfo.Constructibles.lookup(activationEventData.constructibleType);
			if (itemDef != null) {
				if (itemDef.DistrictDefense) {
					return true;
				}
			}
		}
		return false;
	},
})

// ------------------------------------------------------------------
TutorialManager.add({
	ID: "training_ranged_unit",
	runAllTurns: true,
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_RANGED_UNITS_TITLE"),
		body: {
			text: "LOC_TUTORIAL_RANGED_UNITS_BODY",
			getLocParams: (_item: TutorialItem) => {
				let unitName: string = "NO_UNIT";
				if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
					const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
					if (player && player.Units) {
						const cityID: ComponentID | null = UI.Player.getHeadSelectedCity();
						const unitList: UnitType[] = player.Units.getUnitTypesUnlockedWithTag("UNIT_CLASS_RANGED", false);
						for (let i = 0; i < unitList.length; ++i) {
							let thisUnitDef = GameInfo.Units.lookup(unitList[i]);
							if (cityID && thisUnitDef) {
								let result: OperationResult | null = null;
								result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { UnitType: thisUnitDef?.$index }, false);
								if (result.Success) {
									unitName = thisUnitDef.Name;
								}
							}
						}
					}
				}
				return [unitName];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_COMBAT_2_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		let canTrainRanged: boolean = false;
		if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player && player.Units) {
				const cityID: ComponentID | null = UI.Player.getHeadSelectedCity();
				const unitList: UnitType[] = player.Units.getUnitTypesUnlockedWithTag("UNIT_CLASS_RANGED", false);
				for (let i = 0; i < unitList.length; ++i) {
					let thisUnitDef = GameInfo.Units.lookup(unitList[i]);
					if (cityID) {
						let result: OperationResult | null = null;
						result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { UnitType: thisUnitDef?.$index }, false);
						if (result.Success) {
							canTrainRanged = true;
						}
					}
				}
			}
		}
		return canTrainRanged;
	},
	completionCustomEvents: ["interface-mode-changed"],
})

// ------------------------------------------------------------------
TutorialManager.add({
	ID: "training_seige_unit",
	runAllTurns: true,
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_SEIGE_UNITS_TITLE"),
		body: {
			text: "LOC_TUTORIAL_SEIGE_UNITS_BODY",
			getLocParams: (_item: TutorialItem) => {
				let unitName: string = "";
				const activationEventData = (TutorialManager.activatingEvent as CityProductionChanged_EventData);
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player != null) {
					const city: City | null = Cities.get(activationEventData.cityID);
					if (city != null && city.owner == player?.id) {
						if (activationEventData.productionKind == ProductionKind.UNIT) {
							let prodItem = activationEventData.productionItem;
							let unitDef: UnitDefinition | null = GameInfo.Units.lookup(prodItem);
							if (unitDef != null) {
								let unitStats: Unit_StatDefinition | null = GameInfo.Unit_Stats.lookup(unitDef.UnitType);
								if (unitStats != null && unitStats.Bombard > 0 && unitStats.Bombard > unitStats.RangedCombat) {
									unitName = unitDef.Name;
								}
							}
						}
					}
				}
				return [unitName];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_CITYCAPTURE_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["CityProductionChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		const activationEventData = (TutorialManager.activatingEvent as CityProductionChanged_EventData);
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player != null) {
			const city: City | null = Cities.get(activationEventData.cityID);
			if (city != null && city.owner == player?.id) {
				if (activationEventData.productionKind == ProductionKind.UNIT) {
					let prodItem = activationEventData.productionItem;
					let unitDef: UnitDefinition | null = GameInfo.Units.lookup(prodItem);
					if (unitDef != null) {
						let unitStats: Unit_StatDefinition | null = GameInfo.Unit_Stats.lookup(unitDef.UnitType);
						if (unitStats != null && unitStats.Bombard > 0 && unitStats.Bombard > unitStats.RangedCombat) {
							return true;
						}
					}
				}
			}
		}
		return false;
	},
})

// ------------------------------------------------------------------
TutorialManager.add({
	ID: "siege_unit_completed",
	runAllTurns: true,
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_SEIGE_UNIT_COMPLETE_TITLE"),
		body: {
			text: "LOC_TUTORIAL_SEIGE_UNIT_COMPLETE_BODY",
			getLocParams: (_item: TutorialItem) => {
				let unitName: string = "";
				const activationEventData = (TutorialManager.activatingEvent as UnitAddedToMap_EventData);
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player != null) {
					const unit: Unit | null = Units.get(activationEventData.unit);
					if (unit != null && unit.owner == player?.id) {
						let unitDef: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
						if (unitDef != null) {
							let unitStats: Unit_StatDefinition | null = GameInfo.Unit_Stats.lookup(unitDef.UnitType);
							if (unitStats != null && unitStats.Bombard > 0 && unitStats.Bombard > unitStats.RangedCombat) {
								unitName = unitDef.Name;
							}
						}
					}
				}
				return [unitName];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_CITYCAPTURE_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["UnitAddedToMap"],
	onActivateCheck: (_item: TutorialItem) => {
		const activationEventData = (TutorialManager.activatingEvent as UnitAddedToMap_EventData);
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player != null) {
			const unit: Unit | null = Units.get(activationEventData.unit);
			if (unit != null && unit.owner == player?.id) {
				let unitDef: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
				if (unitDef != null) {
					let unitStats: Unit_StatDefinition | null = GameInfo.Unit_Stats.lookup(unitDef.UnitType);
					if (unitStats != null && unitStats.Bombard > 0 && unitStats.Bombard > unitStats.RangedCombat) {
						return true;
					}
				}
			}
		}
		return false;
	},
	onActivate: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		const activationEventData = (TutorialManager.activatingEvent as UnitAddedToMap_EventData);
		if (player) {
			UI.Player.deselectAllUnits();
			Camera.lookAtPlot(activationEventData.location, { zoom: 0.25 });
		}
	},
})
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "naval_unit_acquired_antiquity",
	runAllTurns: true,
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_ANTIQUITY_NAVAL_UNITS_TITLE"),
		body: {
			text: "LOC_TUTORIAL_ANTIQUITY_NAVAL_UNITS_BODY",
			getLocParams: (_item: TutorialItem) => {
				let unitName: string = "";
				const activationEventData = (TutorialManager.activatingEvent as UnitAddedToMap_EventData);
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player != null) {
					const unit: Unit | null = Units.get(activationEventData.unit);
					if (unit != null && unit.owner == player?.id) {
						if (unit.Combat?.canAttack) {
							const unitDefinition: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
							if (unitDefinition) {
								if (unitDefinition.Domain == "DOMAIN_SEA") {
									unitName = unitDefinition.Name;
								}
							}
						}
					}
				}
				return [unitName];
			}
		},
		option1: calloutContinue,
	},
	activationEngineEvents: ["UnitAddedToMap"],
	onActivateCheck: (_item: TutorialItem) => {
		const activationEventData = (TutorialManager.activatingEvent as UnitAddedToMap_EventData);
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player != null) {
			const unit: Unit | null = Units.get(activationEventData.unit);
			if (unit != null && unit.owner == player?.id) {
				if (unit.Combat?.canAttack) {
					const unitDefinition: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
					if (unitDefinition) {
						if (unitDefinition.Domain == "DOMAIN_SEA") {
							return true;
						}
					}
				}
			}
		}
		return false;
	},
	onActivate: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		const activationEventData = (TutorialManager.activatingEvent as UnitAddedToMap_EventData);
		if (player) {
			UI.Player.deselectAllUnits();
			Camera.lookAtPlot(activationEventData.location, { zoom: 0.25 });
		}
	},
})
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "first_discovery_revealed",
	runAllTurns: true,
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_FIRST_DISCOVERY_REVEALED_TITLE"),
		body: {
			text: "LOC_TUTORIAL_FIRST_DISCOVERY_REVEALED_BODY",
			getLocParams: (_item: TutorialItem) => {
				let discoveryName: string = "";
				const activationEventData = (TutorialManager.activatingEvent as ImprovementVisibilityChanged_EventData);
				if (activationEventData) {
					let constructibleDef: ConstructibleDefinition | null = GameInfo.Constructibles.lookup(activationEventData.improvementType);
					if (constructibleDef != null && constructibleDef.Discovery) {
						discoveryName = constructibleDef.Name;
						const kLocation: float2 = activationEventData.location;
						Camera.lookAtPlot(kLocation, { zoom: 0.25 });
					}
				}
				return [discoveryName];
			}
		},
		option1: {
			callback: () => {
				const unitId: ComponentID | null = UI.Player.getHeadSelectedUnit();
				if (unitId) {
					const unit: Unit | null = Units.get(unitId);
					if (unit) {
						Camera.lookAtPlot(unit.location, { zoom: 0.5 });
					}
				}
			},
			text: "LOC_TUTORIAL_CALLOUT_CONTINUE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["ImprovementVisibilityChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		const activationEventData = (TutorialManager.activatingEvent as ImprovementVisibilityChanged_EventData);
		if (activationEventData.changedBy.owner == GameContext.localPlayerID || activationEventData.player == GameContext.localPlayerID) {
			let constructibleDef: ConstructibleDefinition | null = GameInfo.Constructibles.lookup(activationEventData.improvementType);
			if (constructibleDef != null && constructibleDef.Discovery) {
				return true;
			}
		}
		return false;
	},
})

// ------------------------------------------------------------------
//TODO: This is victory related and would better live elsewhere
/*TutorialManager.add({
	ID: "third_settlement_acquired",
	runAllTurns: true,
	callout: {
		title: Locale.compose("LOC_TUTORIAL_THIRD_SETTLEMENT_ACQUIRED_TITLE"),
		body: { text: Locale.compose("LOC_TUTORIAL_THIRD_SETTLEMENT_ACQUIRED_BODY") },
		option1: calloutClose,
		option2: {
			callback: () => {
				ContextManager.push("screen-victory-progress", { singleton: true, createMouseGuard: true })
			},
			text: "LOC_TUTORIAL_CALLOUT_VICTORIES",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["CityAddedToMap"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerCities: City[] | undefined = player.Cities?.getCities();
			if (playerCities && playerCities.length > 2) {
				return true;
			}
		}
		return false;
	},
});*/



// ------------------------------------------------------------------

/*
TutorialManager.add({
	ID: "war_declared",
	callout: {
		title: "LOC_TUTORIAL_COMBAT_CITY_CAPTURE_TITLE",
		body: { text: "LOC_TUTORIAL_COMBAT_CITY_CAPTURE_BODY" },
		option1: calloutContinue,
	},
	activationEngineEvents: ["DiplomacyDeclareWar"],
	onActivateCheck: (_item: TutorialItem) => {
		let isAtWar: boolean = false;
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const PlayerList: PlayerLibrary[] = Players.getAlive();
			for (let i = 0; i < PlayerList.length; ++i) {
				if (PlayerList[i].isMajor && PlayerList[i].id != player.id) {
					if (player.Diplomacy?.isAtWarWith(PlayerList[i].id)) {
						isAtWar = true;
						break;
					}
				}
			}
		}
		return isAtWar;
	},
});
*/

// ------------------------------------------------------------------
TutorialManager.add({
	ID: "war_weariness",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_WAR_WEARINESS_TITLE",
		body: {
			text: "LOC_TUTORIAL_WAR_WEARINESS_BODY",
			getLocParams: (_item: TutorialItem) => {
				let cityName: string = "null";
				let civAdj: string = "null";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					civAdj = player.civilizationAdjective;
					let playerCities: City[] | undefined = player.Cities?.getCities();
					if (playerCities) {
						for (let i = 0; i < playerCities.length; ++i) {
							let city = playerCities[i];
							if (city) {
								if (city.Happiness?.hasWarWeariness) {
									cityName = city.name;
									Camera.lookAtPlot(city.location, { zoom: 0.25 });
								}
							}
						}
					}
				}
				return [cityName, civAdj];
			},
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_WARWEARINESS_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["DiplomacyEventSupportChanged", "PlayerTurnActivated"],
	onActivateCheck: (_item: TutorialItem) => {
		let hasWarWeariness: boolean = false;
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerCities: City[] | undefined = player.Cities?.getCities();
			if (playerCities) {
				for (let i = 0; i < playerCities.length; ++i) {
					let city: City = playerCities[i];
					if (city != null) {
						const cityWarWeariness = city.Happiness?.hasWarWeariness;
						if (cityWarWeariness) {
							hasWarWeariness = true;
							break;
						}
					}
				}
			}
		}
		return hasWarWeariness;
	},
});




// ------------------------------------------------------------------
///
/// UI HIDERS
/// Used to obscure parts of the UI HUD until needed through gameplay
///

TutorialManager.add({
	ID: "hidePlotTooltips",
	isPersistent: true,
	runAllTurns: true,
	filterPlayers: [],
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["LocalPlayerTurnBegin"],
	onActivate: (_item: TutorialItem) => {
		TooltipManager.hidePlotTooltipForTutorial();
	},
	onCleanUp: (_item: TutorialItem) => {
		TooltipManager.showPlotTooltipForTutorial();
	},
	onCompleteCheck: (_item: TutorialItem) => {
		return Game.turn > 1;
	},
});

TutorialManager.add({
	ID: "hideNotificationTrain",
	isPersistent: true,
	runAllTurns: true,
	filterPlayers: [],
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["LocalPlayerTurnBegin"],
	onCompleteCheck: (_item: TutorialItem) => {
		return Game.turn > 3;
	},
	hiders: [".notification-flow-row"]
});

TutorialManager.add({
	ID: "hideAttributes",
	isPersistent: true,
	runAllTurns: true,
	filterPlayers: [],
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["AttributePointsChanged"],
	hiders: [".tut-attributes"],
	inputFilters: [{ inputName: 'open-attributes' }]
});

TutorialManager.add({
	ID: "hideRankings",
	isPersistent: true,
	runAllTurns: true,
	filterPlayers: [],
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["LocalPlayerTurnBegin"],
	onCompleteCheck: (_item: TutorialItem) => {
		return Game.turn > 9;	// TODO: Better gating than waiting until turn 10 to show.
	},
	hiders: [".tut-rankings"],
	inputFilters: [{ inputName: 'open-rankings' }]
});

TutorialManager.add({
	ID: "hideTech",
	isPersistent: true,
	runAllTurns: true,
	filterPlayers: [],
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["TechTreeChanged", "TechTargetChanged"],
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerTechs = player.Techs;
			if (playerTechs?.isNodeUnlocked("NODE_TECH_AQ_AGRICULTURE")) {
				return true;
			}
		}
		return false;
	},
	hiders: [".tut-tech"],
	inputFilters: [{ inputName: 'open-techs' }]
});

TutorialManager.add({
	ID: "hideCulture",
	isPersistent: true,
	runAllTurns: true,
	filterPlayers: [],
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["CultureTreeChanged", "CultureTargetChanged"],
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerCulture = player.Culture;
			if (playerCulture != null) {
				if (playerCulture.isNodeUnlocked("NODE_CIVIC_AQ_MAIN_CHIEFDOM")) {
					return true;
				}
			}
		}
		return false;
	},
	hiders: [".tut-culture", ".tut-traditions"],
	inputFilters: [{ inputName: 'open-civics' }, { inputName: 'open-traditions' }]
});

TutorialManager.add({
	ID: "hideGreatWorks",
	isPersistent: true,
	runAllTurns: true,
	filterPlayers: [],
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["GreatWorkCreated"],
	hiders: [".tut-great-works"],
	inputFilters: [{ inputName: 'open-greatworks' }]
});

TutorialManager.add({
	ID: "hideReligion",
	isPersistent: true,
	runAllTurns: true,
	filterPlayers: [],
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["CultureNodeCompleted"],
	onCompleteCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			let playerCulture = player.Culture;
			if (playerCulture != null) {
				if (playerCulture.isNodeUnlocked("NODE_CIVIC_AQ_MAIN_MYSTICISM")) {
					return true;
				}
			}
		}
		return false;
	},
	hiders: [".tut-religion"]
})

TutorialManager.add({
	ID: "hideTrade",
	isPersistent: true,
	runAllTurns: true,
	filterPlayers: [],
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	completionEngineEvents: ["TechNodeCompleted", "CityTileOwnershipChanged"],
	onCompleteCheck: (_item: TutorialItem) => {
		let bConditionMet: boolean = false;
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const playerResourceList = player.Resources?.getResources();
			if (playerResourceList && playerResourceList.length > 0) {
				bConditionMet = true;
			}
			let playerTechs = player.Techs;
			if (playerTechs?.isNodeUnlocked("NODE_TECH_AQ_CURRENCY")) {
				bConditionMet = true;
			}
		}
		return bConditionMet;
	},
	hiders: [".tut-trade"]
});

TutorialManager.add({
	ID: "hideUnlocks",
	runAllTurns: true,
	isPersistent: true,
	filterPlayers: [],
	activationCustomEvents: ["user-interface-loaded-and-ready"],
	hiders: [".tut-unlocks"]
});
/* //Deactivated due to its unknown purpose and LOC string missing //TODO: CONFIRM purpose of this item.
TutorialManager.add({
	ID: "traditionsToSlot",
	callout: {
		body: { text: "LOC_TUTORIAL_TRADITIONS_TO_SLOT" },
		option1: calloutClose
	},
	activationEngineEvents: ["CultureNodeCompleted"],
	onActivateCheck: (item: TutorialItem) => {
		return TutorialSupport.didCivicUnlock(item, "NODE_CIVIC_AQ_MAIN_CODE_OF_LAWS");
});*/
// TODO: make helper that looks at unlock for tradition
//look at unlock kind, if kind is tradition, it is unlocked

TutorialManager.add({
	ID: "enemyArmyFirstEncounter",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		body: { text: "LOC_TUTORIAL_ENEMY_ARMY_FIRST_ENCOUNTER" },
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_COMBAT_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["UnitArmyZOCChanged"]
});

TutorialManager.add({
	ID: "merchantSelected",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_MERCHANT_UNLOCKED_TITLE",
		body: {
			text: "LOC_TUTORIAL_MERCHANT_UNLOCKED_BODY",
			getLocParams: (_item: TutorialItem) => {
				return [TutorialSupport.getNameOfFirstUnlockedUnitWithTag("UNIT_CLASS_MAKE_TRADE_ROUTE")];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_MERCHANTS_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["UnitSelectionChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(TutorialManager.playerId);
		const unitId: ComponentID | null = UI.Player.getHeadSelectedUnit();
		if (unitId) {
			const unit: Unit | null = Units.get(unitId);
			if (player && player.Units && unit) {
				const unitList: UnitType[] = player.Units.getUnitTypesUnlockedWithTag("UNIT_CLASS_MAKE_TRADE_ROUTE", false);
				if (unitList.length > 0) {
					let unitFound: boolean = false;
					unitList.forEach((value: UnitType) => {
						if (value == unit.type) {
							unitFound = true;
						}
					});
					return unitFound;
				}
			}
		}
		return false;
	},
	completionCustomEvents: ["interface-mode-changed"],
	onCompleteCheck: (_item: TutorialItem) => {
		return InterfaceMode.getCurrent() == "INTERFACEMODE_MAKE_TRADE_ROUTE";
	}
});

// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_happiness_intro",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_HAPPINESS_INTRO_TITLE"),
		body: { text: "LOC_TUTORIAL_HAPPINESS_INTRO_BODY" },
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_HAPPINESS_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["TechNodeCompleted"],
	onActivateCheck: (_item: TutorialItem) => {
		let btechUnlocked = false;
		if (TutorialSupport.didTechUnlock(_item, "NODE_TECH_AQ_MASONRY", 1) || TutorialSupport.didTechUnlock(_item, "NODE_TECH_AQ_IRRIGATION", 1) || TutorialSupport.didTechUnlock(_item, "NODE_TECH_AQ_CURRENCY", 1)) {
			btechUnlocked = true;
		}
		return btechUnlocked;
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_celebration_earned",
	filterPlayers: [],
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_CELEBRATIONS_TITLE",
		body: { text: "LOC_TUTORIAL_CELEBRATIONS_BODY" },
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_HAPPINESS_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["NotificationActivated"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const activationEventData = (TutorialManager.activatingEvent as NotificationActivated_EventData);
			if (activationEventData.byUser && activationEventData.id.owner == player.id) {
				const notification: Notification | null = Game.Notifications.find(activationEventData.id);
				if (notification) {
					if (Game.Notifications.getTypeName(notification.Type) == "NOTIFICATION_CHOOSE_GOLDEN_AGE") {
						return true;
					}
				}
			}
		}
		return false;
	},
	completionCustomEvents: ["interface-mode-changed", "OnContextManagerOpen_screen-policies"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_town_growth_intro",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_TOWN_GROWTH_TITLE",
		body: {
			text: "LOC_TUTORIAL_TOWN_GROWTH_BODY",
			getLocParams: (_item) => {
				let townName = "NO_TOWN";
				let civAdj = "NO_CIV";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					civAdj = player.civilizationAdjective;
					const activationEventData = (TutorialManager.activatingEvent as CityPopulationChanged_EventData);
					if (activationEventData) {
						const city: City | null = Cities.get(activationEventData.cityID);
						if (city) {
							townName = city.name;
						}
					}
				}
				return [townName, civAdj];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_TOWN_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["CityPopulationChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		let townReady = false;
		const activationEventData = (TutorialManager.activatingEvent as CityPopulationChanged_EventData);
		let player = Players.get(GameContext.localPlayerID);
		let thiscity = activationEventData.cityID;
		const city = Cities.get(thiscity);
		if (thiscity.owner == player?.id && !city?.isCapital && city?.isTown && city.originalOwner == player.id) {
			if (activationEventData.newPopulation >= 3) {
				townReady = true;
			}
		}
		return townReady;
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_town_specialization_intro",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_TOWN_SPECIALIZATION_TITLE",
		body: {
			text: "LOC_TUTORIAL_TOWN_SPECIALIZATION_BODY",
			getLocParams: (_item) => {
				let townName = "NO_TOWN";
				const activationEventData = (TutorialManager.activatingEvent as CityPopulationChanged_EventData)
				let thisCity = Cities.get(activationEventData.cityID);
				if (thisCity) {
					townName = thisCity.name;
				}
				return [townName];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_TOWN_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["CityPopulationChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		let townReady = false;
		const activationEventData = (TutorialManager.activatingEvent as CityPopulationChanged_EventData);
		let player = Players.get(GameContext.localPlayerID);
		let thiscity = activationEventData.cityID;
		const city = Cities.get(thiscity);
		if (thiscity.owner == player?.id && !city?.isCapital && city?.isTown && city.originalOwner == player.id) {
			if (activationEventData.newPopulation > 6) {
				townReady = true;
			}
		}
		return townReady;
	},
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_specialist_intro",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_SPECIALISTS_TITLE",
		body: {
			text: "LOC_TUTORIAL_SPECIALISTS_BODY",
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_TILES_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["CityPopulationChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		let specialistAvailable = false;
		let workerCap = 0;
		const activationEventData = (TutorialManager.activatingEvent as CityPopulationChanged_EventData);
		let player = Players.get(GameContext.localPlayerID);
		let thiscity = activationEventData.cityID;
		const city = Cities.get(thiscity);
		if (thiscity.owner == player?.id) {
			if (city && city.Workers?.getCityWorkerCap && !city.isTown) {
				workerCap = city.Workers?.getCityWorkerCap();
				if (workerCap > 0) {
					specialistAvailable = true;
				}
			}
		}
		return specialistAvailable;
	},
	completionCustomEvents: ["interface-mode-changed"],
	onCompleteCheck: (_item: TutorialItem) => {
		return true;
	},
});
// ------------------------------------------------------------------
// TutorialManager.add({
// 	ID: "sanction_action_available",
// 	callout: {
// 		title: "LOC_TUTORIAL_FIRST_SANCTION_UNLOCKED_TITLE",
// 		body: {text:"LOC_TUTORIAL_FIRST_SANCTION_UNLOCKED_BODY"},
// 		option1: calloutClose,
// 	},
// 	activationEngineEvents: ["AttributeNodeCompleted"],
// 	onActivateCheck: (_item: TutorialItem) => {
// 		let bHasSanction: boolean = false;
// 		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
// 		if (player) {
// 			if (player.Diplomacy?.hasAvailableSanctions()) {
// 				bHasSanction = true;
// 			}
// 		}
// 		return bHasSanction;
// 	},
// });
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "espionage_action_available",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_FIRST_ESPIONAGE_UNLOCKED_TITLE",
		body: { text: "LOC_TUTORIAL_FIRST_ESPIONAGE_UNLOCKED_BODY" },
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_DIPLOMACY_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player && player.DiplomacyTreasury?.diplomacyBalance) {
			if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") && DiplomacyManager.selectedPlayerID != GameContext.localPlayerID && Players.get(DiplomacyManager.selectedPlayerID)?.isMajor) {
				if (player.Diplomacy?.hasAvailableEspionageActions()) {
					return true;
				}
			}
		}
		return false;
	},
	completionCustomEvents: ["interface-mode-changed"],
},
);
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_settlement_cap",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_SETTLEMENT_CAP_TITLE",
		body: { text: "LOC_TUTORIAL_SETTLEMENT_CAP_BODY" },
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_CAP_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["PlayerTurnActivated", "CityTransfered"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(TutorialManager.playerId);
		if (player) {
			const stats = player.Stats;
			if (stats) {
				return (stats.numSettlements > 1 && (stats.settlementCap - stats.numSettlements) <= 0);
			}
		}
		return false;
	}
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
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			return true;
		}
		return false;
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_milestone_completed",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_MILESTONE_COMPLETED_TITLE",
		body: { text: "LOC_TUTORIAL_MILESTONE_COMPLETED_BODY" },
		option1: calloutClose,
		option2: {
			callback: () => {
				ContextManager.push("screen-victory-progress", { singleton: true, createMouseGuard: true })
			},
			text: "LOC_TUTORIAL_CALLOUT_VICTORIES",
			actionKey: "inline-accept",
			closes: true
		},
	},
	filterPlayers: [],
	activationEngineEvents: ["LegacyPathMilestoneCompleted"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			return true;
		}
		return false;
	}
});
// ------------------------------------------------------------------
// UNIQUE BUILDINGS
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "unlocked_first_unique_building",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_UNLOCKED_FIRST_UNIQUE_BUILDING_TITLE",
		body: {
			text: "LOC_TUTORIAL_UNLOCKED_FIRST_UNIQUE_BUILDING_BODY",
			getLocParams: (_item) => {
				let buildingName = "NO_BUILDING";
				let civAdjective = "NO_CIV_ADJECTIVE";
				let civName = "NO_CIV_NAME";
				let quarterName = "NO_QUARTER";
				let quarterEffect = "NO_EFFECT";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					civAdjective = player.civilizationAdjective;
					civName = player.civilizationName;
					let nodeType;
					nodeType = player.Culture?.getLastCompletedNodeType();
					if (nodeType) {
						const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(nodeType);
						if (nodeInfo != null) {
							GameInfo.ProgressionTreeNodeUnlocks.filter(n => { return n.ProgressionTreeNodeType == nodeInfo.ProgressionTreeNodeType; }).forEach(unlock => {
								if (unlock.TargetKind == "KIND_CONSTRUCTIBLE") {
									let targetType = unlock.TargetType;
									const constructibleInfo = GameInfo.Constructibles.lookup(targetType);
									const buildingInfo = GameInfo.Buildings.lookup(targetType);
									if (constructibleInfo != null && buildingInfo != null && constructibleInfo.ConstructibleClass == "BUILDING") {
										buildingName = constructibleInfo.Name;
										const playerCivTraitType = GameInfo.LegacyCivilizationTraits.lookup(player.civilizationType);
										for (let i = 0; i < GameInfo.UniqueQuarters.length; ++i) {
											const thisQuarter = GameInfo.UniqueQuarters[i];
											//identify which unique quarter is this civ's unique quarter via trait comparisons
											if (thisQuarter != null && thisQuarter.TraitType == playerCivTraitType?.TraitType) {
												quarterName = thisQuarter.Name;
												quarterEffect = thisQuarter.Description;
												break;
											}
										}
									}
								}
							});
						}
					}
				}
				return [buildingName, civAdjective, civName, quarterName, quarterEffect];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_BUILDINGS_3_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["CultureNodeCompleted"],
	onActivateCheck: (_item: TutorialItem) => {
		let nodeUnlocksBuilding = false;
		const player = Players.get(GameContext.localPlayerID);
		if (player) {
			let nodeType;
			nodeType = player.Culture?.getLastCompletedNodeType();
			if (nodeType) {
				const nodeInfo = GameInfo.ProgressionTreeNodes.lookup(nodeType);
				if (nodeInfo != null) {
					GameInfo.ProgressionTreeNodeUnlocks.filter(n => { return n.ProgressionTreeNodeType == nodeInfo.ProgressionTreeNodeType; }).forEach(unlock => {
						if (unlock.TargetKind == "KIND_CONSTRUCTIBLE") {
							let targetType = unlock.TargetType;
							const constructibleInfo = GameInfo.Constructibles.lookup(targetType);
							const buildingInfo = GameInfo.Buildings.lookup(targetType);
							if (constructibleInfo != null && constructibleInfo.ConstructibleClass == "BUILDING") {
								if (buildingInfo?.TraitType != null) {
									nodeUnlocksBuilding = true;
								}
							}
						}
					});
				}
			}
		}
		return nodeUnlocksBuilding;
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "unique_quarter_available",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_UNIQUE_QUARTER_AVAILABLE_TITLE",
		body: {
			text: "LOC_TUTORIAL_UNIQUE_QUARTER_AVAILABLE_BODY",
			getLocParams: (_item) => {
				let settlementName = "NO_CITY";
				let civAdjective = "NO_ADJECTIVE";
				let cityHasBuilding = "NO_BUILDING";
				let cityNeedsBuilding = "NO_BUILDING";
				let quarterName = "NO_QUARTER";
				let quarterDescription = "NO_DESCRIPTION";
				let playerBuilding1, playerBuilding2 = null;
				const player = Players.get(GameContext.localPlayerID);
				if (player) {
					civAdjective = player.civilizationAdjective;
					const cityID: ComponentID | null = UI.Player.getHeadSelectedCity();
					if (cityID) {
						const city = Cities.get(cityID);
						if (city != null && city.owner == player?.id) {
							if (city != null) {
								settlementName = city.name;
								const playerCivTraitType = GameInfo.LegacyCivilizationTraits.lookup(player.civilizationType);
								for (let i = 0; i < GameInfo.UniqueQuarters.length; ++i) {
									const thisQuarter = GameInfo.UniqueQuarters[i];
									//identify which unique quarter is this civ's unique quarter via trait comparisons
									if (thisQuarter != null && thisQuarter.TraitType == playerCivTraitType?.TraitType) {
										quarterName = thisQuarter.Name;
										quarterDescription = thisQuarter.Tooltip;
										//grab each building & see if the city has them
										playerBuilding1 = thisQuarter.BuildingType1;
										playerBuilding2 = thisQuarter.BuildingType2;
										let cityHasBuilding1 = city.Constructibles?.hasConstructible(playerBuilding1, false);
										let cityHasBuilding2 = city.Constructibles?.hasConstructible(playerBuilding2, false);
										// this is to get the names of each of these
										const constructibleInfoB1 = GameInfo.Constructibles.lookup(playerBuilding1);
										const constructibleInfoB2 = GameInfo.Constructibles.lookup(playerBuilding2);
										if (cityHasBuilding1 == true && constructibleInfoB1 && constructibleInfoB2) {
											cityHasBuilding = constructibleInfoB1?.Name;
											cityNeedsBuilding = constructibleInfoB2?.Name;
										}
										if (cityHasBuilding2 == true && constructibleInfoB1 && constructibleInfoB2) {
											cityHasBuilding = constructibleInfoB2?.Name;
											cityNeedsBuilding = constructibleInfoB1?.Name;
										}
										break;
									}
								}
							}
						}
					}
				}
				return [settlementName, civAdjective, cityNeedsBuilding, cityHasBuilding, quarterName, quarterDescription];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_BUILDINGS_3_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		let canBuildQuarter = false;
		if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
			let playerBuilding1, playerBuilding2 = null; // these are the player's two unique buildings for the quarter, according to data.
			const cityID: ComponentID | null = UI.Player.getHeadSelectedCity();
			const player = Players.get(GameContext.localPlayerID);
			if (player != null && cityID != null) {
				// grab city
				const city = Cities.get(cityID);
				if (city != null && city.owner == player?.id) {
					//first we get the player's trait
					const playerCivTraitType = GameInfo.LegacyCivilizationTraits.lookup(player.civilizationType);
					for (let i = 0; i < GameInfo.UniqueQuarters.length; ++i) {
						const thisQuarter = GameInfo.UniqueQuarters[i];
						//identify which unique quarter is this civ's unique quarter via trait comparisons
						if (thisQuarter != null && thisQuarter.TraitType == playerCivTraitType?.TraitType) {
							//grab each building
							playerBuilding1 = thisQuarter.BuildingType1;
							playerBuilding2 = thisQuarter.BuildingType2;
							break;
						}
					}
					if (playerBuilding1 && playerBuilding2) {
						//check if city has either building
						let cityHasBuilding1 = city.Constructibles?.hasConstructible(playerBuilding1, false);
						let cityHasBuilding2 = city.Constructibles?.hasConstructible(playerBuilding2, false);
						if (cityHasBuilding1 == true) {
							let result = null;
							//check if the other building can be built by the city
							const otherBuilding = GameInfo.Constructibles.lookup(playerBuilding2);
							let otherBuildingType = otherBuilding?.$index;
							result = Game.CityOperations.canStart(city.id, CityOperationTypes.BUILD, { ConstructibleType: otherBuildingType }, false);
							if (result.Success) {
								canBuildQuarter = true;
							}
						}
						if (cityHasBuilding2 == true) {
							let result = null;
							const otherBuilding = GameInfo.Constructibles.lookup(playerBuilding1);
							let otherBuildingType = otherBuilding?.$index;
							result = Game.CityOperations.canStart(city.id, CityOperationTypes.BUILD, { ConstructibleType: otherBuildingType }, false);
							if (result.Success) {
								canBuildQuarter = true;
							}
						}
					}
				}
			}
		}
		return canBuildQuarter;
	},
	completionEngineEvents: ["CityProductionChanged", "interface-mode-changed"],
});
// ------------------------------------------------------------------
// AGE PROGRESS & CRISES
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "age_progress",
	filterPlayers: [],
	runAllTurns: true,
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_AGE_PROGRESS_TITLE"),
		body: {
			text: "LOC_TUTORIAL_AGE_PROGRESS_BODY",
			getLocParams: (_item: TutorialItem) => {
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {

					const leaderType: LeaderType = player.leaderType;
					const leader: LeaderDefinition | null = GameInfo.Leaders.lookup(leaderType);
					const leaderName: string = (leader == null) ? "LOC_LEADER_NONE_NAME" : leader.Name;
					const civName: string = player.civilizationAdjective;
					return [leaderName, civName]

				}
				return [];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				ContextManager.push("screen-victory-progress", { singleton: true, createMouseGuard: true })
			},
			text: "LOC_TUTORIAL_CALLOUT_VICTORIES",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["AgeProgressionChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		let maxAgeProgress = Game.AgeProgressManager.getMaxAgeProgressionPoints();
		let curAgeProgress = Game.AgeProgressManager.getCurrentAgeProgressionPoints();
		if (curAgeProgress >= (maxAgeProgress / 3)) {
			return true;
		}

		return false;
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "player_defeat",
	filterPlayers: [],
	runAllTurns: true,
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_PLAYER_DEFEAT_TITLE"),
		body: {
			text: "LOC_TUTORIAL_PLAYER_DEFEAT_BODY",
			getLocParams: (_item: TutorialItem) => {
				let leaderName: string = "";
				const activationEventData = (TutorialManager.activatingEvent as PlayerDefeat_EventData);
				const defeatedPlayer: PlayerId | null = activationEventData.player;
				if (defeatedPlayer) {
					const playerConfig = Configuration.getPlayer(defeatedPlayer);
					if (playerConfig) {
						leaderName = playerConfig.leaderName ?? 'ERROR: Missing Leader Name';
					}
				}
				return [leaderName]
			}
		},
		option1: calloutClose,
	},
	activationEngineEvents: ["PlayerDefeat"],
	onActivateCheck: (_item: TutorialItem) => {
		const activationEventData = (TutorialManager.activatingEvent as PlayerDefeat_EventData);
		const defeatedPlayerID: PlayerId | null = activationEventData.player;
		if (defeatedPlayerID != null) {
			const defeatedPlayer: PlayerLibrary | null = Players.get(defeatedPlayerID);
			if (defeatedPlayer != null && defeatedPlayer?.isMajor) {
				if (defeatedPlayer.id != GameContext.localPlayerID) {
					return true;
				}
			}
		}
		return false;
	}
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "age_countdown_part_1",
	filterPlayers: [],
	runAllTurns: true,
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_AGE_COUNTDOWN_TITLE"),
		body: {
			text: "LOC_TUTORIAL_AGE_COUNTDOWN_BODY_PART_1",
			getLocParams: (_item: TutorialItem) => {
				let civAdj = "";
				let civName = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					civAdj = player.civilizationAdjective;
					civName = player.civilizationName;
				}
				return [civAdj, civName];
			}
		},
		option1: calloutContinue,
	},
	activationEngineEvents: ["AgeProgressionChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		let maxAgeProgress = Game.AgeProgressManager.getMaxAgeProgressionPoints();
		let curAgeProgress = Game.AgeProgressManager.getCurrentAgeProgressionPoints();
		if (curAgeProgress >= maxAgeProgress) {
			return true;
		}
		return false;
	},
	nextID: "age_countdown_part_2"
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "age_countdown_part_2",
	filterPlayers: [],
	runAllTurns: true,
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_AGE_COUNTDOWN_TITLE"),
		body: {
			text: "LOC_TUTORIAL_AGE_COUNTDOWN_BODY_PART_2"
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_PAGE_AGES_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "independent_encampment",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_INDEPENDENT_ENCAMPMENT_TITLE",
		body: {
			text: "LOC_TUTORIAL_INDEPENDENT_ENCAMPMENT_BODY",
			getLocParams: (_item: TutorialItem) => {
				let independentLocation: float2 = { x: -1, y: -1 };
				let independentID: PlayerId = PlayerIds.NO_PLAYER;
				let bFromUnit = false;
				let bVillageDiscovered = false;
				let independentText: string = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					const activationEventData = (TutorialManager.activatingEvent as DiplomacyMeet_EventData);
					if (activationEventData.viewingObjectID != null) {
						const unit = Units.get(activationEventData.viewingObjectID);
						if (unit) {
							if (unit.owner == player.id) { //If the player is the one spotting the other player, use the location from the event if valid
								const eventLoc: float2 = activationEventData.location;
								if (eventLoc.x >= 0 && eventLoc.y >= 0) {
									independentID = Game.IndependentPowers.getIndependentPlayerIDAt(eventLoc.x, eventLoc.y);
									independentLocation = eventLoc;
								}
							}
							else {
								const objLoc = unit.location;
								if (objLoc.x >= 0 && objLoc.y >= 0) {
									bFromUnit = true;
									independentID = Game.IndependentPowers.getIndependentPlayerIDFromUnit(activationEventData.viewingObjectID);
									independentLocation = objLoc;
								}
							}
						}
					}
					else {
						const eventLoc: float2 = activationEventData.location;
						if (eventLoc.x >= 0 && eventLoc.y >= 0) {
							independentID = Game.IndependentPowers.getIndependentPlayerIDAt(eventLoc.x, eventLoc.y);
							independentLocation = eventLoc;
						}
					}
					if (independentID == PlayerIds.NO_PLAYER) {
						//  If we got here then we probably checked the location for an independent and it was a unit, not owned by an independent player.
						const eventLoc: float2 = activationEventData.location;
						independentID = Game.IndependentPowers.getIndependentPlayerIDWithUnitsAt(eventLoc.x, eventLoc.y);
						bFromUnit = true;
					}
					if (independentID != PlayerIds.NO_PLAYER) {
						bVillageDiscovered = Game.IndependentPowers.independentVillageDiscoveredByPlayer(independentID, GameContext.localPlayerID);
						let independentName: string | null = Game.IndependentPowers.independentName(independentID);
						let isEncampment: boolean | null = Game.IndependentPowers.isIndependentEncampment(independentID);
						if (independentName != null && isEncampment) {
							if ((bFromUnit) || (!bVillageDiscovered)) {
								independentText = Locale.compose("LOC_TUTORIAL_INDEPENDENT_ENCAMPMENT_UNIT_BODY", independentName)
							}
							else {
								independentText = Locale.compose("LOC_TUTORIAL_INDEPENDENT_ENCAMPMENT_VILLAGE_BODY", independentName)
							}
						}
						Camera.lookAtPlot(independentLocation, { zoom: 0.25 });
						_item.highlightPlots = [GameplayMap.getIndexFromLocation(independentLocation)];
					}
				}
				return [independentText];
			}
		},
		option1: calloutContinue,
	},
	runAllTurns: true,
	activationEngineEvents: ["DiplomacyMeetIndependents"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const activationEventData = (TutorialManager.activatingEvent as DiplomacyMeet_EventData);
			const independentID = Game.IndependentPowers.getIndependentPlayerIDFromUnit(activationEventData.viewingObjectID);
			if (independentID != PlayerIds.NO_PLAYER) {
				const isEncampment: boolean | null = Game.IndependentPowers.isIndependentEncampment(independentID);
				let isPlayer1Encampment: boolean | null = Game.IndependentPowers.isIndependentEncampment(activationEventData.player1);
				let isPlayer2Encampment: boolean | null = Game.IndependentPowers.isIndependentEncampment(activationEventData.player2);
				if (activationEventData.player1 == GameContext.localPlayerID || activationEventData.player2 == GameContext.localPlayerID) {
					if (isEncampment && (isPlayer1Encampment || isPlayer2Encampment)) {
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
	ID: "crisis_policy",
	callout: {
		anchorPosition: TutorialAnchorPosition.TopCenter,
		title: Locale.compose("LOC_TUTORIAL_CRISIS_POLICY_TITLE"),
		body: { text: Locale.compose("LOC_TUTORIAL_CRISIS_POLICY_BODY") }
	},
	filterPlayers: [],
	activationCustomEvents: ["OnContextManagerOpen_screen-policies"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const culture: PlayerCulture | null = Players.Culture.get(GameContext.localPlayerID);
			if (culture) {
				if (culture?.numCrisisTraditionSlots > 0) {
					return true;
				}
			}
		}
		return false;
	},
	completionEngineEvents: ["TraditionChanged"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "plagues",
	filterPlayers: [],
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_PLAGUES_NAME"),
		body: { text: Locale.compose("LOC_TUTORIAL_PLAGUES_BODY") },
		option1: calloutContinue,
	},
	activationEngineEvents: ["NotificationAdded"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const activationEventData = (TutorialManager.activatingEvent as NotificationActivated_EventData);
			if (activationEventData.id.owner == player.id) {
				const notification: Notification | null = Game.Notifications.find(activationEventData.id);
				if (notification) {
					if (Game.Notifications.getTypeName(notification.Type) == "NOTIFICATION_PLAGUE_MAJOR_OUTBREAK" || Game.Notifications.getTypeName(notification.Type) == "NOTIFICATION_PLAGUE_MINOR_OUTBREAK" || Game.Notifications.getTypeName(notification.Type) == "NOTIFICATION_PLAGUE_SPREADS") {
						return true;
					}
				}
			}
		}
		return false;
	},
	completionEngineEvents: ["NotificationActivated"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "revolts",
	filterPlayers: [],
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_REVOLTS_NAME"),
		body: {
			text: "LOC_TUTORIAL_REVOLTS_BODY",
			getLocParams: (_item: TutorialItem) => {
				let cityName: string = "null";
				let currentHappines: number = 0;
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					let playerCities: City[] | undefined = player.Cities?.getCities();
					if (playerCities) {
						for (let i = 0; i < playerCities.length; ++i) {
							let city = playerCities[i];
							if (city) {
								const netHappiness = city.Happiness?.netHappinessPerTurn;
								if (netHappiness && netHappiness < currentHappines && !city.isCapital) {
									cityName = city.name;
									currentHappines = netHappiness;
									Camera.lookAtPlot(city.location, { zoom: 0.25 });
								}
							}
						}
					}
				}
				return [cityName];
			}
		},
		option1: calloutContinue,
	},
	activationEngineEvents: ["NotificationAdded"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const activationEventData = (TutorialManager.activatingEvent as NotificationActivated_EventData);
			if (activationEventData.id.owner == player.id) {
				const notification: Notification | null = Game.Notifications.find(activationEventData.id);
				if (notification) {
					if (Game.Notifications.getTypeName(notification.Type) == "NOTIFICATION_REVOLT") {
						return true;
					}
				}
			}
		}
		return false;
	},
	completionEngineEvents: ["NotificationActivated"],
});

// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_wonder_unlocked",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_UNLOCKED_FIRST_WONDER_TITLE",
		body: {
			text: "LOC_TUTORIAL_UNLOCKED_FIRST_WONDER_BODY",
			getLocParams: (_item: TutorialItem) => {
				let WonderName = "";
				if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
					const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
					if (player) {
						const cityID: ComponentID | null = UI.Player.getHeadSelectedCity();
						for (let i = 0; i < GameInfo.Constructibles.length; ++i) {
							if (GameInfo.Constructibles[i].ConstructibleClass == "WONDER") {
								let thisWonder = GameInfo.Constructibles[i];
								if (cityID) {
									let result: OperationResult | null = null;
									result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { ConstructibleType: i }, false);
									if (result.Success) {
										WonderName = thisWonder.Name;
									}
								}
							}
						}
					}
				}
				return [WonderName];
			},
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_WONDERS_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		let bWonderAvailable: boolean = false;
		if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				const cityID: ComponentID | null = UI.Player.getHeadSelectedCity();
				for (let i = 0; i < GameInfo.Constructibles.length; ++i) {
					if (GameInfo.Constructibles[i].ConstructibleClass == "WONDER") {
						if (cityID) {
							let result: OperationResult | null = null;
							result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { ConstructibleType: i }, false);
							if (result.Success) {
								bWonderAvailable = true;
							}
						}
					}
				}
			}
		}
		return bWonderAvailable;
	},
	onActivate: (item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player && player.Units) {
			const buttonHighlights: string[] = [];
			const cityID: ComponentID | null = UI.Player.getHeadSelectedCity();
			for (let i = 0; i < GameInfo.Constructibles.length; ++i) {
				if (GameInfo.Constructibles[i].ConstructibleClass == "WONDER") {
					if (cityID) {
						let thisWonder = GameInfo.Constructibles[i];
						let result: OperationResult | null = null;
						result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { ConstructibleType: i }, false);
						if (result.Success) {
							buttonHighlights.push(".production-item[item-type=\"" + thisWonder.ConstructibleType + "\"]");
							break;
						}
					}
				}
			}
			item.highlights = buttonHighlights;
		}
	},
	completionEngineEvents: ["CityProductionChanged", "interface-mode-changed"],
});
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
//							TODO: BRIAN WORKS ABOVE THIS LINE, KIERA WORKS UNDER THIS LINE.
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_civ_unique_improvement_unlocked",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_CIV_IMPROVEMENT_UNLOCKED_TITLE",
		body: {
			text: "LOC_TUTORIAL_CIV_IMPROVEMENT_UNLOCKED_BODY",
			getLocParams: (_item: TutorialItem) => {
				let ImprovementName = "";
				let civAdj = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					civAdj = player.civilizationAdjective;
					const cityID: ComponentID | null = UI.Player.getHeadSelectedCity();
					for (let i = 0; i < GameInfo.Constructibles.length; ++i) {
						if (GameInfo.Constructibles[i].ConstructibleClass == "IMPROVEMENT") {
							if (cityID) {
								let targetType = GameInfo.Constructibles[i].ConstructibleType;
								const improvementInfo = GameInfo.Improvements.lookup(targetType);
								if (improvementInfo?.TraitType != null) {
									let result: OperationResult | null = null;
									result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { ConstructibleType: i }, false);
									if (result.Success) {
										ImprovementName = GameInfo.Constructibles[i].Name;
									}
								}
							}
						}
					}
				}
				return [ImprovementName, civAdj];
			},
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_BUILDINGS_5_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
			let bImprovementAvailable: boolean = false;
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				const cityID: ComponentID | null = UI.Player.getHeadSelectedCity();
				for (let i = 0; i < GameInfo.Constructibles.length; ++i) {
					if (GameInfo.Constructibles[i].ConstructibleClass == "IMPROVEMENT") {
						if (cityID) {
							let targetType = GameInfo.Constructibles[i].ConstructibleType;
							const improvementInfo = GameInfo.Improvements.lookup(targetType);
							if (improvementInfo?.TraitType != null) {
								let result: OperationResult | null = null;
								result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { ConstructibleType: i }, false);
								if (result.Success) {
									bImprovementAvailable = true;
								}
							}
						}
					}
				}
			}
			return bImprovementAvailable;
		}
		return false;
	},
	onActivate: (item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const buttonHighlights: string[] = [];
			if (player && player.Units) {
				const cityID: ComponentID | null = UI.Player.getHeadSelectedCity();
				for (let i = 0; i < GameInfo.Constructibles.length; ++i) {
					if (GameInfo.Constructibles[i].ConstructibleClass == "IMPROVEMENT") {
						if (cityID) {
							let targetType = GameInfo.Constructibles[i].ConstructibleType;
							const improvementInfo = GameInfo.Improvements.lookup(targetType);
							if (improvementInfo?.TraitType != null) {
								let result: OperationResult | null = null;
								result = Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { ConstructibleType: i }, false);
								if (result.Success) {
									buttonHighlights.push(".production-item[item-type=\"" + targetType.toString() + "\"]");
									break;
								}
							}
						}
					}
				}
			}
			item.highlights = buttonHighlights;
		}
	},
	completionEngineEvents: ["CityProductionChanged", "interface-mode-changed"],
});
//------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_repair",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_REPAIR_TITLE",
		body: {
			text: "LOC_TUTORIAL_REPAIR_BODY",
			getLocParams: (_item: TutorialItem) => {
				let RepairItem = "";
				let CityName = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					const selectedCityID = UI.Player.getHeadSelectedCity();
					if (selectedCityID != null) {
						const thisCity: City | null = Cities.get(selectedCityID);
						if (thisCity && thisCity.Constructibles) {
							CityName = thisCity.name;
							const cityConstructibles: ConstructibleID[] = thisCity.Constructibles.getIds();
							for (let i = 0; i < cityConstructibles.length; ++i) {
								let thisConstructible = Constructibles.getByComponentID(cityConstructibles[i]);
								let constType = thisConstructible?.type;
								if (thisConstructible) {
									let thisConstructibleInfo = GameInfo.Constructibles.lookup(thisConstructible?.type);
									let result: OperationResult | null = null;
									result = Game.CityOperations.canStart(selectedCityID, CityOperationTypes.BUILD, { ConstructibleType: constType }, false);
									if (result.RepairDamaged && thisConstructibleInfo) {
										RepairItem = thisConstructibleInfo.Name;
									}
								}

							}
						}
					}

				}
				return [RepairItem, CityName];
			},
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_REPAIR_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		let canRepair = false;
		if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player) {
				const selectedCityID = UI.Player.getHeadSelectedCity();
				if (selectedCityID != null) {
					const thisCity: City | null = Cities.get(selectedCityID);
					if (thisCity && thisCity.Constructibles) {
						const cityConstructibles: ConstructibleID[] = thisCity.Constructibles.getIds();
						for (let i = 0; i < cityConstructibles.length; ++i) {
							let thisConstructibleInfo = Constructibles.getByComponentID(cityConstructibles[i]);
							let constType = thisConstructibleInfo?.type
							let result: OperationResult | null = null;
							result = Game.CityOperations.canStart(selectedCityID, CityOperationTypes.BUILD, { ConstructibleType: constType }, false);
							if (result.RepairDamaged) {
								canRepair = true;
							}
						}
					}
				}
			}
		}
		return canRepair;
	},
	onActivate: (item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const buttonHighlights: string[] = [];
			const selectedCityID = UI.Player.getHeadSelectedCity();
			if (selectedCityID != null) {
				const thisCity: City | null = Cities.get(selectedCityID);
				if (thisCity && thisCity.Constructibles) {
					const cityConstructibles: ConstructibleID[] = thisCity.Constructibles.getIds();
					for (let i = 0; i < cityConstructibles.length; ++i) {
						let thisConstructible = Constructibles.getByComponentID(cityConstructibles[i]);
						let constType = thisConstructible?.type;
						if (thisConstructible) {
							let thisConstructibleInfo = GameInfo.Constructibles.lookup(thisConstructible?.type);
							let result: OperationResult | null = null;
							result = Game.CityOperations.canStart(selectedCityID, CityOperationTypes.BUILD, { ConstructibleType: constType }, false);
							if (result.RepairDamaged && thisConstructibleInfo) {
								buttonHighlights.push(".production-item[item-type=\"" + thisConstructibleInfo.ConstructibleType + "\"]");
								break;
							}
						}
					}
				}
			}
			item.highlights = buttonHighlights;
		}
	},
	completionEngineEvents: ["CityProductionChanged", "interface-mode-changed"],
});
//------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_warehouse",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_WAREHOUSE_TITLE",
		body: {
			text: "LOC_TUTORIAL_WAREHOUSE_BODY",
			getLocParams: (_item: TutorialItem) => {
				let warehouseName = "";
				let cityName = "";
				if (TutorialManager.activatingEventName == "ConstructibleBuildCompleted") {
					const activationEventData = (TutorialManager.activatingEvent as ConstructibleBuildCompleted_EventData);
					let thisConstructibleInfo = GameInfo.Constructibles.lookup(activationEventData.constructibleType);
					let plotIndex = GameplayMap.getIndexFromLocation(activationEventData.location);
					const thisCity: City | null = Cities.getAtLocation(plotIndex);
					if (thisCity && thisConstructibleInfo) {
						cityName = thisCity?.name;
						warehouseName = thisConstructibleInfo?.Name;
					}
				}
				else if (TutorialManager.activatingEventName == "ConstructibleAddedToMap") {
					const activationEventData = (TutorialManager.activatingEvent as ConstructibleAddedToMap_EventData);
					let thisConstructibleInfo = GameInfo.Constructibles.lookup(activationEventData.constructibleType);
					let plotIndex = GameplayMap.getIndexFromLocation(activationEventData.location);
					const thisCity: City | null = Cities.getAtLocation(plotIndex);
					if (thisCity && thisConstructibleInfo) {
						cityName = thisCity?.name;
						warehouseName = thisConstructibleInfo?.Name;
					}
				}

				return [warehouseName, cityName];
			},
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_BUILDINGS_2_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: ["ConstructibleBuildCompleted", "ConstructibleAddedToMap"],
	onActivateCheck: (_item: TutorialItem) => {
		let hasWarehouse = false;
		if (TutorialManager.activatingEventName == "ConstructibleBuildCompleted") {
			const activationEventData = (TutorialManager.activatingEvent as ConstructibleBuildCompleted_EventData);
			let thisConstructibleWarehouse = GameInfo.Constructible_WarehouseYields.lookup(activationEventData.constructibleType);
			if (thisConstructibleWarehouse != null) {
				hasWarehouse = true;
			}
		}
		else if (TutorialManager.activatingEventName == "ConstructibleAddedToMap") {
			const activationEventData = (TutorialManager.activatingEvent as ConstructibleBuildCompleted_EventData);
			let thisConstructibleWarehouse = GameInfo.Constructible_WarehouseYields.lookup(activationEventData.constructibleType);
			if (thisConstructibleWarehouse != null && activationEventData.percentComplete == 100) {
				hasWarehouse = true;
			}
		}
		return hasWarehouse;
	},
	onActivate: (_item: TutorialItem) => {
		if (TutorialManager.activatingEventName == "ConstructibleBuildCompleted") {
			const activationEventData = (TutorialManager.activatingEvent as ConstructibleBuildCompleted_EventData);
			Camera.lookAtPlot(activationEventData.location, { zoom: 0.25 });
			_item.highlightPlots = [GameplayMap.getIndexFromLocation(activationEventData.location)];
		}
		else if (TutorialManager.activatingEventName == "ConstructibleAddedToMap") {
			const activationEventData = (TutorialManager.activatingEvent as ConstructibleBuildCompleted_EventData);
			Camera.lookAtPlot(activationEventData.location, { zoom: 0.25 });
			_item.highlightPlots = [GameplayMap.getIndexFromLocation(activationEventData.location)];
		}
	},
	completionEngineEvents: ["interface-mode-changed", "UnitSelectionChanged"],
});
//------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_make_peace",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_MAKE_PEACE_TITLE",
		body: {
			text: "LOC_TUTORIAL_MAKE_PEACE_BODY",
			getLocParams: (_item: TutorialItem) => {
				let leaderName = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					const PlayerList: PlayerLibrary[] = Players.getAlive();
					for (let i = 0; i < PlayerList.length; ++i) {
						if (PlayerList[i].isMajor && PlayerList[i].id != player.id) {
							if (player.Diplomacy?.isAtWarWith(PlayerList[i].id)) {
								// canMakePeaceWith does not return a bool.  It returns a Result in case you need tooltip information.  
								const peaceQueryResults: DiplomacyQueryResult = player.Diplomacy.canMakePeaceWith(PlayerList[i].id, false);
								if (peaceQueryResults.Success) {
									leaderName = PlayerList[i].name;
								}
							}
						}
					}
				}
				return [leaderName]
			}
		},
		option1: calloutClose,
	},
	activationCustomEvents: ["PlayerTurnActivated"],
	onActivateCheck: (_item: TutorialItem) => {
		let canMakePeace: boolean = false;
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const PlayerList: PlayerLibrary[] = Players.getAlive();
			for (let i = 0; i < PlayerList.length; ++i) {
				if (PlayerList[i].isMajor && PlayerList[i].id != player.id) {
					if (player.Diplomacy?.isAtWarWith(PlayerList[i].id)) {
						const peaceQueryResults: DiplomacyQueryResult = player.Diplomacy.canMakePeaceWith(PlayerList[i].id, false);
						if (peaceQueryResults.Success) {
							canMakePeace = true;
						}
					}
				}
			}
		}
		return canMakePeace;
	},
});
//------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_befriend_city_state_available",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_BEFRIEND_INDEPENDENT_TITLE",
		body: {
			text: "LOC_TUTORIAL_BEFRIEND_INDEPENDENT_BODY",
			getLocParams: (_item: TutorialItem) => {
				let peopleName = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player && player.DiplomacyTreasury?.diplomacyBalance) {
					if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") && DiplomacyManager.selectedPlayerID != GameContext.localPlayerID && !Players.get(DiplomacyManager.selectedPlayerID)?.isMajor && DiplomacyManager.selectedPlayerID != PlayerIds.NO_PLAYER) {
						let independentName = Game.IndependentPowers.independentName(DiplomacyManager.selectedPlayerID);
						if (independentName) {
							peopleName = independentName;
						}
					}
				}
				return [peopleName]
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_STATEHOOD_3_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player && player.DiplomacyTreasury?.diplomacyBalance) {
			if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") && DiplomacyManager.selectedPlayerID != GameContext.localPlayerID && Players.get(DiplomacyManager.selectedPlayerID)?.isIndependent) {
				waitForLayout(() => {
					if (DiplomacyManager.selectedPlayerID != PlayerIds.NO_PLAYER) {
						const becomeSuzerain = DiplomacyActionTypes.DIPLOMACY_ACTION_GIVE_INFLUENCE_TOKEN;
						const influenceCost = Game.Diplomacy.getInfluenceForBaseAction(becomeSuzerain, player.id, DiplomacyManager.selectedPlayerID);
						if (influenceCost >= 0 && player && player.DiplomacyTreasury?.diplomacyBalance && influenceCost <= player.DiplomacyTreasury?.diplomacyBalance) {
							return true;
						}
					}
					return false;
				})
			}
		}
		return false;
	},
	completionCustomEvents: ["interface-mode-changed"],
});
// ------------------------------------------------------------------
//IMPROVEMENTS FTUE
TutorialManager.add({
	ID: "tutorial_third_improvement",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_IMPROVEMENTS_TITLE"),
		body: {
			text: "LOC_TUTORIAL_IMPROVEMENTS_BODY",
			getLocParams: (_item: TutorialItem) => {
				let cityName = "";
				const activationEventData = (TutorialManager.activatingEvent);
				let plotIndex = GameplayMap.getIndexFromLocation(activationEventData.location);
				const thisCity: City | null = Cities.getAtLocation(plotIndex);
				if (thisCity) {
					cityName = thisCity.name;
				}
				return [cityName];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_TILES_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["CityTileOwnershipChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		const activationEventData = (TutorialManager.activatingEvent);
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		let plotIndex = GameplayMap.getIndexFromLocation(activationEventData.location);
		const thisCity: City | null = Cities.getAtLocation(plotIndex);
		if (player && thisCity?.owner == player?.id && thisCity?.ruralPopulation >= 3) {
			return true;
		}
		return false;
	},
	onActivate: (_item: TutorialItem) => {
		const activationEventData = (TutorialManager.activatingEvent);
		Camera.lookAtPlot(activationEventData.location, { zoom: 0.25 });
		_item.highlightPlots = [GameplayMap.getIndexFromLocation(activationEventData.location)];
	},
	completionCustomEvents: ["interface-mode-changed"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_production_queue_multiple_items",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: Locale.compose("LOC_TUTORIAL_QUEUE_MULTIPLE_ITEMS_TITLE"),
		body: {
			text: "LOC_TUTORIAL_QUEUE_MULTIPLE_ITEMS_BODY",
		},
		option1: calloutClose,
	},
	activationEngineEvents: ["CityProductionQueueChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		const activationEventData = (TutorialManager.activatingEvent as CityProductionQueueChanged_EventData);
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player?.id == activationEventData.cityID.owner && activationEventData.queueEntry >= 1) {
			return true;
		}
		return false;
	},
	//TODO: Find way to highlight the item in the queue panel to draw attention to where it is.
	//TODO: needs control prompts to explain how to cancel production
	completionCustomEvents: ["interface-mode-changed"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_purchase_panel",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_PURCHASE_SCREEN_TITLE",
		body: {
			text: "LOC_TUTORIAL_PURCHASE_SCREEN_BODY",
			getLocParams: (_item: TutorialItem) => {
				let cityName = "";
				const cityID: ComponentID | null = UI.Player.getHeadSelectedCity();
				if (cityID) {
					const city: City | null = Cities.get(cityID);
					if (city) {
						cityName = city.name;
					}
				}
				return [cityName]
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_GOLD_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_CITY_PURCHASE")) {
			return true;
		}
		return false;
	},
	completionCustomEvents: ["interface-mode-changed"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_town_production_panel",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_PRODUCTION_SCREEN_TOWN_TITLE",
		body: {
			text: "LOC_TUTORIAL_PRODUCTION_SCREEN_TOWN_BODY",
			getLocParams: (_item: TutorialItem) => {
				let cityName = "";
				const cityID: ComponentID | null = UI.Player.getHeadSelectedCity();
				if (cityID) {
					const city: City | null = Cities.get(cityID);
					if (city) {
						cityName = city.name;
					}
				}
				return [cityName]
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_TOWN_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_CITY_PRODUCTION")) {
			const cityID: ComponentID | null = UI.Player.getHeadSelectedCity();
			if (cityID) {
				const city: City | null = Cities.get(cityID);
				if (city?.isTown) {
					return true;
				}
			}
		}
		return false;
	},
	completionCustomEvents: ["interface-mode-changed"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_pick_suzerain_bonus",
	filterPlayers: [],
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_SUZERAIN_BONUS_TITLE",
		body: { text: "LOC_TUTORIAL_SUZERAIN_BONUS_BODY" },
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_STATEHOOD_3_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["NotificationActivated"],
	onActivateCheck: (_item: TutorialItem) => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		if (player) {
			const activationEventData = (TutorialManager.activatingEvent as NotificationActivated_EventData);
			if (activationEventData.byUser && activationEventData.id.owner == player.id) {
				const notification: Notification | null = Game.Notifications.find(activationEventData.id);
				if (notification) {
					if (Game.Notifications.getTypeName(notification.Type) == "NOTIFICATION_CHOOSE_CITY_STATE_BONUS") {
						return true;
					}
				}
			}
		}
		return false;
	},
	completionCustomEvents: ["interface-mode-changed"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_great_work_earned",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_GREAT_WORKS_TITLE",
		body: { text: "LOC_TUTORIAL_GREAT_WORKS_EARNED" },
	},
	activationEngineEvents: ["GreatWorkCreated"],
	onActivateCheck: () => {
		const activationEventData = (TutorialManager.activatingEvent as GreatWorkCreated_EventData);
		const player = Players.get(GameContext.localPlayerID);
		if (player) {
			const thisCity: City | null = Cities.getAtLocation(activationEventData.location);
			if (thisCity?.owner == player.id) {
				return true;
			}
		}
		return false;
	},
	completionCustomEvents: ["OnContextManagerOpen_screen-great-works"],
	nextID: "tutorial_great_work_screen",
	highlights: [".tut-great-works"]
});
// ------------------------------------------------------------------
TutorialManager.add({ //TODO: account for different great work names 
	ID: "tutorial_great_work_screen",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_GREAT_WORKS_TITLE",
		body: { text: "LOC_TUTORIAL_GREAT_WORKS_BODY" },
		option1: calloutContinue
	},
	onActivate() {
		ContextManager.push("screen-great-works", { singleton: true, createMouseGuard: true })
	},
	nextID: "tutorial_great_work_display"
});
// ------------------------------------------------------------------
TutorialManager.add({ //TODO: Showcase may be removed
	ID: "tutorial_great_work_display",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_GREAT_WORKS_TITLE",
		body: { text: "LOC_TUTORIAL_GREAT_WORKS_DISPLAY_BODY" },
		option1: calloutContinue
	},
	nextID: "tutorial_great_work_archive"
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_great_work_archive",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_GREAT_WORKS_TITLE",
		body: { text: "LOC_TUTORIAL_GREAT_WORKS_ARCHIVE_BODY" },
		option1: calloutContinue
	},
	nextID: "tutorial_great_work_slot"
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_great_work_slot",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleLeft,
		title: "LOC_TUTORIAL_GREAT_WORKS_TITLE",
		body: { text: "LOC_TUTORIAL_GREAT_WORKS_SLOT_BODY" },
		option1: calloutClose
	},
	completionCustomEvents: ["interface-mode-changed", "OnContextManagerClose"],
});
// ------------------------------------------------------------------
TutorialManager.add({ //TODO: Add Leader icon highlight
	ID: "tutorial_leader_screen_intro",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_LEADER_SCREEN_TITLE",
		body: {
			text: "LOC_TUTORIAL_LEADER_SCREEN_INTRO_BODY",
			getLocParams: (_item: TutorialItem) => {
				let civAdj: string = "";
				const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
				if (player) {
					civAdj = player.civilizationAdjective;
				}
				return [civAdj];
			}
		},
		actionPrompts: [
			{
				kbm: "LOC_TUTORIAL_LEADER_SCREEN_INTRO_BODY_KBM",
				gamepad: "LOC_TUTORIAL_LEADER_SCREEN_INTRO_BODY_GAMEPAD",
				hybrid: "LOC_TUTORIAL_LEADER_SCREEN_INTRO_BODY_KBM",
				touch: "LOC_TUTORIAL_LEADER_SCREEN_INTRO_BODY_TOUCH",
				actionName: "inline-toggle-radial-menu"
			}
		],
	},
	activationEngineEvents: ["CityPopulationChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		let capitalHasPop = false;
		const activationEventData = (TutorialManager.activatingEvent as CityPopulationChanged_EventData);
		let player = Players.get(GameContext.localPlayerID);
		let thiscity = activationEventData.cityID;
		if (thiscity.owner == player?.id) {
			if (activationEventData.newPopulation > 9) {
				capitalHasPop = true;
			}
		}
		return capitalHasPop;
	},
	completionCustomEvents: ["interface-mode-changed"],
	nextID: "tutorial_leader_screen",
	onObsoleteCheck: (_item: TutorialItem) => {
		if (TutorialManager.isItemCompleted("tutorial_leader_screen_left")) {
			return true;
		}
		return false;
	},
	highlights: ['.diplo-ribbon__portrait[data-player-id="0"]']
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_leader_screen_left",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleLeft,
		title: "LOC_TUTORIAL_LEADER_SCREEN_TITLE",
		body: { text: "LOC_TUTORIAL_LEADER_SCREEN_OPENED_BODY" },
		option1: calloutContinue
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		if (InterfaceMode.isInInterfaceMode("INTERFACEMODE_DIPLOMACY_HUB") && DiplomacyManager.selectedPlayerID == GameContext.localPlayerID) {
			return true;
		}
		return false;
	},
	nextID: "tutorial_leader_screen_right"
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_leader_screen_right",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleLeft,
		title: "LOC_TUTORIAL_LEADER_SCREEN_TITLE",
		body: { text: "LOC_TUTORIAL_LEADER_SCREEN_PANELS_BODY" },
		option1: calloutClose
	},
	completionCustomEvents: ["interface-mode-changed"],
	highlights: ["#diplomacy-tab-actions-tab-item", "#diplomacy-tab-relationship-tab-item", "#diplomacy-tab-government-tab-item", "#diplomacy-tab-info-tab-item"]
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_resource_screen_intro",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_RESOURCE_TITLE",
		body: {
			text: "LOC_TUTORIAL_RESOURCE_SCREEN_BODY"
		},
		option1: calloutContinue
	},
	activationCustomEvents: ["OnContextManagerOpen_screen-resource-allocation"],
	completionCustomEvents: ["interface-mode-changed", "OnContextManagerClose"],
	filterPlayers: []
});
// ------------------------------------------------------------------
TutorialManager.add({ //TODO: fancy production highlights can be added.
	ID: "tutorial_altar",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_ALTAR_TITLE",
		body: {
			text: "LOC_TUTORIAL_ALTAR_BODY"
		},
		option1: calloutClose,
	},
	activationCustomEvents: ["interface-mode-changed"],
	onActivateCheck: (_item: TutorialItem) => {
		let bAltarAvailable = false;
		if (InterfaceMode.getCurrent() == "INTERFACEMODE_CITY_PRODUCTION") {
			const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
			if (player && player.Culture) {
				const cityID: ComponentID | null = UI.Player.getHeadSelectedCity();
				if (cityID) {
					if (player.Culture.isNodeUnlocked("NODE_CIVIC_AQ_MAIN_MYSTICISM")) {
						bAltarAvailable = true;
					}
				}
			}
		}
		return bAltarAvailable;
	},
	completionEngineEvents: ["CityProductionChanged", "interface-mode-changed"],
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "tutorial_city_capture",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleRight,
		title: "LOC_TUTORIAL_CITY_CAPTURE_TITLE",
		body: {
			text: "LOC_TUTORIAL_CITY_CAPTURE_BODY",
			getLocParams: (_item: TutorialItem) => {
				let unitName = "";
				let cityName = "";
				const activationEventData = (TutorialManager.activatingEvent as UnitMovementPointsChanged_EventData);
				let player = Players.get(GameContext.localPlayerID);
				if (activationEventData && player) {
					let thisUnit = Units.get(activationEventData.unit)
					if (thisUnit != null) {
						unitName = thisUnit.name;
						const thisCity = MapCities.getCity(thisUnit.location.x, thisUnit.location.y);
						if (thisCity != null) {
							let thisCityInfo = Cities.get(thisCity)
							if (thisCityInfo) {
								cityName = thisCityInfo.name;
							}
						}
					}
				}
				return [unitName, cityName];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_CONCEPTS_PAGE_CITYCAPTURE_1_TITLE"));
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationCustomEvents: [LOCAL_PLAYER_UNIT_MOVEMENT_POINTS_CHANGED],
	onActivateCheck: (_item: TutorialItem) => {
		const activationEventData = (TutorialManager.activatingEvent as UnitMovementPointsChanged_EventData);
		if (activationEventData.unit.owner != GameContext.localPlayerID) {
			return false;
		}

		let player = Players.get(GameContext.localPlayerID);
		if (activationEventData && player) {
			let thisUnit = Units.get(activationEventData.unit)
			if (thisUnit != null) {
				const thisCity: any = MapCities.getCity(thisUnit.location.x, thisUnit.location.y);
				if (thisCity != null && thisCity.owner != player.id) {
					if (player.Diplomacy?.isAtWarWith(thisCity.owner)) {
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
	ID: "tutorial_war_cooldown",
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: "LOC_TUTORIAL_WAR_COOLDOWN_TITLE",
		body: {
			text: "LOC_TUTORIAL_WAR_COOLDOWN_BODY",
			getLocParams: (_item: TutorialItem) => {
				let otherPlayerName = "NO_PLAYER";
				let player = Players.get(GameContext.localPlayerID);
				const PlayerList: PlayerLibrary[] = Players.getAlive();
				if (player && player.Diplomacy) {
					for (let i = 0; i < PlayerList.length; ++i) {
						if (PlayerList[i].isMajor && PlayerList[i].id != player.id) {
							if (!player.Diplomacy.isAtWarWith(PlayerList[i].id) && !player.Diplomacy.canDeclareWarOn(PlayerList[i].id) && player.Diplomacy.hasMet(PlayerList[i].id)) {
								otherPlayerName = PlayerList[i].name;
							}
						}
					}
				}
				return [otherPlayerName];
			}
		},
		option1: calloutClose
	},
	//activationCustomEvents: ["interface-mode-changed"],
	//this event doesn't seem to trigger, but adding what I worked on for text lock.
	onActivateCheck: (_item: TutorialItem) => {
		let isInCooldown = false;
		let player = Players.get(GameContext.localPlayerID);
		const PlayerList: PlayerLibrary[] = Players.getAlive();
		if (player && player.Diplomacy) {
			for (let i = 0; i < PlayerList.length; ++i) {
				if (PlayerList[i].isMajor && PlayerList[i].id != player.id) {
					if (!player.Diplomacy.isAtWarWith(PlayerList[i].id) && !player.Diplomacy.canDeclareWarOn(PlayerList[i].id) && player.Diplomacy.hasMet(PlayerList[i].id)) {
						isInCooldown = true;
					}
				}
			}
		}
		return isInCooldown;
	},
});
// ------------------------------------------------------------------
TutorialManager.add({
	ID: "units_at_age_transition",
	filterPlayers: [],
	runAllTurns: true,
	callout: {
		anchorPosition: TutorialAnchorPosition.MiddleCenter,
		title: Locale.compose("LOC_TUTORIAL_UNITS_AT_AGE_TRANSITION_TITLE"),
		body: {
			text: "LOC_TUTORIAL_UNITS_AT_AGE_TRANSITION_BODY",
			getLocParams: (_item: TutorialItem) => {
				const unitsAssignedToSettlements = 6;
				let injectString = "";
				if (Configuration.getGame().getValue("AgeTransitionSettingName") != "AGE_TRANSITION_SETTING_KEEP_MORE") {
					injectString = Locale.compose("LOC_TUTORIAL_UNITS_INJECT_AT_AGE_TRANSITION_BODY", unitsAssignedToSettlements);
				}
				return [injectString];
			}
		},
		option1: calloutClose,
		option2: {
			callback: () => {
				if (Configuration.getGame().getValue("AgeTransitionSettingName") != "AGE_TRANSITION_SETTING_KEEP_MORE") {
					TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_PAGE_AGES_39_TITLE"));
				}
				else {
					TutorialSupport.OpenCivilopediaAt(Locale.compose("LOC_PEDIA_PAGE_AGES_40_TITLE"));
				}
			},
			text: "LOC_TUTORIAL_CIVILOPEDIA_TELL_ME_MORE",
			actionKey: "inline-accept",
			closes: true
		},
	},
	activationEngineEvents: ["AgeProgressionChanged"],
	onActivateCheck: (_item: TutorialItem) => {
		let maxAgeProgress = Game.AgeProgressManager.getMaxAgeProgressionPoints();
		let curAgeProgress = Game.AgeProgressManager.getCurrentAgeProgressionPoints();
		if (curAgeProgress >= (maxAgeProgress * 0.75)) {
			return true;
		}
		return false;
	}
});
// ------------------------------------------------------------------
TutorialManager.process("antiquity items");		// Must appear at end of item bank!
