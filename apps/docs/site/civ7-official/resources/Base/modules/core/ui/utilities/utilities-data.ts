/**
 * @file utilities-data.ts
 * @copyright 2021, Firaxis Games
 * @description Utilties for working with custom data types and classes
 */

import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'

export namespace TradeRoute {

	export function isWithCity(route: TradeRoute, cityId: ComponentID | null): boolean {
		if (!cityId) return false;
		return ComponentID.isMatch(route.leftCityID, cityId) || ComponentID.isMatch(route.rightCityID, cityId);
	}

	export function getOppositeCityID(route: TradeRoute, cityId: ComponentID): ComponentID | null {
		if (ComponentID.isMatch(route.leftCityID, cityId)) {
			return route.rightCityID;
		}
		else if (ComponentID.isMatch(route.rightCityID, cityId)) {
			return route.leftCityID;
		}
		return null;
	}

	export function getOppositeCity(route: TradeRoute, cityId: ComponentID): City | null {
		if (ComponentID.isMatch(route.leftCityID, cityId)) {
			return Cities.get(route.rightCityID);
		}
		else if (ComponentID.isMatch(route.rightCityID, cityId)) {
			return Cities.get(route.leftCityID);
		}
		return null;
	}

	export function getCityPayload(route: TradeRoute, cityId: ComponentID): TradeRoutePayload | null {
		if (ComponentID.isMatch(route.leftCityID, cityId)) {
			return route.leftPayload;
		}
		if (ComponentID.isMatch(route.rightCityID, cityId)) {
			return route.rightPayload;
		}
		return null;
	}
}