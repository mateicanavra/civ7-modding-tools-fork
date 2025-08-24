/**
 * @file utilities-data.ts
 * @copyright 2021, Firaxis Games
 * @description Utilties for working with custom data types and classes
 */
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js';
export var TradeRoute;
(function (TradeRoute) {
    function isWithCity(route, cityId) {
        if (!cityId)
            return false;
        return ComponentID.isMatch(route.leftCityID, cityId) || ComponentID.isMatch(route.rightCityID, cityId);
    }
    TradeRoute.isWithCity = isWithCity;
    function getOppositeCityID(route, cityId) {
        if (ComponentID.isMatch(route.leftCityID, cityId)) {
            return route.rightCityID;
        }
        else if (ComponentID.isMatch(route.rightCityID, cityId)) {
            return route.leftCityID;
        }
        return null;
    }
    TradeRoute.getOppositeCityID = getOppositeCityID;
    function getOppositeCity(route, cityId) {
        if (ComponentID.isMatch(route.leftCityID, cityId)) {
            return Cities.get(route.rightCityID);
        }
        else if (ComponentID.isMatch(route.rightCityID, cityId)) {
            return Cities.get(route.leftCityID);
        }
        return null;
    }
    TradeRoute.getOppositeCity = getOppositeCity;
    function getCityPayload(route, cityId) {
        if (ComponentID.isMatch(route.leftCityID, cityId)) {
            return route.leftPayload;
        }
        if (ComponentID.isMatch(route.rightCityID, cityId)) {
            return route.rightPayload;
        }
        return null;
    }
    TradeRoute.getCityPayload = getCityPayload;
})(TradeRoute || (TradeRoute = {}));

//# sourceMappingURL=file:///core/ui/utilities/utilities-data.js.map
