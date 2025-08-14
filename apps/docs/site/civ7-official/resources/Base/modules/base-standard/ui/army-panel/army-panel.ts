/**
 * @file army-panel.ts
 * @copyright 2024, Firaxis Games
 * @description Army information and actions raised by view.
 */

import CommanderInteractModel, { CommanderReinforcementItem } from "/base-standard/ui/commander-interact/model-commander-interact.js";
import { UnitActionHandlers } from "/base-standard/ui/unit-interact/unit-action-handlers.js";
import UnitSelection from "/base-standard/ui/unit-selection/unit-selection.js";
import FxsActivatable from "/core/ui/components/fxs-activatable.js";
import FocusManager from "/core/ui/input/focus-manager.js";
import { InterfaceMode } from "/core/ui/interface-modes/interface-modes.js";
import Panel from "/core/ui/panel-support.js";
import { ComponentID } from "/core/ui/utilities/utilities-component-id.js";
import { formatStringArrayAsNewLineText } from "/core/ui/utilities/utilities-core-textprovider.js";
import { Icon } from "/core/ui/utilities/utilities-image.js";
import UpdateGate from "/core/ui/utilities/utilities-update-gate.js";
import { Audio } from "/core/ui/audio-base/audio-support.js";

// TODO: update to mirror unit-actions for animation
enum UnitArmyPanelState {
	HIDDEN,
	VISIBLE
};

interface ArmyActionData {
	name: string;
	icon?: string;
	active: boolean;
	callback: Function;
};

const STARTING_INNER_HTML = `
<div class="army-panel__container-background flex">
	<div class="army-panel__main-container relative flex w-auto p-2">
		<fxs-vslot class="army-panel__main-column flex relative flex-col justify-start">
			<fxs-hslot class="army-panel__standard-actions flex relative flex-row justify-center mb-2" ignore-prior-focus>
			</fxs-hslot>
			<div class="army-panel__units-background relative pointer-events-none pl-5 h-49">
				<fxs-spatial-slot class="army-panel__portrait-row mt-1 flex flex-row" ignore-prior-focus>
					<div class="army-panel__commander-portrait-container flex center justify-center w-54 h-44 p-1\\.5">
					</div>
					<div class="army-panel__army-portraits-column flex flex-col pl-2">
						<div class="army-panel__top-army-row flex flex-row">
						</div>
						<div class="army-panel__bottom-army-row flex flex-row">
						</div>
					</div>
				</fxs-spatial-slot>
				<div class="army-panel__action-panel-decor absolute h-full flex items-center justify-end w-14 -right-9"></div>
			</div>
		</fxs-vslot>
	</div>
</div>
`;

const ARMY_BUTTON_INNER_HTML = `
<div class="army-panel__unit-portrait-container flex relative pointer-events-none center p-0\\.5 w-21 h-21">
	<div class="army-panel__unit-portrait-bg flex">
		<div class="army-panel__unit-portrait-image w-20 h-20"></div>
		<div class="army-panel__unit-health-bar-container absolute justify-center h-4 bottom-2 left-1\\.5 right-0\\.5">
			<div class="army-panel__unit-health-bar-bg absolute w-full h-full"></div>
			<div class="army-panel__unit-health-bar-backing"></div>
			<div class="army-panel__unit-health-bar-fill absolute h-full"></div>
		</div>
		<div class="army-panel__turn-counter-container flex absolute items-end justify-end w-full bottom-0">
			<div class="step-turn-container">
				<div class="step-turn-icon"></div>
				<div class="step-turn-number font-body-base"></div>
			</div>
		</div>
		<div class="army-panel__lock-container flex absolute items-center justify-center">
			<div class="army-panel__lock-icon self-center w-20 h-20"></div>
		</div>
	</div>
</div>
`;

const ARMY_ACTION_INNER_HTML = `
<div class="army-action-button__button-bg-container flex relative pointer-events-none w-9 h-7 justify-center">
	<div class="army-action-button__button-bg-highlight absolute pointer-events-none w-9 h-7"></div>
	<div class="army-action-button__button-icon relative self-center pointer-events-none w-8 h-8"></div>
</div>
`;

class ArmyPanel extends Panel {

	private unitId: ComponentID | null = null;
	private _currentState: UnitArmyPanelState = UnitArmyPanelState.HIDDEN;

	private armyActions: ArmyActionData[] = [];
	private armyActionContainer: HTMLElement | null = null;
	private armyActionButtons: HTMLElement[] = [];
	private commanderContainer: HTMLElement | null = null;
	private commanderButton: HTMLElement | null = null;
	private armyButtons: HTMLElement[] = [];
	private focusArea: HTMLElement | null = null;

	private readonly MEDIUM_HEALTH_THRESHHOLD: number = .75;		// thresholds for healthbar color changes in unit percentage
	private readonly LOW_HEALTH_THRESHHOLD: number = .5;

	private updateGate: UpdateGate = new UpdateGate(() => { this.onUpdate(); });

	private animationTimeout: number | null = 0;

	private get currentState() {
		return this._currentState;
	}

	private set currentState(_state: UnitArmyPanelState) {
		switch (_state) {
			case UnitArmyPanelState.HIDDEN:
				if (this._currentState == UnitArmyPanelState.VISIBLE) {
					this.Root.classList.remove('army-panel--visible', 'army-panel--hidden');
					requestAnimationFrame(() => this.Root.classList.add('army-panel--hidden'));
					this.animationTimeout = setTimeout(() => {
						this.animationTimeout = null;
						this.Root.style.display = "none";
					}, 150);
				} else {
					this.Root.style.display = "none";
				}
				break;
			case UnitArmyPanelState.VISIBLE:
				if (this.animationTimeout) {
					clearTimeout(this.animationTimeout);
					this.animationTimeout = null;
				}

				this.Root.classList.remove('army-panel--visible', 'army-panel--hidden');
				requestAnimationFrame(() => this.Root.classList.add('army-panel--visible'));
				this.Root.style.display = "flex";
				break;
			default:
				console.error(`Bad state enum of ${_state} attempting to be set to unit-actions->currentState`)
				return;
		}
		this._currentState = _state;
	}

	constructor(root: ComponentRoot) {
		super(root);
	}

	private onUpdate() {
		delayByFrame(() => {
			this.updateArmyPanel();
		}, 1);
	}

	onInitialize(): void {
		super.onInitialize();
		this.Root.classList.add("army-panel");
	}

	onAttach(): void {
		super.onAttach();

		UnitSelection.onRaise.on(this.onRaiseArmyPanel);
		UnitSelection.onLower.on(this.onLowerArmyPanel);

		const unitComponentID: ComponentID | null = UI.Player.getHeadSelectedUnit();
		if (ComponentID.isValid(unitComponentID)) {
			const unit: Unit | null = Units.get(unitComponentID);
			if (unit) {
				if (ComponentID.isValid(unit.armyId)) {
					this.onRaiseArmyPanel(unitComponentID);
				}
			}
		}
	}

	onDetach(): void {
		super.onDetach();

		UnitSelection.onRaise.off(this.onRaiseArmyPanel);
		UnitSelection.onLower.off(this.onLowerArmyPanel);
	}

	private onRaiseArmyPanel = (cid: ComponentID) => {
		if (cid && ComponentID.isValid(cid)) {
			this.unitId = cid;
		} else {
			console.error(`UIP received a bad component ID when raising the panel.`);
			return;
		}
		const unit: Unit | null = Units.get(this.unitId);
		if (!unit) {
			console.error(`UIP could not raise the panel due to missing unit for ${ComponentID.toLogString(this.unitId)}.`);
			return;
		}
		if (!ComponentID.isValid(unit.armyId)) {
			this.onLowerArmyPanel(cid);
			return;
		}

		// this._modelRegister: CommanderModelInterface = {
		// 	c: this.Root.component, 
		// 	updateCallback: this.updateArmyPanel
		// };
		CommanderInteractModel.registerListener({ updateCallback: this.updateArmyPanel });

		this.Root.innerHTML = STARTING_INNER_HTML;
		this.updateArmyPanel();
		if (this.currentState == UnitArmyPanelState.HIDDEN) {
			Audio.playSound("data-audio-showing", "army-panel");
		}
		this.currentState = UnitArmyPanelState.VISIBLE;

		this.focusArea = this.Root.querySelector<HTMLElement>(".army-panel__main_column");
		if (this.focusArea) {
			this.focusArea.setAttribute('data-navrule-up', 'stop');
			this.focusArea.setAttribute('focus-rule', 'last');
		}

	}

	private onLowerArmyPanel = (_cid: ComponentID) => {
		CommanderInteractModel.unregisterListener({ updateCallback: this.updateArmyPanel });

		if (this.currentState != UnitArmyPanelState.HIDDEN) {
			Audio.playSound("data-audio-hiding", "army-panel");
		}
		this.currentState = UnitArmyPanelState.HIDDEN;
		this.unitId = null;

		this.clearArmyActions();
		this.clearArmyUnits();
	}

	private updateArmyPanel = () => {
		this.clearArmyActions();
		this.clearArmyUnits();
		this.setupCommander();
		if (CommanderInteractModel.currentArmyCommander) {
			this.setupArmyActions(CommanderInteractModel.currentArmyCommander.commander);
		}
		this.setupArmy();
	}

	private clearArmyActions() {
		this.armyActionButtons.forEach((button) => {
			button.parentElement?.removeChild(button);
		});
		this.armyActionButtons = [];
		this.armyActions = [];
	}

	private clearArmyUnits() {
		this.commanderButton?.parentElement?.removeChild(this.commanderButton);
		this.commanderButton = null;
		this.armyButtons.forEach((button) => {
			button.parentElement?.removeChild(button);
		});
		this.armyButtons = [];
	}

	private setupCommander() {
		this.commanderContainer = this.Root.querySelector<HTMLElement>(".army-panel__commander-portrait-container");
		if (!this.commanderContainer) {
			return;
		}
		if (CommanderInteractModel.currentArmyCommander) {
			this.commanderButton = this.createArmyUnitButton(CommanderInteractModel.currentArmyCommander.commander.id);
			this.setUnitButtonData(this.commanderButton, CommanderInteractModel.currentArmyCommander.commander);
			this.commanderContainer.appendChild(this.commanderButton);
		}
	}

	private setupArmy() {
		const topRow = this.Root.querySelector<HTMLElement>(".army-panel__top-army-row");
		if (!topRow) {
			return;
		}

		const bottomRow = this.Root.querySelector<HTMLElement>(".army-panel__bottom-army-row");
		if (!bottomRow) {
			return;
		}
		if (!CommanderInteractModel.currentArmyCommander) {
			return;
		}

		// create a button using data from each packed unit
		let currentArmy: Unit[] = CommanderInteractModel.currentArmyCommander?.packedUnits;
		for (let index: number = 0; index < currentArmy.length; index++) {
			this.armyButtons.push(this.createArmyUnitButton(currentArmy[index].id));
			this.setUnitButtonData(this.armyButtons[index], currentArmy[index]);
			if (index < 3) {
				topRow.appendChild(this.armyButtons[index]);
			} else {
				bottomRow.appendChild(this.armyButtons[index]);
			}
		}

		// create a button for each incoming reinforcement
		const reinforcementItems: CommanderReinforcementItem[] = CommanderInteractModel.availableReinforcements;
		reinforcementItems.forEach((item) => {
			if (item.isTraveling && item.commanderToReinforce && CommanderInteractModel.currentArmyCommander) {
				if (ComponentID.isMatch(item.commanderToReinforce.id, CommanderInteractModel.currentArmyCommander?.commander.id)) {
					const reinforcementUnit: Unit | null = Units.get(item.unitID);
					if (reinforcementUnit) {
						this.armyButtons.push(this.createArmyUnitButton(item.unitID));
						this.setUnitButtonData(this.armyButtons[this.armyButtons.length - 1], reinforcementUnit);
						if (this.armyButtons.length <= 3) {
							topRow.appendChild(this.armyButtons[this.armyButtons.length - 1]);
						} else {
							bottomRow.appendChild(this.armyButtons[this.armyButtons.length - 1]);
						}
					}
				}
			}
		});

		// now lets create empty buttons to fill up the rest of the slots
		for (let index: number = this.armyButtons.length; index < 6; index++) {
			this.armyButtons.push(this.createArmyUnitButton(ComponentID.getInvalidID()));
			this.setUnitButtonData(this.armyButtons[index], null);
			if (CommanderInteractModel.currentArmyCommander) {
				if (CommanderInteractModel.currentArmyCommander.army.combatUnitCapacity <= index) {
					this.armyButtons[index].classList.add("locked");
				}
			}
			if (index < 3) {
				topRow.appendChild(this.armyButtons[index]);
			} else {
				bottomRow.appendChild(this.armyButtons[index]);
			}
		}
	}

	private createArmyUnitButton(unitId: ComponentID): HTMLElement {
		const unit: Unit | null = Units.get(unitId);

		let newUnitButton = document.createElement("unit-button");
		newUnitButton.innerHTML = ARMY_BUTTON_INNER_HTML;

		newUnitButton.setAttribute('tabindex', "-1");
		newUnitButton.setAttribute('disable-focus-allowed', "true");
		newUnitButton.setAttribute("data-audio-group-ref", "interact-unit");
		newUnitButton.setAttribute("data-audio-focus", "unit-info-hovered");

		if (ComponentID.isValid(unitId)) {
			let unitHealthbar = newUnitButton.querySelector<HTMLElement>(".army-panel__unit-health-bar-fill");
			let healthbarBg = newUnitButton.querySelector<HTMLElement>(".army-panel__unit-health-bar-bg");

			if (unit) {
				const portraitImage = newUnitButton.querySelector<HTMLElement>('.army-panel__unit-portrait-image');
				if (portraitImage) {
					const unitDef = GameInfo.Units.lookup(unit.type);
					if (!unitDef) {
						console.error(`No unit definition found for ${unit.name}`);
					}
					else {
						const unitType = unitDef.UnitType;
						const isUnique = unitDef.TraitType != null; // also includes city-state granted units
						WorldUI.requestPortrait(unitType, unitType, isUnique ? "UnitPortraitsBG_UNIQUE" : "UnitPortraitsBG_BASE");
						const portraitPath = `url("live:/${unitType}")`;
						portraitImage.style.backgroundImage = portraitPath;
					}
				}


				if (unit?.Health) {
					let normalizedHealthValue = (unit.Health.maxDamage - unit.Health.damage) / unit.Health.maxDamage;
					unitHealthbar?.style.setProperty("--health-percentage", `${normalizedHealthValue * 100}%`)
					if (unit.Health.damage > 0) {
						if (normalizedHealthValue <= this.MEDIUM_HEALTH_THRESHHOLD && normalizedHealthValue >= this.LOW_HEALTH_THRESHHOLD) {
							unitHealthbar?.classList.toggle("army-panel__med-health-bar", true);
							unitHealthbar?.classList.toggle("army-panel__low-health-bar", false);
							healthbarBg?.classList.toggle("army-panel__med-health-bar-bg", true);
							healthbarBg?.classList.toggle("army-panel__low-health-bar-bg", false);
						}
						else if (normalizedHealthValue < this.LOW_HEALTH_THRESHHOLD) {
							unitHealthbar?.classList.toggle("army-panel__med-health-bar", false);
							unitHealthbar?.classList.toggle("army-panel__low-health-bar", true);
							healthbarBg?.classList.toggle("army-panel__med-health-bar-bg", true);
							healthbarBg?.classList.toggle("army-panel__low-health-bar-bg", false);
						}
					}
					else {
						unitHealthbar?.classList.toggle("army-panel__med-health-bar", false);
						unitHealthbar?.classList.toggle("army-panel__low-health-bar", false);
						healthbarBg?.classList.toggle("army-panel__med-health-bar-bg", true);
						healthbarBg?.classList.toggle("army-panel__low-health-bar-bg", false);
					}
				}
			}
		}

		return newUnitButton;
	}

	private createArmyActionButton(action: ArmyActionData) {
		let newButton = document.createElement("army-action-button");
		newButton.innerHTML = ARMY_ACTION_INNER_HTML;

		newButton.setAttribute('tabindex', "-1");
		newButton.setAttribute('disable-focus-allowed', "true");
		newButton.setAttribute("data-audio-group-ref", "interact-unit");
		newButton.setAttribute("data-audio-focus", "unit-info-hovered");
		newButton.setAttribute("data-audio-activate", "unit-action-activated");

		this.setActionButtonData(newButton, action);
		this.armyActionButtons.push(newButton);

		this.armyActionContainer?.appendChild(newButton);
	}

	private setUnitButtonData(button: HTMLElement, unit: Unit | null) {
		if (button) {
			button.addEventListener('action-activate', (event: CustomEvent) => { this.onArmyButtonActivated(event) });
			button.addEventListener('focus', (event: FocusEvent) => { this.onButtonFocused(event) });
			button.addEventListener('blur', (event: FocusEvent) => { this.onButtonFocused(event) });

			if (unit) {
				const reinforcementItems: CommanderReinforcementItem[] = CommanderInteractModel.availableReinforcements;
				reinforcementItems.forEach((item) => {
					if (ComponentID.isMatch(item.unitID, unit.id)) {
						// if there is a valid reinforcement coming to this army update the turn counter and show it
						const turnValue: HTMLElement | null = button.querySelector<HTMLElement>(".step-turn-number");
						if (turnValue) {
							turnValue.textContent = item.arrivalTime.toString();
						}
						button.classList.add("isTraveling");
					}
				});
				button.setAttribute("data-tooltip-content", unit.name);
				button.setAttribute("data-tooltip-hide-on-update", "");
				button.setAttribute("play-error-sound", "false");

				const unitDefinition: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
				if (!unitDefinition) {
					console.warn("Cannot set army icon due to missing Unit Definition. type: ", unit.type, "  cid: ", ComponentID.toLogString(unit.id));
				} else {
					const iconName: string = Icon.getUnitIconFromDefinition(unitDefinition);
					const iconCSS: string = (iconName) ? `url(${iconName})` : '';
					button.style.setProperty("--button-icon", iconCSS);
				}


			} else {
				button.classList.add("noUnit");
				button.setAttribute("play-error-sound", "true");
			}
		}
	}

	private setActionButtonData(button: HTMLElement, action: ArmyActionData) {
		button.addEventListener('action-activate', (event: CustomEvent) => { this.onArmyActionActivated(event) });
		button.addEventListener('focus', (event: FocusEvent) => { this.onButtonFocused(event) });
		button.addEventListener('blur', (event: FocusEvent) => { this.onButtonFocused(event) });

		button.setAttribute("data-tooltip-content", action.name);
		button.setAttribute("data-tooltip-hide-on-update", "");

		if (!action.icon) {
			console.error(`army-panel: No icon URL associated with action ${action.name}.`);
		}
		const icon: string = action.icon ?? "";
		const iconCSS: string = (icon) ? `url("${icon}")` : '';
		button.style.setProperty("--button-icon", iconCSS);
		button.classList.toggle("inactive", !action.active);
	}

	private onArmyButtonActivated(event: CustomEvent) {
		if (event.target instanceof HTMLElement) {
			// figure out which button list the button data is in so we can retrieve the associated action's data
			if (event.target == this.commanderButton) {
				if (CommanderInteractModel.currentArmyCommander) {
					UI.Player.selectUnit(CommanderInteractModel.currentArmyCommander.commander.id);
				}
			}
			let unitIndex = this.armyButtons.indexOf(event.target);
			let selectedUnit: Unit | undefined = CommanderInteractModel.currentArmyCommander?.packedUnits[unitIndex];
			if (selectedUnit != undefined) {
				UI.Player.selectUnit(selectedUnit.id);
			} else {
				// selected empty army unit button
			}
		}
	}

	private onArmyActionActivated(event: CustomEvent) {
		if (event.target instanceof HTMLElement) {
			let index = this.armyActionButtons.indexOf(event.target);
			let armyAction = this.armyActions[index];
			armyAction.callback({ x: -9999, y: -9999 });				// target location
			engine.trigger("InteractUnitActionChosen");
		}
	}

	private onButtonFocused(event: FocusEvent) {
		if (event.target instanceof HTMLElement) {
			event.target.classList.toggle("focused", (event.type == "focus"));
		}
	}

	private setupArmyActions(unit: Unit) {
		// build an array of actions associated with the current army

		// add ability operations
		const processOperation = (operation: UnitOperationDefinition) => {
			// ask for canStart on an invalid plot - GameCore gives the correct answers then.
			// TODO: update type to not be any.
			const parameters: any = {
				X: -9999,	// PlotCoord.Range.INVALID_X
				Y: -9999	// PlotCoord.Range.INVALID_Y
			}
			// Include unitAbility index or NO_ABILITY(-1)
			parameters.UnitAbilityType = -1;

			const enabled: OperationResult = Game.UnitOperations?.canStart(unit.id, operation.OperationType, parameters, false);

			let name: string = Locale.compose(operation.Description);
			let icon: string = operation.Icon;

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

			// This action targets a plot
			const armyAction: ArmyActionData = {
				name: name,
				icon: icon,
				active: enabled.Success,
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
				armyAction.callback = (_location: PlotCoord) => {
					if (enabled.Success) {
						UnitActionHandlers.switchToActionInterfaceMode(operation.OperationType, { UnitID: unit.id });
					}
				}
			}
			this.armyActions.push(armyAction);


		};

		// Add unit commands.
		const processCommand = (command: UnitCommandDefinition) => {

			// ask for canStart on an invalid plot - GameCore gives the correct answers then.
			let parameters: any = {
				X: -9999,	// PlotCoord.Range.INVALID_X
				Y: -9999	// PlotCoord.Range.INVALID_Y
			}
			// Include unitAbility index or NO_ABILITY(-1)
			parameters.UnitAbilityType = -1;

			let enabled: OperationResult = Game.UnitCommands?.canStart(unit.id, command.CommandType, parameters, false);

			let commandText: string = command.Description ? Locale.compose(command.Description) : "";
			let icon: string = command.Icon;

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


			const armyAction: ArmyActionData = {
				name: commandText,
				icon: icon,
				active: enabled.Success,
				callback: (_location: PlotCoord) => {	// TODO: Change this callback to work with targeting a plot for the operation.
					if (enabled.Success) {
						parameters.X = _location.x;
						parameters.Y = _location.y;
						Game.UnitCommands?.sendRequest(unit.id, command.CommandType, parameters);
						if (command.CommandType == "UNITCOMMAND_PACK_ARMY") {
							FocusManager.SetWorldFocused();
						} else {
							InterfaceMode.switchToDefault();
						}
						this.updateGate.call(`update`);
					}
				}
			};

			// Override the default callback if we want to go to a custom interface mode
			if (UnitActionHandlers.doesActionHaveHandler(command.CommandType)) {
				armyAction.callback = (_location: PlotCoord) => {
					if (enabled.Success) {
						UnitActionHandlers.switchToActionInterfaceMode(command.CommandType, { UnitID: unit.id, CommandArguments: parameters });
					}
				}
			}

			this.armyActions.push(armyAction);
		};

		const reinforceArmy: UnitOperationDefinition | null = GameInfo.UnitOperations.lookup("UNITOPERATION_CALL_REINFORCEMENTS");
		const packArmy: UnitCommandDefinition | null = GameInfo.UnitCommands.lookup("UNITCOMMAND_PACK_ARMY");
		const unpackArmy: UnitCommandDefinition | null = GameInfo.UnitCommands.lookup("UNITCOMMAND_UNPACK_ARMY");

		if (reinforceArmy) {
			processOperation(reinforceArmy);
		}
		if (packArmy) {
			processCommand(packArmy);
		}
		if (unpackArmy) {
			processCommand(unpackArmy);
		}

		this.armyActionContainer = this.Root.querySelector<HTMLElement>(".army-panel__standard-actions");

		this.armyActions.forEach((action) => {
			this.createArmyActionButton(action);
		})
	}
}

Controls.define("army-panel", {
	createInstance: ArmyPanel,
	description: 'Panel for displaying and accessing armies',
	styles: ['fs://game/base-standard/ui/army-panel/army-panel.css']
})

Controls.define("unit-button", {
	createInstance: FxsActivatable,
	description: 'Army panel portrait button that includes a healthbar and reinforement timer',
	classNames: ['army-panel__unit-button'],
	styles: ['fs://game/base-standard/ui/army-panel/army-panel.css'],
	images: ['fs://game/hud_unit-panel_empty-slot'],
	attributes: [{ name: 'play-error-sound' }]
})

Controls.define("army-action-button", {
	createInstance: FxsActivatable,
	description: "Army action",
	classNames: ['army-panel__action-button'],
	styles: ['fs://game/base-standard/ui/army-panel/army-panel.css']
})