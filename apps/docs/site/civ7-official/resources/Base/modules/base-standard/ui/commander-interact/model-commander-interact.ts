/**
 * @file model-commander-interact.ts
 * @copyright 2023, Firaxis Games
 */

import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import { UnitAction, UnitActionCategory } from '/base-standard/ui/unit-actions/unit-actions.js';
import { UnitActionHandlers } from '/base-standard/ui/unit-interact/unit-action-handlers.js'
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { formatStringArrayAsNewLineText } from '/core/ui/utilities/utilities-core-textprovider.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import ViewManager from '/core/ui/views/view-manager.js';

export interface CommanderModelInterface {
	updateCallback: () => void;
}

type ArmyCommanderItem = {
	commander: Unit;
	commanderExperience?: UnitExperience | undefined;
	army: Army;
	packedUnits: Unit[];
	availableReinforcements?: any;
}

type CommanderExperience = {
	caption: string;
	progress: string;
}

export type CommanderReinforcementItem = {
	unitID: ComponentID;
	armyID: number;
	startLocation: float2;
	path: UnitGetPathToResults;
	arrivalTime: number;
	commanderToReinforce?: Unit;
	isTraveling: boolean;
}

class CommanderInteractModel {

	private _registeredComponents: CommanderModelInterface[] = [];

	private armyCommanders: ArmyCommanderItem[] = [];
	private availableReinforcementIDs: ComponentID[] = [];
	private _index: number = 0;

	// Model Data
	private _name: string = "";
	private _experience: CommanderExperience | null = null;
	private _hasExperience: boolean = false;
	private _hasPackedUnits: boolean = false;
	private _hasActions: boolean = false;
	private _hasData: boolean = false;
	private _currentArmyCommander: ArmyCommanderItem | null = null;
	private _availableReinforcements: CommanderReinforcementItem[] = [];
	private _commanderActions: UnitAction[] = [];

	private _OnUpdate?: (model: CommanderInteractModel) => void;
	public updateGate: UpdateGate = new UpdateGate(() => { this.update(); });

	constructor() {
		engine.whenReady.then(() => {
			this.updateGate.call('init');
			engine.on('UnitSelectionChanged', this.onUnitSelectionChanged, this);
		});
	}

	set updateCallback(callback: (model: CommanderInteractModel) => void) {
		this._OnUpdate = callback;
	}

	public registerListener(c: CommanderModelInterface) {

		if (this._registeredComponents.length == 0) {
			engine.on('UnitAddedToMap', this.onUnitAddedRemoved, this);
			engine.on('UnitRemovedFromMap', this.onUnitAddedRemoved, this);
			engine.on('UnitAddedToArmy', this.onUnitArmyChange, this);
			engine.on('UnitRemovedFromArmy', this.onUnitArmyChange, this);
			engine.on('UnitExperienceChanged', this.onUnitExperienceChanged, this);

		}

		this._registeredComponents.push(c);

	}

	public unregisterListener(c: CommanderModelInterface) {
		let raiseIndex: number = this._registeredComponents.findIndex((listener: CommanderModelInterface) => {
			return listener == c;
		});
		this._registeredComponents.splice(raiseIndex, 1);

		// if we have no more components listening for updates to the model unregister from events
		if (this._registeredComponents.length == 0) {
			engine.off('UnitAddedToMap', this.onUnitAddedRemoved, this);
			engine.off('UnitRemovedFromMap', this.onUnitAddedRemoved, this);
			engine.off('UnitAddedToArmy', this.onUnitArmyChange, this);
			engine.off('UnitRemovedFromArmy', this.onUnitArmyChange, this);
			engine.off('UnitExperienceChanged', this.onUnitExperienceChanged, this);
			// engine.off('UnitSelectionChanged', this.onUnitSelectionChanged, this);
		}
	}

	get name(): string { return this._name; }
	get experience(): CommanderExperience | null { return this._experience; }
	get hasExperience(): boolean { return this._hasExperience; }
	get hasPackedUnits(): boolean { return this._hasPackedUnits; }
	get hasActions(): boolean { return this._hasActions; }
	get hasData(): boolean { return this._hasData; }
	get currentArmyCommander(): ArmyCommanderItem | null { return this._currentArmyCommander; }
	get availableReinforcements(): CommanderReinforcementItem[] { return this._availableReinforcements; }
	get commanderActions(): UnitAction[] { return this._commanderActions; }

	private update() {
		this.availableReinforcementIDs = [];
		this._availableReinforcements = [];

		const localPlayerID: PlayerId = GameContext.localPlayerID;
		const player: PlayerLibrary | null = Players.get(localPlayerID);

		if (!player) {
			console.error("model-commander-interact: Local player not found");
			return;
		}

		const playerUnits: PlayerUnits | undefined = player.Units;
		if (playerUnits == undefined) {
			return;
		}

		this.updateArmyData();

		this._hasData = this.armyCommanders.length > 0;

		if (!this._hasData) {
			this._name = "LOC_UI_COMMANDER_NO_AVAILABLE";
			this._hasPackedUnits = false;
			this._hasActions = false;
			this._hasExperience = false;
			return;
		}

		// Set current army commander
		this._currentArmyCommander = this.armyCommanders[this._index];
		this._name = this._currentArmyCommander.commander.name;
		this._hasPackedUnits = this._currentArmyCommander.packedUnits.length > 0;

		// Look at the current army commander
		const commanderLocation: PlotCoord = this._currentArmyCommander.commander.location;
		if (commanderLocation.x >= 0 && commanderLocation.y >= 0 && this.currentArmyCommander?.commander.isReadyToSelect) {
			UI.Player.selectUnit(this._currentArmyCommander.commander.id);
		}

		const experience: UnitExperience | undefined = this._currentArmyCommander.commanderExperience;
		if (!experience) {
			this._hasExperience = false;
			this._experience = null;
		} else {
			this._hasExperience = true;
			const currentExperience: number = experience.experiencePoints;
			const experienceToNextLevel: number = experience.experienceToNextLevel;
			const normalizedXpProgress: number = Math.min(1, (currentExperience / experienceToNextLevel));
			const experienceProgress: string = (normalizedXpProgress * 100) + '%';
			const experienceCaption: string = `${Locale.compose("LOC_PROMOTION_EXPERIENCE")}: ${currentExperience}/${experienceToNextLevel}`;

			this._experience = {
				progress: experienceProgress,
				caption: experienceCaption
			}
		}

		if (!this.currentArmyCommander) {
			console.error("model-commander-interact: current army commander not set");
			return;
		}

		// Process reinforcements 
		for (let i: number = 0; i < this.availableReinforcementIDs.length; i++) {
			const unitID: ComponentID = this.availableReinforcementIDs[i];
			const args: any = {};
			const result: OperationResult = Game.UnitOperations.canStart(unitID, 'UNITOPERATION_REINFORCE_ARMY', args, false);

			if (result.Success && result.Units) {
				const commanderId: number = this.currentArmyCommander.commander.localId;
				const unitId: number | undefined = result.Units.find(id => { return id == commanderId });
				// skip this id if the current commander is not eligible for reinforcement
				if (!unitId) {
					continue;
				}
			}

			const unit: Unit | null = Units.get(unitID);
			if (!unit) {
				console.error("model-commander-interact: No unit with id: " + unitID);
				return;
			}

			const playerArmies: PlayerArmies | undefined = player.Armies;
			if (!playerArmies) {
				console.error("model-commander-interact: No PlayerArmy defined for player with id: " + player.id);
				return;
			}

			const reinforcementPathPlots: number[] = playerArmies.getUnitReinforcementPath(unitID, localPlayerID);
			const reinforcementETA: number = playerArmies.getUnitReinforcementETA(unitID, localPlayerID);
			const startLocation: float2 = playerArmies.getUnitReinforcementStartLocation(unitID, localPlayerID);
			const armyId: number = playerArmies.getUnitReinforcementCommanderId(unitID, localPlayerID);
			const armyCommander: ArmyCommanderItem | undefined = this.armyCommanders.find(c => { return c.army.localId == armyId });
			const unitCurrentLocation: float2 = unit.location;
			const pathToCommander: UnitGetPathToResults = Units.getPathTo(unitID, this.currentArmyCommander.commander.location);
			const turnsToCurrentCommander: number = Math.max(...pathToCommander.turns, 0); // Default to 0 if it is negative
			const location: float2 = (startLocation.x >= 0 && startLocation.y >= 0) ? startLocation : unitCurrentLocation;
			const arrivalTime: number = reinforcementETA > 0 ? reinforcementETA : turnsToCurrentCommander;
			const reinforcementPath: UnitGetPathToResults = { plots: reinforcementPathPlots, turns: [reinforcementETA], obstacles: [] };
			const path: UnitGetPathToResults = pathToCommander.plots.length > 0 ? pathToCommander : reinforcementPath;

			const reinforcementItem: CommanderReinforcementItem = {
				unitID: unitID,
				armyID: armyId,
				startLocation: location,
				path: path,
				arrivalTime: arrivalTime,
				commanderToReinforce: armyCommander?.commander,
				isTraveling: !unit.isOnMap
			}

			this._availableReinforcements.push(reinforcementItem);
		}

		// Add unit actions from commander		
		const commander: Unit | null = this.currentArmyCommander.commander || null;
		if (!commander) {
			console.warn("model-commander-interact: Couldn't find commander unit");
			return;
		}

		const actions: UnitAction[] = this.getUnitActions(commander);
		const commanderActions: UnitAction[] | undefined = actions.filter(action => { return action.UICategory == UnitActionCategory.COMMAND || action.type == 'UNITCOMMAND_PROMOTE' });
		// Asign data index, using priority as holding property
		commanderActions.forEach((action, index) => action.priority = index);

		this._commanderActions = commanderActions;
		this._hasActions = this.commanderActions.length > 0;

		if (this._OnUpdate) {
			this._OnUpdate(this);
		}

		this._registeredComponents.forEach(c => {
			c.updateCallback();
		});
	}

	setName(name: string) {
		this._name = name;
		if (this._OnUpdate) {
			this._OnUpdate(this);
		}
	}

	public setArmyCommander(unitID: ComponentID) {
		const selectedIndex: number | undefined = this.armyCommanders.findIndex(c => { return ComponentID.isMatch(c.commander.id, unitID) });
		if (selectedIndex != undefined && selectedIndex >= 0) {
			this._index = selectedIndex;
			this.update(); // Update with new index data
		}
	}

	getCommanderReinforcementItem(unitID: ComponentID): CommanderReinforcementItem | undefined {
		return this.availableReinforcements.find(r => { return ComponentID.isMatch(unitID, r.unitID) });
	}

	// update reinforcements, packed units, and commander
	private updateArmyData() {
		this.armyCommanders = [];
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);

		if (!player) {
			console.error("model-commander-interact: Local player not found");
			return;
		}

		const playerUnits: PlayerUnits | undefined = player.Units;
		if (playerUnits == undefined) {
			return;
		}

		const unitIDs: ComponentID[] = playerUnits.getUnitIds();
		for (const unitID of unitIDs) {
			const unit: Unit | null = Units.get(unitID);
			const args: any = {};
			const result: OperationResult = Game.UnitOperations.canStart(unitID, 'UNITOPERATION_REINFORCE_ARMY', args, false);
			const reinforcementId: number | undefined = player.Armies?.getUnitReinforcementCommanderId(unitID, GameContext.localPlayerID);
			// if it is not reinforcing yet but can, the result should be true
			// if it is reinforcing, the result would be false but the reinforcement id is valid
			if (result.Success || reinforcementId != -1) {
				this.availableReinforcementIDs.push(unitID);
			}

			if (unit != null && unit.isCommanderUnit) {
				//const commanderId: ComponentID = unit.id;
				const commanderExperience: UnitExperience | undefined = unit.Experience;

				const armyId: ComponentID = unit.armyId;
				const army: Army | null = Armies.get(armyId);
				if (!army) {
					console.error("model-commander-interact: No army defined for commander with id: " + unitID);
					return;
				}

				const armyUnitIds: ComponentID[] = army.getUnitIds();
				const packedUnits: Unit[] = armyUnitIds.reduce((result, unitId) => {
					const unit: Unit | null = Units.get(unitId);
					if (unit) {
						result.push(unit);
					}
					return result;
				}, new Array<Unit>());

				this.armyCommanders.push({
					commander: unit,
					commanderExperience: commanderExperience,
					army: army,
					packedUnits: packedUnits
				});
			}
		}
	}

	private onUnitAddedRemoved(data: Unit_EventData) {
		if (data.unit.owner == GameContext.localPlayerID) {
			this.updateGate.call("onUnitAddedRemoved");
		}
	}

	private onUnitArmyChange(data: Unit_Army_EventData) {
		if (ComponentID.isValid(data.initiatingUnit)) {
			const unit: Unit | null = Units.get(data.initiatingUnit);
			if (!unit) {
				console.error("model-commander-interact: onUnitArmyChange: Unable to retrieve unit object for unit with id: " + data.initiatingUnit.id.toString());
				return;
			}
			this.updateGate.call("onUnitArmyChange");
		}
	}

	private onUnitExperienceChanged(data: Unit_EventData) {
		if (ComponentID.isMatch(data.unit, UI.Player.getHeadSelectedUnit())) {
			const unit: Unit | null = Units.get(data.unit);
			if (!unit) {
				console.error("model-commander-interact: onUnitExperienceChanged: Unable to retrieve unit object for unit with id: " + data.unit.id.toString());
				return;
			}
			this.updateGate.call("onUnitExperienceChanged");
		}
	}

	private onUnitSelectionChanged(event: UnitSelectionChangedData) {
		if (!ViewManager.isUnitSelectingAllowed) {
			return;
		}

		if (event.unit.owner == GameContext.localPlayerID && event.selected) {
			const unitComponentID: ComponentID | null = UI.Player.getHeadSelectedUnit();
			if (!ComponentID.isValid(unitComponentID)) {
				console.warn("model-commander-interact: onUnitSelectionChanged: Unit selected message signaled but no head selected unit!");
				return;
			}

			if (ComponentID.isMatch(unitComponentID, event.unit)) {
				const unit: Unit | null = Units.get(event.unit);
				if (unit && unit.isCommanderUnit) {
					this.updateArmyData();
					this.setArmyCommander(event.unit);
				}
			}
		}
	}

	getUnitActions(unit: Unit): UnitAction[] {
		// build an array of actions associated with the current unit
		const actions: UnitAction[] = [];
		// Add unit operations.
		const processOperation = (operation: UnitOperationDefinition, unitAbility: UnitAbilityDefinition | null = null) => {
			// ask for canStart on an invalid plot - GameCore gives the correct answers then.			// TODO is this the right way?
			// TODO: update type to not be any.
			const parameters: any = {
				X: -9999,	// PlotCoord.Range.INVALID_X
				Y: -9999	// PlotCoord.Range.INVALID_Y
			}
			// Include unitAbility index or NO_ABILITY(-1)
			parameters.UnitAbilityType = unitAbility ? unitAbility.$index : -1;

			if (operation.OperationType == "UNITOPERATION_WMD_STRIKE") {
				parameters.Type = Database.makeHash("WMD_NUCLEAR_DEVICE");
			}

			const result: OperationResult = Game.UnitOperations?.canStart(unit.id, operation.OperationType, parameters, true);
			const enabled: OperationResult = Game.UnitOperations?.canStart(unit.id, operation.OperationType, parameters, false);		//TODO: PostVS Change from loosely type after
			let annotation: string | undefined = "";

			switch (operation.OperationType) {
				case "UNITOPERATION_MOVE_TO":
					annotation = `${unit.Movement?.movementMovesRemaining.toString()}/${unit.Movement?.maxMoves.toString()}`;
					break;

				case "UNITOPERATION_RANGE_ATTACK":
					annotation = unit.Combat?.attacksRemaining.toString();
					break;

				default:
					annotation = "";
					break;
			}

			if (result.Success) {
				let name: string = "[ERR] Ability (Operation) Unknown";
				let icon: string = operation.Icon;
				if (unitAbility) {
					let keywordAbilityDef = unitAbility.KeywordAbilityType ? GameInfo.KeywordAbilities.lookup(unitAbility.KeywordAbilityType) : null;
					if (keywordAbilityDef?.IconString) {
						icon = keywordAbilityDef.IconString;
					}

					let nameKey: string = unitAbility.Name ?? keywordAbilityDef?.Summary ?? "";
					name = Locale.compose(nameKey, unitAbility.KeywordAbilityValue ?? -1);

					// Description
					let abilityDesc: string = "";
					// - if both a keyword ability and a description provided, append them as <KeywordTerm>: <Desc>
					if (unitAbility.Description) {
						if (keywordAbilityDef) {
							abilityDesc = Locale.compose(keywordAbilityDef.Summary, unitAbility.KeywordAbilityValue ?? -1) + ": ";
						}
						abilityDesc += Locale.compose(unitAbility.Description, unitAbility.KeywordAbilityValue ?? -1);
					}
					// - if keyword only, use its full description
					else if (keywordAbilityDef) {
						abilityDesc = Locale.compose(keywordAbilityDef.FullDescription, unitAbility.KeywordAbilityValue ?? -1)
					}

					if (abilityDesc) {
						name += "<br><br>" + abilityDesc;
					}
				}
				else {
					name = Locale.compose(operation.Description);
				}

				// Always include any additional description
				if (enabled.AdditionalDescription) {
					const addlDescString: string = formatStringArrayAsNewLineText(enabled.AdditionalDescription);
					name += "<br><p>" + addlDescString + "</p>";
				}
				// If enabled but not ready to start, include failure reasons
				if (!enabled.Success) {
					if (enabled.FailureReasons) {
						const failureString: string = formatStringArrayAsNewLineText(enabled.FailureReasons);
						name += "<br><p style='color:orange;'>" + failureString + "</p>";
					}
				}

				if (this.isTargetPlotOperation(operation.OperationType)) {
					const unitAction: UnitAction = {
						name: name,
						icon: icon,
						type: operation.OperationType,
						annotation: annotation,
						active: enabled.Success,
						confirmTitle: enabled.ConfirmDialogTitle,
						confirmBody: enabled.ConfirmDialogBody,
						UICategory: UnitActionCategory.NONE,
						priority: operation.PriorityInUI ? operation.PriorityInUI : 0,
						callback: (_location: PlotCoord) => {	// TODO: Change this callback to work with targeting a plot for the operation.
							if (enabled.Success) {
								parameters.X = _location.x;
								parameters.Y = _location.y;
								Game.UnitOperations?.sendRequest(unit.id, operation.OperationType, parameters);
							}
						}
					};

					// Override the default callback if we want to go to a custom interface mode
					if (UnitActionHandlers.doesActionHaveHandler(operation.OperationType)) {
						unitAction.callback = (_location: PlotCoord) => {
							if (enabled.Success) {
								UnitActionHandlers.switchToActionInterfaceMode(operation.OperationType, { UnitID: unit.id });
							}
						}
					}
					actions.push(unitAction);

				} else {
					actions.push({
						name: name,
						icon: icon,
						type: operation.OperationType,
						annotation: annotation,
						active: enabled.Success,
						confirmTitle: enabled.ConfirmDialogTitle,
						confirmBody: enabled.ConfirmDialogBody,
						UICategory: UnitActionCategory.NONE,
						priority: operation.PriorityInUI ? operation.PriorityInUI : 0,
						callback: (_location: PlotCoord) => {
							if (enabled.Success) {
								parameters.X = _location.x;
								parameters.Y = _location.y;
								Game.UnitOperations?.sendRequest(unit.id, operation.OperationType, parameters);
								InterfaceMode.switchToDefault();
							}
						}
					});
				}
			}
		};

		GameInfo.UnitOperations.forEach((operation) => {
			if (!operation.VisibleInUI) {
				return;
			}

			// If this operation is linked to any UnitAbilities, process it per ability type associated
			const unitAbilities: UnitAbilityDefinition[] = this.getUnitAbilitiesForOperationOrCommand(operation.OperationType);
			if (unitAbilities.length > 0) {
				for (const unitAbility of unitAbilities) {
					processOperation(operation, unitAbility);
				}
			}
			// If this operation has no associated UnitAbilities, process it alone
			else {
				processOperation(operation);
			}
		});

		// Add unit commands.
		const processCommand = (command: UnitCommandDefinition, unitAbility: UnitAbilityDefinition | null = null) => {

			// ask for canStart on an invalid plot - GameCore gives the correct answers then.
			let parameters: any = {
				X: -9999,	// PlotCoord.Range.INVALID_X
				Y: -9999	// PlotCoord.Range.INVALID_Y
			}
			// Include unitAbility index or NO_ABILITY(-1)
			parameters.UnitAbilityType = unitAbility ? unitAbility.$index : -1;

			let result: OperationResult = Game.UnitCommands?.canStart(unit.id, command.CommandType, parameters, true);
			let enabled: OperationResult = Game.UnitCommands?.canStart(unit.id, command.CommandType, parameters, false);
			var annotation;
			// TODO: will unit commands need this kind of annotation?
			switch (command.CommandType) {
				case "UNITCOMMAND_CONSTRUCT":
					if (enabled.BestConstructible) {
						// TODO: This is currently taking the provided "best" constructible the unit can make as the desired one.
						// Needs to be replaced with player input and/or divided among different buttons for each constructible type.
						parameters = {
							ConstructibleType: enabled.BestConstructible,
						};
					}

					break;

				//TODO: Convert Pack Army, Unpack Army, and Promote to always show but disabled when unavailable
				//TODO: Make available a way to keep more actions visible but disabled, so the player is aware of what a unit can do (even if it can't be done in the current context)
				// Always show these common Commander actions
				case "UNITCOMMAND_PACK_ARMY":
					if (unit.isCommanderUnit) {
						result.Success = true;
					}
					break;

				case "UNITCOMMAND_UNPACK_ARMY":
					if (unit.isCommanderUnit) {
						result.Success = true;
					}
					break;

				// Should be able to open Promotion window regardless of whether you can promote or not
				case "UNITCOMMAND_PROMOTE":
					if (unit.isCommanderUnit) {
						result.Success = true;
						enabled.Success = true;
					}
					break;

				default:
					annotation = "";
					break;
			}
			if (result.Success) {
				let commandText: string = command.Description ? Locale.compose(command.Description) : "";
				let icon: string = "";
				if (unitAbility?.KeywordAbilityType) {
					let keywordAbilityDef = GameInfo.KeywordAbilities.lookup(unitAbility.KeywordAbilityType);
					if (keywordAbilityDef) {
						commandText = Locale.compose(keywordAbilityDef.Summary, unitAbility.KeywordAbilityValue ?? -1);
						icon = keywordAbilityDef.IconString ?? command.Icon;
					}
					else {
						commandText = "[ERR] Unknown Keyword Ability";
					}
				}
				else {
					if (unitAbility?.Name) {
						commandText = Locale.compose(unitAbility.Name);
					}
					icon = command.Icon;
				}

				// Always include any additional description
				if (enabled.AdditionalDescription) {
					const addlDescString: string = formatStringArrayAsNewLineText(enabled.AdditionalDescription);
					commandText += "<br><p>" + addlDescString + "</p>";
				}
				// If enabled but not ready to start, include failure reasons
				if (!enabled.Success) {
					if (enabled.FailureReasons) {
						const failureString: string = formatStringArrayAsNewLineText(enabled.FailureReasons);
						commandText += "<br><p style='color:orange;'>" + failureString + "</p>";
					}
				}
				// If ready, include name and description of best improvement
				// TODO: This is temp! Eventually there should be distinct buttons per valid build option
				else {
					if (enabled.BestConstructible) {
						const constructibleInfo: ConstructibleDefinition | null = GameInfo.Constructibles.lookup(enabled.BestConstructible);
						if (constructibleInfo) {
							let constructibleText = Locale.compose(constructibleInfo.Name);
							if (constructibleInfo.Description) {
								constructibleText += ": " + Locale.compose(constructibleInfo.Description);
							}
							commandText += "<br><p style='color:cyan;'>" + constructibleText + "</p>";
						}
					}
				}

				if (this.isTargetPlotOperation(command.CommandType)) {

					const unitAction: UnitAction = {
						name: commandText,
						icon: icon,
						type: command.CommandType,
						annotation: annotation,
						active: enabled.Success,
						confirmTitle: enabled.ConfirmDialogTitle,
						confirmBody: enabled.ConfirmDialogBody,
						UICategory: UnitActionCategory.NONE,
						priority: command.PriorityInUI ? command.PriorityInUI : 0,
						callback: (_location: PlotCoord) => {	// TODO: Change this callback to work with targeting a plot for the operation.
							if (enabled.Success) {
								parameters.X = _location.x;
								parameters.Y = _location.y;
								Game.UnitCommands?.sendRequest(unit.id, command.CommandType, parameters);
							}
						}
					};

					// Override the default callback if we want to go to a custom interface mode
					if (UnitActionHandlers.doesActionHaveHandler(command.CommandType)) {
						unitAction.callback = (_location: PlotCoord) => {
							if (enabled.Success) {
								UnitActionHandlers.switchToActionInterfaceMode(command.CommandType, { UnitID: unit.id, CommandArguments: parameters });
							}
						}
					}

					actions.push(unitAction);
				} else {
					if (UnitActionHandlers.doesActionHaveHandler(command.CommandType)) {
						actions.push({
							name: commandText,
							icon: icon,
							type: command.CommandType,
							annotation: annotation,
							active: enabled.Success,
							confirmTitle: enabled.ConfirmDialogTitle,
							confirmBody: enabled.ConfirmDialogBody,
							UICategory: UnitActionCategory.NONE,
							priority: command.PriorityInUI ? command.PriorityInUI : 0,
							callback: (_location: PlotCoord) => {
								if (enabled.Success) {
									UnitActionHandlers.switchToActionInterfaceMode(command.CommandType, { UnitID: unit.id, CommandArguments: parameters });
								}
							}
						});
						return;
					}
					actions.push({
						name: commandText,
						icon: icon,
						type: command.CommandType,
						annotation: annotation,
						active: enabled.Success,
						confirmTitle: enabled.ConfirmDialogTitle,
						confirmBody: enabled.ConfirmDialogBody,
						UICategory: UnitActionCategory.NONE,
						priority: command.PriorityInUI ? command.PriorityInUI : 0,
						callback: (_location: PlotCoord) => {
							if (enabled.Success) {
								parameters.X = _location.x;
								parameters.Y = _location.y;
								Game.UnitCommands?.sendRequest(unit.id, command.CommandType, parameters);
								if (command.CommandType == "UNITCOMMAND_WAKE" || command.CommandType == "UNITCOMMAND_CANCEL") {
									const frameLimit: number = 5;
									let framesLeft: number = frameLimit;
									new Promise<void>((resolve, reject) => {
										const checkWakeStatus = () => {
											framesLeft--;
											requestAnimationFrame(() => {
												// is the unit awake yet?
												if (Game.UnitOperations?.canStart(unit.id, "UNITOPERATION_SLEEP", parameters, true).Success) {
													resolve();
												}
												// frame limit has been reached; just hide the buttons
												else if (framesLeft <= 0) {
													console.error(`Could not wake unit ${unit.name} after completing action ${command.CommandType} within ${frameLimit} frame(s)`);
													reject();
												}
												// loop back
												else {
													checkWakeStatus();
												}
											});
										};
										checkWakeStatus();
									}).then(() => {

									}).catch(() => {
										InterfaceMode.switchToDefault();
									});
								} else if (command.CommandType == "UNITCOMMAND_PACK_ARMY" || command.CommandType == "UNITCOMMAND_FORCE_MARCH") {
									FocusManager.SetWorldFocused();
								} else {
									InterfaceMode.switchToDefault();
								}
							}
						}
					});
				}
			}
		};

		GameInfo.UnitCommands.forEach((command) => {
			if (!command.VisibleInUI) {
				return;
			}

			// If this command is linked to any UnitAbilities, process it per ability type associated
			const unitAbilities: UnitAbilityDefinition[] = this.getUnitAbilitiesForOperationOrCommand(command.CommandType);
			if (unitAbilities.length > 0) {
				for (const unitAbility of unitAbilities) {
					processCommand(command, unitAbility);
				}
			}
			// If this command has no associated UnitAbilities, process it alone
			else {
				processCommand(command);
			}
		});

		return actions;
	}

	/**
	 * Does a particular unit operation require a targetPlot if selected?
	 * @param type Game core unit operation as string name.
	 * @returns true if this operation requires a plot to be targeted before exectuing.
	 */
	private isTargetPlotOperation(type: UnitOperationType): boolean {
		if (UnitActionHandlers.doesActionHaveHandler(type.toString())) {
			return UnitActionHandlers.doesActionRequireTargetPlot(type.toString());
		}
		return false;
	}

	//TODO - Database Definitions Collections will make this irrelevant
	private getUnitAbilitiesForOperationOrCommand(type: HashId): UnitAbilityDefinition[] {
		const results: UnitAbilityDefinition[] = [];
		for (const unitAbility of GameInfo.UnitAbilities) {
			if (unitAbility.CommandType && unitAbility.CommandType == type) {
				results.push(unitAbility);
			}
			else if (unitAbility.OperationType && unitAbility.OperationType == type) {
				results.push(unitAbility);
			}
		}
		return results;
	}
}

const CommanderInteract: CommanderInteractModel = new CommanderInteractModel();
engine.whenReady.then(() => {

	const updateModel = () => {
		engine.updateWholeModel(CommanderInteract);
	}

	engine.createJSModel('g_CommanderInteract', CommanderInteract);
	CommanderInteract.updateCallback = updateModel;
});

export { CommanderInteract as default };