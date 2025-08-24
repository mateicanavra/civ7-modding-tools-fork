/**
 * @file town-focus-panel.ts
 * @copyright 2024, Firaxis Games
 * @description slide out panel for selecting town focus
 */

import { GetTownFocusItems, TownFocusItem } from '/base-standard/ui/production-chooser/production-chooser-helpers.js'
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'
import { FxsFrame } from '/core/ui/components/fxs-frame.js'
import { Framework } from '/core/ui/framework.js'

export const TownFocusRefreshEventName = 'panel-town-focus-refresh' as const;
export class TownFocusRefreshEvent extends CustomEvent<{}> {
	constructor() {
		super(TownFocusRefreshEventName, { bubbles: false, cancelable: true });
	}
}

class PanelTownFocus extends FxsFrame {

	private _cityID: ComponentID | null = null;
	private get cityID() {
		return this._cityID;
	}
	private set cityID(value: ComponentID | null) {
		if (ComponentID.isMatch(value, this._cityID)) {
			return;
		}

		if (value === null) {
			this.focusItems = [];
			this._cityID = null;
			return;
		}

		const city = Cities.get(value);
		if (!city) {
			this.focusItems = [];
			console.error(`panel-production-chooser: Failed to get city with ID: ${ComponentID.toLogString(value)}`);
			return;
		}

		this.focusItems = GetTownFocusItems(city.id);
		this._cityID = value;
	}

	private set focusItems(items: TownFocusItem[]) {
		this.focusItemListElement.innerHTML = '';

		for (let i = 0; i < items.length; i++) {
			const { name, description, tooltipDescription, growthType, projectType } = items[i];
			const itemElement = document.createElement('town-focus-chooser-item');
			itemElement.classList.add('w-full');
			itemElement.dataset.name = name;
			itemElement.dataset.description = description;
			if (tooltipDescription) {
				itemElement.dataset.tooltipDescription = tooltipDescription;
			} else {
				itemElement.removeAttribute('data-tooltip-description');
			}
			itemElement.dataset.growthType = growthType.toString();
			itemElement.dataset.projectType = projectType.toString();
			this.focusItemListElement.appendChild(itemElement);
		}
	}

	// #region Element References
	private readonly headerElement = document.createElement("fxs-header");
	private readonly focusItemListElement = document.createElement('fxs-vslot');
	// #endregion

	onInitialize(): void {
		this.Root.setAttribute('override-styling', 'relative flex max-w-full max-h-full pt-3\\.5 px-3\\.5 pb-6 pointer-events-auto');
		this.Root.setAttribute('frame-style', 'simple');

		super.onInitialize();

		this.render();
	}

	onAttach() {
		super.onAttach();

		this.Root.addEventListener('focus', this.onFocus);
		engine.on('CitySelectionChanged', this.onCitySelectionChanged);
		engine.on('CityGrowthModeChanged', this.onCityGrowthModeChanged);
		this.Root.addEventListener(TownFocusRefreshEventName, this.onRefreshFocusList);

		this.cityID = UI.Player.getHeadSelectedCity();
	}

	onDetach() {
		this.Root.addEventListener(TownFocusRefreshEventName, this.onRefreshFocusList);
		engine.off('CityGrowthModeChanged', this.onCityGrowthModeChanged);
		engine.off('CitySelectionChanged', this.onCitySelectionChanged);
		this.Root.removeEventListener('focus', this.onFocus);

		super.onDetach();
	}

	private onCitySelectionChanged = ({ selected, cityID }: CitySelectionChangedData) => {
		if (selected) {
			this.cityID = cityID;
		}
	}

	private onCityGrowthModeChanged = ({ cityID }: CityGrowthModeChanged_EventData) => {
		if (this._cityID && ComponentID.isMatch(this._cityID, cityID)) {
			this.cityID = cityID;
		}
	}

	private onRefreshFocusList = () => {
		const oldCityID = this._cityID;

		this.cityID = null;
		this.cityID = oldCityID;
	}

	private onFocus = () => {
		if (this.cityID) {
			Game.CityOperations.sendRequest(this.cityID, CityOperationTypes.CONSIDER_TOWN_PROJECT, {});
		}

		Framework.FocusManager.setFocus(this.focusItemListElement);
	}

	private render() {
		this.content.classList.add('flex', 'flex-col');
		this.headerElement.classList.add("uppercase", "tracking-100");
		this.headerElement.setAttribute("title", "LOC_UI_TOWN_FOCUS");
		this.content.appendChild(this.headerElement);
		this.content.insertAdjacentHTML('beforeend', `<div class="flex flex-col items-center justify-center mb-2 font-body text-xs text-accent-2" data-l10n-id="LOC_UI_TOWN_FOCUS_CTA"></div>`);
		const scrollable = document.createElement('fxs-scrollable');
		scrollable.classList.add('flex-auto', 'px-3\\.5', 'mr-1');
		this.focusItemListElement.setAttribute('data-navrule-up', 'stop');
		this.focusItemListElement.setAttribute('data-navrule-down', 'stop');
		this.focusItemListElement.setAttribute('data-navrule-left', 'stop');
		this.focusItemListElement.setAttribute('data-navrule-right', 'stop');
		scrollable.appendChild(this.focusItemListElement);
		this.content.appendChild(scrollable);
	}

}

declare global {
	interface WindowEventMap {
		'panel-town-focus-refresh': TownFocusRefreshEvent;
	}
}

Controls.define("panel-town-focus", {
	createInstance: PanelTownFocus,
	tabIndex: -1
});