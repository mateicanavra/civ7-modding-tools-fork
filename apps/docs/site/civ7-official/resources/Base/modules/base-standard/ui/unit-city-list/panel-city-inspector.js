/**
 * @file panel-city-inspector.ts
 * @copyright 2021, Firaxis Games
 * @description Information about a city
 */
import CityInspectorModel from '/base-standard/ui/unit-city-list/model-city-inspector.js';
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
import { databindRetrieveComponentIDSerial } from '/core/ui/utilities/utilities-databinding.js';
import Panel from '/core/ui/panel-support.js';
/**
 * Area for expanded city information.
 */
class PanelCityInspector extends Panel {
    constructor(root) {
        super(root);
        this.animateInType = this.animateOutType = 5 /* AnchorType.RelativeToLeft */;
    }
    onAttach() {
        super.onAttach();
        this.refreshCityID();
    }
    onAttributeChanged(name, _oldValue, _newValue) {
        if (name == "componentid") {
            this.refreshCityID();
        }
    }
    refreshCityID() {
        const targetHash = databindRetrieveComponentIDSerial(this.Root);
        const targetID = ComponentID.fromString(targetHash);
        if (targetHash != "" && !ComponentID.isInvalid(targetID)) {
            CityInspectorModel.targetCityID = targetID;
        }
        else {
            // Only assign selected city if it's 'our' city and not a town.
            let localPlayer = GameContext.localPlayerID;
            let selectedCityID = UI.Player.getHeadSelectedCity();
            if (selectedCityID) {
                const c = Cities.get(selectedCityID);
                if (c && !c.isTown && c.owner == localPlayer) {
                    CityInspectorModel.targetCityID = selectedCityID;
                }
            }
        }
    }
}
Controls.define('panel-city-inspector', {
    createInstance: PanelCityInspector,
    description: 'Area for expanded city information.',
    classNames: ['panel-city-inspector', 'city-inspector'],
    styles: ['fs://game/base-standard/ui/unit-city-list/panel-city-inspector.css'],
    content: ['fs://game/base-standard/ui/unit-city-list/panel-city-inspector.html'],
    attributes: [
        {
            name: 'componentid',
            required: true
        }
    ]
});

//# sourceMappingURL=file:///base-standard/ui/unit-city-list/panel-city-inspector.js.map
