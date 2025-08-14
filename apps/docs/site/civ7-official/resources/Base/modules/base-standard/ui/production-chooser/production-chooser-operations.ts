export const CanUpgradeToCity = (townID: ComponentID) => {
	const result = Game.CityCommands.canStart(townID, CityCommandTypes.PURCHASE, { Directive: OrderTypes.ORDER_TOWN_UPGRADE }, false);
	return result.Success;
}

export type ConstructibleOperationResult = OperationResult;
export const CanCityConstruct = (cityID: ComponentID, constructible: ConstructibleDefinition, isPurchase: boolean): ConstructibleOperationResult => {
	if (isPurchase) {
		return Game.CityCommands.canStart(cityID, CityCommandTypes.PURCHASE, { ConstructibleType: constructible.$index }, false);
	} else {
		return Game.CityOperations.canStart(cityID, CityOperationTypes.BUILD, { ConstructibleType: constructible.$index }, false);
	}
}

export const CanConvertToCity = (townID: ComponentID) => {
	return Game.CityCommands.canStart(townID, CityCommandTypes.PURCHASE, { Directive: OrderTypes.ORDER_TOWN_UPGRADE }, false);
}

export const ConvertToCity = (townID: ComponentID) => {
	const result = CanConvertToCity(townID);
	if (result.Success) {
		Game.CityCommands.sendRequest(townID, CityCommandTypes.PURCHASE, { Directive: OrderTypes.ORDER_TOWN_UPGRADE });
		UI.sendAudioEvent("city-upgrade-confirm");
		return true;
	}

	return false;
}