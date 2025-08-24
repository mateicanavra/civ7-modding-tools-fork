/**
 * last-production-section.ts
 * @copyright 2025, Firaxis Gmaes
 * @description The section to show the last production of a city
 */

import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { GetLastProductionData } from "/base-standard/ui/production-chooser/production-chooser-helpers.js";
import { UpdateCityDetailsEventName } from "/base-standard/ui/city-details/model-city-details.js";
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js'

export class LastProductionSection extends Component {

	private cityID: ComponentID | null = null;

	private updateCityDetailsListener = this.onUpdateCityDetails.bind(this);

	private readonly nameElement = document.createElement('div');
	private readonly iconElement = document.createElement('fxs-icon');
	private readonly yieldDiv = document.createElement('div');

	onInitialize() {
		super.onInitialize();
		this.render();
	}

	onAttach() {
		super.onAttach();

		window.addEventListener(UpdateCityDetailsEventName, this.updateCityDetailsListener);
	}

	onDetach() {
		this.cityID = null;

		window.removeEventListener(UpdateCityDetailsEventName, this.updateCityDetailsListener);

		super.onDetach();
	}

	private render() {
		this.Root.classList.add('flex', 'flex-col', 'items-center', 'justify-center', 'px-14', 'py-2', 'pointer-events-auto');
		this.Root.insertAdjacentHTML('beforeend', '<div class="font-title uppercase text-sm text-secondary-2 text-gradient-secondary mb-1" data-l10n-id="LOC_UI_JUST_COMPLETED"></div>');

		const frame = document.createElement('fxs-inner-frame');
		frame.classList.add('min-w-96', 'items-start', 'last-production-frame');

		const container = document.createElement('div');
		container.classList.add('flex', 'items-center', 'my-4', 'ml-8');

		this.iconElement.classList.add("size-16");
		container.appendChild(this.iconElement);

		const details = document.createElement('div');
		details.classList.add('flex-col', 'ml-4');

		this.nameElement.classList.add('font-title', 'text-xs', 'text-accent-2', 'uppercase')
		details.appendChild(this.nameElement);

		this.yieldDiv.classList.add('flex');
		details.appendChild(this.yieldDiv);
		container.appendChild(details);

		const checkmarkBG = document.createElement("div");
		checkmarkBG.style.backgroundImage = 'url("fs://game/techtree-icon-empty")';
		checkmarkBG.classList.value = "check-icon flex absolute size-6 bg-no-repeat bg-center bg-contain -right-2 -top-2 justify-center items-center";
		frame.appendChild(checkmarkBG);

		const checkmark = document.createElement("div");
		checkmark.classList.value = "size-4 bg-center bg-contain bg-no-repeat";
		checkmark.style.backgroundImage = 'url("fs://game/techtree_icon-checkmark")';
		checkmarkBG.appendChild(checkmark);

		frame.appendChild(container);
		this.Root.appendChild(frame);
	}

	private updateGate = new UpdateGate(() => {
		if (!this.cityID || ComponentID.isInvalid(this.cityID)) {
			// Expected case if getting detached
			return;
		}

		const lastProductionData = GetLastProductionData(this.cityID);
		if (!lastProductionData) {
			// Hide panel if no data returned
			this.Root.classList.add('hidden');
			return;
		}

		this.nameElement.setAttribute('data-l10n-id', lastProductionData.name);

		this.iconElement.setAttribute("data-icon-id", lastProductionData.type);

		this.yieldDiv.innerHTML = '';
		for (const detailData of lastProductionData.details) {
			const yieldEntry = document.createElement('div');
			yieldEntry.classList.add('flex', 'items-center', 'pr-4');

			const yieldIcon = document.createElement('fxs-icon')
			yieldIcon.classList.add("size-8");
			if (lastProductionData.isUnit) {
				// Unit stats generally don't have registered
				yieldIcon.style.backgroundImage = `url('blp:${detailData.icon}')`;
			} else {
				yieldIcon.setAttribute("data-icon-id", detailData.icon);
			}
			yieldEntry.appendChild(yieldIcon);

			const yieldValue = document.createElement('div');
			yieldValue.textContent = detailData.value;
			yieldEntry.appendChild(yieldValue);

			this.yieldDiv.appendChild(yieldEntry);
		}

		this.Root.setAttribute("data-type", lastProductionData.type);
		if (lastProductionData.isUnit) {
			this.Root.setAttribute('data-tooltip-style', 'production-unit-tooltip');
		} else {
			this.Root.setAttribute('data-tooltip-style', 'production-constructible-tooltip');
		}

		this.Root.classList.remove('hidden');
	})

	onAttributeChanged(name: string, oldValue: string, newValue: string): void {
		switch (name) {
			case 'data-cityid':
				this.cityID = JSON.parse(newValue);
				this.updateGate.call('onAttributeChanged');
				break;
			default:
				super.onAttributeChanged(name, oldValue, newValue);
				break;
		}
	}

	private onUpdateCityDetails() {
		this.updateGate.call('onUpdateCityDetails');
	}
}

Controls.define("last-production-section", {
	createInstance: LastProductionSection,
	tabIndex: -1,
	attributes: [
		{
			name: "data-cityid",
		}
	]
});