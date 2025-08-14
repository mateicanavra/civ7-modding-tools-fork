// @copyright 2020-2022, Firaxis Games
class CityInspector {
    constructor() {
        this._targetCityID = null;
        this.cityName = "";
        this.currentProduction = "";
        this.currentProductionDescription = "";
        this.currentProductionTurns = "";
        this.currentProductionTurnsLabel = "";
        this.currentProductionPrompt = "";
        this.turnsUntilGrowth = "";
        this.turnsUntilGrowthLabel = "";
        this.yields = [];
        this.stats = [];
        engine.whenReady.then(() => {
            const playerTurnOrCitySelectionOrTileOwnershipListener = () => {
                this.update();
            };
            engine.on('PlayerTurnActivated', playerTurnOrCitySelectionOrTileOwnershipListener);
            engine.on('CitySelectionChanged', playerTurnOrCitySelectionOrTileOwnershipListener);
            engine.on('CityTileOwnershipChanged', playerTurnOrCitySelectionOrTileOwnershipListener);
            engine.on('CityProductionChanged', (data) => {
                if (data.cityID.owner == GameContext.localPlayerID) {
                    this.update(); // Should just set a 'dirty'
                }
            });
            engine.on('CityYieldChanged', (data) => {
                if (data.cityID.owner == GameContext.localPlayerID) {
                    this.update(); // Should just set a 'dirty'
                }
            });
            engine.on('CityProductionUpdated', (data) => {
                if (data.cityID.owner == GameContext.localPlayerID) {
                    this.update(); // Should just set a 'dirty'
                }
            });
            engine.on('CityProductionCompleted', (data) => {
                if (data.cityID.owner == GameContext.localPlayerID) {
                    this.update(); // Should just set a 'dirty'
                }
            });
            //TODO: need to check after more events that could change city info
            this.update();
        });
    }
    set updateCallback(callback) {
        this._OnUpdate = callback;
    }
    update() {
        if (!this._targetCityID)
            return;
        const cityInfo = Cities.get(this._targetCityID);
        this.stats = [];
        if (cityInfo) {
            this.cityName = Locale.compose(cityInfo.name);
            const queue = cityInfo.BuildQueue;
            if (queue == undefined) {
                this.currentProduction = Locale.compose("LOC_UI_CITY_INSPECTOR_EMPTY_BUILD_QUEUE");
                this.currentProductionTurnsLabel = "";
                this.currentProductionPrompt = "";
            }
            else {
                const productionType = queue.currentProductionTypeHash;
                //TODO: remove? much spam: console.log(`Producing - ${productionType}`);
                if (productionType != 0 && productionType != -1) {
                    this.currentProductionTurns = "##";
                    const constructible = GameInfo.Constructibles.lookup(productionType);
                    if (constructible) {
                        this.currentProductionPrompt = Locale.compose("LOC_UI_CITY_STATUS_CURRENTLY_BUILDING");
                        this.currentProduction = Locale.compose(constructible.Name);
                        this.currentProductionTurns = queue.getTurnsLeft(productionType).toString();
                    }
                    const unit = GameInfo.Units.lookup(productionType);
                    if (unit) {
                        this.currentProductionPrompt = Locale.compose("LOC_UI_CITY_STATUS_CURRENTLY_TRAINING");
                        this.currentProduction = Locale.compose(unit.Name);
                        this.currentProductionTurns = queue.getTurnsLeft(productionType).toString();
                    }
                }
                else {
                    this.currentProductionPrompt = Locale.compose("LOC_UI_CITY_STATUS_CURRENTLY_PRODUCING");
                    this.currentProduction = Locale.compose("LOC_UI_CITY_STATUS_CURRENTLY_PRODUCING_NOTHING");
                    this.currentProductionTurns = Locale.compose("LOC_UI_CITY_STATUS_NOT_APPLICABLE");
                }
                this.currentProductionTurnsLabel = Locale.compose("LOC_UI_CITY_STATUS_TURNS");
                this.currentProductionDescription = '';
                this.stats.push({
                    label: Locale.compose("LOC_UI_CITY_STATUS_URBAN_POPULATION"),
                    value: cityInfo.urbanPopulation
                });
                this.stats.push({
                    label: Locale.compose('LOC_UI_CITY_STATUS_RURAL_POPULATION'),
                    value: cityInfo.ruralPopulation
                });
                if (cityInfo.Yields) {
                    this.stats.push({
                        label: Locale.compose('LOC_UI_CITY_STATUS_HAPPINESS_PER_TURN'),
                        value: cityInfo.Yields.getNetYield(YieldTypes.YIELD_HAPPINESS),
                    });
                    this.stats.push({
                        label: Locale.compose('LOC_UI_CITY_STATUS_PRODUCTION_PER_TURN'),
                        value: cityInfo.Yields.getYield(YieldTypes.YIELD_PRODUCTION),
                    });
                    this.stats.push({
                        label: Locale.compose('LOC_UI_CITY_STATUS_FOOD_SURPLUS_PER_TURN'),
                        value: cityInfo.Yields.getNetYield(YieldTypes.YIELD_FOOD),
                    });
                }
                if (cityInfo.Growth) {
                    // >>> Civilian
                    let queueFrontNode = cityInfo.FoodQueue.front();
                    if (queueFrontNode) {
                        let queueFrontUnitInfo = null;
                        queueFrontUnitInfo = GameInfo.Units.lookup(queueFrontNode.type);
                        if (queueFrontUnitInfo) {
                            this.stats.push({
                                label: Locale.compose('LOC_UI_CITY_STATUS_TRAINING', queueFrontUnitInfo.Name),
                                value: cityInfo.FoodQueue.currentTurnsLeft,
                            });
                        }
                    }
                    // >>> Growth/Starvation
                    else {
                        this.stats.push({
                            label: Locale.compose('LOC_UI_CITY_STATUS_CURRENT_FOOD_STOCKPILE'),
                            value: cityInfo.Growth.currentFood,
                        });
                        this.stats.push({
                            label: Locale.compose('LOC_UI_CITY_STATUS_NEXT_GROWTH_FOOD_THRESHOLD'),
                            value: cityInfo.Growth.getNextGrowthFoodThreshold().value,
                        });
                        if (cityInfo.Growth.turnsUntilStarvation > 0) {
                            this.stats.push({
                                label: Locale.compose('LOC_UI_CITY_STATUS_TURNS_UNTIL_STARVATION', cityInfo.Growth.turnsUntilStarvation),
                                value: cityInfo.Growth.turnsUntilStarvation,
                            });
                        }
                        else if (cityInfo.Growth.turnsUntilGrowth > 0) {
                            this.stats.push({
                                label: Locale.compose("LOC_UI_CITY_STATUS_TURNS_UNTIL_GROWTH", cityInfo.Growth.turnsUntilGrowth),
                                value: cityInfo.Growth.turnsUntilGrowth,
                            });
                        }
                        else {
                            this.stats.push({
                                label: Locale.compose('LOC_UI_CITY_STATUS_STAGNANT_GROWTH'),
                                value: "",
                            });
                        }
                    }
                }
            }
        }
        if (this._OnUpdate) {
            this._OnUpdate(this);
        }
    }
    set targetCityID(target) {
        this._targetCityID = target;
        this.update();
        if (this._OnUpdate) {
            this._OnUpdate(this);
        }
    }
    getCurrentProductionName() {
        return this.currentProduction;
    }
}
const CityInspectorModel = new CityInspector();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(CityInspectorModel);
    };
    engine.on('PlayerTurnActivated', () => {
        CityInspectorModel.update();
    });
    engine.createJSModel('g_CityInspector', CityInspectorModel);
    CityInspectorModel.updateCallback = updateModel;
});
export { CityInspectorModel as default };

//# sourceMappingURL=file:///base-standard/ui/unit-city-list/model-city-inspector.js.map
