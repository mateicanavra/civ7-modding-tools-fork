/**
* @file screen-diplomacy-target-select.ts
* @copyright 2024, Firaxis Games
* @description Handles secondary target selection for diplomatic actions
*/

import DiplomacyManager, { DiplomacyActionOperationArgs, DiplomacyInputPanel } from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import { UpdateFromOperationResult } from '/core/ui/components/fxs-activatable.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import { Navigation } from '/core/ui/input/navigation-support.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import { Icon } from '/core/ui/utilities/utilities-image.js';
import { Audio } from '/core/ui/audio-base/audio-support.js';

class DiplomacyTargetSelectScreen extends DiplomacyInputPanel {
	private selectedTarget?: DiplomaticProjectTarget;
	private lastSelectedTarget?: HTMLElement;
	private operationArgs?: DiplomacyActionOperationArgs;
	private engineInputListener = this.onEngineInput.bind(this);

	private subsystemPanel: HTMLElement | null = null;
	private confirmButton: HTMLElement | null = null;

	private render() {
		this.Root.innerHTML = `
			<fxs-subsystem-frame class="w-128 h-174 items-center" box-style="b2" headerimage="">
				<fxs-header data-slot="header" class="uppercase" title="LOC_DIPLOMACY_SELECT_TARGET"></fxs-header>
			</fxs-frame>
		`

		this.subsystemPanel = MustGetElement("fxs-subsystem-frame", this.Root);
		this.subsystemPanel.addEventListener('subsystem-frame-close', () => { this.close(); });
	}

	handleInput(inputEvent: InputEngineEvent): boolean {
		const inputEventName = inputEvent.detail.name;
		switch (inputEventName) {
			case 'cancel':
				this.close();
		}
		return false;
	}

	onAttach(): void {
		this.enableOpenSound = true;
		this.enableCloseSound = true;
		this.Root.setAttribute("data-audio-group-ref", "diplomacy-target-select-panel");

		super.onAttach();

		this.render();

		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
		const container = document.createElement("fxs-vslot");
		container.setAttribute('disable-focus-allowed', 'true');
		container.id = "diplomacy-target-select-target-container";

		const projectData: DiplomaticProjectUIData | undefined = Game.Diplomacy.getProjectDataForUI(GameContext.localPlayerID, DiplomacyManager.selectedPlayerID, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET, DiplomacyActionGroups.NO_DIPLOMACY_ACTION_GROUP, -1, DiplomacyActionTargetTypes.NO_DIPLOMACY_TARGET).find(project => project.actionType == DiplomacyManager.selectedProjectData?.actionType);
		if (projectData === undefined) {
			console.error("screen-diplomacy-target-selection: Unable to get project data for secondary target selection!");
			return;
		}

		const initialTargetPlayer = Players.get(DiplomacyManager.selectedPlayerID);
		if (!initialTargetPlayer) {
			console.error("screen-diplomacy-target-select: Unable to get player object for selected player with id " + DiplomacyManager.selectedPlayerID);
			return;
		}

		this.operationArgs = {
			Player1: GameContext.localPlayerID,
			Type: projectData.actionType,
			Amount: 1
		}

		if (initialTargetPlayer.isMajor) {
			this.operationArgs.Player2 = initialTargetPlayer.id;
		} else {
			this.operationArgs.ID = initialTargetPlayer.id;
		}

		projectData.targetList2.forEach(target => {
			const targetItem = document.createElement("chooser-item");
			targetItem.classList.add("h-19", "chooser-item_unlocked", "mb-2", "flex", "flex-row", "justify-around", "items-center");

			const targetNameElement = document.createElement("div");
			targetNameElement.classList.value = "font-body-sm text-secondary-1 flex-auto text-left self-center relative";

			if (target.parameterName == "Player3") {
				//We are selcting another player to target, use standard player portrait
				const otherPlayer = Players.get(target.targetID);
				if (!otherPlayer) {
					console.error("screen-diplomacy-target-select: Unable to get player library for player with id: " + target.targetID);
					return;
				}
				const portrait = document.createElement("div");
				portrait.classList.add("panel-diplomacy-actions__ongoing-action-portrait", "pointer-events-auto", "relative");

				const portraitBG = document.createElement("div");
				portraitBG.classList.add("panel-diplomacy-actions__ongoing-actions-portrait-bg");
				portrait.appendChild(portraitBG);

				const portraitBGInner = document.createElement("div");
				portraitBGInner.classList.add("panel-diplomacy-actions__ongoing-actions-portrait-bg-inner");
				portrait.appendChild(portraitBGInner);

				const portraitIcon = document.createElement("div");
				portraitIcon.classList.add("panel-diplomacy-actions__ongoing-actions-portrait-image");
				portraitIcon.style.backgroundImage = `url(${Icon.getPlayerLeaderIcon(target.targetID)})`;
				portrait.appendChild(portraitIcon);
				portrait.setAttribute("data-tooltip-content", Locale.compose(otherPlayer.leaderName));

				const relationshipIcon = document.createElement("img");
				relationshipIcon.classList.value = "size-10 absolute bottom-px";

				const diplomacy = Players.get(GameContext.localPlayerID)?.Diplomacy;
				if (!diplomacy) {
					console.error("screen-diplomacy-target-select: Unable to get local player diplomacy library!");
					return;
				}

				if (diplomacy.isAtWarWith(target.targetID)) {
					relationshipIcon.src = UI.getIcon("PLAYER_RELATIONSHIP_AT_WAR", "PLAYER_RELATIONSHIP");
				} else if (diplomacy.hasAllied(target.targetID)) {
					relationshipIcon.src = UI.getIcon("PLAYER_RELATIONSHIP_ALLIANCE", "PLAYER_RELATIONSHIP");
				} else {
					relationshipIcon.src = UI.getIcon(DiplomacyManager.getRelationshipTypeString(diplomacy.getRelationshipEnum(target.targetID)), "PLAYER_RELATIONSHIP");
				}

				portrait.appendChild(relationshipIcon);

				const targetConfig = Configuration.getPlayer(target.targetID)
				if (targetConfig) {
					targetNameElement.innerHTML = Locale.stylize(targetConfig.slotName);
				} else {
					targetNameElement.innerHTML = Locale.compose(otherPlayer.name);
				}

				targetItem.appendChild(portrait);

				targetItem.addEventListener("action-activate", () => {
					if (this.lastSelectedTarget) {
						this.lastSelectedTarget.setAttribute("selected", "false");
					}
					this.selectedTarget = target;
					this.lastSelectedTarget = targetItem;
					this.operationArgs!.Player3 = target.targetID;
					targetItem.setAttribute("selected", "true");
					const heroButton = MustGetElement("fxs-hero-button", this.Root);
					heroButton.setAttribute("disabled", "false");
				})
				targetItem.setAttribute("data-audio-group-ref", "leader-target-button");
			} else if (target.parameterName == "Amount2") {
				//We are selecting an amount of gold to send, no icon neccesary
				const header = MustGetElement("fxs-header", this.Root);
				header.setAttribute("title", "LOC_DIPLOMACY_SELECT_AMOUNT")

				targetNameElement.innerHTML = Locale.stylize(target.targetName);
				targetNameElement.classList.remove("font-body-sm");
				targetNameElement.classList.add("font-title", "text-lg");
				targetNameElement.classList.add("text-center");
				targetItem.addEventListener("action-activate", () => {
					if (this.lastSelectedTarget) {
						this.lastSelectedTarget.setAttribute("selected", "false");
					}
					this.selectedTarget = target;
					this.lastSelectedTarget = targetItem;
					this.operationArgs!.Amount2 = target.targetID;
					targetItem.setAttribute("selected", "true");
					const heroButton = MustGetElement("fxs-hero-button", this.Root);
					heroButton.setAttribute("disabled", "false");
				})
				targetItem.setAttribute("data-audio-group-ref", "gold-target-button");
			} else {
				const iconContainer = document.createElement("div");
				iconContainer.classList.value = "chooser-item__icon flex self-center items-center justify-center pointer-events-none relative";
				targetItem.appendChild(iconContainer);

				const iconImage = document.createElement("div");
				iconImage.classList.value = "chooser-item__icon-image relative flex flex-col items-center";
				iconContainer.appendChild(iconImage);

				if (target.parameterName == "Unit") {
					//We are selecting which unit type to levy
					const header = MustGetElement("fxs-header", this.Root);
					header.setAttribute("title", "LOC_DIPLOMACY_SELECT_UNIT")
					const unitDef = GameInfo.Units.lookup(target.targetName);

					if (!unitDef) {
						console.error("screen-diplomacy-target-select: Unable to get unit definition for unit type: " + target.targetID.toString());
						return;
					}

					iconImage.style.setProperty("background-image", `url(${Icon.getUnitIconFromDefinition(unitDef)})`);
					targetNameElement.innerHTML = Locale.compose(unitDef.Name);

					targetItem.addEventListener("action-activate", () => {
						if (this.lastSelectedTarget) {
							this.lastSelectedTarget.setAttribute("selected", "false");
						}
						this.selectedTarget = target;
						this.lastSelectedTarget = targetItem;
						this.operationArgs!.Unit = target.targetID;
						targetItem.setAttribute("selected", "true");
						const heroButton = MustGetElement("fxs-hero-button", this.Root);
						heroButton.setAttribute("disabled", "false");
					});
					targetItem.setAttribute("data-audio-group-ref", "unit-target-button")
				} else if (target.parameterName == "City") {
					//We are selecting a city to target
					iconImage.style.setProperty("background-image", `url("fs://game/Yield_Cities")`);
					const city = Cities.getAtLocation(target.targetPlot);
					if (!city) {
						console.error("screen-diplomacy-target-select: Unable to get city at plot " + target.targetPlot);
						return;
					}

					if (city.isTown) {
						iconImage.style.setProperty("background-image", `url("fs://game/Yield_Towns")`);
					}

					const populationText = document.createElement("div");
					populationText.classList.add("font-body-sm", "absolute", "bottom-px", "bg-primary-3", "opacity-75");
					populationText.innerHTML = city.population.toString();
					iconContainer.appendChild(populationText);

					targetNameElement.innerHTML = Locale.compose(city.name);

					targetItem.addEventListener("action-activate", () => {
						if (this.lastSelectedTarget) {
							this.lastSelectedTarget.setAttribute("selected", "false");
						}
						this.selectedTarget = target;
						this.lastSelectedTarget = targetItem;
						this.operationArgs!.City = target.targetID;
						targetItem.setAttribute("selected", "true");
						const heroButton = MustGetElement("fxs-hero-button", this.Root);
						heroButton.setAttribute("disabled", "false");
					})
					targetItem.setAttribute("data-audio-group-ref", "city-target-button")
				} else {
					iconImage.style.setProperty("background-image", `url("fs://game/leader_portrait_independent")`);

					const independent = Players.get(target.targetID);
					if (!independent) {
						console.error("screen-diploamcy-target-select: Unable to get player library for independent with id " + target.targetID);
						return;
					}

					targetNameElement.innerHTML = Locale.stylize(independent.civilizationName);
					targetItem.addEventListener("action-activate", () => {
						if (this.lastSelectedTarget) {
							this.lastSelectedTarget.setAttribute("selected", "false");
						}
						this.selectedTarget = target;
						this.lastSelectedTarget = targetItem;
						this.operationArgs!.ID2 = target.targetID;
						targetItem.setAttribute("selected", "true");
						const heroButton = MustGetElement("fxs-hero-button", this.Root);
						heroButton.setAttribute("disabled", "false");
					})
				}
			}

			const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, projectData.operationType, this.operationArgs!, false);
			if (!result.Success) {
				targetItem.setAttribute("disabled", "true");
				UpdateFromOperationResult(targetItem, result);
			}

			targetItem.appendChild(targetNameElement);

			if (target.costYieldD > 0) {
				const costElement = document.createElement("div");
				costElement.classList.value = "font-body-base w-auto h-auto relative";
				costElement.innerHTML = Locale.stylize(target.costYieldD + "[icon:YIELD_DIPLOMACY]");
				targetItem.appendChild(costElement);
			}

			container.appendChild(targetItem);
		});
		this.subsystemPanel?.appendChild(container);

		this.confirmButton = document.createElement('fxs-hero-button');
		this.confirmButton.classList.value = "mb-3";
		this.confirmButton.setAttribute('disabled', 'true');
		this.confirmButton.setAttribute('caption', 'LOC_OPTIONS_CONFIRM');
		this.confirmButton.addEventListener("action-activate", () => { this.confirmTargetSelection() });
		this.confirmButton.setAttribute("data-audio-activate-ref", "none");
		this.subsystemPanel?.appendChild(this.confirmButton)
	}

	onDetach(): void {
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		const inputEventName = inputEvent.detail.name;
		switch (inputEventName) {
			case 'keyboard-escape':
			case 'sys-menu':
				this.close();
				inputEvent.stopPropagation();
				inputEvent.preventDefault();
				return false;
		}

		return true;
	}
	private confirmTargetSelection() {
		if (!DiplomacyManager.selectedProjectData) {
			console.error("screen-diplomacy-target-select: Attempting to confirm target selection but there is no valid selectedProjectData.");
			return;
		}

		if (!this.selectedTarget) {
			console.error("screen-diplomacy-target-select: Attempting to confirm target selection but there is no valid selectedTarget!");
			return;
		}

		if (!this.operationArgs) {
			console.error("screen-diplomacy-target-select: Attempting to confirm target selection but there is no valid operationArgs!");
			return;
		}
		let soundTuple = DiplomacyManager.getAudioIdForDiploAction(DiplomacyManager.selectedProjectData);
		Audio.playSound(soundTuple[1], "audio-diplo-project-reaction");
		Game.PlayerOperations.sendRequest(GameContext.localPlayerID, DiplomacyManager.selectedProjectData.operationType, this.operationArgs);
		this.close();
	}

	onReceiveFocus(): void {
		const element = Navigation.getFirstFocusableElement(this.Root, { isDisableFocusAllowed: true, direction: InputNavigationAction.NONE });
		if (element) {
			FocusManager.setFocus(element);
		}
	}
}

Controls.define('screen-diplomacy-target-select', {
	createInstance: DiplomacyTargetSelectScreen,
	description: 'Diplomacy Target Select screen.',
	classNames: ['screen-diplomacy-target-select']
});