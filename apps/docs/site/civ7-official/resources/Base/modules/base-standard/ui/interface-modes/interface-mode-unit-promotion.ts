/**
 * @file interface-mode-unit-promotion.ts
 * @copyright 2021, Firaxis Games
 * @description Interface mode to handle viewing and assigning promotions for units and switching between promotable units.
 */

import { InputEngineEvent } from '/core/ui/input/input-support.js';
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js'
import UnitPromotionModel from '/base-standard/ui/unit-promotion/model-unit-promotion.js';

/**
 * Handler for INTERFACEMODE_UNIT_PROMOTION.
 */
class UnitPromotionInterfaceMode implements InterfaceMode.Handler {

	canLeaveMode(): boolean {
		return UnitPromotionModel.isClosing;
	}

	canEnterMode(): boolean {
		const selectedUnitID: ComponentID | null = UI.Player.getHeadSelectedUnit();
		if (!selectedUnitID) {
			console.error("interface-mode-unit-promotion: canEnterMode(): No selected unit ID! Cannot transition to unit promotion interface mode!")
			return false;
		}

		const selectedUnit: Unit | null = Units.get(selectedUnitID);
		if (!selectedUnit) {
			console.error("interface-mode-unit-promotion: canEnterMode(): Unable to retrieve selected unit object! Cannot transition to unit promotion interface mode!")
			return false;
		}

		return true;
	}

	transitionTo(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId, _context?: object) {
		const selectedUnitID: ComponentID | null = UI.Player.getHeadSelectedUnit();
		if (!selectedUnitID) {
			console.error("interface-mode-unit-promotion: transitionTo(): No selected unit ID! Cannot transition to unit promotion interface mode!")
			return;
		}

		const selectedUnit: Unit | null = Units.get(selectedUnitID);
		if (!selectedUnit) {
			console.error("interface-mode-unit-promotion: transitionTo(): Unable to retrieve selected unit object! Cannot transition to unit promotion interface mode!")
			return;
		}

		//Zoom in and pan two plots to the left of the unit to allow room for panel and unit
		//TODO: Figure out a way to tell which side of the screen the promotion panel is going to be on
		let newCoord: float2 = GameplayMap.getAdjacentPlotLocation(selectedUnit.location, DirectionTypes.DIRECTION_WEST);
		newCoord = GameplayMap.getAdjacentPlotLocation(newCoord, DirectionTypes.NO_DIRECTION);
		Camera.saveCameraZoom();
		const params: CameraLookAtParams = { zoom: 0.01 }
		Camera.lookAtPlot(newCoord, params)
	}

	transitionFrom(_oldMode: InterfaceMode.ModeId, _newMode: InterfaceMode.ModeId) {
		Camera.restoreCameraZoom();
	}

	handleInput(inputEvent: InputEngineEvent): boolean {
		if (inputEvent.detail.status != InputActionStatuses.FINISH) {
			return true;
		}

		if (inputEvent.isCancelInput() || inputEvent.detail.name == 'sys-menu') {
			const promotionPanel = document.querySelector("panel-unit-promotion");
			if (promotionPanel) {
				const promotionBackEvent = InputEngineEvent.CreateNewEvent(inputEvent);
				promotionPanel.dispatchEvent(promotionBackEvent);
			}
			return false;
		}

		return true;
	}
}

InterfaceMode.addHandler('INTERFACEMODE_UNIT_PROMOTION', new UnitPromotionInterfaceMode());