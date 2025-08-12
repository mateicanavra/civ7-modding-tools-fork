/**
 * @file interface-mode-move-to.ts
 * @copyright 2024, Firaxis Games
 * @description Handles the overlay and action calls for the move to operation
 */

import { Audio } from '/core/ui/audio-base/audio-support.js';
import ChoosePlotInterfaceMode from '/base-standard/ui/interface-modes/interface-mode-choose-plot.js'
import { ComponentID } from '/core/ui/utilities/utilities-component-id.js'
import { InterfaceMode } from '/core/ui/interface-modes/interface-modes.js';
import { UnitMapDecorationSupport } from '/base-standard/ui/interface-modes/support-unit-map-decoration.js'
import WorldInput from '/base-standard/ui/world-input/world-input.js';


interface MoveToInterfaceModeContext extends InterfaceMode.Context {
	UnitID: ComponentID;
}

/**
 * Handler for INTERFACEMODE_MOVE_TO.
 */
class MoveToInterfaceMode extends ChoosePlotInterfaceMode {

	private attackPlots: number[] = [];
	private unitID: ComponentID = ComponentID.getInvalidID();

	initialize(): boolean {
		const context = this.Context as MoveToInterfaceModeContext;
		this.unitID = context.UnitID;

		const args: any = {
			Modifiers: UnitOperationMoveModifiers.MOVE_IGNORE_UNEXPLORED_DESTINATION		// Human players can click out into the fog
		};
		const result = Game.UnitOperations.canStart(this.unitID, UnitOperationTypes.MOVE_TO, args, false);
		this.attackPlots = Units.getReachableTargets(this.unitID);
		return result.Success == true;
	}

	reset() {

	}

	decorate(_overlayGroup: WorldUI.OverlayGroup, _modelGroup: WorldUI.ModelGroup) {
		const unit: Unit | null = Units.get(this.unitID);
		if (!unit) {
			console.error("Move To Interface Mode failed to visualize possible move to plots");
			return;
		}

		UnitMapDecorationSupport.manager.showDesiredDestination = true;
		UnitMapDecorationSupport.manager.activate(this.unitID, UnitMapDecorationSupport.Mode.movement);
	}

	decorateHover(plotCoord: PlotCoord, _overlay: WorldUI.OverlayGroup, modelGroup: WorldUI.ModelGroup) {
		modelGroup.clear();
		this.attackPlots.forEach(plotID => {
			if (GameplayMap.getIndexFromLocation(plotCoord) == plotID) {
				const selectedUnit: Unit | null = Units.get(this.unitID);
				if (selectedUnit) {
					const attackingUnitCombat: UnitCombat | undefined = selectedUnit.Combat;
					if (attackingUnitCombat) {
						const args: any = {
							X: plotCoord.x,
							Y: plotCoord.y
						}
						if (attackingUnitCombat.rangedStrength > 0 || attackingUnitCombat.bombardStrength > 0) {
							const results = Game.UnitOperations.canStart(this.unitID, UnitOperationTypes.RANGE_ATTACK, args, false);
							if (results.Success) {
								//TODO: replace with real assets once implemented
								modelGroup.addModelAtPlot('UI_Prototype_Sword_Single_01', { i: plotCoord.x, j: plotCoord.y }, { x: 0, y: 0, z: 0 }, { angle: 0, alpha: 0.6, tintColor1: 0xFFA6B333 });
								return;
							}
						}
						else if ((attackingUnitCombat.getMeleeStrength(false) > 0)) {
							args.Modifiers = UnitOperationMoveModifiers.ATTACK;
							const results = Game.UnitOperations.canStart(this.unitID, UnitOperationTypes.MOVE_TO, args, false);
							if (results.Success) {
								//TODO: replace with real assets once implemented
								modelGroup.addModelAtPlot('UI_Prototype_Sword_Crossed_01', { i: plotCoord.x, j: plotCoord.y }, { x: 0, y: 0, z: 0 }, { angle: 0, alpha: 0.6, tintColor1: 0xFFA6B333 });
								return;
							}
						}
						UI.sendAudioEvent(Audio.getSoundTag('data-audio-unit-action-combat-hovered', 'interact-unit'));
					}
				}
			}
		});

		UnitMapDecorationSupport.manager.showDesiredDestination = true;
		UnitMapDecorationSupport.manager.update(plotCoord);
	}

	undecorate(_overlayGroup: WorldUI.OverlayGroup, _modelGroup: WorldUI.ModelGroup) {
		UnitMapDecorationSupport.manager.deactivate();
	}

	proposePlot(_plot: PlotCoord, accept: () => void, _reject: () => void) {
		accept();
	}

	commitPlot(plot: PlotCoord) {
		const args: any = {
			X: plot.x,
			Y: plot.y
		};
		WorldInput.requestMoveOperation(this.unitID, args);
	}
}

InterfaceMode.addHandler('INTERFACEMODE_MOVE_TO', new MoveToInterfaceMode());