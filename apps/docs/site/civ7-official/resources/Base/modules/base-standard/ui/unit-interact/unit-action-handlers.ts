/**
 * @file unit-action-handlers.ts
 * @copyright 2021, Firaxis Games
 * @description Provides unique functionality and handling for unit actions
 */

import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'


interface UnitActionHandler {
	/**
	 * Does a particular unit operation require a targetPlot if selected?
	 * @returns true if this operation requires a plot to be targeted before exectuing.
	 */
	isTargetPlotOperation(): boolean;

	/**
	 * Switches to the intended interface mode for this handler and passes along the context data
	 */
	switchTo(context?: any): void;

	/**
	 * Should the interface mode be switch to, even on gamepad mode
	 */
	useHandlerWithGamepad?(): boolean;
}

export namespace UnitActionHandlers {

	const unitActionHandlers = new Map<string, UnitActionHandler>();

	export function setUnitActionHandler(actionType: string, handler: UnitActionHandler) {
		const existingHandler: UnitActionHandler | undefined = unitActionHandlers.get(actionType);
		if (existingHandler == undefined) {
			unitActionHandlers.set(actionType, handler);
		}
	}

	export function doesActionHaveHandler(actionType: string): boolean {
		const handler: UnitActionHandler | undefined = unitActionHandlers.get(actionType);
		if (handler != undefined) {
			return true;
		}
		return false;
	}

	export function useHandlerWithGamepad(actionType: string): boolean {
		const handler: UnitActionHandler | undefined = unitActionHandlers.get(actionType);
		if (handler != undefined && handler.useHandlerWithGamepad) {
			return handler.useHandlerWithGamepad();
		}
		return false;
	}

	export function doesActionRequireTargetPlot(actionType: string): boolean {
		const handler: UnitActionHandler | undefined = unitActionHandlers.get(actionType);
		if (handler != undefined) {
			return handler.isTargetPlotOperation();
		}
		return false;
	}

	export function switchToActionInterfaceMode(actionType: string, context?: any) {
		const handler: UnitActionHandler | undefined = unitActionHandlers.get(actionType);
		if (handler != undefined) {
			if (context) {
				context.ActionType = actionType;
			}
			return handler.switchTo(context);
		}
	}
}

class MoveToHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_MOVE_TO', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITOPERATION_MOVE_TO', new MoveToHandler());

class RangeAttackHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_RANGE_ATTACK', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITOPERATION_RANGE_ATTACK', new RangeAttackHandler());

class ReinforceArmyHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_REINFORCE_ARMY', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITOPERATION_REINFORCE_ARMY', new ReinforceArmyHandler());

class CallReinforcementsHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_COMMANDER_REINFORCEMENT', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITOPERATION_CALL_REINFORCEMENTS', new CallReinforcementsHandler());

class AerialReconHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_AERIAL_RECON', context);
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}
}
UnitActionHandlers.setUnitActionHandler('UNITOPERATION_AERIAL_RECON', new AerialReconHandler());

class CargoDropHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_CARGO_DROP', context);
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}
}
UnitActionHandlers.setUnitActionHandler('UNITOPERATION_CARGO_DROP', new CargoDropHandler());

class UnitAirDropHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_UNIT_AIR_DROP', context);
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}
}
UnitActionHandlers.setUnitActionHandler('UNITOPERATION_UNIT_AIR_DROP', new UnitAirDropHandler());

class CoastalRaidHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_COASTAL_RAID', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITOPERATION_COASTAL_RAID', new CoastalRaidHandler());

class PillageLandHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_PILLAGE', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITOPERATION_PILLAGE', new PillageLandHandler());

class PillageRouteHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_PILLAGE_ROUTE', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITOPERATION_PILLAGE_ROUTE', new PillageRouteHandler());

class UnpackArmyHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_UNPACK_ARMY', context);
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_UNPACK_ARMY', new UnpackArmyHandler());

class ResettlePopulationHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_ACQUIRE_TILE', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_RESETTLE', new ResettlePopulationHandler());


class EstablishBaseHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_ESTABLISH_BASE', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITOPERATION_ESTABLISH_BASE', new EstablishBaseHandler());

class FoundCityAdjacentPlotHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_FOUND_CITY_ADJACENT_PLOT', context);
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}
}
UnitActionHandlers.setUnitActionHandler('UNITOPERATION_FOUND_CITY_ADJACENT_PLOT', new FoundCityAdjacentPlotHandler());

class ReBaseHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_REBASE', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITOPERATION_REBASE', new ReBaseHandler());

class ConstructInRangeHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	switchTo(context?: any) {
		context.CommandType =
			InterfaceMode.switchTo('INTERFACEMODE_CONSTRUCT_IN_RANGE', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_CONSTRUCT_IN_RANGE', new ConstructInRangeHandler());
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_ARMY_CONSTRUCT_IN_RANGE', new ConstructInRangeHandler());

class AddToArmyHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_ADD_TO_ARMY', context);
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_ADD_TO_ARMY', new AddToArmyHandler());

class RemoveFromArmyHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_REMOVE_FROM_ARMY', context);
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_REMOVE_FROM_ARMY', new RemoveFromArmyHandler());

class AirAttackHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_AIR_ATTACK', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITOPERATION_AIR_ATTACK', new AirAttackHandler());

class NavalAttackHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_NAVAL_ATTACK', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITOPERATION_NAVAL_ATTACK', new NavalAttackHandler());

class WMDStrikeHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_WMD_STRIKE', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITOPERATION_WMD_STRIKE', new WMDStrikeHandler());

class TeleportToCityHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_TELEPORT_TO_CITY', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITOPERATION_TELEPORT_TO_CITY', new TeleportToCityHandler());

class ArmyOverrunHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_ARMY_OVERRUN', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_ARMY_OVERRUN', new ArmyOverrunHandler());

class UnitPromotionHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return false;
	}

	switchTo(_context?: any) {
		InterfaceMode.switchTo("INTERFACEMODE_UNIT_PROMOTION");
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_PROMOTE', new UnitPromotionHandler());

class FocusedAttackLandMeleeHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_FOCUSED_ATTACK_LAND_MELEE', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_FOCUSED_ATTACK_LAND_MELEE', new FocusedAttackLandMeleeHandler());

class FocusedAttackLandRangedHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_FOCUSED_ATTACK_LAND_RANGED', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_FOCUSED_ATTACK_LAND_RANGED', new FocusedAttackLandRangedHandler());

class FocusedAttackSeaMeleeHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_FOCUSED_ATTACK_SEA_MELEE', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_FOCUSED_ATTACK_SEA_MELEE', new FocusedAttackSeaMeleeHandler());

class FocusedAttackSeaRangedHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_FOCUSED_ATTACK_SEA_RANGED', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_FOCUSED_ATTACK_SEA_RANGED', new FocusedAttackSeaRangedHandler());

class FocusedAttackAirToAirHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_FOCUSED_ATTACK_AIR_TO_AIR', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_FOCUSED_ATTACK_AIR_TO_AIR', new FocusedAttackAirToAirHandler());

class FocusedAttackAirToLandHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_FOCUSED_ATTACK_AIR_TO_LAND', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_FOCUSED_ATTACK_AIR_TO_LAND', new FocusedAttackAirToLandHandler());

class FocusedAttackAirBombHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_FOCUSED_ATTACK_AIR_BOMB', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_FOCUSED_ATTACK_AIR_BOMB', new FocusedAttackAirBombHandler());

class DefensivePerimeterHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_DEFENSIVE_PERIMETER', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_DEFENSIVE_PERIMETER', new DefensivePerimeterHandler());

class ConnectWithRoadHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_CONNECT_WITH_ROAD', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_CONNECT_WITH_ROAD', new ConnectWithRoadHandler());

class MoveByRailHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_MOVE_BY_RAIL', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_MOVE_BY_RAIL', new MoveByRailHandler());

class GrantSecondWindHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_GRANT_SECOND_WIND', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_GRANT_SECOND_WIND', new GrantSecondWindHandler());

class CommanderAttackHandler implements UnitActionHandler {
	isTargetPlotOperation(): boolean {
		return true;
	}

	useHandlerWithGamepad(): boolean {
		return true;
	}

	switchTo(context?: any) {
		InterfaceMode.switchTo('INTERFACEMODE_COMMANDER_ATTACK', context);
	}
}
UnitActionHandlers.setUnitActionHandler('UNITCOMMAND_COMMANDER_ATTACK', new CommanderAttackHandler());