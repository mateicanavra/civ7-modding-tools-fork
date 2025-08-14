/**
 * World Input Mangement
 * @copyright 2020-2025, Firaxis Games
 * 
 * Handles input interacting with the world.
  */

import ActionHandler from '/core/ui/input/action-handler.js';
import ContextManager from '/core/ui/context-manager/context-manager.js';
import Cursor from '/core/ui/input/cursor.js';
import PlotCursor from '/core/ui/input/plot-cursor.js'
import FocusManager from '/core/ui/input/focus-manager.js';
import ViewManager from '/core/ui/views/view-manager.js';

import { Audio } from '/core/ui/audio-base/audio-support.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { IEngineInputHandler, InputEngineEvent, NavigateInputEvent } from '/core/ui/input/input-support.js';
import { NetworkUtilities } from 'core/ui/utilities/utilities-network.js';

// TODO: Re-architectto remove base-standard based dependencies:
import { RaiseDiplomacyEvent } from '/base-standard/ui/diplomacy/diplomacy-events.js';
import { UnitMapDecorationSupport } from '/base-standard/ui/interface-modes/support-unit-map-decoration.js'


export type PlotSelectionHandler = ((plot: PlotCoord, previousPlot: PlotCoord | null) => boolean);
export type PostDeclareWarActionFunc = (() => void);
export type WarHandler = ((warDeclarationTarget: WarDeclarationTarget, postDeclareWarActionFunc: PostDeclareWarActionFunc) => boolean);

type AttackOperationResult = Pick<OperationResult, 'Success'>

class WorldInputSingleton implements IEngineInputHandler {

	private selectedPlot: float2 | null = null;
	private canUnitSelect: boolean = true;
	private canCitySelect: boolean = true;

	private defaultPlotSelectionHandler: PlotSelectionHandler = (location: PlotCoord, previousLocation: PlotCoord | null): boolean => { return this.handleSelectedPlot(location, previousLocation); }
	private plotSelectionHandler: PlotSelectionHandler = this.defaultPlotSelectionHandler;
	private warHandlers: WarHandler[] = [];
	private uiDisableWorldInputListener: EventListener = () => { Camera.setPreventMouseCameraMovement(true); }; 			// disable all input
	private uiEnableWorldInputListener: EventListener = () => { Camera.setPreventMouseCameraMovement(false); };				// enable all input
	private uiDisableWorldCityInputListener: EventListener = () => { this.canCitySelect = false };							// disable city input only
	private uiEnableWorldCityInputListener: EventListener = () => { this.canCitySelect = true };							// enable city input
	private uiDisableWorldUnitInputListener: EventListener = () => { this.canUnitSelect = false };							// disable unit input only
	private uiEnableWorldUnitInputListener: EventListener = () => { this.canUnitSelect = true };							// enable unit input


	constructor() {
		engine.whenReady.then(() => { this.onReady(); });
	}

	onReady() {
		window.addEventListener('ui-disable-world-input', this.uiDisableWorldInputListener);
		window.addEventListener('ui-enable-world-input', this.uiEnableWorldInputListener);
		window.addEventListener('ui-disable-world-city-input', this.uiDisableWorldCityInputListener);
		window.addEventListener('ui-enable-world-city-input', this.uiEnableWorldCityInputListener);
		window.addEventListener('ui-disable-world-unit-input', this.uiDisableWorldUnitInputListener);
		window.addEventListener('ui-enable-world-unit-input', this.uiEnableWorldUnitInputListener);
	}

	/**
	 * @returns true if still live, false if input should stop.
	   */
	handleInput(inputEvent: InputEngineEvent): boolean {

		switch (inputEvent.detail.name) {
			case 'mousebutton-left':
				return this.actionActivate(inputEvent);
			case 'accept':
				return this.actionActivate(inputEvent);
			case 'touch-tap':
				return this.handleTouchTap(inputEvent);
			case 'mousebutton-right':
				return this.actionMouseRightButton(inputEvent);
			case 'swap-plot-selection':
				return this.swapPlotSelection(inputEvent);
			case 'cancel':
				return this.actionCancel(inputEvent);
			case 'shell-action-5':
				return this.onSocialPanel(inputEvent);
		}

		return true;
	}

	/**
	 * @returns true if still live, false if input should stop.
	 */
	handleNavigation(_navigationEvent: NavigateInputEvent): boolean {
		return true;
	}

	private trySelectPlot(isOnUI: boolean): boolean {
		const coord = PlotCursor.plotCursorCoords;
		if (isOnUI || coord == null || (!FocusManager.isWorldFocused() && InterfaceMode.isInInterfaceMode("INTERFACEMODE_DEFAULT"))) {
			console.log(`World Input: Fail because isOnUI (${isOnUI}), plot (${PlotCursor.plotCursorCoords == null}) `);
			return true;
		}
		console.log(`World Input: Selected plot '${coord.x},${coord.y}'`);
		this.selectPlot(coord);
		return false;
	}

	/**
	 * @returns true if still live, false if input should stop.
	 */
	private actionActivate(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return true;
		}

		// TODO: disabled the Cursor.isOnUI check due to actions triggered when the cursor was on the world (not UI) -- fixup in test before merging
		return this.trySelectPlot(Cursor.isOnUI);
	}

	private isOnUI(x: number, y: number): boolean {
		const target: Element | null = document.elementFromPoint(x, y);
		return !(target == document.documentElement || target == document.body || target == null || target.hasAttribute("data-pointer-passthrough"));
	}

	private handleTouchTap(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return true;
		}

		const isOnUI: boolean = this.isOnUI(inputEvent.detail.x, inputEvent.detail.y);

		return this.trySelectPlot(isOnUI);
	}

	private actionCancel(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return true;
		}

		if (Cursor.isOnUI) {
			return true;
		}

		InterfaceMode.switchToDefault();
		this.unselectPlot();
		return false;
	}

	/**
	 * @returns true if still live, false if input should stop.
	 */
	private actionMouseRightButton(inputEvent: InputEngineEvent): boolean {

		// With gamepads we do not want 'action-target' to trigger quick actions
		//if (Cursor.isOnUI || #TODO Temporarily disabling this check, as it is always returning true.
		if (UI.getViewExperience() == UIViewExperience.VR) {
			if (ActionHandler.isGamepadActive) {
				return true;
			}
		}

		// Early out in case something cleared out plotCursorCoords. Potentially normal behavior.
		if (PlotCursor.plotCursorCoords == null) {
			return true;
		}

		//For now, we need to divide when this engine event is used by various parts of UI. 
		if (UI.getViewExperience() != UIViewExperience.VR) {
			//TODO: remove this if focus management system is updated to not gate input at context manager.
			if (!ContextManager.canUseInput("world-input", 'action-target') || !ViewManager.isWorldInputAllowed) {
				return true;
			}
		}

		if (inputEvent.detail.status == InputActionStatuses.FINISH) {
			this.doActionOnPlot(PlotCursor.plotCursorCoords);
			UnitMapDecorationSupport.manager.showDesiredDestination = false;
			UnitMapDecorationSupport.manager.update(PlotCursor.plotCursorCoords);
		} else if (inputEvent.detail.status == InputActionStatuses.START) {
			const headSelectedUnit: ComponentID | null = UI.Player.getHeadSelectedUnit();
			if (headSelectedUnit) {
				UnitMapDecorationSupport.manager.showDesiredDestination = true;
				UnitMapDecorationSupport.manager.update(PlotCursor.plotCursorCoords);
			}
		}

		return false;
	}

	private onSocialPanel(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return true;
		}

		if (ContextManager.canOpenPauseMenu()) {
			NetworkUtilities.openSocialPanel();
			return false;
		}

		return true;
	}

	/**
	 * Swap the selection between units and city in the same plot.
	 * @returns true if still live, false if input should stop.
	 */
	private swapPlotSelection(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return true;
		}

		const selectedUnit: ComponentID | null = UI.Player.getHeadSelectedUnit();

		if (!selectedUnit || selectedUnit.owner != GameContext.localPlayerID) {
			return true;
		}

		const unit: Unit | null = Units.get(selectedUnit);
		if (!unit) {
			return true;
		}

		let unitsList: ComponentID[] = MapUnits.getUnits(unit.location.x, unit.location.y);
		const districtId: ComponentID | null = MapCities.getDistrict(unit.location.x, unit.location.y);

		unitsList = unitsList.filter(u => u.owner == GameContext.localPlayerID);
		if (selectedUnit && ComponentID.isValid(selectedUnit) && (unitsList.length > 1 || districtId)) {
			let targetIndex: number = 0;
			for (let i: number = 0; i < unitsList.length; i++) {
				if (unitsList[i].id == selectedUnit?.id) {
					targetIndex = i + 1;
					break;
				}
			}
			// loop around
			if (targetIndex > unitsList.length - 1) {
				if (districtId && ComponentID.isValid(districtId)) {
					if (this.isDistrictSelectable(districtId)) {
						const district: District | null = Districts.get(districtId);
						if (district) {
							if (district.cityId) {
								const city: City | null = Cities.get(district.cityId);
								if (city && city.owner == GameContext.localPlayerID) {
									UI.Player.selectCity(district.cityId);
								} else {
									this.handleSelectedPlotCity({ x: unit.location.x, y: unit.location.y });
								}
								return false;
							} else {
								this.handleSelectedPlotCity({ x: unit.location.x, y: unit.location.y });
								return false;
							}
						}
					}
				}
				targetIndex = 0;
			}
			UI.Player.selectUnit(unitsList[targetIndex]);
		}

		return false; // TODO only return false if we actualy swapped selection ?
	}

	isDistrictSelectable(districtId: ComponentID): boolean {
		if (districtId && ComponentID.isValid(districtId)) {
			const district: District | null = Districts.get(districtId);
			if (district) {
				const owningPlayer: PlayerLibrary | null = Players.get(district.owner);
				if (owningPlayer) {
					if (district.cityId && district.type == DistrictTypes.CITY_CENTER || owningPlayer.isIndependent) {
						return true;
					}
				}
			}
		}
		return false;
	}

	setPlotSelectionHandler(handler: PlotSelectionHandler) {
		this.plotSelectionHandler = handler;
	}

	useDefaultPlotSelectionHandler() {
		this.plotSelectionHandler = this.defaultPlotSelectionHandler;
	}

	private unselectPlot() {
		this.selectedPlot = null;
	}

	private selectPlot(location: PlotCoord) {
		const previousPlot: PlotCoord | null = this.selectedPlot;
		this.selectedPlot = location;
		this.plotSelectionHandler(location, previousPlot);
	}


	/**
	 * Default handler for clicking a plot with a unit potentially in it.
	 * @param {PlotCoord} location a plot's x/y location in the world map.
	 * @param {PlotCoord|null} previousPlot is the previous plot's x/y location in the world map or NULL if no previous plot was selected
	 * @returns {boolean} true if input is still "live", false if "handled" and/or consumed
	 */
	private handleSelectedPlotUnit(location: PlotCoord, previousPlot: PlotCoord | null): boolean {
		const localPlayerID: PlayerId = GameContext.localPlayerID;

		// With gamepads we want 'action-activate' to trigger quick actions when unit is selected
		if (ActionHandler.isGamepadActive) {
			if (previousPlot == null || (location.x != previousPlot.x || location.y != previousPlot.y)) {
				const selectedUnit: ComponentID | null = UI.Player.getHeadSelectedUnit();
				if (selectedUnit && selectedUnit.owner == localPlayerID) {
					const unit: Unit | null = Units.get(selectedUnit);
					if (unit) {
						if (unit.location.x != location.x || unit.location.y != location.y) {
							this.doActionOnPlot(location);
							return false;
						}
					}
				}
			}
		}

		let units = MapUnits.getUnits(location.x, location.y);	// Get all units on plot
		units = units.filter(u => u.owner == localPlayerID);	// Reduce to just owned by local player

		// Determine starting index to cycle units.
		let selectedIndex = -1;
		const prevUnit = UI.Player.getHeadSelectedUnit();
		if (prevUnit && prevUnit.owner == localPlayerID) {
			selectedIndex = units.findIndex(u => u.id == prevUnit.id);
		}
		selectedIndex++;	// Cycle to next value.

		// If a unit is already selected, see if anyone else wants to handle it instead.
		// interact-unit will if it's a gamepad, and there may be modding possibilities.
		if (selectedIndex > 0) {
			const cancelled: boolean = !window.dispatchEvent(new CustomEvent('unit-reselected', { bubbles: false, cancelable: true, detail: location }));
			if (cancelled) {	// If an external routine handled this; end early.
				return false;
			}
		}

		if (selectedIndex < units.length) {
			let newSelection = units[selectedIndex];
			UI.Player.selectUnit(newSelection);
			UI.sendAudioEvent(Audio.getSoundTag('data-audio-activate'));
			return false;
		}

		return true; // Input still live.
	}


	/**
	 * Handle selecting the city at the given plot
	 * @param {PlotCoord} location a plot's x/y location in the world map.
	 * @returns {boolean} true if input is still live, false otherwise
	 */
	private handleSelectedPlotCity(location: PlotCoord): boolean {
		const localPlayerID: PlayerId = GameContext.localPlayerID;

		// Player may have conquered a district but not own the city.
		const districtId: ComponentID | null = MapCities.getDistrict(location.x, location.y);
		if (districtId) {
			const district: District | null = Districts.get(districtId);
			if (district) {
				if (district.cityId && district.type == DistrictTypes.CITY_CENTER) {
					const city: City | null = Cities.get(district.cityId);
					if (city) {
						if (city.owner == localPlayerID) {
							UI.sendAudioEvent(Audio.getSoundTag('data-audio-activate'));
							UI.Player.selectCity(district.cityId);
							return false;
						} else {
							const otherPlayer: PlayerLibrary | null = Players.get(city.owner);
							if (!otherPlayer) {
								console.error("world-input: Invalid player library for owner of clicked city.");
								return false;
							}
							if (otherPlayer.isMajor || otherPlayer.isMinor) {
								//Enter diplomacy if clicking on the city of another major player
								//  Needing to add edge case check for if players haven't met since early age and distanct lands from each other so will never meet.
								//  	but close enough they spot each other.
								if (!Game.Diplomacy.hasMet(localPlayerID, city.owner)) {
									return false;
								}
								window.dispatchEvent(new RaiseDiplomacyEvent(city.owner));
							}
							return false;
						}
					}
				} else if (Players.get(district.owner)?.isIndependent) {
					//  Needing to add edge case check for if players haven't met since early age and distanct lands from each other so will never meet.
					//  	but close enough they spot each other.
					if (!Game.Diplomacy.hasMet(localPlayerID, district.owner)) {
						return false;
					}
					window.dispatchEvent(new RaiseDiplomacyEvent(district.owner));
					return false;
				}
			}
		}

		const prevUnit = UI.Player.getHeadSelectedUnit();
		if (prevUnit && prevUnit.owner == localPlayerID) {
			const unit: Unit | null = Units.get(prevUnit);
			if (!unit) {
				console.error("world-input.ts: Unable to retrieve Unit object for unit with id: " + ComponentID.toLogString(prevUnit));
				InterfaceMode.switchToDefault();
				return true;
			}

			//If we still have a unit selected, we only want to exit unit interact via "keyboard-escape" or selecting the unit again
			if (unit.location.x != location.x || unit.location.y != location.y) {
				return false;
			}
		}

		InterfaceMode.switchToDefault();
		return true;	// Input still live
	}

	/**
	 * Default handler if a player has clicked on the world.
	 * Attempts to select a unit first, if all units in plot have had a chance, loops around to any city selection.
	 * @param {PlotCoord} location a plot's x/y location in the world map.
	 * @param {PlotCoord|null} previousPlot is the previous plot's x/y location in the world map or NULL if no previous plot was selected
	 * @returns {boolean} true if input is still "live", false if "handled" and/or consumed
	 */
	private handleSelectedPlot(location: PlotCoord, previousPlot: PlotCoord | null): boolean {
		if (!ViewManager.isWorldSelectingAllowed) {
			return true;
		}
		if (location.x == -1 || location.y == -1) {
			console.error(`World input: attempt to handle select plot with invalid coordinates (${location.x},${location.y})`);
			return true;
		}

		// With gamepads and touch we want to trigger quick actions when unit is selected
		if (this.canUnitSelect && (ActionHandler.isGamepadActive || ActionHandler.deviceType == InputDeviceType.Touch)) {
			if (previousPlot == null || (location.x != previousPlot.x || location.y != previousPlot.y)) {
				const selectedUnit: ComponentID | null = UI.Player.getHeadSelectedUnit();
				if (selectedUnit && selectedUnit.owner == GameContext.localPlayerID) {
					const unit: Unit | null = Units.get(selectedUnit);
					if (unit && (unit.location.x != location.x || unit.location.y != location.y)) {
						this.doActionOnPlot(location);
						return false;
					}
				}
			}
		}

		if (GameplayMap.getRevealedState(GameContext.localPlayerID, location.x, location.y) == RevealedStates.HIDDEN) {
			return true;
		}

		let live: boolean = true;
		if (this.canUnitSelect) {
			live = this.handleSelectedPlotUnit(location, null);		// Try Unit first...
		}
		if (live && this.canCitySelect) {
			live = this.handleSelectedPlotCity(location);		// ... City/district second.
		}
		return live;
	}

	requestMoveOperation(unitComponentID: ComponentID, parameters: any): boolean {
		const unit: Unit | null = Units.get(unitComponentID);
		if (!unit) {
			console.error("Request move on NULL unit at: ", parameters.X, ",", parameters.Y);
			return false;
		}

		parameters.Modifiers = UnitOperationMoveModifiers.NONE;

		//Naval and Air units evaluate combat slightly differently than Land units
		const navalAttack: AttackOperationResult = Game.UnitOperations?.canStart(unit.id, "UNITOPERATION_NAVAL_ATTACK", parameters, false);
		if (navalAttack.Success) {
			const operationCallback = () => {
				parameters.Modifiers = UnitOperationMoveModifiers.ATTACK + UnitOperationMoveModifiers.MOVE_IGNORE_UNEXPLORED_DESTINATION;
				UI.sendAudioEvent(Audio.getSoundTag('data-audio-unit-combat-confirmed', 'interact-unit'));
				Game.UnitOperations?.sendRequest(unit.id, "UNITOPERATION_NAVAL_ATTACK", parameters);
			}

			if (this.checkDeclareWarAt(unit, parameters.X, parameters.Y, operationCallback)) {
				return true;
			}

			operationCallback();

		} else {
			const airAttack: AttackOperationResult = Game.UnitOperations?.canStart(unit.id, "UNITOPERATION_AIR_ATTACK", parameters, false);
			if (airAttack.Success) {
				const operationCallback = () => {
					parameters.Modifiers = UnitOperationMoveModifiers.ATTACK + UnitOperationMoveModifiers.MOVE_IGNORE_UNEXPLORED_DESTINATION;
					UI.sendAudioEvent(Audio.getSoundTag('data-audio-unit-combat-confirmed', 'interact-unit'));
					Game.UnitOperations?.sendRequest(unit.id, "UNITOPERATION_AIR_ATTACK", parameters);
				}

				if (this.checkDeclareWarAt(unit, parameters.X, parameters.Y, operationCallback)) {
					return true;
				}

				operationCallback();
			} else {
				const combatType: CombatTypes = Game.Combat.testAttackInto(unit.id, parameters);
				if (combatType == CombatTypes.COMBAT_RANGED) {

					const operationCallback = () => {
						const result: AttackOperationResult = Game.UnitOperations?.canStart(unit.id, "UNITOPERATION_RANGE_ATTACK", parameters, false);
						if (result.Success) {
							parameters.Modifiers = UnitOperationMoveModifiers.ATTACK + UnitOperationMoveModifiers.MOVE_IGNORE_UNEXPLORED_DESTINATION;
							Game.UnitOperations?.sendRequest(unit.id, "UNITOPERATION_RANGE_ATTACK", parameters);
							UI.sendAudioEvent(Audio.getSoundTag('data-audio-unit-combat-confirmed', 'interact-unit'));
							return true
						}

						return false;
					}

					// See if we need to declare war
					if (this.checkDeclareWarAt(unit, parameters.X, parameters.Y, operationCallback)) {
						return true;
					};

					return operationCallback();
				} else {
					const canOverrun: AttackOperationResult = Game.UnitCommands?.canStart(unit.id, "UNITCOMMAND_ARMY_OVERRUN", parameters, false);
					if (canOverrun.Success) {
						Game.UnitCommands?.sendRequest(unit.id, "UNITCOMMAND_ARMY_OVERRUN", parameters);
						UI.sendAudioEvent(Audio.getSoundTag('data-audio-unit-combat-confirmed', 'interact-unit'));
					}
					else {
						// Check that unit isn't already in the plot (essentially canceling the move),
						// otherwise the operation will complete, and while no move is made, the next
						// unit will auto select.
						if (parameters.X != unit.location.x || parameters.Y != unit.location.y) {
							const canSwap: AttackOperationResult = Game.UnitOperations?.canStart(unit.id, "UNITOPERATION_SWAP_UNITS", parameters, false);
							if (canSwap.Success) {
								Game.UnitOperations?.sendRequest(unit.id, "UNITOPERATION_SWAP_UNITS", parameters);
							}
							else {
								if (combatType == CombatTypes.NO_COMBAT) {
									UI.sendAudioEvent(Audio.getSoundTag('data-audio-unit-move-confirmed', 'interact-unit'));
								} else {
									UI.sendAudioEvent(Audio.getSoundTag('data-audio-unit-combat-confirmed', 'interact-unit'));
								}

								// See if we need to declare war
								const operationCallback = () => {
									parameters.Modifiers = UnitOperationMoveModifiers.ATTACK + UnitOperationMoveModifiers.MOVE_IGNORE_UNEXPLORED_DESTINATION;
									const result: AttackOperationResult = Game.UnitOperations.canStart(unit.id, UnitOperationTypes.MOVE_TO, parameters, false);
									if (!result.Success) {
										return false;
									}
									Game.UnitOperations?.sendRequest(unit.id, UnitOperationTypes.MOVE_TO, parameters);
									return true;
								}

								if (this.checkDeclareWarAt(unit, parameters.X, parameters.Y, operationCallback)) {
									return true;
								}

								return operationCallback();
							}
						}
					}
				}
			}
		}

		return false
	}

	private checkDeclareWarAt(attackingUnit: Unit, x: number, y: number, postDeclareWarAction: PostDeclareWarActionFunc): boolean {
		const warDeclarationTarget: WarDeclarationTarget = { player: PlayerIds.NO_PLAYER, independentIndex: IndependentTypes.NO_INDEPENDENT };
		const playerDiplomacy = Players.get(attackingUnit.owner)?.Diplomacy;
		const targetLocation: PlotCoord = { x, y };

		if (playerDiplomacy) {
			const result: DiplomacyQueryResult = playerDiplomacy.willMoveStartWar(attackingUnit.id, targetLocation);
			if (result.Success) {
				if (result.Player2 != undefined) {
					warDeclarationTarget.player = result.Player2;
				}
			}
		}

		// Do we need to declare war?
		if (warDeclarationTarget.player != PlayerIds.NO_PLAYER) {
			const length = this.warHandlers.length;
			for (let i = 0; i < length; i++) {
				const callback = this.warHandlers[i];
				if (callback(warDeclarationTarget, postDeclareWarAction)) {	// If true,
					break;													// war has been handled.
				}
			}
			return true;
		}

		return false;
	}


	/**
	 * Add a handler for when war may be declared.
	 * @param warHandler callback function to raise.
	 */
	public addWarHandler(warHandler: WarHandler) {
		const found = this.warHandlers.some((existingHandler) => {
			if (existingHandler == warHandler) {
				return true;
			}
			return false;
		});
		if (!found) {
			this.warHandlers.push(warHandler)
		} else {
			console.error("Duplicate war handler registration attempted on the world input.");
		}
	}


	// Use the target as an action for any selected object
	private doActionOnPlot(location: float2) {
		let headSelectedUnit: ComponentID | null = UI.Player.getHeadSelectedUnit();
		let operationName: string = "UNITOPERATION_MOVE_TO";
		if (headSelectedUnit) {
			let args: any = {};
			args.X = location.x;
			args.Y = location.y;
			this.requestMoveOperation(headSelectedUnit, args);
		} else {
			operationName = "NONE";
		}

		// TODO: remove? Deprecated as nothing uses this and not all move paths (right-click path, and gamepad fast move)
		const detail: any = {
			plotCoordinates: location,
			operation: operationName
		}
		window.dispatchEvent(new CustomEvent('action-on-plot', { bubbles: true, detail: detail }));

		this.unselectPlot();
	}

}
const WorldInput: WorldInputSingleton = new WorldInputSingleton();
export { WorldInput as default }
