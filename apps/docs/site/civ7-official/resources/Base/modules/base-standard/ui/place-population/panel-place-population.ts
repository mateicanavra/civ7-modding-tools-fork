/**
 * @file panel-place-population.ts
 * @copyright 2024, Firaxis Games
 * @description Displays all the useful information when attempting to place new population
 */

import { InterfaceMode, InterfaceModeChangedEventName } from '/core/ui/interface-modes/interface-modes.js';
import Panel, { AnchorType } from '/core/ui/panel-support.js';
import Databind from '/core/ui/utilities/utilities-core-databinding.js';
import NavTray from '/core/ui/navigation-tray/model-navigation-tray.js';
import { MustGetElement } from "/core/ui/utilities/utilities-dom.js";
import PlacePopulation from '/base-standard/ui/place-population/model-place-population.js';

class PlacePopulationPanel extends Panel {

	private readonly subsystemFrame = document.createElement("fxs-subsystem-frame");

	constructor(root: ComponentRoot) {
		super(root);
		this.animateInType = this.animateOutType = AnchorType.RelativeToLeft;
	}

	onAttach() {
		super.onAttach();

		PlacePopulation.update();

		this.buildView();

		this.setHidden(true);

		window.addEventListener(InterfaceModeChangedEventName, this.onInterfaceModeChanged);
		this.subsystemFrame.addEventListener('subsystem-frame-close', this.requestClose);

		NavTray.clear();
		NavTray.addOrUpdateGenericBack();

	}
	onDetach() {
		window.removeEventListener(InterfaceModeChangedEventName, this.onInterfaceModeChanged);
		this.subsystemFrame.removeEventListener('subsystem-frame-close', this.requestClose);

		NavTray.clear();
		super.onDetach();
	}

	private buildView() {
		const fragment = document.createDocumentFragment();

		const isMobile = UI.getViewExperience() == UIViewExperience.Mobile;
		const container = document.createElement('div');
		container.classList.add("w-128", "pointer-events-none");
		container.classList.toggle("h-full", isMobile);
		container.classList.toggle("flow-row", isMobile);
		container.appendChild(this.buildPopulationPlacementInfo());
		if (!PlacePopulation.isTown) {	// Ignore if town, as towns don't have specialists.
			container.appendChild(this.buildSpecialistInfo());
		}
		container.appendChild(this.buildImprovementInfo());
		fragment.appendChild(container);

		this.Root.appendChild(fragment);
	}

	private buildPopulationPlacementInfo(): HTMLElement {

		this.subsystemFrame.innerHTML = `
			<div class="flex flex-col">
				<fxs-header class="uppercase tracking-100" title="${PlacePopulation.cityName}"></fxs-header>
				<div class="yields-container flex self-center"></div>
				<fxs-header data-bind-if="!{{g_PlacePopulation.isTown}}" class="uppercase tracking-100 mt-2" title="LOC_UI_CITY_GROWTH_TITLE" filigree-style="small"></fxs-header>
				<fxs-header data-bind-if="{{g_PlacePopulation.isTown}}" class="uppercase tracking-100 mt-2" title="LOC_UI_TOWN_GROWTH_TITLE" filigree-style="small"></fxs-header>
				<fxs-header class="uppercase" title="LOC_UI_CITY_GROWTH_SELECT_A_TILE" filigree-style="h4"></fxs-header>
				<div class="flex ml-4 my-4">
					<div class="expand-icon size-20 bg-contain bg-no-repeat"></div>
					<div class="flex flex-col">
						<div data-bind-if="!{{g_PlacePopulation.isTown}}" class="font-title uppercase mt-2 text-lg text-secondary w-84" data-l10n-id="LOC_UI_CITY_GROWTH_EXPAND_CITY"></div>
						<div data-bind-if="{{g_PlacePopulation.isTown}}" class="font-title uppercase mt-2 text-lg text-secondary w-84" data-l10n-id="LOC_UI_CITY_GROWTH_EXPAND_TOWN"></div>
					</div>
				</div>
				<div data-bind-if="!{{g_PlacePopulation.isTown}} && !{{g_PlacePopulation.isResettling}}" class="flex ml-4 mb-4">
					<div class="add-population-icon size-20 bg-contain bg-no-repeat"></div>
					<div class="flex flex-col">
						<div class="font-title uppercase mt-2 text-lg text-secondary w-84" data-l10n-id="LOC_UI_CITY_GROWTH_ADD_SPECIALST"></div>
						<div class="mt-2">${PlacePopulation.maxSlotsMessage}</div>
					</div>
				</div>
			</div>
		`;

		const yieldsContainer = MustGetElement(".yields-container", this.subsystemFrame);

		const cityYields = PlacePopulation.cityYields;
		for (const yieldEntry of cityYields) {
			if (!yieldEntry.type) {
				continue;
			}

			const yieldDiv = document.createElement("div");
			yieldDiv.classList.add("flex", "flex-col", "mx-2");
			yieldsContainer.appendChild(yieldDiv);

			const yieldIcon = document.createElement("fxs-icon");
			yieldIcon.classList.add("size-8");
			yieldIcon.setAttribute("data-icon-id", yieldEntry.type);
			yieldDiv.appendChild(yieldIcon);

			const yieldValue = document.createElement("div");
			yieldValue.classList.add("self-center");
			yieldValue.textContent = Locale.compose("LOC_UI_YIELD_ONE_DECIMAL_NO_PLUS", yieldEntry.valueNum)
			yieldDiv.appendChild(yieldValue);
		}

		return this.subsystemFrame;
	}

	private buildSpecialistInfo(): HTMLElement {
		const isMobile = UI.getViewExperience() == UIViewExperience.Mobile;

		const specialistInfoFrame = document.createElement('fxs-frame');
		specialistInfoFrame.setAttribute("override-styling", "relative flex mx-7 pb-8");
		specialistInfoFrame.setAttribute("frame-style", "simple");
		specialistInfoFrame.classList.add("panel-place-population_specialist-info");
		Databind.if(specialistInfoFrame, '{{g_PlacePopulation.hasHoveredWorkerPlot}}');

		const specialistInfoFrameHeader = document.createElement('fxs-header');
		specialistInfoFrameHeader.classList.add("uppercase", "mt-4", "mb-2");
		specialistInfoFrameHeader.setAttribute('title', 'LOC_WORKERS_TITLE');
		specialistInfoFrameHeader.setAttribute("filigree-style", "small");
		specialistInfoFrame.appendChild(specialistInfoFrameHeader);

		const specialistsInfoContainer = document.createElement("div");
		specialistsInfoContainer.classList.add("flex");
		specialistsInfoContainer.classList.toggle('ml-8', !isMobile);
		specialistsInfoContainer.classList.toggle('ml-5', isMobile);
		specialistInfoFrame.appendChild(specialistsInfoContainer);

		const specialistsIcon = document.createElement("div");
		specialistsIcon.classList.add("add_specialists_icon", "bg-contain", "bg-no-repeat");
		specialistsIcon.classList.toggle('size-16', !isMobile);
		specialistsIcon.classList.toggle('size-14', isMobile);
		specialistsInfoContainer.appendChild(specialistsIcon);

		const specialistsTextContainer = document.createElement("div");
		specialistsTextContainer.classList.add("add-specialists-desc", "flex", "flex-col", "self-center", "ml-2", "max-w-84");
		specialistsInfoContainer.appendChild(specialistsTextContainer);

		const specialistInfoFrameCanAddText = document.createElement('div');
		specialistInfoFrameCanAddText.classList.add("text-secondary");
		Databind.html(specialistInfoFrameCanAddText, '{{g_PlacePopulation.canAddSpecialistMessage}}');
		specialistsTextContainer.appendChild(specialistInfoFrameCanAddText);

		const specialistInfoFrameNumSpecialists = document.createElement('div');
		Databind.html(specialistInfoFrameNumSpecialists, '{{g_PlacePopulation.numSpecialistsMessage}}');
		specialistsTextContainer.appendChild(specialistInfoFrameNumSpecialists);

		const specialistInfoFrameSlotsAvailableText = document.createElement('div');
		Databind.html(specialistInfoFrameSlotsAvailableText, '{{g_PlacePopulation..maxSlotsMessage}}');
		specialistsTextContainer.appendChild(specialistInfoFrameSlotsAvailableText);

		if (isMobile) {
			const specialistInfoFrameTextContainer = document.createElement('div');
			specialistInfoFrameTextContainer.classList.add('flow-row');
			specialistInfoFrameNumSpecialists.classList.add('mr-1');
			specialistInfoFrameTextContainer.appendChild(specialistInfoFrameNumSpecialists);
			specialistInfoFrameTextContainer.appendChild(specialistInfoFrameSlotsAvailableText);
			specialistsTextContainer.appendChild(specialistInfoFrameTextContainer);
		}

		return specialistInfoFrame;
	}

	private buildImprovementInfo(): HTMLElement {
		const isMobile = UI.getViewExperience() == UIViewExperience.Mobile;

		const improvementInfoFrame = document.createElement('fxs-frame');
		improvementInfoFrame.setAttribute("override-styling", "relative flex mx-7 pb-8");
		improvementInfoFrame.setAttribute("frame-style", "simple");
		improvementInfoFrame.classList.add("panel-place-population_improvement-info");
		Databind.if(improvementInfoFrame, '{{g_PlacePopulation.shouldShowImprovement}}');

		const improvementInfoFrameHeader = document.createElement('fxs-header');
		improvementInfoFrameHeader.classList.add("uppercase", "mt-4", "mb-2");
		improvementInfoFrameHeader.setAttribute('title', 'LOC_UI_ADD_IMPROVEMENT');
		improvementInfoFrameHeader.setAttribute("filigree-style", "small");
		improvementInfoFrame.appendChild(improvementInfoFrameHeader);

		const improvementInfoContainer = document.createElement("div");
		improvementInfoContainer.classList.add("flex");
		improvementInfoContainer.classList.toggle('ml-8', !isMobile);
		improvementInfoContainer.classList.toggle('ml-5', isMobile);
		improvementInfoFrame.appendChild(improvementInfoContainer);

		const improvementIcon = document.createElement("fxs-icon");
		improvementIcon.classList.toggle('size-16', !isMobile);
		improvementIcon.classList.toggle('size-14', isMobile);
		improvementIcon.setAttribute('data-bind-attr-data-icon-id', '{{g_PlacePopulation.addImprovementType}}');
		improvementInfoContainer.appendChild(improvementIcon);

		const improvementAddIcon = document.createElement("div");
		improvementAddIcon.classList.add("improvement_add_icon", "size-8", "bg-contain", "bg-no-repeat", "left-8", "top-8", "relative");
		improvementIcon.appendChild(improvementAddIcon);

		const addImprovementText = document.createElement('div');
		addImprovementText.classList.add("add-improvement-desc", "self-center", "ml-2", "max-w-84");
		Databind.html(addImprovementText, '{{g_PlacePopulation.addImprovementText}}');
		improvementInfoContainer.appendChild(addImprovementText);

		return improvementInfoFrame;
	}

	private onInterfaceModeChanged = () => {
		switch (InterfaceMode.getCurrent()) {
			case "INTERFACEMODE_ACQUIRE_TILE":
				this.setHidden(false);
				break;
			default:
				this.setHidden(true);
				break;
		}
	}

	private setHidden(hidden: boolean) {
		this.Root.classList.toggle("hidden", hidden);
	}

	protected requestClose() {
		InterfaceMode.switchToDefault();
	}
}

Controls.define('panel-place-population', {
	createInstance: PlacePopulationPanel,
	description: '',
	classNames: ['panel-place-population', "font-body", "text-base", "py-12", "pl-8", "h-full"],
	styles: ["fs://game/base-standard/ui/place-population/panel-place-population.css"]
});

declare global {
	interface HTMLElementTagNameMap {
		'panel-place-population': ComponentRoot<PlacePopulationPanel>;
	}
}