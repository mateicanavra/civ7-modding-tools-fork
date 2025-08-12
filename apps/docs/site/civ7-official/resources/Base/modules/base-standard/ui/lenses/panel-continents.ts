/**
 * @file panel-continents.ts
 * @copyright 2024, Firaxis Games
 * @description Panel providing additional continent information
 */

import { ContinentLensLayer, ContinentPlotList } from "/base-standard/ui/lenses/layer/continent-layer.js";
import { numberHexToStringRGB } from "/core/ui/utilities/utilities-color.js";
import { MustGetElement } from "/core/ui/utilities/utilities-dom.js";
import { InputEngineEvent } from '/core/ui/input/input-support.js';
import LensManager, { LensActivationEvent, LensActivationEventName } from '/core/ui/lenses/lens-manager.js';
import Panel from "/core/ui/panel-support.js";

export class ContinentLensInfo extends Panel {
	private subsystemFrameCloseListener = this.close.bind(this);
	private engineInputListener = this.onEngineInput.bind(this);
	private readonly activeLensChangedListener = this.onActiveLensChanged.bind(this);

	private continentListContainer: HTMLElement | null = null;
	private frame: HTMLElement | null = null;

	private get isExplorationAge() {
		return Game.age == Game.getHash("AGE_EXPLORATION");
	}

	private get isModernAge() {
		return Game.age == Game.getHash("AGE_MODERN");
	}

	inputContext: InputContext = InputContext.World;

	constructor(root: ComponentRoot) {
		super(root);
	}

	onAttach() {
		this.frame = this.Root.querySelector<HTMLElement>(".continent-frame");
		this.Root.addEventListener('engine-input', this.engineInputListener);
		if (this.frame == undefined) {
			return;
		}
		this.frame.addEventListener('subsystem-frame-close', this.subsystemFrameCloseListener);
		window.addEventListener(LensActivationEventName, this.activeLensChangedListener);
	}

	onDetach() {
		if (this.frame) {
			this.frame.removeEventListener('subsystem-frame-close', this.subsystemFrameCloseListener);
		}
		this.Root.removeEventListener('engine-input', this.engineInputListener);
		window.removeEventListener(LensActivationEventName, this.activeLensChangedListener);
		super.onDetach();
	}

	onActiveLensChanged(event: LensActivationEvent) {
		const areWeVisible = (event.detail.activeLens == 'fxs-continent-lens');

		if (areWeVisible) {
			this.initPanel();
		}

		this.Root.classList.toggle('hidden', !areWeVisible);
	}

	private initPanel() {
		if (this.isExplorationAge || this.isModernAge) {
			const subHeaderElement = MustGetElement(".continents__subheader", this.Root);
			subHeaderElement.setAttribute("data-l10n-id", this.isExplorationAge ? Locale.compose("LOC_UI_CONTINENTS_EXPLORATION_SUBTITLE") : Locale.compose("LOC_UI_CONTINENTS_MODERN_SUBTITLE"));
		}
		this.continentListContainer = MustGetElement(".continents__info-container", this.Root);

		while (this.continentListContainer.firstChild) {
			this.continentListContainer.removeChild(this.continentListContainer.firstChild)
		}

		// add continent entries
		for (let i = 0; i < ContinentLensLayer.instance.continentsList.length; i++) {
			const continentPlotList = ContinentLensLayer.instance.continentsList[i];
			this.addContinentInfoRow(continentPlotList);
		}

		if (this.isExplorationAge) {
			// add hex outline key
			this.addIconKeyRow("fs://game/res_treasurehex", "LOC_UI_CONTINENTS_HOMELANDS_RESOURCE_DESCRIPTION");
			// add fleet generation key
			this.addIconKeyRow("fs://game/res_distanttreasurehex", "LOC_UI_CONTINENTS_DISTANT_LANDS_RESOURCE_DESCRIPTION");
		}
	}

	private addContinentInfoRow(contintentPlotList: ContinentPlotList) {
		const rowContainer = document.createElement('div');
		rowContainer.classList.value = 'continents__row-container flex my-2';

		const rowContent = document.createElement('div');
		rowContent.classList.value = 'continents__row-container flex flex-row flex-auto';
		rowContainer.appendChild(rowContent);

		const colorBoxContainer = document.createElement('div');
		colorBoxContainer.classList.value = 'continents__color-box-container flex size-10';
		colorBoxContainer.style.backgroundColor = 'grey';
		rowContent.appendChild(colorBoxContainer);

		const colorBox = document.createElement('div');
		colorBox.classList.value = 'continents__color-box flex m-px size-full';
		colorBox.style.backgroundColor = numberHexToStringRGB(contintentPlotList.color);
		colorBoxContainer.appendChild(colorBox);

		const continentsTextColumn = document.createElement('div');
		continentsTextColumn.classList.value = 'continents__text-column flex flex-col font-fit-shrink whitespace-nowrap ml-4 w-62';
		rowContent.appendChild(continentsTextColumn);

		const continentsTextTitle = document.createElement('div');
		continentsTextTitle.classList.value = 'continents__continent-title flex font-title text-base uppercase font-fit-shrink whitespace-nowrap';
		continentsTextTitle.innerHTML = Locale.compose(`${GameInfo.Continents.lookup(contintentPlotList.continent)?.Description}`);
		continentsTextColumn.appendChild(continentsTextTitle);

		const researchText = this.getContinentResearchState(contintentPlotList.continent, contintentPlotList.isDistant);
		let resourceAmount = "";
		if (contintentPlotList.totalResources != 0) {
			resourceAmount = `${contintentPlotList.availableResources}`;
		}

		const continentsTextStatus = document.createElement('div');
		continentsTextStatus.classList.value = 'continents__continent-status flex font-body text-base text-primary-1 font-fit-shrink';
		continentsTextColumn.appendChild(continentsTextStatus);

		if (this.isModernAge) {
			continentsTextStatus.innerHTML = `${resourceAmount} ${researchText}`;
		}

		this.continentListContainer?.appendChild(rowContainer);
	}

	public addIconKeyRow(iconURL: string, locTitle: string) {
		const rowContainer = document.createElement('div');
		rowContainer.classList.value = 'continents__row-container flex my-2';

		const rowContent = document.createElement('div');
		rowContent.classList.value = 'continents__row-container flex flex-row flex-auto';
		rowContainer.appendChild(rowContent);

		const iconContainer = document.createElement('div');
		iconContainer.classList.value = 'continents__key-icon-container flex size-10';
		rowContent.appendChild(iconContainer);

		const keyIcon = document.createElement('fxs-icon');
		keyIcon.classList.value = 'continents__key-icon flex m-px size-full';
		keyIcon.style.backgroundImage = `url(${iconURL})`;
		iconContainer.appendChild(keyIcon);

		const continentsTextColumn = document.createElement('div');
		continentsTextColumn.classList.value = 'continents__text-column flex flex-col ml-4 w-64';
		rowContent.appendChild(continentsTextColumn);

		const continentsTextTitle = document.createElement('div');
		continentsTextTitle.classList.value = 'continents__continent-title flex font-title text-base font-fit-shrink';
		continentsTextTitle.innerHTML = Locale.compose(locTitle);
		continentsTextColumn.appendChild(continentsTextTitle);

		this.continentListContainer?.appendChild(rowContainer);
	}

	private getContinentResearchState(continentType: ContinentType, isDistant: boolean): string {
		let descriptionsText = "";

		if (this.isExplorationAge) {
			if (!isDistant) {
				descriptionsText = Locale.compose("LOC_UI_CONTINENTS_PANEL_HOMELAND");
			}
			else {
				descriptionsText = Locale.compose("LOC_UI_CONTINENTS_PANEL_TREASURE_AVAILABLE");
			}
		}

		if (this.isModernAge) {
			const numAgesResearched = Players.get(GameContext.localPlayerID)?.Culture?.getNumAgesResearched(continentType);
			if (numAgesResearched == undefined) {
				return descriptionsText;
			}

			if (numAgesResearched <= 0) {
				descriptionsText = Locale.compose("LOC_UI_CONTINENTS_PANEL_NOT_RESEARCHED");
			}
			else if (numAgesResearched <= 1) {
				descriptionsText = Locale.compose("LOC_UI_CONTINENTS_PANEL_AVAILABLE");
			}
			else {
				descriptionsText = Locale.compose("LOC_UI_CONTINENTS_PANEL_COMPLETE");
			}
		}
		return descriptionsText;
	}

	protected close(): void {
		if (LensManager.getActiveLens() != 'fxs-default-lens') {
			LensManager.setActiveLens("fxs-default-lens");
		}
	}

	private onEngineInput(inputEvent: InputEngineEvent): void {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return;
		}

		if (inputEvent.detail.name == 'cancel' || inputEvent.detail.name == 'sys-menu') {
			this.close();
			inputEvent.stopPropagation();
			inputEvent.preventDefault();
		}
	}
}

Controls.define('panel-continents', {
	createInstance: ContinentLensInfo,
	description: 'Information about continents, exploration-age treasure convoys, and modern-age artifacts',
	styles: ['fs://game/base-standard/ui/lenses/panel-continents.css'],
	content: ['fs://game/base-standard/ui/lenses/panel-continents.html'],
	classNames: ["panel-continents", "w-96", "pr-4", "hidden"],
});