/**
 * @file trade-route-model.ts
 * @copyright 2024, Firaxis Games
 * @description Select and get info on trade trade routes
 */

export interface IProjectedTradeRoute {
	index: number;
	city: City;
	cityPlotIndex: PlotIndex;
	leaderIcon: string;
	leaderName: string;
	status: TradeRouteStatus;
	statusIcon: string;
	statusText: string;
	statusTooltip: string;
	statusTooltipReason: string;
	importPayloads: ResourceDefinition[];
	exportYields: YieldAmount[];
	exportYieldsString: string;
	pathPlots: number[];
}

class TradeRoutesModelImpl {
	private projectedTradeRoutes: IProjectedTradeRoute[] = [];
	private isModern = Game.age == Database.makeHash("AGE_MODERN");
	private tradeRouteModelGroup = WorldUI.createModelGroup(`TradeRoutePath`);
	private tradeRoutePathColor: number[] = [2, 2, 2]; // Color for the trade route arrow in linear space

	public getTradeRoute(tradeRouteIndex: number) {
		return this.projectedTradeRoutes[tradeRouteIndex];
	}

	public getProjectedTradeRoutes() {
		return this.projectedTradeRoutes;
	}

	public calculateProjectedTradeRoutes(): IProjectedTradeRoute[] {
		const localPlayerId = GameContext.localPlayerID;
		const localPlayer = Players.get(localPlayerId);

		if (!localPlayer) {
			console.error("TradeRoutesModel - No local player, cannot calculate trade routes")
			return [];
		}

		const possibleTradeRoutes = localPlayer.Trade?.projectPossibleTradeRoutes();
		if (!possibleTradeRoutes) {
			return [];
		}

		this.projectedTradeRoutes = [];
		for (const tradeRoute of possibleTradeRoutes) {
			const targetCity = Cities.get(tradeRoute.targetCityId);
			if (!targetCity) {
				console.error("TradeRoutesModel - Unable to project trade route - City not found!")
				continue;
			}

			const player = Players.get(targetCity.owner);
			if (!player) {
				console.error("TradeRoutesModel - Unable to project trade route - Player not found!")
				continue;
			}

			const cityPlotIndex = GameplayMap.getIndexFromLocation(targetCity.location);

			const leaderIcon = GameInfo.Leaders.lookup(player.leaderType)?.LeaderType ?? "";
			const leaderName = player.leaderName
			const isLandRoute = tradeRoute.domain == DomainType.DOMAIN_LAND;
			const statusIcon = this.getTradeRouteStatusIcon(tradeRoute.status, isLandRoute);
			const statusTexts = this.getTradeActionText(tradeRoute.status, targetCity, leaderName, isLandRoute);
			const importPayloads: ResourceDefinition[] = [];
			const exportYieldAmounts: string[] = [];

			for (const resource of tradeRoute.importPayloads) {
				const payload = GameInfo.Resources.lookup(resource.uniqueResource.resource as string);
				if (payload) {
					importPayloads.push(payload)
				}
			}

			for (const yieldAmount of tradeRoute.exportYields) {
				const yieldName = GameInfo.Yields.lookup(yieldAmount.yieldType)?.YieldType ?? "";
				const yieldStyle = yieldName.toLowerCase().replace(/_/g, "-");
				exportYieldAmounts.push(Locale.compose('LOC_TRADE_LENS_YIELD', yieldStyle, yieldAmount.amount, yieldName));
			}

			const exportYieldsString = Locale.compose("LOC_TRADE_LENS_YIELD_EXPORT", exportYieldAmounts.join(", "), targetCity.name);

			this.projectedTradeRoutes.push({
				index: this.projectedTradeRoutes.length,
				city: targetCity,
				cityPlotIndex,
				leaderIcon,
				leaderName,
				status: tradeRoute.status,
				statusIcon,
				statusText: statusTexts.statusText,
				statusTooltip: statusTexts.statusTooltip,
				statusTooltipReason: statusTexts.statusTooltipReason,
				importPayloads,
				exportYields: tradeRoute.exportYields,
				exportYieldsString,
				pathPlots: tradeRoute.pathPlots
			});
		}

		return this.projectedTradeRoutes;
	}

	public getTradeRouteStatusIcon(status: TradeRouteStatus, isLandRoute: boolean) {
		switch (status) {
			case TradeRouteStatus.SUCCESS:
				return isLandRoute ? "TRADE_ROUTE_LAND" : "TRADE_ROUTE_SEA";

			case TradeRouteStatus.AT_WAR:
				return "TRADE_ROUTE_WAR";

			case TradeRouteStatus.DISTANCE:
				return "TRADE_ROUTE_OUT_OF_RANGE";

			case TradeRouteStatus.NEED_MORE_FRIENDSHIP:
				return "TRADE_ROUTE_ALLIANCE";
		}

		return "";
	}

	private getTradeActionText(status: TradeRouteStatus, city: City, leaderName: string, isLandRoute: boolean) {
		const results = { statusText: "", statusTooltip: "", statusTooltipReason: "" };

		const localPlayerTrade = Players.get(GameContext.localPlayerID)?.Trade;
		const capacity = localPlayerTrade?.getTradeCapacityFromPlayer(city.owner) ?? 0;

		switch (status) {
			case TradeRouteStatus.SUCCESS:
				const current = localPlayerTrade?.countPlayerTradeRoutesTo(city.owner) ?? 0;

				results.statusText = this.isModern
					? Locale.compose("LOC_TRADE_LENS_ADD_ROUTES", current, capacity)
					: Locale.compose("LOC_TRADE_LENS_EXISTING_ROUTES", current, capacity, leaderName);

				results.statusTooltip = isLandRoute
					? "LOC_TRADE_LENS_ROUTE_TYPE_LAND"
					: "LOC_TRADE_LENS_ROUTE_TYPE_SEA";

				break;

			case TradeRouteStatus.AT_WAR:
				results.statusText = Locale.compose("LOC_TRADE_LENS_ROUTE_TYPE_WAR");
				results.statusTooltip = results.statusText;
				break;

			case TradeRouteStatus.NEED_MORE_FRIENDSHIP:
				results.statusText = Locale.compose("LOC_TRADE_LENS_ROUTE_TYPE_ALLIANCE");
				results.statusTooltip = results.statusText;
				results.statusTooltipReason = Locale.compose("LOC_TRADE_LENS_EXISTING_ROUTES_FULL", capacity, leaderName);
				break;

			case TradeRouteStatus.DISTANCE:
				results.statusText = Locale.compose("LOC_TRADE_LENS_ROUTE_TYPE_OUT_OF_RANGE");
				results.statusTooltip = results.statusText;
				break;
		}

		return results;
	}

	// TODO: Change this to spline paths when available
	public showTradeRouteVfx(plots: PlotIndex[]) {
		this.tradeRouteModelGroup.clear();

		for (let i = 0; i < plots.length; ++i) {
			const plotIndex = plots[i];
			const prevIndex = i == 0 ? null : plots[i - 1];
			const nextIndex = i + 1 == plots.length ? null : plots[i + 1];

			let prevDirection: number = 0;
			let nextDirection: number = 0;
			const thisPlotCoord: PlotCoord = GameplayMap.getLocationFromIndex(plotIndex);

			// Find the direction to the previous plot
			if (prevIndex != undefined) {
				const prevPlotCoord: PlotCoord = GameplayMap.getLocationFromIndex(prevIndex);
				prevDirection = this.getDirectionNumberFromDirectionType(GameplayMap.getDirectionToPlot(thisPlotCoord, prevPlotCoord));
			}

			// Find the direction to the next plot
			if (nextIndex != undefined) {
				const nextPlotCoord: PlotCoord = GameplayMap.getLocationFromIndex(nextIndex);
				nextDirection = this.getDirectionNumberFromDirectionType(GameplayMap.getDirectionToPlot(thisPlotCoord, nextPlotCoord));
			}

			this.tradeRouteModelGroup.addVFXAtPlot(this.getPathVFXforPlot(), plotIndex, { x: 0, y: 0, z: 0 }, { constants: { "start": prevDirection, "end": nextDirection, "Color3": this.tradeRoutePathColor } });
		}
	}

	public clearTradeRouteVfx() {
		this.tradeRouteModelGroup.clear();
	}

	private getPathVFXforPlot(): string {
		return "VFX_3dUI_TradeRoute_01";
	}

	private getDirectionNumberFromDirectionType(direction: DirectionTypes): number {
		switch (direction) {
			case DirectionTypes.DIRECTION_EAST:
				return 1;
			case DirectionTypes.DIRECTION_SOUTHEAST:
				return 2;
			case DirectionTypes.DIRECTION_SOUTHWEST:
				return 3;
			case DirectionTypes.DIRECTION_WEST:
				return 4;
			case DirectionTypes.DIRECTION_NORTHWEST:
				return 5;
			case DirectionTypes.DIRECTION_NORTHEAST:
				return 6;
		}

		return 0;
	}

}

export const TradeRoutesModel = new TradeRoutesModelImpl();