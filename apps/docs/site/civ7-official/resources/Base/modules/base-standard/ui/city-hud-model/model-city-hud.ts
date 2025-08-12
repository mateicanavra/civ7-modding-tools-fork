/**
 * @file model-city-hud.ts
 * @copyright 2020-2021, Firaxis Games
 * @description The HUD when viewing a city.
 */

import '/base-standard/ui/city-trade/model-city-trade.js';

class CityHUDModel {
	private static _Instance: CityHUDModel;
	private _OnUpdate?: (model: CityHUDModel) => void;
	private citySelectionChangedListener = (data: CitySelectionChangedData) => { this.onCitySelectionChanged(data) }

	private SelectedCityID: ComponentID | null = null;

	private constructor() {

		engine.whenReady.then(() => {
			engine.on('CitySelectionChanged', this.citySelectionChangedListener);
		});
	}

	/**
	 * Singleton accessor 
	 */
	static getInstance() {

		if (!CityHUDModel._Instance) {
			CityHUDModel._Instance = new CityHUDModel();
		}
		return CityHUDModel._Instance;
	}

	set updateCallback(callback: (model: CityHUDModel) => void) {
		this._OnUpdate = callback;
	}

	update() {
		this.SelectedCityID = UI.Player.getHeadSelectedCity();

		if (this._OnUpdate) {
			this._OnUpdate(this);
		}
	}

	private onCitySelectionChanged(data: CitySelectionChangedData) {
		if (data.selected && this.SelectedCityID && data.cityID.id == this.SelectedCityID.id) {
			return;
		}
		this.update();
	}
}

const CityHUD = CityHUDModel.getInstance();
export { CityHUD as default }

engine.whenReady.then(() => {
	const updateModel = () => {
		engine.updateWholeModel(CityHUD);
	}

	engine.createJSModel('g_CityHUD', CityHUD);
	CityHUD.updateCallback = updateModel;

});