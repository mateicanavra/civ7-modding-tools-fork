/**
 * @file screen-city-state-bonus-chooser.ts
 * @copyright 2020-2024, Firaxis Games
 * @description City-State bonus chooser screen.  This screen is an instance of a general chooser.
 */

import { ScreenGeneralChooser } from '/base-standard/ui/general-chooser/screen-general-chooser.js';
import { MustGetElement } from '/core/ui/utilities/utilities-dom.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import { InputEngineEvent } from '/core/ui/input/input-support.js';

class ScreenCityStateBonusChooser extends ScreenGeneralChooser {
	private confirmButtonListener = this.onConfirm.bind(this);
	private currentlySelectedChoice: HTMLElement | null = null;
	private confirmButton!: HTMLElement;
	private bonusEntryContainer!: HTMLElement;

	onInitialize(): void {
		this.confirmButton = MustGetElement(".suzerain-bonus__confirm", this.Root);
		this.bonusEntryContainer = MustGetElement(".suzerain-bonus__choices-container", this.Root);
		this.createCloseButton = false;
	}

	onAttach(): void {
		super.onAttach();
		this.confirmButton.addEventListener('action-activate', this.confirmButtonListener);

		const suzerainSubsystemFrame: HTMLElement = MustGetElement(".suzerain-bonus__subsystem-frame", this.Root);
		suzerainSubsystemFrame.addEventListener('subsystem-frame-close', () => { this.close(); });

		Databind.classToggle(this.confirmButton, 'hidden', `g_NavTray.isTrayRequired`);

		this.createEntries(this.bonusEntryContainer);
		this.focusCityState();

	}

	onDetach(): void {
		this.confirmButton.removeEventListener('action-activate', this.confirmButtonListener);
		super.onDetach();
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		FocusManager.setFocus(this.bonusEntryContainer);
	}

	protected onEngineInput(inputEvent: InputEngineEvent) {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			this.close();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
		if (inputEvent.detail.name == 'shell-action-1') {
			if (this.currentlySelectedChoice) {
				this.onConfirm();
			}
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}

	createEntries(entryContainer: HTMLElement) {
		const cityState: PlayerId = Game.CityStates.getCityStateBonusToSelect(GameContext.localPlayerID);
		for (const item of GameInfo.CityStateBonuses) {
			if (Game.CityStates.canHaveBonus(GameContext.localPlayerID, cityState, item.CityStateBonusType)) {
				const bonusItem = document.createElement("fxs-chooser-item");
				bonusItem.setAttribute("select-on-activate", "true");
				bonusItem.setAttribute('bonus-item', item.CityStateBonusType);
				bonusItem.classList.add("mx-3", "my-1\\.5", "flex");
				this.tagEntry(bonusItem);

				const bonusItemContentContainer = document.createElement("div");
				bonusItemContentContainer.classList.value = "flex items-center flex-auto";
				bonusItem.appendChild(bonusItemContentContainer);

				const bonusItemImage = document.createElement("div");
				bonusItemImage.classList.value = "size-12 bg-no-repeat bg-contain bg-center ml-2";
				bonusItemImage.style.backgroundImage = UI.getIconCSS(item.CityStateBonusType, "CITY_STATE_BONUS");
				bonusItemContentContainer.appendChild(bonusItemImage);

				const bonusItemTextContainer = document.createElement("div");
				bonusItemTextContainer.classList.value = "flex flex-col m-3 flex-auto";
				bonusItemContentContainer.appendChild(bonusItemTextContainer);

				const bonusItemTitle = document.createElement("div");
				bonusItemTitle.classList.value = "text-base font-title mb-1 text-accent-2";
				bonusItemTitle.setAttribute("data-l10n-id", item.Name);
				bonusItemTextContainer.appendChild(bonusItemTitle);

				const bonusItemDescription = document.createElement("div");
				bonusItemDescription.classList.value = "text-sm font-body text-accent-3";
				bonusItemDescription.setAttribute("data-l10n-id", item.Description);
				bonusItemTextContainer.appendChild(bonusItemDescription);
				entryContainer.appendChild(bonusItem);
			}
		}
	}

	entrySelected(entryElement: HTMLElement) {
		if (this.currentlySelectedChoice) {
			this.currentlySelectedChoice.setAttribute("selected", "false");
		}
		this.currentlySelectedChoice = entryElement;
		this.confirmButton.removeAttribute("disabled");
		NavTray.addOrUpdateShellAction1("LOC_UI_RESOURCE_ALLOCATION_CONFIRM");
	}

	private focusCityState() {
		const cityState: PlayerId = Game.CityStates.getCityStateBonusToSelect(GameContext.localPlayerID);
		const cityStatePlayerLibrary: PlayerLibrary | null = Players.get(cityState);
		if (!cityStatePlayerLibrary) {
			console.error(`screen-city-state-bonus-chooser: focusCityState() - No player library for city state with id ${cityState}`);
			return;
		}
		const cityStateCitiesLibrary: PlayerCities | undefined = cityStatePlayerLibrary.Cities;
		if (!cityStateCitiesLibrary) {
			console.error(`screen-city-state-bonus-chooser: focusCityState() - No PlayerCities library for city state with id ${cityState}`);
			return;
		}

		const cityStateCities: City[] = cityStateCitiesLibrary.getCities();
		const cityStateSettlement: City | undefined = cityStateCities.length > 0 ? cityStateCities[0] : undefined;

		if (cityStateSettlement == undefined) {
			console.error(`screen-city-state-bonus-chooser: focusCityState() - City state with id ${cityState} has no settlements!`);
			return;
		}

		UI.Player.lookAtID(cityStateSettlement.id);
	}

	private onConfirm() {
		if (!this.currentlySelectedChoice) {
			console.error("screen-city-state-bonus-chooser: onConfirm - no currently selected choice!");
			return;
		}
		const bonusType: string | null = this.currentlySelectedChoice.getAttribute("bonus-item");
		if (bonusType) {
			let args: any = {
				OtherPlayer: Game.CityStates.getCityStateBonusToSelect(GameContext.localPlayerID),
				CityStateBonusType: Database.makeHash(bonusType)
			};

			const result = Game.PlayerOperations.canStart(GameContext.localPlayerID, PlayerOperationTypes.CHOOSE_CITY_STATE_BONUS, args, false);
			if (result.Success) {
				Game.PlayerOperations.sendRequest(GameContext.localPlayerID, PlayerOperationTypes.CHOOSE_CITY_STATE_BONUS, args);
				this.close();
			}
		}
	}
}

Controls.define('screen-city-state-bonus-chooser', {
	createInstance: ScreenCityStateBonusChooser,
	description: 'City-State Bonus Chooser screen.',
	classNames: ['city-state-bonus-chooser', 'fullscreen', 'pointer-events-auto'],
	content: ["fs://game/base-standard/ui/city-state-bonus-chooser/screen-city-state-bonus-chooser.html"],
	styles: ['fs://game/base-standard/ui/city-state-bonus-chooser/screen-city-state-bonus-chooser.css'],
	attributes: []
});