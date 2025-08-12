/**
 * model-yield-bar.ts
 * @copyright 2025, Firaxis Games
 * @description Model for yield bar data
 */

import UpdateGate from '/core/ui/utilities/utilities-update-gate.js'

class YieldBarModel {

	cityYields: { type: string, value: number }[] = [];

	yieldBarUpdateEvent: LiteEvent<void> = new LiteEvent();

	constructor() {
		this.updateGate.call('constructor');

		engine.on('CitySelectionChanged', this.onCitySelectionChanged, this);
	}

	private onUpdate?: (model: YieldBarModel) => void;

	set updateCallback(callback: (model: YieldBarModel) => void) {
		this.onUpdate = callback;
	}

	private updateGate = new UpdateGate(() => {
		const cityID = UI.Player.getHeadSelectedCity();
		if (!cityID) {
			// No city selected
			return;
		}

		const city: City | null = Cities.get(cityID);
		const cityYields: CityYields | undefined = city?.Yields; // ...but I actually want to get details on the current city only. 

		if (!cityYields) {
			console.error("model-yield-bar: Failed to find city yields!");
			return;
		}

		this.cityYields = [];
		const yields: GameAttribute[] | null = cityYields.getYields();
		if (yields) {
			for (const [index, y] of yields.entries()) {
				const yieldDefinition: YieldDefinition | null = GameInfo.Yields[index];
				if (yieldDefinition) {
					this.cityYields.push({ type: yieldDefinition.YieldType, value: y.value })
				}
			}
		}


		if (this.onUpdate) {
			this.onUpdate(this);
		}

		this.yieldBarUpdateEvent.trigger();
	});

	private onCitySelectionChanged(event: CitySelectionChanged_EventData) {
		if (!event.selected) {
			// Ignore unselected events
			return;
		}

		const city = Cities.get(event.cityID);
		if (!city) {
			console.error(`model-yield-bar: Failed to find city despite 'selected' being true!`);
			return;
		}

		if (city.owner != GameContext.localPlayerID) {
			// Ignore other player city selection
			return;
		}

		this.updateGate.call('onCitySelectionChanged');
	}

}

const YieldBar = new YieldBarModel();
engine.whenReady.then(() => {

	const updateModel = () => {
		engine.updateWholeModel(YieldBar);
	}

	engine.createJSModel('g_YieldBar', YieldBar);
	YieldBar.updateCallback = updateModel;
});

export { YieldBar as default };