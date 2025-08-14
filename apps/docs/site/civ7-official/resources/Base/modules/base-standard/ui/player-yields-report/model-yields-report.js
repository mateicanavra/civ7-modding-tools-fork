/**
 * @file player-yields-report-screen.ts
 * @copyright 2024, Firaxis Games
 * @description Model containing data for panel-yields-report-screen
 */
class ModelYieldsReport {
    constructor() {
        this._yieldTotalRows = [];
        this._yieldCityRows = [];
        this._yieldUnitRows = [];
        this._yieldSummaryRows = [];
        this._yieldOtherRows = [];
        this.totalYield = this.createBlankMap();
        this.totalYieldCity = this.createBlankMap();
        this._netGoldFromUnits = 0;
        this._curGoldBalance = 0;
        this._curInfluenceBalance = 0;
        this.getYieldMap = (api) => {
            return {
                [YieldTypes.YIELD_GOLD]: api.getNetYield(YieldTypes.YIELD_GOLD),
                [YieldTypes.YIELD_SCIENCE]: api.getNetYield(YieldTypes.YIELD_SCIENCE),
                [YieldTypes.YIELD_DIPLOMACY]: api.getNetYield(YieldTypes.YIELD_DIPLOMACY),
                [YieldTypes.YIELD_PRODUCTION]: api.getNetYield(YieldTypes.YIELD_PRODUCTION),
                [YieldTypes.YIELD_HAPPINESS]: api.getNetYield(YieldTypes.YIELD_HAPPINESS),
                [YieldTypes.YIELD_FOOD]: api.getNetYield(YieldTypes.YIELD_FOOD),
                [YieldTypes.YIELD_CULTURE]: api.getNetYield(YieldTypes.YIELD_CULTURE),
            };
        };
    }
    set updateCallback(callback) {
        this.onUpdate = callback;
    }
    update() {
        this.constructTotalData();
        this.constructCityData();
        this.constructUnitData();
        //call constructOtherData() after the prior functions so we can calc its values
        this.constructOtherData();
        this.constructYieldSummary();
        this.onUpdate?.(this);
    }
    constructTotalData() {
        const player = Players.get(GameContext.localObserverID);
        const playerStats = player?.Stats;
        if (!playerStats) {
            console.error("model-yield-report.ts: constructTotalData - Could not get local player stats!");
            return;
        }
        this._yieldTotalRows = [];
        this.totalYield = this.getYieldMap(playerStats);
        const totalIncomeYieldRow = {
            isTitle: true,
            rowLabel: "LOC_GLOBAL_YIELDS_SUMMARY_TOTAL_INCOME_PER_TURN",
            yieldNumbers: this.totalYield
        };
        this._yieldTotalRows.push(totalIncomeYieldRow);
    }
    constructCityData() {
        const player = Players.get(GameContext.localObserverID);
        const playerCities = player?.Cities;
        if (!playerCities) {
            console.error("model-yield-report.ts: constructCityData - Could not get local player cities!");
            return;
        }
        this._yieldCityRows = [];
        let totalYieldNumbers = this.createBlankMap();
        for (const city of playerCities.getCities()) {
            const cityYields = city.Yields;
            if (!cityYields) {
                console.error(`model-yield-report.ts: constructCityData - No city yields for city ${city.id}`);
                return;
            }
            const cityWorkers = city.Workers;
            if (!cityWorkers) {
                console.error(`model-yield-report.ts: constructCityData - No city workers for city ${city.id}`);
                return;
            }
            const cityConstructibles = city.Constructibles;
            if (!cityConstructibles) {
                console.error(`model-yield-report.ts: constructCityData - No city constructibles for city ${city.id}`);
                return;
            }
            const cityYieldNumbers = this.getYieldMap(cityYields);
            const cityNetYields = {
                isTitle: false,
                rowLabel: city.name,
                rowIcon: "CHAT_BUILDINGS",
                yieldNumbers: cityYieldNumbers
            };
            const cityCenterYields = {
                isTitle: false,
                rowLabel: "LOC_DISTRICT_CITY_CENTER_NAME",
                rowIcon: "CITY_CENTERPIN",
                rowLabelTabbed: true,
                yieldNumbers: this.getCityCenterYields(city)
            };
            const cityUrbanYields = {
                isTitle: false,
                rowLabel: "LOC_GLOBAL_YIELDS_URBAN_DISTRICTS",
                rowIcon: "CITY_URBAN",
                rowLabelTabbed: true,
                yieldNumbers: this.getCityDistrictTypeYields(city, DistrictTypes.URBAN)
            };
            const cityRuralYields = {
                isTitle: false,
                rowLabel: "LOC_GLOBAL_YIELDS_RURAL_DISTRICTS",
                rowIcon: "CITY_RURAL",
                rowLabelTabbed: true,
                yieldNumbers: this.getCityDistrictTypeYields(city, DistrictTypes.RURAL)
            };
            const specialistYieldMap = this.createBlankMap();
            const allWorkerPlacementInfo = cityWorkers.GetAllPlacementInfo();
            for (const workerPlacementInfo of allWorkerPlacementInfo) {
                for (let i = 0; i < workerPlacementInfo.CurrentMaintenance.length; i++) {
                    specialistYieldMap[Game.getHash(GameInfo.Yields[i].YieldType)] -= workerPlacementInfo.CurrentMaintenance[i];
                }
                for (let i = 0; i < workerPlacementInfo.CurrentYields.length; i++) {
                    specialistYieldMap[Game.getHash(GameInfo.Yields[i].YieldType)] += workerPlacementInfo.CurrentYields[i];
                }
            }
            const citySpecialistYields = {
                isTitle: false,
                rowLabel: "LOC_UI_FOOD_CHOOSER_SPECIALISTS",
                rowIcon: "CITY_SPECIAL_BASE",
                rowLabelTabbed: true,
                yieldNumbers: specialistYieldMap
            };
            const buildingMaintenanceMap = {};
            for (const constructibleId of cityConstructibles.getIds()) {
                const constructible = Constructibles.getByComponentID(constructibleId);
                if (!constructible) {
                    console.error(`model-yield-report.ts: constructCityData - No constructible found for id ${constructibleId}`);
                    continue;
                }
                const maintenances = cityConstructibles.getMaintenance(constructible.type);
                for (const maintenanceIndex in maintenances) {
                    const maintenanceValue = maintenances[maintenanceIndex];
                    if (maintenanceValue == 0) {
                        continue;
                    }
                    const yieldDefinition = GameInfo.Yields[maintenanceIndex];
                    const existingValue = buildingMaintenanceMap[yieldDefinition.YieldType];
                    if (existingValue) {
                        const newValue = existingValue - maintenanceValue;
                        buildingMaintenanceMap[yieldDefinition.$hash] = newValue;
                    }
                    else {
                        buildingMaintenanceMap[yieldDefinition.$hash] = -maintenanceValue;
                    }
                }
            }
            const cityBuildingMaintenanceYields = {
                isTitle: false,
                rowLabel: "LOC_ATTR_BUILDING_MAINT",
                rowIcon: "CITY_BUILDING_LIST",
                rowLabelTabbed: true,
                yieldNumbers: buildingMaintenanceMap
            };
            totalYieldNumbers = this.addYieldNumbers(totalYieldNumbers, cityNetYields.yieldNumbers);
            this._yieldCityRows.push(cityNetYields);
            this._yieldCityRows.push(cityCenterYields);
            this._yieldCityRows.push(cityUrbanYields);
            this._yieldCityRows.push(cityRuralYields);
            this._yieldCityRows.push(citySpecialistYields);
            this._yieldCityRows.push(cityBuildingMaintenanceYields);
        }
        this.totalYieldCity = totalYieldNumbers;
        const totalCityYields = {
            isTitle: true,
            rowLabel: "LOC_GLOBAL_YIELDS_TOTAL_FROM_CITIES",
            yieldNumbers: totalYieldNumbers
        };
        this._yieldCityRows.unshift(totalCityYields);
    }
    getCityCenterYields(city) {
        const cityDistricts = city.Districts;
        if (!cityDistricts) {
            console.error(`model-yield-report.ts: getCityCenterYields - No city districts for city ${city.id}`);
            return this.createBlankMap();
        }
        ;
        return this.getDistrictYields(cityDistricts.cityCenter, city.owner);
    }
    getCityDistrictTypeYields(city, districtType) {
        let totalNumbers = this.createBlankMap();
        const cityDistricts = city.Districts;
        if (!cityDistricts) {
            console.error(`model-yield-report.ts: getCityDistrictTypeYields - No city districts for city ${city.id}`);
            return totalNumbers;
        }
        ;
        const cityUrbanIDs = cityDistricts.getIdsOfType(districtType);
        for (const urbanID of cityUrbanIDs) {
            totalNumbers = this.addYieldNumbers(totalNumbers, this.getDistrictYields(urbanID, city.owner));
        }
        return totalNumbers;
    }
    getDistrictYields(districtID, owner) {
        const cityDistrict = Districts.get(districtID);
        if (!cityDistrict) {
            console.error(`model-yield-report.ts: getDistrictYields - No district found for componentID ${districtID}`);
            return this.createBlankMap();
        }
        const districtYields = GameplayMap.getYields(GameplayMap.getIndexFromLocation(cityDistrict.location), owner);
        const districtYieldsMap = {
            [YieldTypes.YIELD_GOLD]: districtYields.find((element) => element[0] == Database.makeHash("YIELD_GOLD"))?.[1] ?? 0,
            [YieldTypes.YIELD_SCIENCE]: districtYields.find((element) => element[0] == Database.makeHash("YIELD_SCIENCE"))?.[1] ?? 0,
            [YieldTypes.YIELD_DIPLOMACY]: districtYields.find((element) => element[0] == Database.makeHash("YIELD_DIPLOMACY"))?.[1] ?? 0,
            [YieldTypes.YIELD_PRODUCTION]: districtYields.find((element) => element[0] == Database.makeHash("YIELD_PRODUCTION"))?.[1] ?? 0,
            [YieldTypes.YIELD_HAPPINESS]: districtYields.find((element) => element[0] == Database.makeHash("YIELD_HAPPINESS"))?.[1] ?? 0,
            [YieldTypes.YIELD_FOOD]: districtYields.find((element) => element[0] == Database.makeHash("YIELD_FOOD"))?.[1] ?? 0,
            [YieldTypes.YIELD_CULTURE]: districtYields.find((element) => element[0] == Database.makeHash("YIELD_CULTURE"))?.[1] ?? 0,
        };
        return districtYieldsMap;
    }
    constructUnitData() {
        this._yieldUnitRows = [];
        const player = Players.get(GameContext.localObserverID);
        const playerUnits = player?.Units;
        if (!playerUnits) {
            console.error("model-yield-report.ts: constructUnitData - Could not get local player units!");
            return;
        }
        const playerStats = player?.Stats;
        if (!playerStats) {
            console.error("model-yield-report.ts: constructUnitData - Could not get local player stats!");
            return;
        }
        const playerTreasury = player?.Treasury;
        if (!playerTreasury) {
            console.error("model-yield-report.ts: constructUnitData - Could not get local player treasury!");
            return;
        }
        const unitsTypesParsed = [];
        let goldTotal = 0;
        for (const unit of playerUnits.getUnits()) {
            if (!unitsTypesParsed.includes(unit.type)) {
                const numUnitsOfType = playerUnits.getNumUnitsOfType(unit.type);
                const unitCost = playerTreasury.getMaintenanceForAllUnitsOfType(unit.type) * -1;
                goldTotal += unitCost;
                const unitRowMap = {
                    [YieldTypes.YIELD_GOLD]: unitCost,
                    [YieldTypes.NO_YIELD]: numUnitsOfType,
                };
                const unitDefinition = GameInfo.Units.lookup(unit.type);
                if (!unitDefinition) {
                    console.error(`model-yield-report.ts: constructUnitData - Could not unit definition for unit type ${unit.type}!`);
                    return;
                }
                const unitYieldRow = {
                    rowLabel: unit.name,
                    rowIcon: unitDefinition.UnitType,
                    isTitle: false,
                    rowLabelTabbed: true,
                    yieldNumbers: unitRowMap
                };
                this._yieldUnitRows.push(unitYieldRow);
                unitsTypesParsed.push(unit.type);
            }
        }
        this._netGoldFromUnits = goldTotal;
    }
    constructYieldSummary() {
        const player = Players.get(GameContext.localObserverID);
        const playerStats = player?.Stats;
        if (!playerStats) {
            console.error("model-yield-report.ts: constructYieldSummary - Could not get local player stats!");
            return;
        }
        const playerTreasury = player?.Treasury;
        if (!playerTreasury) {
            console.error("model-yield-report.ts: constructYieldSummary - Could not get local player treasury!");
            return;
        }
        const playerDiplomacyTreasury = player?.DiplomacyTreasury;
        if (!playerDiplomacyTreasury) {
            console.error("model-yield-report.ts: constructYieldSummary - Could not get local player diplomacy treasury!");
            return;
        }
        this._yieldSummaryRows = [];
        const totalIncomeMap = this.getYieldMap(playerStats);
        const totalIncomeYieldRow = {
            isTitle: true,
            rowLabel: "LOC_GLOBAL_YIELDS_SUMMARY_TOTAL_INCOME_PER_TURN",
            yieldNumbers: totalIncomeMap
        };
        this._curGoldBalance = playerTreasury.goldBalance;
        this._curInfluenceBalance = playerDiplomacyTreasury.diplomacyBalance;
        this._yieldSummaryRows.push(totalIncomeYieldRow);
    }
    constructOtherData() {
        this._yieldOtherRows = [];
        const otherIncomeMap = this.subtractYieldNumbers(this.totalYield, this.totalYieldCity);
        otherIncomeMap[YieldTypes.YIELD_GOLD] -= this._netGoldFromUnits;
        const otherRow = {
            rowLabel: "LOC_GLOBAL_YIELDS_OTHER",
            isTitle: true,
            yieldNumbers: otherIncomeMap
        };
        this._yieldOtherRows.push(otherRow);
    }
    get yieldTotal() {
        return this._yieldTotalRows;
    }
    get yieldSummary() {
        return this._yieldSummaryRows;
    }
    get yieldCity() {
        return this._yieldCityRows;
    }
    get yieldUnits() {
        return this._yieldUnitRows;
    }
    get yieldOther() {
        return this._yieldOtherRows;
    }
    get netUnitGold() {
        return this._netGoldFromUnits;
    }
    get currentGoldBalance() {
        return this._curGoldBalance;
    }
    get currentInfluenceBalance() {
        return this._curInfluenceBalance;
    }
    addYieldNumbers(yields1, yields2) {
        return {
            [YieldTypes.YIELD_GOLD]: yields1[YieldTypes.YIELD_GOLD] + yields2[YieldTypes.YIELD_GOLD],
            [YieldTypes.YIELD_SCIENCE]: yields1[YieldTypes.YIELD_SCIENCE] + yields2[YieldTypes.YIELD_SCIENCE],
            [YieldTypes.YIELD_DIPLOMACY]: yields1[YieldTypes.YIELD_DIPLOMACY] + yields2[YieldTypes.YIELD_DIPLOMACY],
            [YieldTypes.YIELD_PRODUCTION]: yields1[YieldTypes.YIELD_PRODUCTION] + yields2[YieldTypes.YIELD_PRODUCTION],
            [YieldTypes.YIELD_HAPPINESS]: yields1[YieldTypes.YIELD_HAPPINESS] + yields2[YieldTypes.YIELD_HAPPINESS],
            [YieldTypes.YIELD_FOOD]: yields1[YieldTypes.YIELD_FOOD] + yields2[YieldTypes.YIELD_FOOD],
            [YieldTypes.YIELD_CULTURE]: yields1[YieldTypes.YIELD_CULTURE] + yields2[YieldTypes.YIELD_CULTURE],
        };
    }
    subtractYieldNumbers(yields1, yields2) {
        return {
            [YieldTypes.YIELD_GOLD]: yields1[YieldTypes.YIELD_GOLD] - yields2[YieldTypes.YIELD_GOLD],
            [YieldTypes.YIELD_SCIENCE]: yields1[YieldTypes.YIELD_SCIENCE] - yields2[YieldTypes.YIELD_SCIENCE],
            [YieldTypes.YIELD_DIPLOMACY]: yields1[YieldTypes.YIELD_DIPLOMACY] - yields2[YieldTypes.YIELD_DIPLOMACY],
            [YieldTypes.YIELD_PRODUCTION]: yields1[YieldTypes.YIELD_PRODUCTION] - yields2[YieldTypes.YIELD_PRODUCTION],
            [YieldTypes.YIELD_HAPPINESS]: yields1[YieldTypes.YIELD_HAPPINESS] - yields2[YieldTypes.YIELD_HAPPINESS],
            [YieldTypes.YIELD_FOOD]: yields1[YieldTypes.YIELD_FOOD] - yields2[YieldTypes.YIELD_FOOD],
            [YieldTypes.YIELD_CULTURE]: yields1[YieldTypes.YIELD_CULTURE] - yields2[YieldTypes.YIELD_CULTURE],
        };
    }
    createBlankMap() {
        return {
            [YieldTypes.YIELD_GOLD]: 0,
            [YieldTypes.YIELD_SCIENCE]: 0,
            [YieldTypes.YIELD_DIPLOMACY]: 0,
            [YieldTypes.YIELD_PRODUCTION]: 0,
            [YieldTypes.YIELD_HAPPINESS]: 0,
            [YieldTypes.YIELD_FOOD]: 0,
            [YieldTypes.YIELD_CULTURE]: 0,
        };
    }
}
const YieldReportData = new ModelYieldsReport();
engine.whenReady.then(() => {
    const updateModel = () => {
        engine.updateWholeModel(YieldReportData);
    };
    engine.createJSModel('g_YieldReport', YieldReportData);
    YieldReportData.updateCallback = updateModel;
});
export { YieldReportData as default };

//# sourceMappingURL=file:///base-standard/ui/player-yields-report/model-yields-report.js.map
