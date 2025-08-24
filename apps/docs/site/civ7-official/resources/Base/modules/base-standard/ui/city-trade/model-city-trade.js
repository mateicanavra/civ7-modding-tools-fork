class CityTradeModel {
    constructor() {
        this._cityID = null;
        this._resourceYields = null;
        this._tradeYields = null;
        this._allYields = [];
        this._numLocalResources = 0;
        const citySelectionOrTradeRouteUpdatesListener = () => {
            this.update();
        };
        engine.on('CitySelectionChanged', citySelectionOrTradeRouteUpdatesListener);
        engine.on('TradeRouteAddedToMap', citySelectionOrTradeRouteUpdatesListener);
        engine.on('TradeRouteRemovedFromMap', citySelectionOrTradeRouteUpdatesListener);
        engine.on('TradeRouteChanged', citySelectionOrTradeRouteUpdatesListener);
        this.update();
    }
    set cityID(id) {
        this._cityID = id;
        this.update();
    }
    get hasValidCity() {
        return this._cityID != null;
    }
    get cityID() {
        return this._cityID;
    }
    get yields() {
        return this._allYields;
    }
    get tradeYields() {
        return this._tradeYields;
    }
    get resourceYields() {
        return this._resourceYields;
    }
    get numLocalResources() {
        return this._numLocalResources;
    }
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    update() {
        this._cityID = null;
        this._tradeYields = [];
        this._resourceYields = [];
        this._allYields = [];
        let localPlayer = GameContext.localPlayerID;
        let city = null;
        let selectedCityID = UI.Player.getHeadSelectedCity();
        if (selectedCityID) {
            city = Cities.get(selectedCityID);
            if (!city || city.owner != localPlayer) {
                selectedCityID = null;
            }
        }
        this._cityID = selectedCityID;
        if (city) {
            if (city.Yields) {
                this._tradeYields = city.Yields.getTradeYields();
                this._resourceYields = city.Yields.getResourceYields();
                if (this._tradeYields != null && this._resourceYields != null) {
                    // Init aggregate yield objects
                    for (let i = 0; i < GameInfo.Yields.length; i++) {
                        this._allYields[i] = {
                            yieldType: GameInfo.Yields[i].YieldType,
                            value: 0,
                            memberAttributes: [],
                        };
                    }
                    // Aggregate resource and trade yield GameAttributes
                    this.aggregateYieldAttributes(this._resourceYields, this._allYields);
                    this.aggregateYieldAttributes(this._tradeYields, this._allYields);
                }
            }
            if (city.Resources) {
                this._numLocalResources = city.Resources.getLocalResources().length;
            }
        }
        if (this.onUpdate) {
            this.onUpdate(this);
        }
    }
    aggregateYieldAttributes(yieldAttributes, yieldDataRef) {
        for (let i = 0; i < yieldAttributes.length; i++) {
            yieldDataRef[i].memberAttributes.push(yieldAttributes[i]);
            yieldDataRef[i].value += yieldAttributes[i].value;
        }
    }
}
const CityTradeData = new CityTradeModel();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(CityTradeData);
    };
    engine.createJSModel('g_CityTrade', CityTradeData);
    CityTradeData.updateCallback = updateModel;
});
export { CityTradeData as default };

//# sourceMappingURL=file:///base-standard/ui/city-trade/model-city-trade.js.map
