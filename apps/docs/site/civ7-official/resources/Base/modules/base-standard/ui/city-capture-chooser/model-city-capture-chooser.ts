/**
 * @file model-city-capture.ts
 * @copyright 2024, Firaxis Games
 * @description Data model for city capture panel
 */

import UpdateGate from '/core/ui/utilities/utilities-update-gate.js'
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';

enum DirectiveTypes {
	LIBERATE_FOUNDER = 0,
	LIBERATE_PREVIOUS_OWNER,
	KEEP,
	RAZE,
}

class CityCaptureChooserModel {
	private _cityID: ComponentID | null = null;
	private _OnUpdate?: (model: CityCaptureChooserModel) => void;

	private _isJustConqueredFrom: boolean = false;
	private _isBeingRazed: boolean = false;
	private _numWonders: number = 0;

	constructor() {
		engine.whenReady.then(() => {

			engine.on('CitySelectionChanged', () => {
				// Only assign selected city if it's 'our' city and not a town.
				const localPlayer: PlayerId = GameContext.localPlayerID;
				let selectedCityID: ComponentID | null = UI.Player.getHeadSelectedCity();
				if (selectedCityID) {
					const c: City | null = Cities.get(selectedCityID);
					if (!c || c.owner != localPlayer) {
						selectedCityID = null;
					}
					else if (c) {
						this._isJustConqueredFrom = c.isJustConqueredFrom;
						this._isBeingRazed = c.isBeingRazed;
						if (c.Constructibles) {
							this._numWonders = c.Constructibles.getNumWonders();
						}

					}
				}

				this.cityID = selectedCityID;
			});

			this.updateGate.call('init');
		});
	}

	set updateCallback(callback: (model: CityCaptureChooserModel) => void) {
		this._OnUpdate = callback;
	}

	updateGate = new UpdateGate(() => {
		const player: PlayerLibrary | null = Players.get(GameContext.localPlayerID);
		const cityID: ComponentID | null = this.cityID;
		if (player && cityID && !ComponentID.isInvalid(cityID)) {
			const city: City | null = Cities.get(cityID);
			if (!city) {
				console.error("model-city-capture: updateGate - no city found for cityID " + cityID);
				return;
			}
			this._isJustConqueredFrom = city.isJustConqueredFrom;
			this._isBeingRazed = city.isBeingRazed;
			if (!city.Constructibles) {
				console.error("model-city-capture: updateGate - no city constructibles found for cityID " + cityID);
				return;
			}
			this._numWonders = city.Constructibles.getNumWonders();
		}

		if (this._OnUpdate) {
			this._OnUpdate(this);
		}
	});

	set cityID(id: ComponentID | null) {
		this._cityID = id;
		if (id != null) {
			this.updateGate.call('cityID');
		}
	}

	get cityID(): ComponentID | null {
		return this._cityID;
	}

	get canDisplayPanel(): boolean {
		return this._isJustConqueredFrom;
	}

	get isBeingRazed(): boolean {
		return this._isBeingRazed;
	}

	get isNotBeingRazed(): boolean {
		return !(this._isBeingRazed);
	}

	get containsWonder(): boolean {
		return this._numWonders > 0;
	}

	get numWonders(): number {
		return this._numWonders;
	}

	sendLiberateFounderRequest() {
		this.sendChoiceRequest(DirectiveTypes.LIBERATE_FOUNDER);
	}

	sendKeepRequest() {
		this.sendChoiceRequest(DirectiveTypes.KEEP);
	}

	sendRazeRequest() {
		this.sendChoiceRequest(DirectiveTypes.RAZE);
	}

	private sendChoiceRequest(choice: DirectiveTypes) {
		const args = { Directive: choice };
		if (this._cityID) {
			const result = Game.CityCommands.canStart(this._cityID, CityCommandTypes.DESTROY, args, false);
			if (result.Success) {
				Game.CityCommands.sendRequest(this._cityID, CityCommandTypes.DESTROY, args);
			}
			else {
				console.error("model-city-capture: sendChoiceRequest() - failed to start DESTROY operation");
			}
		}
	}

	getKeepCanStartResult(): OperationResult | undefined {
		const args = { Directive: DirectiveTypes.KEEP };
		if (this._cityID) {
			const result = Game.CityCommands.canStart(this._cityID, CityCommandTypes.DESTROY, args, false);
			return result;
		}
		return undefined;
	}

	getRazeCanStartResult(): OperationResult | undefined {
		const args = { Directive: DirectiveTypes.RAZE };
		if (this._cityID) {
			const result = Game.CityCommands.canStart(this._cityID, CityCommandTypes.DESTROY, args, false);
			return result;
		}
		return undefined;
	}
}

const CityCaptureChooser: CityCaptureChooserModel = new CityCaptureChooserModel();
engine.whenReady.then(() => {

	const updateModel = () => {
		engine.updateWholeModel(CityCaptureChooser);
	}

	engine.createJSModel('g_CityCaptureChooser', CityCaptureChooser);
	CityCaptureChooser.updateCallback = updateModel;
});

export { CityCaptureChooser as default };
