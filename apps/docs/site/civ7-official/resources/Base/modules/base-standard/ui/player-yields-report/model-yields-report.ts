/**
 * @file player-yields-report-screen.ts
 * @copyright 2024, Firaxis Games
 * @description Model containing data for panel-yields-report-screen
 */

export interface YieldIncomeRow {
	isTitle: boolean;
	rowLabel: string;
	rowLabelTabbed?: boolean;
	rowIcon?: string;
	yieldNumbers: Record<YieldType, number>;
}

class ModelYieldsReport {
	private _yieldTotalRows: YieldIncomeRow[] = [];
	private _yieldCityRows: YieldIncomeRow[] = [];
	private _yieldUnitRows: YieldIncomeRow[] = [];
	private _yieldSummaryRows: YieldIncomeRow[] = [];
	private _yieldOtherRows: YieldIncomeRow[] = [];

	private totalYield: Record<YieldType, number> = this.createBlankMap();
	private totalYieldCity: Record<YieldType, number> = this.createBlankMap();

	private _netGoldFromUnits: number = 0;
	private _curGoldBalance: number = 0;
	private _curInfluenceBalance: number = 0;

	private onUpdate?: (model: ModelYieldsReport) => void;

	set updateCallback(callback: (model: ModelYieldsReport) => void) {
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

	private constructTotalData() {
		const player = Players.get(GameContext.localObserverID);
		const playerStats = player?.Stats;
		if (!playerStats) {
			console.error("model-yield-report.ts: constructTotalData - Could not get local player stats!");
			return;
		}

		this._yieldTotalRows = [];

		this.totalYield = this.getYieldMap(playerStats);
		const totalIncomeYieldRow: YieldIncomeRow = {
			isTitle: true,
			rowLabel: "LOC_GLOBAL_YIELDS_SUMMARY_TOTAL_INCOME_PER_TURN",
			yieldNumbers: this.totalYield
		};

		this._yieldTotalRows.push(totalIncomeYieldRow);

	}

	private constructCityData() {
		const player = Players.get(GameContext.localObserverID);
		const playerCities: PlayerCities | undefined = player?.Cities;
		if (!playerCities) {
			console.error("model-yield-report.ts: constructCityData - Could not get local player cities!");
			return;
		}

		this._yieldCityRows = [];

		let totalYieldNumbers = this.createBlankMap();

		for (const city of playerCities.getCities()) {
			const cityYields: CityYields | undefined = city.Yields;
			if (!cityYields) {
				console.error(`model-yield-report.ts: constructCityData - No city yields for city ${city.id}`);
				return;
			}
			const cityWorkers: CityWorkers | undefined = city.Workers;
			if (!cityWorkers) {
				console.error(`model-yield-report.ts: constructCityData - No city workers for city ${city.id}`);
				return;
			}
			const cityConstructibles: CityConstructibles | undefined = city.Constructibles;
			if (!cityConstructibles) {
				console.error(`model-yield-report.ts: constructCityData - No city constructibles for city ${city.id}`);
				return;
			}
			const cityYieldNumbers = this.getYieldMap(cityYields);
			const cityNetYields: YieldIncomeRow = {
				isTitle: false,
				rowLabel: city.name,
				rowIcon: "CHAT_BUILDINGS",
				yieldNumbers: cityYieldNumbers
			}

			const cityCenterYields: YieldIncomeRow = {
				isTitle: false,
				rowLabel: "LOC_DISTRICT_CITY_CENTER_NAME",
				rowIcon: "CITY_CENTERPIN",
				rowLabelTabbed: true,
				yieldNumbers: this.getCityCenterYields(city)
			}

			const cityUrbanYields: YieldIncomeRow = {
				isTitle: false,
				rowLabel: "LOC_GLOBAL_YIELDS_URBAN_DISTRICTS",
				rowIcon: "CITY_URBAN",
				rowLabelTabbed: true,
				yieldNumbers: this.getCityDistrictTypeYields(city, DistrictTypes.URBAN)
			}

			const cityRuralYields: YieldIncomeRow = {
				isTitle: false,
				rowLabel: "LOC_GLOBAL_YIELDS_RURAL_DISTRICTS",
				rowIcon: "CITY_RURAL",
				rowLabelTabbed: true,
				yieldNumbers: this.getCityDistrictTypeYields(city, DistrictTypes.RURAL)
			}

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

			const citySpecialistYields: YieldIncomeRow = {
				isTitle: false,
				rowLabel: "LOC_UI_FOOD_CHOOSER_SPECIALISTS",
				rowIcon: "CITY_SPECIAL_BASE",
				rowLabelTabbed: true,
				yieldNumbers: specialistYieldMap
			}

			const buildingMaintenanceMap: Record<YieldType, number> = {}
			for (const constructibleId of cityConstructibles.getIds()) {
				const constructible: Constructible | null = Constructibles.getByComponentID(constructibleId);
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
					} else {
						buildingMaintenanceMap[yieldDefinition.$hash] = -maintenanceValue;
					}
				}
			}

			const cityBuildingMaintenanceYields: YieldIncomeRow = {
				isTitle: false,
				rowLabel: "LOC_ATTR_BUILDING_MAINT",
				rowIcon: "CITY_BUILDING_LIST",
				rowLabelTabbed: true,
				yieldNumbers: buildingMaintenanceMap
			}

			totalYieldNumbers = this.addYieldNumbers(totalYieldNumbers, cityNetYields.yieldNumbers);
			this._yieldCityRows.push(cityNetYields);
			this._yieldCityRows.push(cityCenterYields);
			this._yieldCityRows.push(cityUrbanYields);
			this._yieldCityRows.push(cityRuralYields);
			this._yieldCityRows.push(citySpecialistYields);
			this._yieldCityRows.push(cityBuildingMaintenanceYields);

		}

		this.totalYieldCity = totalYieldNumbers;
		const totalCityYields: YieldIncomeRow = {
			isTitle: true,
			rowLabel: "LOC_GLOBAL_YIELDS_TOTAL_FROM_CITIES",
			yieldNumbers: totalYieldNumbers
		}
		this._yieldCityRows.unshift(totalCityYields);
	}

	private getCityCenterYields(city: City) {
		const cityDistricts: CityDistricts | undefined = city.Districts;
		if (!cityDistricts) {
			console.error(`model-yield-report.ts: getCityCenterYields - No city districts for city ${city.id}`);
			return this.createBlankMap();
		};

		return this.getDistrictYields(cityDistricts.cityCenter, city.owner);
	}

	private getCityDistrictTypeYields(city: City, districtType: DistrictType) {
		let totalNumbers = this.createBlankMap();
		const cityDistricts: CityDistricts | undefined = city.Districts;
		if (!cityDistricts) {
			console.error(`model-yield-report.ts: getCityDistrictTypeYields - No city districts for city ${city.id}`);
			return totalNumbers;
		};
		const cityUrbanIDs = cityDistricts.getIdsOfType(districtType);

		for (const urbanID of cityUrbanIDs) {
			totalNumbers = this.addYieldNumbers(totalNumbers, this.getDistrictYields(urbanID, city.owner));
		}

		return totalNumbers;
	}

	private getDistrictYields(districtID: ComponentID, owner: PlayerId) {
		const cityDistrict: District | null = Districts.get(districtID);
		if (!cityDistrict) {
			console.error(`model-yield-report.ts: getDistrictYields - No district found for componentID ${districtID}`);
			return this.createBlankMap();
		}
		const districtYields: [YieldType, number][] = GameplayMap.getYields(GameplayMap.getIndexFromLocation(cityDistrict.location), owner);

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

	private constructUnitData() {
		this._yieldUnitRows = [];
		const player = Players.get(GameContext.localObserverID);
		const playerUnits: PlayerUnits | undefined = player?.Units;
		if (!playerUnits) {
			console.error("model-yield-report.ts: constructUnitData - Could not get local player units!");
			return;
		}
		const playerStats: PlayerStats | undefined = player?.Stats;
		if (!playerStats) {
			console.error("model-yield-report.ts: constructUnitData - Could not get local player stats!");
			return;
		}
		const playerTreasury: PlayerTreasury | undefined = player?.Treasury;
		if (!playerTreasury) {
			console.error("model-yield-report.ts: constructUnitData - Could not get local player treasury!");
			return;
		}

		const unitsTypesParsed: UnitType[] = [];
		let goldTotal: number = 0;
		for (const unit of playerUnits.getUnits()) {
			if (!unitsTypesParsed.includes(unit.type)) {
				const numUnitsOfType: number = playerUnits.getNumUnitsOfType(unit.type);
				const unitCost: number = playerTreasury.getMaintenanceForAllUnitsOfType(unit.type) * -1;

				goldTotal += unitCost;

				const unitRowMap = {
					[YieldTypes.YIELD_GOLD]: unitCost,
					[YieldTypes.NO_YIELD]: numUnitsOfType,
				};

				const unitDefinition: UnitDefinition | null = GameInfo.Units.lookup(unit.type);
				if (!unitDefinition) {
					console.error(`model-yield-report.ts: constructUnitData - Could not unit definition for unit type ${unit.type}!`);
					return;
				}

				const unitYieldRow: YieldIncomeRow = {
					rowLabel: unit.name,
					rowIcon: unitDefinition.UnitType,
					isTitle: false,
					rowLabelTabbed: true,
					yieldNumbers: unitRowMap
				}
				this._yieldUnitRows.push(unitYieldRow);
				unitsTypesParsed.push(unit.type);
			}
		}

		this._netGoldFromUnits = goldTotal;
	}

	private constructYieldSummary() {
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
		const totalIncomeYieldRow: YieldIncomeRow = {
			isTitle: true,
			rowLabel: "LOC_GLOBAL_YIELDS_SUMMARY_TOTAL_INCOME_PER_TURN",
			yieldNumbers: totalIncomeMap
		};

		this._curGoldBalance = playerTreasury.goldBalance;
		this._curInfluenceBalance = playerDiplomacyTreasury.diplomacyBalance;

		this._yieldSummaryRows.push(totalIncomeYieldRow);
	}

	private constructOtherData() {
		this._yieldOtherRows = [];

		const otherIncomeMap = this.subtractYieldNumbers(this.totalYield, this.totalYieldCity);
		otherIncomeMap[YieldTypes.YIELD_GOLD] -= this._netGoldFromUnits;

		const otherRow: YieldIncomeRow = {
			rowLabel: "LOC_GLOBAL_YIELDS_OTHER",
			isTitle: true,
			yieldNumbers: otherIncomeMap
		}

		this._yieldOtherRows.push(otherRow);
	}

	get yieldTotal(): YieldIncomeRow[] {
		return this._yieldTotalRows;
	}

	get yieldSummary(): YieldIncomeRow[] {
		return this._yieldSummaryRows;
	}

	get yieldCity(): YieldIncomeRow[] {
		return this._yieldCityRows;
	}

	get yieldUnits(): YieldIncomeRow[] {
		return this._yieldUnitRows;
	}

	get yieldOther(): YieldIncomeRow[] {
		return this._yieldOtherRows;
	}

	get netUnitGold(): number {
		return this._netGoldFromUnits;
	}

	get currentGoldBalance(): number {
		return this._curGoldBalance;
	}

	get currentInfluenceBalance(): number {
		return this._curInfluenceBalance;
	}

	private addYieldNumbers(yields1: Record<YieldType, number>, yields2: Record<YieldType, number>) {
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

	private subtractYieldNumbers(yields1: Record<YieldType, number>, yields2: Record<YieldType, number>) {
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

	private createBlankMap() {
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

	getYieldMap = (api: PlayerStats | CityYields) => {
		return {
			[YieldTypes.YIELD_GOLD]: api.getNetYield(YieldTypes.YIELD_GOLD),
			[YieldTypes.YIELD_SCIENCE]: api.getNetYield(YieldTypes.YIELD_SCIENCE),
			[YieldTypes.YIELD_DIPLOMACY]: api.getNetYield(YieldTypes.YIELD_DIPLOMACY),
			[YieldTypes.YIELD_PRODUCTION]: api.getNetYield(YieldTypes.YIELD_PRODUCTION),
			[YieldTypes.YIELD_HAPPINESS]: api.getNetYield(YieldTypes.YIELD_HAPPINESS),
			[YieldTypes.YIELD_FOOD]: api.getNetYield(YieldTypes.YIELD_FOOD),
			[YieldTypes.YIELD_CULTURE]: api.getNetYield(YieldTypes.YIELD_CULTURE),
		};
	}
}

const YieldReportData = new ModelYieldsReport();
engine.whenReady.then(() => {

	const updateModel = () => {
		engine.updateWholeModel(YieldReportData);
	}

	engine.createJSModel('g_YieldReport', YieldReportData);
	YieldReportData.updateCallback = updateModel;
});

export { YieldReportData as default };