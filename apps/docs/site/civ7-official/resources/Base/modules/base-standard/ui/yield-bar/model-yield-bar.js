/**
 * model-yield-bar.ts
 * @copyright 2025, Firaxis Games
 * @description Model for yield bar data
 */
import UpdateGate from '/core/ui/utilities/utilities-update-gate.js';
class YieldBarModel {
    constructor() {
        this.cityYields = [];
        this.yieldBarUpdateEvent = new LiteEvent();
        this.updateGate = new UpdateGate(() => {
            const cityID = UI.Player.getHeadSelectedCity();
            if (!cityID) {
                // No city selected
                return;
            }
            const city = Cities.get(cityID);
            const cityYields = city?.Yields; // ...but I actually want to get details on the current city only. 
            if (!cityYields) {
                console.error("model-yield-bar: Failed to find city yields!");
                return;
            }
            this.cityYields = [];
            const yields = cityYields.getYields();
            if (yields) {
                for (const [index, y] of yields.entries()) {
                    const yieldDefinition = GameInfo.Yields[index];
                    if (yieldDefinition) {
                        this.cityYields.push({ type: yieldDefinition.YieldType, value: y.value });
                    }
                }
            }
            if (this.onUpdate) {
                this.onUpdate(this);
            }
            this.yieldBarUpdateEvent.trigger();
        });
        this.updateGate.call('constructor');
        engine.on('CitySelectionChanged', this.onCitySelectionChanged, this);
    }
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    onCitySelectionChanged(event) {
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
    };
    engine.createJSModel('g_YieldBar', YieldBar);
    YieldBar.updateCallback = updateModel;
});
export { YieldBar as default };

//# sourceMappingURL=file:///base-standard/ui/yield-bar/model-yield-bar.js.map
