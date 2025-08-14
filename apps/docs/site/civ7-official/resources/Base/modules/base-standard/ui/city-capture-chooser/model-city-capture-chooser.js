/**
 * @file model-city-capture.ts
 * @copyright 2024, Firaxis Games
 * @description Data model for city capture panel
 */
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
var DirectiveTypes;
(function (DirectiveTypes) {
    DirectiveTypes[DirectiveTypes["LIBERATE_FOUNDER"] = 0] = "LIBERATE_FOUNDER";
    DirectiveTypes[DirectiveTypes["LIBERATE_PREVIOUS_OWNER"] = 1] = "LIBERATE_PREVIOUS_OWNER";
    DirectiveTypes[DirectiveTypes["KEEP"] = 2] = "KEEP";
    DirectiveTypes[DirectiveTypes["RAZE"] = 3] = "RAZE";
})(DirectiveTypes || (DirectiveTypes = {}));
class CityCaptureChooserModel {
    constructor() {
        this._cityID = null;
        this._isJustConqueredFrom = false;
        this._isBeingRazed = false;
        this._numWonders = 0;
        this.updateGate = new UpdateGate(() => {
            const player = Players.get(GameContext.localPlayerID);
            const cityID = this.cityID;
            if (player && cityID && !ComponentID.isInvalid(cityID)) {
                const city = Cities.get(cityID);
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
        engine.whenReady.then(() => {
            engine.on('CitySelectionChanged', () => {
                // Only assign selected city if it's 'our' city and not a town.
                const localPlayer = GameContext.localPlayerID;
                let selectedCityID = UI.Player.getHeadSelectedCity();
                if (selectedCityID) {
                    const c = Cities.get(selectedCityID);
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
    set updateCallback(callback) {
        this._OnUpdate = callback;
    }
    set cityID(id) {
        this._cityID = id;
        if (id != null) {
            this.updateGate.call('cityID');
        }
    }
    get cityID() {
        return this._cityID;
    }
    get canDisplayPanel() {
        return this._isJustConqueredFrom;
    }
    get isBeingRazed() {
        return this._isBeingRazed;
    }
    get isNotBeingRazed() {
        return !(this._isBeingRazed);
    }
    get containsWonder() {
        return this._numWonders > 0;
    }
    get numWonders() {
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
    sendChoiceRequest(choice) {
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
    getKeepCanStartResult() {
        const args = { Directive: DirectiveTypes.KEEP };
        if (this._cityID) {
            const result = Game.CityCommands.canStart(this._cityID, CityCommandTypes.DESTROY, args, false);
            return result;
        }
        return undefined;
    }
    getRazeCanStartResult() {
        const args = { Directive: DirectiveTypes.RAZE };
        if (this._cityID) {
            const result = Game.CityCommands.canStart(this._cityID, CityCommandTypes.DESTROY, args, false);
            return result;
        }
        return undefined;
    }
}
const CityCaptureChooser = new CityCaptureChooserModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(CityCaptureChooser);
    };
    engine.createJSModel('g_CityCaptureChooser', CityCaptureChooser);
    CityCaptureChooser.updateCallback = updateModel;
});
export { CityCaptureChooser as default };

//# sourceMappingURL=file:///base-standard/ui/city-capture-chooser/model-city-capture-chooser.js.map
