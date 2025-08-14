/**
* @file screen-espionage-details.ts
* @copyright 2024-2025, Firaxis Games
* @description Displays details about completed espionage actions
*/

import DiplomacyManager from '/base-standard/ui/diplomacy/diplomacy-manager.js';
import { RaiseDiplomacyEvent } from '/base-standard/ui/diplomacy/diplomacy-events.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import { InputEngineEvent, InputEngineEventName } from '/core/ui/input/input-support.js';
import { Navigation } from '/core/ui/input/navigation-support.js';
import Panel from '/core/ui/panel-support.js';
import PopupSequencer from '/base-standard/ui/popup-sequencer/popup-sequencer.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';


class EspionageDetailsScreen extends Panel {

	private engineInputListener: EventListener = (inputEvent: InputEngineEvent) => { this.onEngineInput(inputEvent); };

	private screenId: string = "screen-espionage-details";

	private render() {
		this.Root.innerHTML = `
			<div class="w-194 relative">
				<fxs-modal-frame class="w-full espionage-details-bg">
					<div class="flex flex-col w-full h-auto pl-60 items-start">
						<fxs-header class="mb-6 font-title text-2xl text-secondary" filigree-style="small" title="LOC_DIPLOMACY_ESPIONAGE_DETAILS_HEADER"></fxs-header>
						<div id="espionage-status-container" class="flex flex-col mb-3"></div>
						<fxs-inner-frame id="espionage-details-container" class="min-h-40 mr-6 w-full p-2"></fxs-inner-frame>
					</div>
					<fxs-hslot id="espionage-details-button-container" class="flex flex-row w-full h-auto justify-around mt-10"></fxs-vslot>
				</fxs-modal-frame>
				<img class="absolute -top-16 -left-24" src="blp:dip_esp_image.png">
				<fxs-close-button class="right-2 top-1"></fxs-close-button>
			</div>
		`;

		const buttonContainer = MustGetElement("#espionage-details-button-container", this.Root);

		const acknowledgeButton = document.createElement("chooser-item");
		acknowledgeButton.classList.add("chooser-item_unlocked", "h-16", "flex", "flex-row", "w-76");
		acknowledgeButton.addEventListener("action-activate", () => { PopupSequencer.closePopup(this.screenId); });

		const acknowledgeIconContainer = document.createElement("div");
		acknowledgeIconContainer.classList.value = "chooser-item__icon flex self-center items-center justify-center pointer-events-none relative";
		acknowledgeButton.appendChild(acknowledgeIconContainer);

		const acknowledgeIconImage = document.createElement("div");
		acknowledgeIconImage.classList.value = "chooser-item__icon-image relative flex flex-col items-center justify-center espionage-details-acknowledge-icon";
		acknowledgeIconContainer.appendChild(acknowledgeIconImage);

		const acknowledgeString = document.createElement("div");
		acknowledgeString.classList.add("font-title", "text-lg", "mb-1", "pointer-events-none", "font-fit-shrink", "self-center", "relative", "flex-1", "p-px");
		acknowledgeString.innerHTML = Locale.compose("LOC_DIPLOMACY_ESPIONAGE_DETAILS_ACKNOWLEDGE");
		acknowledgeButton.appendChild(acknowledgeString);

		buttonContainer.appendChild(acknowledgeButton);

		const diplomacyButton = document.createElement("chooser-item");
		diplomacyButton.classList.add("chooser-item_unlocked", "h-16", "flex", "flex-row", "w-76");
		diplomacyButton.addEventListener("action-activate", () => {
			PopupSequencer.closePopup(this.screenId);
			const playerID = DiplomacyManager.currentEspionageData?.Header.targetPlayer ? DiplomacyManager.currentEspionageData?.Header.targetPlayer : GameContext.localPlayerID;
			window.dispatchEvent(new RaiseDiplomacyEvent(playerID));
		});

		const diplomacyIconContainer = document.createElement("div");
		diplomacyIconContainer.classList.value = "chooser-item__icon flex self-center items-center justify-center pointer-events-none relative";
		diplomacyButton.appendChild(diplomacyIconContainer);

		const diplomacyIconImage = document.createElement("div");
		diplomacyIconImage.classList.value = "chooser-item__icon-image relative flex flex-col items-center justify-center espionage-details-diplomacy-icon";
		diplomacyIconContainer.appendChild(diplomacyIconImage);

		const diplomacyString = document.createElement("div");
		diplomacyString.classList.add("font-title", "text-lg", "mb-1", "pointer-events-none", "font-fit-shrink", "self-center", "relative", "flex-1", "p-px");
		diplomacyString.innerHTML = Locale.compose("LOC_DIPLOMACY_OPEN_DIPLOMACY");
		diplomacyButton.appendChild(diplomacyString);

		buttonContainer.appendChild(diplomacyButton);

		const closeButton = MustGetElement("fxs-close-button", this.Root);
		closeButton.addEventListener("action-activate", () => { PopupSequencer.closePopup(this.screenId); });
	}

	onAttach() {
		super.onAttach();
		this.render();
		this.Root.addEventListener(InputEngineEventName, this.engineInputListener);
		this.populateEspionageDetails();
	}

	onDetach(): void {
		this.Root.removeEventListener(InputEngineEventName, this.engineInputListener);
	}

	onReceiveFocus(): void {
		const focusableElement = Navigation.getFirstFocusableElement(this.Root, { isDisableFocusAllowed: true, direction: InputNavigationAction.NONE });
		if (focusableElement) {
			FocusManager.setFocus(focusableElement);
		} else {
			FocusManager.setFocus(this.Root);
		}
	}

	private onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			PopupSequencer.closePopup(this.screenId);
		}
	}

	private populateEspionageDetails() {
		if (!DiplomacyManager.currentEspionageData) {
			console.error("screen-espionage-details: Attempting to populate espionage details but no valid espionage data!");
			return;
		}

		const statusContainer = MustGetElement("#espionage-status-container", this.Root);

		if (!DiplomacyManager.currentEspionageData.Header.failed) {
			statusContainer.appendChild(this.createEspionageStatusRow("fs://game/dip_esp_reveal_icon.png", Locale.compose("LOC_DIPLOMACY_ESPIONAGE_DETAILS_SUCCESS")));
		} else {
			statusContainer.appendChild(this.createEspionageStatusRow("fs://game/dip_esp_noreveal_icon.png", Locale.compose("LOC_DIPLOMACY_ESPIONAGE_DETAILS_FAILED")));
		}

		if (!DiplomacyManager.currentEspionageData.Header.revealed) {
			statusContainer.appendChild(this.createEspionageStatusRow("fs://game/dip_esp_reveal_icon.png", Locale.compose("LOC_DIPLOMACY_ESPIONAGE_DETAILS_HIDDEN")));
		} else {
			statusContainer.appendChild(this.createEspionageStatusRow("fs://game/dip_esp_noreveal_icon.png", Locale.compose("LOC_DIPLOMACY_ESPIONAGE_DETAILS_REVEALED")));
		}

		const detailsContainer = MustGetElement("#espionage-details-container", this.Root);

		const detailsElement = document.createElement("div");
		detailsElement.classList.value = "w-full font-body text-base font-fit-shrink";
		detailsElement.innerHTML = Locale.stylize(DiplomacyManager.currentEspionageData.DetailsString);
		detailsContainer.appendChild(detailsElement);
	}

	private createEspionageStatusRow(imageSource: string, statusString: string): HTMLElement {
		const statusrow = document.createElement("div");
		statusrow.classList.value = "flex flex-row items-center";

		const statusIcon = document.createElement("img");
		statusIcon.classList.value = "mr-2";
		statusIcon.src = imageSource;
		statusrow.appendChild(statusIcon);

		const statusStringElement = document.createElement("div");
		statusStringElement.classList.value = "font-title text-lg uppercase font-fit-shrink grow";
		statusStringElement.innerHTML = statusString;
		statusrow.appendChild(statusStringElement);

		return statusrow;
	}
}

Controls.define('screen-espionage-details', {
	createInstance: EspionageDetailsScreen,
	description: 'Espionage Details Screen.',
	styles: ['fs://game/base-standard/ui/espionage-details/screen-espionage-details.css'],
	classNames: ['screen-espionage-details'],
	attributes: []
});
