/**
 * @file age-select-panel.ts
 * @copyright 2022-2024, Firaxis Games
 * @description Allows the player to select the desired age for a new game
 */

import { ActionActivateEvent } from '/core/ui/components/fxs-activatable.js';
import ActionHandler from '/core/ui/input/action-handler.js';
import FocusManager from '/core/ui/input/focus-manager.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { AgeData, GetAgeMap } from '/core/ui/shell/create-panels/age-civ-select-model.js';
import { CreateGameModel } from '/core/ui/shell/create-panels/create-game-model.js';
import { GameCreationPanelBase } from '/core/ui/shell/create-panels/game-creation-panel-base.js';

class AgeSelectPanel extends GameCreationPanelBase {
	private ageButtonListener = this.handleSelectAge.bind(this);
	private ageFocusListener = this.handleFocusAge.bind(this);
	private ageButtons: HTMLElement[] = [];
	private selectedAgeButton: HTMLElement | null = null;
	private agesSlot: HTMLElement | null = null;
	private agesScrollable: HTMLElement | null = null;
	private ageMap: Map<string, AgeData>;

	constructor(root: ComponentRoot<AgeSelectPanel>) {
		super(root);

		this.ageMap = GetAgeMap();
	}

	onInitialize() {
		super.onInitialize();

		const fragment = this.createLayoutFragment(true);

		const ageSelectHeader = document.createElement("fxs-header");
		ageSelectHeader.setAttribute("title", "LOC_AGE_SELECT_TITLE");
		ageSelectHeader.classList.add("mt-4");
		this.mainContent.appendChild(ageSelectHeader);

		this.agesScrollable = document.createElement('fxs-scrollable');
		this.agesScrollable.setAttribute("attached-scrollbar", "true");
		this.agesScrollable.classList.add('age-select-scrollable', 'flex-auto');

		this.agesSlot = document.createElement("fxs-vslot");
		this.agesSlot.classList.add("flex", "flex-col");

		this.agesScrollable.appendChild(this.agesSlot);
		this.mainContent.appendChild(this.agesScrollable);

		const ageParameter = GameSetup.findGameParameter('Age');
		const ages = [...ageParameter?.domain.possibleValues ?? []];
		const sortedAges = ages.sort((a, b) => a.sortIndex - b.sortIndex);

		for (const [index, age] of sortedAges.entries()) {
			const name = GameSetup.resolveString(age.name) || "";
			const description = GameSetup.resolveString(age.description) || "";
			const ageButton = this.createAgeButton(age.value as string, name, description, index + 1);
			this.ageButtons.push(ageButton);
			this.agesSlot.appendChild(ageButton);
		}

		const spacer = document.createElement("div");
		spacer.classList.add("flex-auto");
		this.mainContent.appendChild(spacer);

		this.mainContent.appendChild(this.buildBottomNavBar());

		this.detailContent.classList.add("font-body-base");

		fragment.appendChild(this.buildLeaderBox());

		this.Root.appendChild(fragment);
	}

	createAgeButton(id: string, title: string, description: string, tabIndex: number) {
		const ageButton = document.createElement("fxs-activatable");

		ageButton.addEventListener('action-activate', this.ageButtonListener);
		ageButton.addEventListener('focus', this.ageFocusListener);
		ageButton.classList.add("age-select-age-choice", "age-select-unselected", this.getAgeClassName(id), "flex", "flex-col", "justify-center", "items-center", "my-2", "mx-7", "text-primary-4");
		ageButton.setAttribute("data-age", id);
		ageButton.setAttribute("tabindex", tabIndex.toString());
		ageButton.setAttribute("data-audio-group-ref", "age-select");
		ageButton.setAttribute("data-audio-activate-ref", "data-audio-age-select");

		const ageName = document.createElement("div");
		ageName.innerHTML = Locale.stylize("LOC_CREATE_GAME_AGE_TITLE", title);
		ageName.classList.add("font-title-xl", "uppercase", "font-bold");
		ageButton.appendChild(ageName);

		const ageDesc = document.createElement("div");
		ageDesc.innerHTML = Locale.stylize(description);
		ageDesc.classList.add("font-body-lg");
		ageButton.appendChild(ageDesc);

		return ageButton;
	}

	onAttach() {
		super.onAttach();

		// Select the first age when it gets attached
		waitForLayout(() => {
			this.selectGameParamAge();
			this.showQuoteSubtitles();
		});
	}

	onReceiveFocus() {
		super.onReceiveFocus();

		this.selectGameParamAge();
		this.updateNavTray();
	}

	onLoseFocus() {
		NavTray.clear();

		super.onLoseFocus();
	}

	private getAgeClassName(ageId: string) {
		return `age-select-${ageId.toLowerCase().replace("_", "-")}`;
	}

	private selectGameParamAge() {
		const ageId = GameSetup.findGameParameter("Age")?.value?.value;

		// First try to load age from current age in game setup params
		if (ageId) {
			const foundAge = this.ageButtons.find(b => b.getAttribute('data-age') == ageId);

			if (foundAge) {
				this.selectAge(foundAge);
				return;
			}
		}

		// If it wasn't found, default to the first item
		this.selectAge(this.ageButtons[0]);
	}


	private handleFocusAge(event: FocusEvent) {
		if (ActionHandler.isGamepadActive) {
			this.selectAge(event.target as HTMLElement)
		}
	}

	private handleSelectAge(event: ActionActivateEvent) {
		if (ActionHandler.isGamepadActive) {
			CreateGameModel.showNextPanel();
		} else {
			this.selectAge(event.target as HTMLElement)
		}
	}

	private selectAge(ageButton: HTMLElement) {
		const ageType = ageButton.getAttribute('data-age');

		if (ageButton && FocusManager.getFocus() != ageButton) {
			FocusManager.setFocus(ageButton);
		}

		if (ageType && ageButton != this.selectedAgeButton) {
			if (this.selectedAgeButton) {
				this.selectedAgeButton.classList.add("age-select-unselected");
			}

			this.selectedAgeButton = ageButton;
			this.selectedAgeButton.classList.remove("age-select-unselected");

			GameSetup.setGameParameterValue('Age', ageType);
			CreateGameModel.selectedAge = this.ageMap.get(ageType);
			CreateGameModel.setBackground(CreateGameModel.getAgeBackgroundName(ageType));

			this.updateLeaderBox();
		}
	}

	protected override showNextPanel(): void {
		CreateGameModel.showNextPanel({ skip: "" });
	}
}

Controls.define('age-select-panel', {
	createInstance: AgeSelectPanel,
	description: 'Select the age the game takes place in',
	requires: ['fxs-button'],
	classNames: ["size-full", "relative", "flex", "flex-col"],
	styles: ['fs://game/core/ui/shell/create-panels/age-select-panel.css'],
	tabIndex: -1,
	images: [
		'fs://game/shell_antiquity-select.png',
		'fs://game/age-sel_antiquity_desat.png',
		'fs://game/shell_exploration-select.png',
		'fs://game/age-sel_exploration_desat.png',
		"fs://game/shell_modern-select.png",
		'fs://game/age-sel_modern_desat.png',
	],
});